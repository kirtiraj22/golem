import {
  getPrice,
  getSnapshot,
  playerBuy,
  playerSell,
  playerSellAtPrice,
  tick,
  triggerDemandEvent,
  triggerLootRumour,
} from "./economy";
import {
  GOODS,
  MERCHANT_DEFINITIONS,
  PLAYER_STALL,
  PLAYER_STARTING_INVENTORY,
  createInventory,
} from "./goods";
import { GOOD_IDS } from "./types";
import type {
  GameEconomyState,
  GoodId,
  Inventory,
  MerchantState,
  SimulationState,
  WorldSnapshot,
} from "./types";
import { lootSaleValue, type ItemCondition } from "../auction/types";

/**
 * Minimal shape shared by the persisted player state and this bridge. Keeping
 * balance and day on the outside means there is exactly one authoritative
 * copy of each, while the reusable simulation still receives a normal
 * SimulationState when it runs.
 */
export type EconomyHostState = {
  day: number;
  balance: number;
  economy?: GameEconomyState | null;
};

function cloneInventory(inventory: Partial<Inventory> | undefined): Inventory {
  return createInventory(inventory ?? {});
}

function cloneMerchant(merchant: MerchantState): MerchantState {
  return {
    ...merchant,
    inventory: cloneInventory(merchant.inventory),
    production: merchant.production ? { ...merchant.production } : null,
    consumption: merchant.consumption ? { ...merchant.consumption } : null,
    conversion: merchant.conversion ? { ...merchant.conversion } : null,
    wants: { ...merchant.wants },
    reserves: { ...merchant.reserves },
  };
}

function cloneMerchants(merchants: MerchantState[]): MerchantState[] {
  return merchants.map(cloneMerchant);
}

function totalInventory(accounts: Array<{ inventory: Inventory }>): Inventory {
  const totals = createInventory();

  for (const account of accounts) {
    for (const goodId of GOOD_IDS) {
      totals[goodId] += account.inventory[goodId];
    }
  }

  return totals;
}

function merchantDefinitions(): MerchantState[] {
  return MERCHANT_DEFINITIONS.map((definition) => ({
    id: definition.id,
    name: definition.name,
    role: definition.role,
    balance: definition.startingBalance,
    inventory: createInventory(definition.startingInventory),
    production: definition.production ? { ...definition.production } : null,
    consumption: definition.consumption ? { ...definition.consumption } : null,
    conversion: definition.conversion ? { ...definition.conversion } : null,
    wants: { ...definition.wants },
    reserves: { ...definition.reserves },
  }));
}

export function createInitialEconomy(
  playerBalance: number,
  playerInventory: Partial<Inventory> = PLAYER_STARTING_INVENTORY
): GameEconomyState {
  const merchants = merchantDefinitions();
  const inventory = createInventory(playerInventory);
  const accounts = [...merchants, { inventory }];

  return {
    version: 2,
    playerInventory: inventory,
    merchants,
    events: [],
    history: [],
    initialMoneySupply:
      playerBalance +
      merchants.reduce((total, merchant) => total + merchant.balance, 0),
    initialStockTotals: totalInventory(accounts),
    totals: {
      produced: createInventory(),
      consumed: createInventory(),
    },
  };
}

function isCompleteEconomy(
  economy: GameEconomyState | null | undefined
): economy is GameEconomyState {
  return Boolean(
    economy &&
      economy.version === 2 &&
      Array.isArray(economy.merchants) &&
      economy.merchants.length > 0 &&
      economy.playerInventory &&
      Array.isArray(economy.events) &&
      Array.isArray(economy.history) &&
      economy.totals &&
      economy.totals.produced &&
      economy.totals.consumed &&
      economy.initialStockTotals &&
      Number.isFinite(economy.initialMoneySupply)
  );
}

/**
 * Existing saves predate the market economy. Fill in a complete economy once,
 * using the player's current balance as the opening money supply so the
 * persisted ledger stays internally consistent.
 */
export function ensureEconomyState(state: EconomyHostState): boolean {
  if (isCompleteEconomy(state.economy)) {
    return false;
  }

  state.economy = createInitialEconomy(state.balance);
  return true;
}

function toSimulationState(state: EconomyHostState): SimulationState {
  const economy = isCompleteEconomy(state.economy)
    ? state.economy
    : createInitialEconomy(state.balance);
  const merchants = cloneMerchants(economy.merchants);

  return {
    day: state.day,
    merchants,
    player: {
      id: "player",
      name: "Storage Scavenger",
      balance: state.balance,
      inventory: cloneInventory(economy.playerInventory),
      stall: { ...PLAYER_STALL },
    },
    events: economy.events.map((event) => ({ ...event })),
    history: economy.history.map((entry) => ({ ...entry })),
    // Auction income and spending legitimately move coins in and out of the
    // market loop. Re-baseline before every operation so the simulation's
    // conservation checks apply to the trade being performed, not to the
    // whole auction ledger.
    initialMoneySupply:
      state.balance +
      merchants.reduce((total, merchant) => total + merchant.balance, 0),
    initialStockTotals: cloneInventory(economy.initialStockTotals),
    totals: {
      produced: cloneInventory(economy.totals.produced),
      consumed: cloneInventory(economy.totals.consumed),
    },
  };
}

function applySimulationState(
  state: EconomyHostState,
  simulation: SimulationState
): void {
  state.day = simulation.day;
  state.balance = simulation.player.balance;
  state.economy = {
    version: 2,
    playerInventory: cloneInventory(simulation.player.inventory),
    merchants: cloneMerchants(simulation.merchants),
    events: simulation.events.map((event) => ({ ...event })),
    history: simulation.history.map((entry) => ({ ...entry })),
    initialMoneySupply: simulation.initialMoneySupply,
    initialStockTotals: cloneInventory(simulation.initialStockTotals),
    totals: {
      produced: cloneInventory(simulation.totals.produced),
      consumed: cloneInventory(simulation.totals.consumed),
    },
  };
}

export function advanceEconomyDay(state: EconomyHostState): void {
  const simulation = toSimulationState(state);
  tick(simulation);
  applySimulationState(state, simulation);
}

export function advanceEconomyDays(
  state: EconomyHostState,
  days: number
): void {
  const simulation = toSimulationState(state);

  for (let index = 0; index < days; index += 1) {
    tick(simulation);
  }

  applySimulationState(state, simulation);
}

export type MarketHeadlineInput = {
  goodId: GoodId;
  label: string;
  changePct: number;
};

/**
 * Turn fresh town headlines into short demand events. This keeps the printed
 * news and the dealer prices tied to the same economy instead of running two
 * unrelated market systems.
 */
export function applyMarketHeadlines(
  state: EconomyHostState,
  headlines: MarketHeadlineInput[]
): void {
  if (headlines.length === 0) {
    return;
  }

  const simulation = toSimulationState(state);
  let changed = false;

  for (const headline of headlines) {
    if (!headline.changePct) {
      continue;
    }

    const demandMultiplier = Math.max(
      0.6,
      Math.min(1.8, 1 + headline.changePct / 100)
    );

    if (demandMultiplier === 1) {
      continue;
    }

    triggerDemandEvent(simulation, headline.goodId, {
      durationDays: 2,
      demandMultiplier,
      label: headline.label,
    });
    changed = true;
  }

  if (changed) {
    applySimulationState(state, simulation);
  }
}

export function startLootRumour(
  state: EconomyHostState,
  goodId: GoodId
): void {
  const simulation = toSimulationState(state);
  triggerLootRumour(simulation, goodId);
  applySimulationState(state, simulation);
}

/**
 * @deprecated Crop-era bridge kept for compatibility with older scripts.
 * Use startLootRumour(state, goodId).
 */
export function startGrainRumour(state: EconomyHostState): void {
  startLootRumour(state, "collectibles");
}

export type LootSaleResult = {
  price: number;
  buyerId: string;
  buyerName: string;
};

/**
 * Sell one revealed loot item to a specialist dealer. The item is converted
 * into one category unit, sold through the normal playerSellAtPrice validation,
 * and then removed from the haul by the caller.
 */
export function sellLootItem(
  state: EconomyHostState,
  goodId: GoodId,
  baseValue: number,
  condition: ItemCondition,
  buyerId?: string
): LootSaleResult {
  const good = GOODS[goodId];

  if (!good) {
    throw new Error(`Unknown loot category: ${String(goodId)}`);
  }

  const simulation = toSimulationState(state);
  const unitPrice = lootSaleValue(
    { baseValue, condition },
    getPrice(simulation, goodId),
    good.basePrice
  );

  // Loot enters the market from outside the dealer loop. Increasing the
  // opening stock total by the same amount keeps the simulation conservation
  // checks honest while the player's temporary unit is sold immediately.
  simulation.player.inventory[goodId] += 1;
  simulation.initialStockTotals[goodId] += 1;

  playerSellAtPrice(simulation, goodId, 1, unitPrice, buyerId);

  const trade = [...simulation.history]
    .reverse()
    .find(
      (entry) => entry.type === "TRADE" && entry.sellerId === "player"
    );

  if (!trade || trade.type !== "TRADE") {
    throw new Error("The dealer trade was not recorded.");
  }

  const buyer = simulation.merchants.find(
    (merchant) => merchant.id === trade.buyerId
  );

  applySimulationState(state, simulation);

  return {
    price: trade.totalPrice,
    buyerId: trade.buyerId,
    buyerName: buyer?.name ?? trade.buyerId,
  };
}

export function buyGood(
  state: EconomyHostState,
  goodId: GoodId,
  quantity: number,
  sellerId?: string
): void {
  const simulation = toSimulationState(state);
  playerBuy(simulation, goodId, quantity, sellerId);
  applySimulationState(state, simulation);
}

export function sellGood(
  state: EconomyHostState,
  goodId: GoodId,
  quantity: number,
  buyerId?: string
): void {
  const simulation = toSimulationState(state);
  playerSell(simulation, goodId, quantity, buyerId);
  applySimulationState(state, simulation);
}

export function getEconomySnapshot(state: EconomyHostState): WorldSnapshot {
  return getSnapshot(toSimulationState(state));
}
