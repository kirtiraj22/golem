import {
  GOOD_IDS,
  GoodDefinition,
  GoodId,
  Inventory,
  MerchantDefinition,
} from "./types";

/**
 * Dealer-facing loot categories. Auction items use the same ids, so every
 * revealed item is one unit of its category once it reaches a dealer.
 */
export const GOODS: Record<GoodId, GoodDefinition> = {
  electronics: {
    id: "electronics",
    name: "Electronics",
    unit: "piece",
    description: "Vintage gear, gadgets, and salvage-grade tech.",
    basePrice: 34,
    minPrice: 18,
    maxPrice: 96,
    targetMarketStock: 18,
    priceElasticity: 0.55,
  },
  furniture: {
    id: "furniture",
    name: "Furniture",
    unit: "piece",
    description: "Heavy pieces with resale value when the right buyer walks in.",
    basePrice: 30,
    minPrice: 15,
    maxPrice: 84,
    targetMarketStock: 14,
    priceElasticity: 0.55,
  },
  antiques: {
    id: "antiques",
    name: "Antiques",
    unit: "piece",
    description: "Old objects with provenance, patina, and picky buyers.",
    basePrice: 46,
    minPrice: 22,
    maxPrice: 138,
    targetMarketStock: 12,
    priceElasticity: 0.6,
  },
  tools: {
    id: "tools",
    name: "Tools",
    unit: "piece",
    description: "Workshop equipment and salvage that contractors still want.",
    basePrice: 22,
    minPrice: 11,
    maxPrice: 66,
    targetMarketStock: 20,
    priceElasticity: 0.5,
  },
  collectibles: {
    id: "collectibles",
    name: "Collectibles",
    unit: "piece",
    description: "Cards, comics, records, and display pieces for dedicated collectors.",
    basePrice: 38,
    minPrice: 19,
    maxPrice: 120,
    targetMarketStock: 15,
    priceElasticity: 0.6,
  },
  misc: {
    id: "misc",
    name: "Misc Valuables",
    unit: "piece",
    description: "Odds, ends, and small treasures that need the right eye.",
    basePrice: 16,
    minPrice: 8,
    maxPrice: 52,
    targetMarketStock: 24,
    priceElasticity: 0.45,
  },
};

export const GOODS_LIST: GoodDefinition[] = GOOD_IDS.map((id) => GOODS[id]);

export function createInventory(partial: Partial<Inventory> = {}): Inventory {
  return GOOD_IDS.reduce((inventory, goodId) => {
    inventory[goodId] = partial[goodId] ?? 0;
    return inventory;
  }, {} as Inventory);
}

export const PLAYER_STALL = {
  id: "copper-stall",
  name: "The Copper Stall",
  town: "Dealer Row",
};

export const PLAYER_STARTING_BALANCE = 250;

/**
 * Loot is the player's primary stock. The dealer economy starts with an empty
 * player bag; inventory arrives by winning and opening storage units.
 */
export const PLAYER_STARTING_INVENTORY = createInventory();

/**
 * Three specialist dealers. They trade with each other and with the player,
 * but the player is not expected to run a buy-low/sell-high goods loop.
 */
export const MERCHANT_DEFINITIONS: MerchantDefinition[] = [
  {
    id: "pawnbroker",
    name: "Vera the Pawnbroker",
    role: "PAWNBROKER",
    startingBalance: 900,
    startingInventory: createInventory({
      electronics: 4,
      collectibles: 2,
      misc: 2,
    }),
    production: { goodId: "electronics", quantityPerDay: 1 },
    consumption: { goodId: "collectibles", quantityPerDay: 1 },
    conversion: null,
    wants: { electronics: 6, collectibles: 4, misc: 2 },
    reserves: { electronics: 2, collectibles: 1, misc: 1 },
  },
  {
    id: "furniture-dealer",
    name: "Deke the Furniture Dealer",
    role: "FURNITURE_DEALER",
    startingBalance: 1100,
    startingInventory: createInventory({
      furniture: 4,
      antiques: 2,
      collectibles: 1,
    }),
    production: { goodId: "furniture", quantityPerDay: 1 },
    consumption: { goodId: "antiques", quantityPerDay: 1 },
    conversion: null,
    wants: { furniture: 5, antiques: 4 },
    reserves: { furniture: 2, antiques: 1 },
  },
  {
    id: "salvage-buyer",
    name: "Cora the Salvage Buyer",
    role: "SALVAGE_BUYER",
    startingBalance: 800,
    startingInventory: createInventory({ tools: 5, misc: 3, electronics: 1 }),
    production: { goodId: "tools", quantityPerDay: 1 },
    consumption: { goodId: "misc", quantityPerDay: 2 },
    conversion: null,
    wants: { tools: 6, misc: 5, electronics: 2 },
    reserves: { tools: 2, misc: 1 },
  },
];
