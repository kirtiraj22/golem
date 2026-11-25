import {
  GOODS,
  GOODS_LIST,
  MERCHANT_DEFINITIONS,
  PLAYER_STALL,
  PLAYER_STARTING_BALANCE,
  PLAYER_STARTING_INVENTORY,
  createInventory,
} from "./goods";
import {
  ConsumptionLogEntry,
  DemandShockEvent,
  EventLogEntry,
  GOOD_IDS,
  GoodId,
  Inventory,
  MerchantState,
  PlayerState,
  ProductionLogEntry,
  ShortageLogEntry,
  SimulationLogEntry,
  SimulationState,
  TradeLogEntry,
  WorldSnapshot,
} from "./types";

const SIMULATION_EPOCH_MS = Date.UTC(2026, 0, 1);
const MINUTES_PER_DAY = 24 * 60;

type Account = {
  id: string;
  balance: number;
  inventory: Inventory;
};

type LogInput =
  | Omit<TradeLogEntry, "id" | "timestamp">
  | Omit<ProductionLogEntry, "id" | "timestamp">
  | Omit<ConsumptionLogEntry, "id" | "timestamp">
  | Omit<ShortageLogEntry, "id" | "timestamp">
  | Omit<EventLogEntry, "id" | "timestamp">;

export interface DemandRumourOptions {
  durationDays?: number;
  demandMultiplier?: number;
  label?: string;
}

/** @deprecated Crop-era name kept for older verification scripts. */
export type GrainRumourOptions = DemandRumourOptions;

function timestampFor(state: SimulationState, day: number): string {
  const minuteOfDay = state.history.length % MINUTES_PER_DAY;
  return new Date(
    SIMULATION_EPOCH_MS +
      ((day - 1) * MINUTES_PER_DAY + minuteOfDay) * 60 * 1000
  ).toISOString();
}

function appendLog(
  state: SimulationState,
  entry: LogInput
): SimulationLogEntry {
  const log = {
    ...entry,
    id: state.history.length + 1,
    timestamp: timestampFor(state, entry.day),
  } as SimulationLogEntry;

  state.history.push(log);
  return log;
}

function cloneInventory(inventory: Inventory): Inventory {
  return { ...inventory };
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

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    inventory: cloneInventory(player.inventory),
    stall: { ...player.stall },
  };
}

function accountsOf(state: SimulationState): Account[] {
  return [...state.merchants, state.player];
}

function calculateMoneySupply(accounts: Account[]): number {
  return accounts.reduce((total, account) => total + account.balance, 0);
}

function calculateStockTotals(accounts: Account[]): Inventory {
  const totals = createInventory();

  for (const account of accounts) {
    for (const goodId of GOOD_IDS) {
      totals[goodId] += account.inventory[goodId];
    }
  }

  return totals;
}

function findMerchant(
  state: SimulationState,
  merchantId: string
): MerchantState {
  const merchant = state.merchants.find(
    (candidate) => candidate.id === merchantId
  );
  if (!merchant) {
    throw new Error(`Unknown merchant: ${merchantId}`);
  }
  return merchant;
}

function assertValidQuantity(quantity: number, label = "Quantity"): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function sellableAmount(merchant: MerchantState, goodId: GoodId): number {
  return merchant.inventory[goodId] - (merchant.reserves[goodId] ?? 0);
}

export function getDemandMultiplier(
  state: SimulationState,
  goodId: GoodId
): number {
  return state.events.reduce((multiplier, event) => {
    if (event.remainingDays > 0 && event.goodId === goodId) {
      return multiplier * event.demandMultiplier;
    }
    return multiplier;
  }, 1);
}

export function getMarketStock(state: SimulationState, goodId: GoodId): number {
  return accountsOf(state).reduce(
    (total, account) => total + account.inventory[goodId],
    0
  );
}

export function getPrice(state: SimulationState, goodId: GoodId): number {
  const good = GOODS[goodId];
  const stock = Math.max(0, getMarketStock(state, goodId));
  const scarcityRatio = good.targetMarketStock / Math.max(1, stock);
  const rawPrice =
    good.basePrice *
    Math.pow(scarcityRatio, good.priceElasticity) *
    getDemandMultiplier(state, goodId);

  return Math.min(good.maxPrice, Math.max(good.minPrice, Math.round(rawPrice)));
}

function executeTrade(
  state: SimulationState,
  buyer: Account,
  seller: Account,
  goodId: GoodId,
  quantity: number,
  unitPrice: number
): void {
  assertValidQuantity(quantity);
  assertValidQuantity(unitPrice, "Unit price");

  if (buyer.id === seller.id) {
    throw new Error("A trade requires two different accounts.");
  }

  const totalPrice = quantity * unitPrice;

  if (buyer.balance < totalPrice) {
    throw new Error(
      `${buyer.id} cannot afford ${quantity} ${goodId} at ${unitPrice} each (needs ${totalPrice}, has ${buyer.balance}).`
    );
  }

  if (seller.inventory[goodId] < quantity) {
    throw new Error(
      `${seller.id} does not have ${quantity} ${goodId} to sell (has ${seller.inventory[goodId]}).`
    );
  }

  buyer.balance -= totalPrice;
  seller.balance += totalPrice;
  buyer.inventory[goodId] += quantity;
  seller.inventory[goodId] -= quantity;

  appendLog(state, {
    type: "TRADE",
    day: state.day,
    buyerId: buyer.id,
    sellerId: seller.id,
    goodId,
    quantity,
    unitPrice,
    totalPrice,
  });
}

function runProduction(state: SimulationState): void {
  for (const merchant of state.merchants) {
    if (merchant.conversion) {
      const rule = merchant.conversion;
      const availableInput = merchant.inventory[rule.inputGoodId];
      const batches = Math.min(
        rule.maxBatchesPerDay,
        Math.floor(availableInput / rule.inputPerBatch)
      );

      if (batches > 0) {
        const inputQuantity = batches * rule.inputPerBatch;
        const outputQuantity = batches * rule.outputPerBatch;

        merchant.inventory[rule.inputGoodId] -= inputQuantity;
        merchant.inventory[rule.outputGoodId] += outputQuantity;
        state.totals.consumed[rule.inputGoodId] += inputQuantity;
        state.totals.produced[rule.outputGoodId] += outputQuantity;

        appendLog(state, {
          type: "PRODUCTION",
          day: state.day,
          actorId: merchant.id,
          goodId: rule.outputGoodId,
          quantity: outputQuantity,
          inputGoodId: rule.inputGoodId,
          inputQuantity,
        });
      }
    }

    if (merchant.production) {
      const rule = merchant.production;
      merchant.inventory[rule.goodId] += rule.quantityPerDay;
      state.totals.produced[rule.goodId] += rule.quantityPerDay;

      appendLog(state, {
        type: "PRODUCTION",
        day: state.day,
        actorId: merchant.id,
        goodId: rule.goodId,
        quantity: rule.quantityPerDay,
      });
    }
  }
}

function runNpcPurchases(state: SimulationState): void {
  for (const buyer of state.merchants) {
    for (const goodId of GOOD_IDS) {
      let remainingNeed = (buyer.wants[goodId] ?? 0) - buyer.inventory[goodId];

      if (remainingNeed <= 0) {
        continue;
      }

      for (const seller of state.merchants) {
        if (seller.id === buyer.id) {
          continue;
        }

        const available = sellableAmount(seller, goodId);
        if (available <= 0) {
          continue;
        }

        const unitPrice = getPrice(state, goodId);
        const affordable = Math.floor(buyer.balance / unitPrice);
        const quantity = Math.min(remainingNeed, available, affordable);

        if (quantity <= 0) {
          continue;
        }

        executeTrade(state, buyer, seller, goodId, quantity, unitPrice);
        remainingNeed -= quantity;

        if (remainingNeed <= 0) {
          break;
        }
      }
    }
  }
}

function runConsumption(state: SimulationState): void {
  for (const merchant of state.merchants) {
    if (!merchant.consumption) {
      continue;
    }

    const rule = merchant.consumption;
    const available = merchant.inventory[rule.goodId];
    const consumed = Math.min(rule.quantityPerDay, available);

    if (consumed > 0) {
      merchant.inventory[rule.goodId] -= consumed;
      state.totals.consumed[rule.goodId] += consumed;

      appendLog(state, {
        type: "CONSUMPTION",
        day: state.day,
        actorId: merchant.id,
        goodId: rule.goodId,
        quantity: consumed,
      });
    }

    if (consumed < rule.quantityPerDay) {
      appendLog(state, {
        type: "SHORTAGE",
        day: state.day,
        actorId: merchant.id,
        goodId: rule.goodId,
        requested: rule.quantityPerDay,
        available,
      });
    }
  }
}

function ageEvents(state: SimulationState): void {
  for (const event of state.events) {
    if (event.remainingDays <= 0) {
      continue;
    }

    event.remainingDays -= 1;

    if (event.remainingDays === 0) {
      appendLog(state, {
        type: "EVENT_ENDED",
        day: state.day,
        eventId: event.id,
        goodId: event.goodId,
        label: event.label,
        demandMultiplier: event.demandMultiplier,
      });
    }
  }
}

export function createInitialWorld(): SimulationState {
  const merchants: MerchantState[] = MERCHANT_DEFINITIONS.map((definition) => ({
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

  const player: PlayerState = {
    id: "player",
    name: "Storage Scavenger",
    balance: PLAYER_STARTING_BALANCE,
    inventory: createInventory(PLAYER_STARTING_INVENTORY),
    stall: { ...PLAYER_STALL },
  };

  const accounts = [...merchants, player];

  const state: SimulationState = {
    day: 0,
    merchants,
    player,
    events: [],
    history: [],
    initialMoneySupply: calculateMoneySupply(accounts),
    initialStockTotals: calculateStockTotals(accounts),
    totals: {
      produced: createInventory(),
      consumed: createInventory(),
    },
  };

  assertValidState(state);
  return state;
}

/**
 * Advance the market by one simulated day. A tick runs production,
 * autonomous NPC purchasing, consumption, and event aging.
 */
export function tick(state: SimulationState): WorldSnapshot {
  assertValidState(state);

  state.day += 1;
  runProduction(state);
  runNpcPurchases(state);
  runConsumption(state);
  ageEvents(state);

  assertValidState(state);
  return getSnapshot(state);
}

export function fastForwardDays(
  state: SimulationState,
  days: number
): WorldSnapshot {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("Fast-forward days must be a positive integer.");
  }

  let snapshot = getSnapshot(state);
  for (let day = 0; day < days; day += 1) {
    snapshot = tick(state);
  }
  return snapshot;
}

export function fastForwardSevenDays(state: SimulationState): WorldSnapshot {
  return fastForwardDays(state, 7);
}

export function triggerDemandEvent(
  state: SimulationState,
  goodId: GoodId,
  options: DemandRumourOptions = {}
): DemandShockEvent {
  const good = GOODS[goodId];

  if (!good) {
    throw new Error(`Unknown loot category: ${String(goodId)}`);
  }

  const durationDays = options.durationDays ?? 2;
  const demandMultiplier = options.demandMultiplier ?? 1.75;

  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    throw new Error(
      "Demand event duration must be a positive integer number of days."
    );
  }

  if (
    !Number.isFinite(demandMultiplier) ||
    demandMultiplier <= 0 ||
    demandMultiplier === 1
  ) {
    throw new Error("Demand multiplier must be positive and different from 1.");
  }

  const event: DemandShockEvent = {
    id: `loot-demand-${goodId}-${state.events.length + 1}`,
    type: "DEMAND_SHOCK",
    goodId,
    label:
      options.label ??
      `Rumour: dealers are chasing ${good.name.toLowerCase()} after a storage-unit tip.`,
    demandMultiplier,
    startedAtDay: state.day,
    endsAtDay: state.day + durationDays,
    remainingDays: durationDays,
  };

  state.events.push(event);

  appendLog(state, {
    type: "EVENT_STARTED",
    day: state.day,
    eventId: event.id,
    goodId: event.goodId,
    label: event.label,
    demandMultiplier: event.demandMultiplier,
  });

  assertValidState(state);
  return event;
}

export function triggerLootRumour(
  state: SimulationState,
  goodId: GoodId,
  options: DemandRumourOptions = {}
): DemandShockEvent {
  const good = GOODS[goodId];

  if (!good) {
    throw new Error(`Unknown loot category: ${String(goodId)}`);
  }

  const activeRumour = state.events.find(
    (event) => event.goodId === goodId && event.remainingDays > 0
  );

  if (activeRumour) {
    throw new Error(
      `A ${good.name.toLowerCase()} demand rumour is already active (${activeRumour.id}).`
    );
  }

  return triggerDemandEvent(state, goodId, options);
}

/**
 * @deprecated Crop-era compatibility shim. New code should call
 * triggerLootRumour(state, goodId). Kept so older scripts do not need to be
 * rewritten before they are retired.
 */
export function triggerGrainRumour(
  state: SimulationState,
  options: GrainRumourOptions = {}
): DemandShockEvent {
  return triggerLootRumour(state, "collectibles", options);
}

export function playerBuy(
  state: SimulationState,
  goodId: GoodId,
  quantity: number,
  sellerId?: string
): WorldSnapshot {
  if (!GOODS[goodId]) {
    throw new Error(`Unknown good: ${String(goodId)}`);
  }
  assertValidQuantity(quantity);

  let seller: MerchantState;

  if (sellerId) {
    seller = findMerchant(state, sellerId);
    const available = sellableAmount(seller, goodId);
    if (available < quantity) {
      throw new Error(
        `${seller.name} only has ${Math.max(
          0,
          available
        )} ${goodId} available for sale.`
      );
    }
  } else {
    const candidate = state.merchants.find(
      (merchant) => sellableAmount(merchant, goodId) >= quantity
    );

    if (!candidate) {
      throw new Error(
        `No merchant has ${quantity} ${goodId} available for sale.`
      );
    }

    seller = candidate;
  }

  const unitPrice = getPrice(state, goodId);
  const totalPrice = quantity * unitPrice;

  if (state.player.balance < totalPrice) {
    throw new Error(
      `Player cannot afford ${quantity} ${goodId} at ${unitPrice} each (needs ${totalPrice}, has ${state.player.balance}).`
    );
  }

  executeTrade(state, state.player, seller, goodId, quantity, unitPrice);
  assertValidState(state);
  return getSnapshot(state);
}

export function playerSellAtPrice(
  state: SimulationState,
  goodId: GoodId,
  quantity: number,
  unitPrice: number,
  buyerId?: string
): WorldSnapshot {
  if (!GOODS[goodId]) {
    throw new Error(`Unknown good: ${String(goodId)}`);
  }
  assertValidQuantity(quantity);
  assertValidQuantity(unitPrice, "Unit price");

  if (state.player.inventory[goodId] < quantity) {
    throw new Error(
      `Player does not have ${quantity} ${goodId} to sell (has ${state.player.inventory[goodId]}).`
    );
  }

  const totalPrice = quantity * unitPrice;
  let buyer: MerchantState;

  if (buyerId) {
    buyer = findMerchant(state, buyerId);
    const need = (buyer.wants[goodId] ?? 0) - buyer.inventory[goodId];

    if (need < quantity) {
      throw new Error(
        `${buyer.name} only wants ${Math.max(0, need)} more ${goodId}.`
      );
    }

    if (buyer.balance < totalPrice) {
      throw new Error(
        `${buyer.name} cannot afford ${quantity} ${goodId} at ${unitPrice} each.`
      );
    }
  } else {
    const candidate = state.merchants.find((merchant) => {
      const need = (merchant.wants[goodId] ?? 0) - merchant.inventory[goodId];
      return need >= quantity && merchant.balance >= totalPrice;
    });

    if (!candidate) {
      throw new Error(
        `No merchant wants ${quantity} ${goodId} at the current offer of ${unitPrice}.`
      );
    }

    buyer = candidate;
  }

  executeTrade(state, buyer, state.player, goodId, quantity, unitPrice);
  assertValidState(state);
  return getSnapshot(state);
}

export function playerSell(
  state: SimulationState,
  goodId: GoodId,
  quantity: number,
  buyerId?: string
): WorldSnapshot {
  return playerSellAtPrice(
    state,
    goodId,
    quantity,
    getPrice(state, goodId),
    buyerId
  );
}

export function validateState(state: SimulationState): string[] {
  const errors: string[] = [];
  const accounts = accountsOf(state);
  const knownActorIds = new Set(accounts.map((account) => account.id));

  if (!Number.isInteger(state.day) || state.day < 0) {
    errors.push("Simulation day must be a non-negative integer.");
  }

  for (const account of accounts) {
    if (!Number.isInteger(account.balance) || account.balance < 0) {
      errors.push(`${account.id} has an invalid balance: ${account.balance}.`);
    }

    for (const goodId of GOOD_IDS) {
      const quantity = account.inventory[goodId];
      if (!Number.isInteger(quantity) || quantity < 0) {
        errors.push(
          `${account.id} has an invalid ${goodId} inventory: ${quantity}.`
        );
      }
    }
  }

  const moneySupply = calculateMoneySupply(accounts);
  if (moneySupply !== state.initialMoneySupply) {
    errors.push(
      `Money supply changed from ${state.initialMoneySupply} to ${moneySupply}.`
    );
  }

  const stockTotals = calculateStockTotals(accounts);
  for (const goodId of GOOD_IDS) {
    const expected =
      state.initialStockTotals[goodId] +
      state.totals.produced[goodId] -
      state.totals.consumed[goodId];

    if (stockTotals[goodId] !== expected) {
      errors.push(
        `${goodId} stock is ${stockTotals[goodId]}, expected ${expected} from production and consumption.`
      );
    }
  }

  const producedFromLogs = createInventory();
  const consumedFromLogs = createInventory();
  const logIds = new Set<number>();

  for (const entry of state.history) {
    if (logIds.has(entry.id)) {
      errors.push(`Duplicate history entry id: ${entry.id}.`);
    }
    logIds.add(entry.id);

    if (!Number.isInteger(entry.day) || entry.day < 0) {
      errors.push(`History entry ${entry.id} has an invalid day.`);
    }

    if (entry.type === "TRADE") {
      if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
        errors.push(`Trade ${entry.id} has an invalid quantity.`);
      }
      if (!Number.isInteger(entry.unitPrice) || entry.unitPrice <= 0) {
        errors.push(`Trade ${entry.id} has an invalid unit price.`);
      }
      if (entry.totalPrice !== entry.quantity * entry.unitPrice) {
        errors.push(`Trade ${entry.id} has an inconsistent total price.`);
      }
      if (entry.buyerId === entry.sellerId) {
        errors.push(`Trade ${entry.id} has the same buyer and seller.`);
      }
      if (
        !knownActorIds.has(entry.buyerId) ||
        !knownActorIds.has(entry.sellerId)
      ) {
        errors.push(`Trade ${entry.id} references an unknown account.`);
      }
    }

    if (entry.type === "PRODUCTION") {
      if (!knownActorIds.has(entry.actorId)) {
        errors.push(`Production ${entry.id} references an unknown account.`);
      }
      if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
        errors.push(`Production ${entry.id} has an invalid quantity.`);
      }

      producedFromLogs[entry.goodId] += entry.quantity;

      if (entry.inputGoodId !== undefined) {
        if (
          entry.inputQuantity === undefined ||
          !Number.isInteger(entry.inputQuantity) ||
          entry.inputQuantity <= 0
        ) {
          errors.push(`Production ${entry.id} has an invalid input quantity.`);
        } else {
          consumedFromLogs[entry.inputGoodId] += entry.inputQuantity;
        }
      }
    }

    if (entry.type === "CONSUMPTION") {
      if (!knownActorIds.has(entry.actorId)) {
        errors.push(`Consumption ${entry.id} references an unknown account.`);
      }
      if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
        errors.push(`Consumption ${entry.id} has an invalid quantity.`);
      }
      consumedFromLogs[entry.goodId] += entry.quantity;
    }

    if (entry.type === "EVENT_STARTED" || entry.type === "EVENT_ENDED") {
      if (
        !Number.isFinite(entry.demandMultiplier) ||
        entry.demandMultiplier <= 0
      ) {
        errors.push(`Event log ${entry.id} has an invalid demand multiplier.`);
      }
    }
  }

  for (const goodId of GOOD_IDS) {
    if (producedFromLogs[goodId] !== state.totals.produced[goodId]) {
      errors.push(
        `${goodId} produced total does not match production history.`
      );
    }
    if (consumedFromLogs[goodId] !== state.totals.consumed[goodId]) {
      errors.push(
        `${goodId} consumed total does not match consumption history.`
      );
    }
  }

  for (const event of state.events) {
    if (
      !Number.isInteger(event.remainingDays) ||
      event.remainingDays < 0 ||
      event.remainingDays > event.endsAtDay - event.startedAtDay
    ) {
      errors.push(`Event ${event.id} has an invalid remaining duration.`);
    }
    if (
      !Number.isFinite(event.demandMultiplier) ||
      event.demandMultiplier <= 0
    ) {
      errors.push(`Event ${event.id} has an invalid demand multiplier.`);
    }
  }

  return errors;
}

export function assertValidState(state: SimulationState): void {
  const errors = validateState(state);
  if (errors.length > 0) {
    throw new Error(`Invalid simulation state:\n- ${errors.join("\n- ")}`);
  }
}

export function getSnapshot(state: SimulationState): WorldSnapshot {
  const prices = {} as Record<GoodId, number>;
  const demandMultipliers = {} as Record<GoodId, number>;
  const marketStock = {} as Record<GoodId, number>;

  for (const goodId of GOOD_IDS) {
    prices[goodId] = getPrice(state, goodId);
    demandMultipliers[goodId] = getDemandMultiplier(state, goodId);
    marketStock[goodId] = getMarketStock(state, goodId);
  }

  return {
    day: state.day,
    goods: GOODS_LIST.map((good) => ({ ...good })),
    prices,
    demandMultipliers,
    marketStock,
    player: clonePlayer(state.player),
    merchants: state.merchants.map(cloneMerchant),
    activeEvents: state.events
      .filter((event) => event.remainingDays > 0)
      .map((event) => ({ ...event })),
    history: state.history.map((entry) => ({ ...entry })),
    totals: {
      produced: cloneInventory(state.totals.produced),
      consumed: cloneInventory(state.totals.consumed),
    },
    moneySupply: calculateMoneySupply(accountsOf(state)),
    validationErrors: validateState(state),
  };
}
