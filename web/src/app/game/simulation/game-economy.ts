import {
  getSnapshot,
  playerBuy,
  playerSell,
  tick,
  triggerGrainRumour,
} from "./economy";
import {
  MERCHANT_DEFINITIONS,
  PLAYER_STALL,
  PLAYER_STARTING_INVENTORY,
  createInventory,
} from "./goods";
import type {
  GameEconomyState,
  GoodId,
  Inventory,
  MerchantState,
  SimulationState,
  WorldSnapshot,
} from "./types";

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
  return accounts.reduce(
    (totals, account) => ({
      GRAIN: totals.GRAIN + account.inventory.GRAIN,
      WOOD: totals.WOOD + account.inventory.WOOD,
      TOOLS: totals.TOOLS + account.inventory.TOOLS,
    }),
    createInventory()
  );
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
      name: "Market Trader",
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

export function startGrainRumour(state: EconomyHostState): void {
  const simulation = toSimulationState(state);
  triggerGrainRumour(simulation);
  applySimulationState(state, simulation);
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
