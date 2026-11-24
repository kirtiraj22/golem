import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "~/lib/supabase/server";
import type { PlayerProfile } from "~/lib/auth/types";
import { createInitialGameState, createStorageLot, nextMarketDay } from "./generator";
import {
  advanceEconomyDay,
  buyGood as buyMarketGood,
  ensureEconomyState,
  sellGood as sellMarketGood,
  startGrainRumour,
} from "~/app/game/simulation/game-economy";
import {
  saleValue,
  type GameAction,
  type PublicPlayerGameState,
  type PlayerGameState,
  type ServerStorageLot,
  type StorageLot,
} from "~/app/game/auction/types";

const MIN_ACTIVE_LOTS = 3;
const MAX_KEPT_LOTS = 8;
const MAX_MUTATION_ATTEMPTS = 6;

export class GameActionError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = "GameActionError";
  }
}

type SaveRow = {
  state: PlayerGameState;
  version: number;
};

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

function isPreviewOrLive(lot: ServerStorageLot): boolean {
  return lot.status === "preview" || lot.status === "live";
}

function addHistory(
  state: PlayerGameState,
  entry: Omit<PlayerGameState["history"][number], "id" | "at" | "day">,
  now: Date
) {
  state.history.push({
    ...entry,
    id: randomUUID(),
    day: state.day,
    at: now.toISOString(),
  });
  state.history = state.history.slice(-80);
}

function refreshLots(state: PlayerGameState, now: Date): boolean {
  let changed = false;

  for (const lot of state.lots) {
    if (lot.status === "preview" && now.getTime() >= Date.parse(lot.previewEndsAt)) {
      lot.status = "live";
      changed = true;
    }

    if (lot.status !== "live") {
      continue;
    }

    if (now.getTime() >= Date.parse(lot.endsAt)) {
      const playerWon =
        lot.playerBid > 0 &&
        lot.playerBid > lot.rivalBid &&
        lot.playerBid >= lot.currentBid;

      lot.resolvedAt = now.toISOString();
      lot.currentBid = Math.max(lot.playerBid, lot.rivalBid);
      lot.isLeading = false;

      if (playerWon) {
        lot.status = "won";
        lot.wonBy = "player";
        lot.paidPrice = lot.playerBid;
        lot.revealStatus = "ready";
        lot.playerBid = 0;
        state.reputation += 3;
        addHistory(
          state,
          {
            type: "WIN",
            amount: lot.paidPrice,
            message: `Won ${lot.title} ${lot.unitNumber} for ${lot.paidPrice}c. The vault is ready to open.`,
          },
          now
        );
      } else {
        const refund = lot.playerBid;
        lot.status = "lost";
        lot.wonBy = "rival";
        lot.revealStatus = "locked";
        lot.playerBid = 0;
        lot.refundedAmount = refund;
        if (refund > 0) {
          state.balance += refund;
        }
        addHistory(
          state,
          {
            type: "LOSS",
            amount: refund,
            message:
              refund > 0
                ? `${lot.rivalName} took ${lot.title} ${lot.unitNumber}. Your ${refund}c deposit was returned.`
                : `${lot.rivalName} took ${lot.title} ${lot.unitNumber} before you placed a bid.`,
          },
          now
        );
      }

      changed = true;
      continue;
    }

    const rivalBidAt = Date.parse(lot.rivalNextBidAt);
    if (
      lot.playerBid > lot.rivalBid &&
      lot.rivalBid < lot.rivalCeiling &&
      now.getTime() >= rivalBidAt
    ) {
      const raise = Math.max(10, Math.round(lot.startingBid * 0.12));
      const nextBid = Math.min(lot.rivalCeiling, lot.playerBid + raise);
      lot.rivalBid = nextBid;
      lot.currentBid = Math.max(lot.currentBid, nextBid);
      lot.isLeading = lot.playerBid > lot.rivalBid;
      lot.rivalNextBidAt = new Date(
        now.getTime() + 8_000 + Math.random() * 8_000
      ).toISOString();
      changed = true;
    }
  }

  for (const lot of state.lots) {
    if (lot.revealStatus !== "pending" || !lot.revealReadyAt) {
      continue;
    }

    if (now.getTime() < Date.parse(lot.revealReadyAt)) {
      continue;
    }

    lot.revealStatus = "revealed";

    if (!lot.contentsClaimed) {
      lot.contentsClaimed = true;
      state.inventory.push(...lot.contents);
      const value = lot.contents.reduce(
        (total, item) => total + item.baseValue,
        0
      );
      state.reputation += 5;
      addHistory(
        state,
        {
          type: "REVEAL",
          amount: value,
          message: `Opened ${lot.title} ${lot.unitNumber}: ${lot.contents.length} items logged into the haul.`,
        },
        now
      );
    }

    changed = true;
  }

  const active = state.lots.filter(isPreviewOrLive).length;

  for (let index = active; index < MIN_ACTIVE_LOTS; index += 1) {
    state.lots.push(
      createStorageLot(now, state.nextListingNumber, state.day)
    );
    state.nextListingNumber += 1;
    changed = true;
  }

  while (state.lots.length > MAX_KEPT_LOTS) {
    const resolvedIndex = state.lots.findIndex((lot) => !isPreviewOrLive(lot));
    if (resolvedIndex < 0) {
      break;
    }
    state.lots.splice(resolvedIndex, 1);
    changed = true;
  }

  return changed;
}

function publicLot(lot: ServerStorageLot): StorageLot {
  const {
    contents,
    rivalCeiling: _rivalCeiling,
    rivalNextBidAt: _rivalNextBidAt,
    contentsClaimed: _contentsClaimed,
    ...publicFields
  } = lot;

  return {
    ...publicFields,
    contents: lot.revealStatus === "revealed" ? contents : undefined,
  };
}

export function publicGameState(state: PlayerGameState): PublicPlayerGameState {
  return {
    ...state,
    lots: state.lots.map(publicLot),
  };
}

async function readSave(walletAddress: string): Promise<SaveRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("player_game_state")
    .select("state, version")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load game state: ${error.message}`);
  }

  return (data as SaveRow | null) ?? null;
}

async function ensureSave(
  walletAddress: string,
  now: Date
): Promise<SaveRow> {
  const existing = await readSave(walletAddress);

  if (existing) {
    return existing;
  }

  const initial = createInitialGameState(now).state;
  const { error } = await getSupabaseAdmin()
    .from("player_game_state")
    .upsert(
      {
        wallet_address: walletAddress,
        state: initial,
        version: 0,
      },
      { onConflict: "wallet_address", ignoreDuplicates: true }
    );

  if (error) {
    throw new Error(`Could not create game state: ${error.message}`);
  }

  const created = await readSave(walletAddress);

  if (!created) {
    throw new Error("Game state was not created. Try again.");
  }

  return created;
}

async function saveIfChanged(
  walletAddress: string,
  previousVersion: number,
  state: PlayerGameState
): Promise<PlayerGameState | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("player_game_state")
    .update({
      state,
      version: previousVersion + 1,
    })
    .eq("wallet_address", walletAddress)
    .eq("version", previousVersion)
    .select("state, version")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not save game state: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return (data as SaveRow).state;
}

async function loadProfile(walletAddress: string): Promise<PlayerProfile> {
  const { data, error } = await getSupabaseAdmin()
    .from("player_profiles")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load player profile: ${error.message}`);
  }

  if (!data) {
    throw new GameActionError("Player profile not found. Sign in again.", 401);
  }

  return data as PlayerProfile;
}

function applyAction(
  state: PlayerGameState,
  action: GameAction,
  now: Date
): boolean {
  if (action.action === "refresh") {
    return false;
  }

  if (action.action === "bid") {
    const lot = state.lots.find((candidate) => candidate.id === action.lotId);
    if (!lot) {
      throw new GameActionError("That storage lot is no longer on the block.");
    }

    if (lot.status === "preview") {
      throw new GameActionError(
        "The preview is still running. Bidding opens when the clock hits zero."
      );
    }

    if (lot.status !== "live") {
      throw new GameActionError("This lot has already closed.");
    }

    if (now.getTime() >= Date.parse(lot.endsAt)) {
      throw new GameActionError("The hammer has already fallen on this lot.");
    }

    if (!Number.isInteger(action.amount)) {
      throw new GameActionError("Bids must be whole coins.");
    }

    if (action.amount <= lot.currentBid) {
      throw new GameActionError(
        `Your bid must beat the current ${lot.currentBid}c bid.`
      );
    }

    if (action.amount > 9_000_000) {
      throw new GameActionError("That bid is outside the house limit.");
    }

    const additional = action.amount - lot.playerBid;
    if (additional > state.balance) {
      throw new GameActionError(
        `You need ${additional}c more in free balance for that raise.`
      );
    }

    state.balance -= additional;
    lot.playerBid = action.amount;
    lot.currentBid = Math.max(lot.currentBid, action.amount);
    lot.isLeading = lot.playerBid > lot.rivalBid;
    lot.rivalNextBidAt = new Date(
      now.getTime() + 7_000 + Math.random() * 5_000
    ).toISOString();

    addHistory(
      state,
      {
        type: "BID",
        amount: action.amount,
        message: `Bid ${action.amount}c on ${lot.title} ${lot.unitNumber}. ${
          lot.isLeading ? "You lead the board." : `${lot.rivalName} is ahead.`
        }`,
      },
      now
    );

    return true;
  }

  if (action.action === "reveal") {
    const lot = state.lots.find((candidate) => candidate.id === action.lotId);
    if (!lot) {
      throw new GameActionError("That storage lot is no longer in the ledger.");
    }

    if (lot.status !== "won") {
      throw new GameActionError("Only a won lot can be opened.");
    }

    if (lot.revealStatus === "pending") {
      throw new GameActionError("The vault is already opening. Wait for it.");
    }

    if (lot.revealStatus === "revealed") {
      return false;
    }

    if (lot.revealStatus !== "ready" && lot.revealStatus !== "failed") {
      throw new GameActionError("This vault is not ready to open.");
    }

    lot.revealStatus = "pending";
    lot.revealReadyAt = new Date(now.getTime() + 2_800).toISOString();
    lot.revealError = undefined;
    return true;
  }

  if (action.action === "sell") {
    const itemIndex = state.inventory.findIndex(
      (item) => item.id === action.itemId
    );
    if (itemIndex < 0) {
      throw new GameActionError("That item is no longer in your haul.");
    }

    const item = state.inventory[itemIndex];
    const price = saleValue(item, state.market.multipliers);
    state.inventory.splice(itemIndex, 1);
    state.balance += price;
    state.reputation += 1;
    addHistory(
      state,
      {
        type: "SALE",
        amount: price,
        message: `Sold ${item.name} (${item.condition}) to Marla for ${price}c.`,
      },
      now
    );
    return true;
  }

  if (action.action === "advance-day") {
    if (action.expectedDay !== undefined && action.expectedDay !== state.day) {
      throw new GameActionError(
        `The market already moved to day ${state.day}. Refresh and try again.`,
        409
      );
    }

    // Production, autonomous NPC trading, consumption and event aging all run
    // here, once, on the server. Clients never advance their own worlds.
    advanceEconomyDay(state);
    state.market = nextMarketDay(state.market, state.day);
    addHistory(
      state,
      {
        type: "DAY",
        message: `Day ${state.day} begins. Market prices have shifted; check the headlines.`,
      },
      now
    );
    return true;
  }

  if (action.action === "fast-forward-week") {
    if (action.expectedDay !== undefined && action.expectedDay !== state.day) {
      throw new GameActionError(
        `The market already moved to day ${state.day}. Refresh and try again.`,
        409
      );
    }

    for (let index = 0; index < 7; index += 1) {
      advanceEconomyDay(state);
      state.market = nextMarketDay(state.market, state.day);
    }

    addHistory(
      state,
      {
        type: "DAY",
        message: `Seven market days pass. Day ${state.day} begins with fresh prices.`,
      },
      now
    );
    return true;
  }

  if (action.action === "start-rumour") {
    startGrainRumour(state);
    return true;
  }

  if (action.action === "buy-good") {
    buyMarketGood(state, action.goodId, action.quantity, action.sellerId);
    return true;
  }

  if (action.action === "sell-good") {
    sellMarketGood(state, action.goodId, action.quantity, action.buyerId);
    return true;
  }

  return false;
}

export async function loadGameState(
  walletAddress: string
): Promise<{ profile: PlayerProfile; state: PublicPlayerGameState }> {
  const now = new Date();
  const profile = await loadProfile(walletAddress);
  const save = await ensureSave(walletAddress, now);
  const state = cloneState(save.state);
  const economyChanged = ensureEconomyState(state);
  const lotsChanged = refreshLots(state, now);
  const changed = economyChanged || lotsChanged;

  if (changed) {
    const saved = await saveIfChanged(walletAddress, save.version, state);
    if (saved) {
      return { profile, state: publicGameState(saved) };
    }

    // Another tab changed the row while we were refreshing. Re-read below.
    const fresh = await readSave(walletAddress);
    if (fresh) {
      return { profile, state: publicGameState(fresh.state) };
    }
  }

  return { profile, state: publicGameState(state) };
}

export async function applyGameAction(
  walletAddress: string,
  action: GameAction
): Promise<{ profile: PlayerProfile; state: PublicPlayerGameState }> {
  const profile = await loadProfile(walletAddress);

  for (let attempt = 0; attempt < MAX_MUTATION_ATTEMPTS; attempt += 1) {
    const now = new Date();
    const save = await ensureSave(walletAddress, now);
    const state = cloneState(save.state);
    const economyChanged = ensureEconomyState(state);
    const timeChanged = refreshLots(state, now);
    const actionChanged = applyAction(state, action, now);

    if (!economyChanged && !timeChanged && !actionChanged) {
      return { profile, state: publicGameState(state) };
    }

    const saved = await saveIfChanged(walletAddress, save.version, state);
    if (saved) {
      return { profile, state: publicGameState(saved) };
    }
  }

  throw new GameActionError(
    "The ledger was busy for a moment. Try that action again.",
    409
  );
}
