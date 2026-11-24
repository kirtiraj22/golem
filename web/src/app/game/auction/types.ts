import type { GameEconomyState, GoodId } from "../simulation/types";

export const ITEM_CATEGORIES = [
  "electronics",
  "collectibles",
  "tools",
  "furniture",
  "fashion",
  "curios",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "legendary",
] as const;

export type ItemRarity = (typeof ITEM_RARITIES)[number];

export type ItemCondition = "mint" | "good" | "worn" | "rough";

export type ItemDefinition = {
  key: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  icon: string;
  baseValue: number;
  description: string;
};

export type InventoryItem = {
  id: string;
  definitionKey: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  icon: string;
  condition: ItemCondition;
  baseValue: number;
  acquiredDay: number;
  sourceListing: number;
};

export type StorageLotStatus = "preview" | "live" | "won" | "lost";
export type RevealStatus =
  | "locked"
  | "ready"
  | "pending"
  | "revealed"
  | "failed";

export type LotSilhouette = {
  category: ItemCategory;
  label: string;
  icon: string;
};

export type StorageLot = {
  id: string;
  listingNumber: number;
  unitNumber: string;
  facility: string;
  title: string;
  teaser: string;
  sizeLabel: string;
  status: StorageLotStatus;
  previewEndsAt: string;
  endsAt: string;
  startingBid: number;
  currentBid: number;
  playerBid: number;
  rivalBid: number;
  rivalName: string;
  isLeading: boolean;
  previewClues: string[];
  silhouettes: LotSilhouette[];
  revealStatus: RevealStatus;
  revealReadyAt?: string;
  revealError?: string;
  contents?: InventoryItem[];
  paidPrice?: number;
  refundedAmount?: number;
  resolvedAt?: string;
  wonBy?: "player" | "rival";
};

export type ServerStorageLot = StorageLot & {
  /** Never exposed before the vault is revealed. */
  contents: InventoryItem[];
  rivalCeiling: number;
  rivalNextBidAt: string;
  contentsClaimed: boolean;
};

export type GameHistoryEntry = {
  id: string;
  day: number;
  at: string;
  type: "BID" | "WIN" | "LOSS" | "REVEAL" | "SALE" | "DAY";
  message: string;
  amount?: number;
};

export type MarketHeadline = {
  id: string;
  day: number;
  category: ItemCategory;
  text: string;
  changePct: number;
};

export type GameMarket = {
  refreshedDay: number;
  multipliers: Record<ItemCategory, number>;
  headlines: MarketHeadline[];
};

export type PlayerGameState = {
  version: 1;
  balance: number;
  day: number;
  reputation: number;
  lots: ServerStorageLot[];
  inventory: InventoryItem[];
  history: GameHistoryEntry[];
  market: GameMarket;
  economy: GameEconomyState;
  nextListingNumber: number;
  createdAt: string;
};

export type PublicPlayerGameState = Omit<PlayerGameState, "lots"> & {
  lots: StorageLot[];
};

export type GameStateResponse = {
  profile: {
    walletAddress: string;
    username: string;
  };
  state: PublicPlayerGameState;
  serverNow: number;
};

export type GameAction =
  | { action: "refresh" }
  | { action: "bid"; lotId: string; amount: number }
  | { action: "reveal"; lotId: string }
  | { action: "sell"; itemId: string }
  | { action: "advance-day"; expectedDay?: number }
  | { action: "fast-forward-week"; expectedDay?: number }
  | { action: "start-rumour" }
  | {
      action: "buy-good";
      goodId: GoodId;
      quantity: number;
      sellerId?: string;
    }
  | {
      action: "sell-good";
      goodId: GoodId;
      quantity: number;
      buyerId?: string;
    };

export const CONDITION_MULTIPLIERS: Record<ItemCondition, number> = {
  mint: 1.35,
  good: 1.1,
  worn: 0.8,
  rough: 0.55,
};

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#5d5446",
  uncommon: "#346b3e",
  rare: "#1f5f91",
  legendary: "#8a4b12",
};

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  electronics: "Electronics",
  collectibles: "Collectibles",
  tools: "Tools",
  furniture: "Furniture",
  fashion: "Fashion",
  curios: "Curios",
};

export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  electronics: "▣",
  collectibles: "◆",
  tools: "⚒",
  furniture: "▤",
  fashion: "✦",
  curios: "◈",
};

export function saleValue(
  item: InventoryItem,
  multipliers: Record<ItemCategory, number>
): number {
  const condition = CONDITION_MULTIPLIERS[item.condition];
  const market = multipliers[item.category] ?? 1;
  return Math.max(1, Math.round(item.baseValue * condition * market));
}

export function itemConditionLabel(condition: ItemCondition): string {
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}
