// web/src/lib/game/chain-sync.ts
//
// Glue between the Supabase-backed game state and the on-chain program.
//   On-chain PlayerState.balance  = THE balance.   state.balance = read-only mirror of it once linked.
//   Every balance change that is not a wallet-signed bid goes through apply_delta, exactly once,
//   using a write-ahead "pending" record + the program's strict nonce.
import { PublicKey } from "@solana/web3.js";
import type {
  PlayerGameState,
  ServerStorageLot,
} from "~/app/game/auction/types";
import { VOID_RIVAL_BID } from "~/lib/solana/stock-wars";
import {
  ChainNotReadyError,
  ChainTxError,
  ERR,
  applyDeltaOnChain,
  readLot,
  readPlayer,
  retryRevealOnChain,
  settleLotOnChain,
} from "~/lib/solana/stock-wars-server";
import { rollContentsFromRandomness } from "./generator";

export type PendingOp = {
  nonce: number;
  credit: number;
  debit: number;
  prev: PlayerGameState;
};
/** Stored at PlayerGameState.chain (optional field; no DB migration - state is a JSON column). */
export type ChainMirror = {
  linked: boolean;
  syncNonce: number;
  pending?: PendingOp;
};

/** Mapped to GameActionError(message, status) in state.ts. */
export class ChainSyncError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

export type SaveOps = {
  saveIfChanged(
    wallet: string,
    version: number,
    state: PlayerGameState
  ): Promise<PlayerGameState | null>;
  readSave(
    wallet: string
  ): Promise<{ state: PlayerGameState; version: number } | null>;
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const isLinked = (s: PlayerGameState) => s.chain?.linked === true;

function guard<T>(p: Promise<T>): Promise<T> {
  return p.catch((e) => {
    if (e instanceof ChainNotReadyError)
      throw new ChainSyncError(
        "The rollup is still syncing your account. Try again in a few seconds.",
        503
      );
    throw e;
  });
}

/** Mirror := chain. Skipped while an op is pending (its finalize step sets the balance). */
export async function reconcileBalance(
  wallet: string,
  state: PlayerGameState
): Promise<void> {
  if (!isLinked(state) || state.chain?.pending) return;
  const player = await guard(readPlayer(new PublicKey(wallet)));
  if (!player) throw new ChainSyncError("On-chain profile not found.", 409);
  state.balance = player.balance;
}

async function finalize(
  wallet: string,
  ops: SaveOps,
  nonce: number
): Promise<void> {
  const player = await guard(readPlayer(new PublicKey(wallet)));
  if (!player) throw new ChainSyncError("On-chain profile not found.", 409);
  for (let i = 0; i < 4; i += 1) {
    const row = await ops.readSave(wallet);
    if (!row) return;
    if (row.state.chain?.pending?.nonce !== nonce) return; // someone else already finalized
    const next = clone(row.state);
    next.balance = player.balance;
    next.chain = { linked: true, syncNonce: nonce };
    if (await ops.saveIfChanged(wallet, row.version, next)) return;
  }
}

async function rollback(
  wallet: string,
  ops: SaveOps,
  nonce: number
): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    const row = await ops.readSave(wallet);
    if (!row || row.state.chain?.pending?.nonce !== nonce) return;
    const prev = clone(row.state.chain.pending.prev);
    if (await ops.saveIfChanged(wallet, row.version, prev)) return;
  }
}

function describe(e: ChainTxError): string {
  if (e.code === ERR.InsufficientBalance)
    return "Not enough free coins on-chain for that.";
  return "The ledger rejected that change.";
}

/** Send (or re-send) the pending op. Same nonce => at-most-once. Finalizes or rolls back. */
async function drive(
  wallet: string,
  ops: SaveOps,
  op: PendingOp
): Promise<void> {
  const pk = new PublicKey(wallet);
  const player = await guard(readPlayer(pk));
  if (player && player.syncNonce >= op.nonce)
    return finalize(wallet, ops, op.nonce); // already applied
  try {
    await applyDeltaOnChain(
      pk,
      op.nonce,
      op.credit,
      op.debit,
      player?.layer
    );
  } catch (e) {
    if (e instanceof ChainTxError) {
      if (e.code === ERR.BadSyncNonce) return finalize(wallet, ops, op.nonce); // raced: it landed
      if (e.definite) {
        await rollback(wallet, ops, op.nonce);
        throw new ChainSyncError(describe(e));
      }
      throw new ChainSyncError(
        "Syncing with the ledger. Try again in a moment.",
        409
      ); // outcome unknown: keep pending
    }
    throw e;
  }
  return finalize(wallet, ops, op.nonce);
}

/** Call at the start of every request. Returns true if it changed the row (caller should re-read). */
export async function resolvePending(
  wallet: string,
  state: PlayerGameState,
  ops: SaveOps
): Promise<boolean> {
  const op = state.chain?.pending;
  if (!op) return false;
  await drive(wallet, ops, op);
  return true;
}

/**
 * Replace the plain saveIfChanged for linked wallets whose action moved coins off-chain
 * (sell, buy-good, sell-good, anything else that changes state.balance).
 * `before` = state right before applyAction; `next` = after. Returns null on CAS loss (caller retries,
 * nothing has been sent in that case).
 */
export async function saveWithChain(args: {
  wallet: string;
  version: number;
  before: PlayerGameState;
  next: PlayerGameState;
  ops: SaveOps;
}): Promise<PlayerGameState | null> {
  const { wallet, version, before, next, ops } = args;
  const delta = next.balance - before.balance;
  if (!isLinked(next) || delta === 0) {
    next.balance = before.balance; // linked wallets: balance is never changed except via apply_delta
    return ops.saveIfChanged(wallet, version, next);
  }
  const op: PendingOp = {
    nonce: (before.chain?.syncNonce ?? 0) + 1,
    credit: Math.max(delta, 0),
    debit: Math.max(-delta, 0),
    prev: before,
  };
  return executeOp(wallet, version, before, next, op, ops);
}

async function executeOp(
  wallet: string,
  version: number,
  before: PlayerGameState,
  intent: PlayerGameState,
  op: PendingOp,
  ops: SaveOps
): Promise<PlayerGameState | null> {
  // 1. write-ahead intent (mirror balance deliberately NOT changed yet)
  const staged = clone(intent);
  staged.balance = before.balance;
  staged.chain = {
    linked: true,
    syncNonce: before.chain?.syncNonce ?? 0,
    pending: { ...op, prev: clone(before) },
  };
  const saved = await ops.saveIfChanged(wallet, version, staged);
  if (!saved) return null;
  // 2+3. chain tx, then finalize/rollback (throws ChainSyncError on rejection or unknown outcome)
  await drive(wallet, ops, staged.chain.pending!);
  return (await ops.readSave(wallet))?.state ?? saved;
}

/**
 * First-time link. Client has already (wallet-signed) run init_player + delegate_player.
 * Authorization: only the session wallet's own PlayerState (authority == wallet, sync_nonce == 0) can be seeded,
 * and nonce 1 can only ever be applied once, so a wallet cannot mint itself coins.
 * Bids held under the legacy off-chain model are cancelled and refunded into the seed (no LotBid exists for them).
 */
export async function linkChain(
  wallet: string,
  version: number,
  state: PlayerGameState,
  ops: SaveOps
): Promise<PlayerGameState | null> {
  if (isLinked(state) && !state.chain?.pending) return state;
  const pk = new PublicKey(wallet);
  const player = await guard(readPlayer(pk));
  if (!player || player.authority !== wallet)
    throw new ChainSyncError("Create your on-chain profile first.", 409);
  if (player.layer !== "er")
    throw new ChainSyncError("Delegate your on-chain profile first.", 409);
  const before = clone(state);
  const intent = clone(state);
  let held = 0;
  for (const lot of intent.lots) {
    if (
      (lot.status === "preview" || lot.status === "live") &&
      lot.playerBid > 0
    ) {
      held += lot.playerBid;
      lot.playerBid = 0;
      lot.isLeading = false;
      lot.currentBid = Math.max(lot.startingBid, lot.rivalBid);
    }

    // A lot won before linking has no on-chain LotBid, so VRF cannot reveal it.
    // Keep those pre-link wins on the original timer-driven reveal path.
    if (lot.status === "won" && lot.revealStatus !== "revealed") {
      lot.legacyReveal = true;
    }
  }
  if (player.syncNonce !== 0) {
    // already seeded earlier (e.g. crash after the tx): just adopt the chain balance
    intent.balance = player.balance;
    intent.chain = { linked: true, syncNonce: player.syncNonce };
    return ops.saveIfChanged(wallet, version, intent);
  }
  const op: PendingOp = {
    nonce: 1,
    credit: state.balance + held,
    debit: 0,
    prev: before,
  };
  return executeOp(wallet, version, before, intent, op, ops);
}

// ---------------------------------------------------------------- auction settlement

export type ChainLotResult = {
  won: boolean;
  pricePaid: number;
  rivalBid: number;
  voided: boolean;
};

/**
 * For ended lots with an on-chain LotBid: have the authority close it (idempotent) and read back the
 * contract's verdict. The contract derives winner+price from escrow; we only supply the rival's final bid.
 * If the escrow differs from the bid the house accepted (late/rejected raise), the bid is voided
 * (rival = VOID) => Lost + full refund. Throws (never guesses) if the chain can't be reached.
 */
export async function settleDueLots(
  wallet: string,
  state: PlayerGameState,
  now: Date
): Promise<Map<number, ChainLotResult>> {
  const out = new Map<number, ChainLotResult>();
  if (!isLinked(state)) return out;
  const pk = new PublicKey(wallet);
  for (const lot of state.lots) {
    if (lot.status !== "live" || now.getTime() < Date.parse(lot.endsAt))
      continue;
    let chainLot = await guard(readLot(pk, lot.listingNumber));
    if (!chainLot) continue; // never bid on-chain => nothing escrowed; mirror rule resolves it as lost
    if (chainLot.status === "open") {
      const rival =
        chainLot.escrow === lot.playerBid ? lot.rivalBid : VOID_RIVAL_BID;
      try {
        await settleLotOnChain(
          pk,
          lot.listingNumber,
          rival,
          chainLot.layer
        );
      } catch (e) {
        if (e instanceof ChainTxError)
          throw new ChainSyncError(
            "Settling the auction on-chain failed; try again.",
            503
          );
        throw e;
      }
      chainLot = await guard(readLot(pk, lot.listingNumber));
      if (!chainLot || chainLot.status === "open")
        throw new ChainSyncError(
          "Auction settlement is not confirmed yet.",
          503
        );
    }
    const voided = chainLot.rivalBid === VOID_RIVAL_BID;
    out.set(lot.listingNumber, {
      won: chainLot.status === "won",
      pricePaid: chainLot.pricePaid,
      rivalBid: voided ? lot.rivalBid : chainLot.rivalBid,
      voided,
    });
  }
  return out;
}

/** Before applying a linked `bid`: the wallet-signed ER tx must really be in the contract state. */
export async function verifyChainBid(
  wallet: string,
  listing: number,
  amount: number
): Promise<void> {
  const chainLot = await guard(readLot(new PublicKey(wallet), listing));
  if (!chainLot || chainLot.status !== "open" || chainLot.escrow !== amount) {
    throw new ChainSyncError(
      "Your on-chain bid is not confirmed yet. Wait a moment and retry.",
      409
    );
  }
}

// ---------------------------------------------------------------- VRF reveal

const STUCK_REVEAL_MS = 45_000;

/** Pull finished VRF results into the lot (contents rolled from verified randomness, persisted in the row). */
export async function resolveChainReveals(
  wallet: string,
  state: PlayerGameState,
  now: Date
): Promise<boolean> {
  if (!isLinked(state)) return false;
  const pk = new PublicKey(wallet);
  let changed = false;
  for (const lot of state.lots as ServerStorageLot[]) {
    if (
      lot.status !== "won" ||
      lot.revealStatus !== "pending" ||
      lot.revealReadyAt ||
      lot.legacyReveal
    )
      continue;
    const chainLot = await guard(readLot(pk, lot.listingNumber));
    if (!chainLot) continue;
    if (chainLot.reveal === "done") {
      if (!lot.revealRandom) {
        lot.revealRandom = chainLot.revealRandomHex; // persisted; chain also refuses any re-request after Done
        lot.contents = rollContentsFromRandomness(
          lot,
          chainLot.revealRandomHex,
          state.day
        );
      }
      lot.revealReadyAt = now.toISOString(); // existing refreshLots loop moves it to "revealed" + inventory
      changed = true;
    } else if (chainLot.reveal === "pending") {
      const last = Date.parse(lot.revealRequestedAt ?? "") || 0;
      if (now.getTime() - last > STUCK_REVEAL_MS) {
        try {
          await retryRevealOnChain(pk, lot.listingNumber, chainLot.layer);
        } catch {
          /* next poll retries */
        }
        lot.revealRequestedAt = now.toISOString();
        changed = true;
      }
    } else {
      lot.revealStatus = "ready"; // client never actually requested it on-chain
      changed = true;
    }
  }
  return changed;
}

/** Before applying a linked `reveal`: the wallet-signed request_reveal must really be recorded by the program. */
export async function verifyChainReveal(
  wallet: string,
  listing: number
): Promise<void> {
  const chainLot = await guard(readLot(new PublicKey(wallet), listing));
  if (!chainLot || chainLot.status !== "won" || chainLot.reveal === "none") {
    throw new ChainSyncError(
      "Your reveal request is not confirmed on-chain yet. Wait a moment and retry.",
      409
    );
  }
}
