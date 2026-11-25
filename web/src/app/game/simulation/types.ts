/**
 * Storage loot categories. These ids are shared by the auction item catalogue
 * and the dealer economy so a revealed item can always be sold as one unit of
 * its category without a translation layer.
 */
export const GOOD_IDS = [
  "electronics",
  "furniture",
  "antiques",
  "tools",
  "collectibles",
  "misc",
] as const;

export type GoodId = (typeof GOOD_IDS)[number];

export type MerchantRole =
  | "PAWNBROKER"
  | "FURNITURE_DEALER"
  | "SALVAGE_BUYER";

export type Inventory = Record<GoodId, number>;

export type StockTargets = Partial<Record<GoodId, number>>;

export interface GoodDefinition {
  id: GoodId;
  name: string;
  unit: string;
  description: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  targetMarketStock: number;
  priceElasticity: number;
}

export interface ProductionRule {
  goodId: GoodId;
  quantityPerDay: number;
}

export interface ConsumptionRule {
  goodId: GoodId;
  quantityPerDay: number;
}

export interface ConversionRule {
  inputGoodId: GoodId;
  inputPerBatch: number;
  outputGoodId: GoodId;
  outputPerBatch: number;
  maxBatchesPerDay: number;
}

export interface MerchantDefinition {
  id: string;
  name: string;
  role: MerchantRole;
  startingBalance: number;
  startingInventory: Inventory;
  production: ProductionRule | null;
  consumption: ConsumptionRule | null;
  conversion: ConversionRule | null;
  wants: StockTargets;
  reserves: StockTargets;
}

export interface MerchantState {
  id: string;
  name: string;
  role: MerchantRole;
  balance: number;
  inventory: Inventory;
  production: ProductionRule | null;
  consumption: ConsumptionRule | null;
  conversion: ConversionRule | null;
  wants: StockTargets;
  reserves: StockTargets;
}

export interface PlayerState {
  id: "player";
  name: string;
  balance: number;
  inventory: Inventory;
  stall: {
    id: string;
    name: string;
    town: string;
  };
}

export interface DemandShockEvent {
  id: string;
  type: "DEMAND_SHOCK";
  goodId: GoodId;
  label: string;
  demandMultiplier: number;
  startedAtDay: number;
  endsAtDay: number;
  remainingDays: number;
}

interface BaseLogEntry {
  id: number;
  day: number;
  timestamp: string;
}

export interface TradeLogEntry extends BaseLogEntry {
  type: "TRADE";
  buyerId: string;
  sellerId: string;
  goodId: GoodId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ProductionLogEntry extends BaseLogEntry {
  type: "PRODUCTION";
  actorId: string;
  goodId: GoodId;
  quantity: number;
  inputGoodId?: GoodId;
  inputQuantity?: number;
}

export interface ConsumptionLogEntry extends BaseLogEntry {
  type: "CONSUMPTION";
  actorId: string;
  goodId: GoodId;
  quantity: number;
}

export interface ShortageLogEntry extends BaseLogEntry {
  type: "SHORTAGE";
  actorId: string;
  goodId: GoodId;
  requested: number;
  available: number;
}

export interface EventLogEntry extends BaseLogEntry {
  type: "EVENT_STARTED" | "EVENT_ENDED";
  eventId: string;
  goodId: GoodId;
  label: string;
  demandMultiplier: number;
}

export type SimulationLogEntry =
  | TradeLogEntry
  | ProductionLogEntry
  | ConsumptionLogEntry
  | ShortageLogEntry
  | EventLogEntry;

export interface SimulationTotals {
  produced: Inventory;
  consumed: Inventory;
}

export interface SimulationState {
  day: number;
  merchants: MerchantState[];
  player: PlayerState;
  events: DemandShockEvent[];
  history: SimulationLogEntry[];
  initialMoneySupply: number;
  initialStockTotals: Inventory;
  totals: SimulationTotals;
}

/**
 * The persisted slice of the market economy. Player balance and the current
 * day deliberately live on the surrounding game state so there is only one
 * authoritative copy of each.
 */
export interface GameEconomyState {
  /** Bumped when the loot-category schema changes so old saves are rebuilt. */
  version: 2;
  playerInventory: Inventory;
  merchants: MerchantState[];
  events: DemandShockEvent[];
  history: SimulationLogEntry[];
  initialMoneySupply: number;
  initialStockTotals: Inventory;
  totals: SimulationTotals;
}

export interface WorldSnapshot {
  day: number;
  goods: GoodDefinition[];
  prices: Record<GoodId, number>;
  demandMultipliers: Record<GoodId, number>;
  marketStock: Record<GoodId, number>;
  player: PlayerState;
  merchants: MerchantState[];
  activeEvents: DemandShockEvent[];
  history: SimulationLogEntry[];
  totals: SimulationTotals;
  moneySupply: number;
  validationErrors: string[];
}
