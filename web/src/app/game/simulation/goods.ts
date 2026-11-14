import {
  GOOD_IDS,
  GoodDefinition,
  GoodId,
  Inventory,
  MerchantDefinition,
} from "./types";

export const GOODS: Record<GoodId, GoodDefinition> = {
  GRAIN: {
    id: "GRAIN",
    name: "Grain",
    unit: "sack",
    description: "Staple food grown by the farmer.",
    basePrice: 9,
    minPrice: 5,
    maxPrice: 27,
    targetMarketStock: 30,
    priceElasticity: 0.6,
  },
  WOOD: {
    id: "WOOD",
    name: "Wood",
    unit: "log",
    description: "Timber cut by the lumberjack and used by the blacksmith.",
    basePrice: 8,
    minPrice: 4,
    maxPrice: 24,
    targetMarketStock: 20,
    priceElasticity: 0.6,
  },
  TOOLS: {
    id: "TOOLS",
    name: "Tools",
    unit: "tool",
    description: "Smithing work used by the farmer to keep the fields running.",
    basePrice: 26,
    minPrice: 13,
    maxPrice: 78,
    targetMarketStock: 14,
    priceElasticity: 0.6,
  },
};

export const GOODS_LIST: GoodDefinition[] = GOOD_IDS.map((id) => GOODS[id]);

export function createInventory(partial: Partial<Inventory> = {}): Inventory {
  return {
    GRAIN: partial.GRAIN ?? 0,
    WOOD: partial.WOOD ?? 0,
    TOOLS: partial.TOOLS ?? 0,
  };
}

export const PLAYER_STALL = {
  id: "copper-stall",
  name: "The Copper Stall",
  town: "Market Row",
};

export const PLAYER_STARTING_BALANCE = 250;

export const PLAYER_STARTING_INVENTORY = createInventory({
  GRAIN: 6,
  WOOD: 4,
  TOOLS: 3,
});

/**
 * A small, closed loop of supply and demand:
 * - Farmer makes grain and burns through tools.
 * - Lumberjack makes wood and eats grain.
 * - Blacksmith turns wood into tools and eats grain.
 */
export const MERCHANT_DEFINITIONS: MerchantDefinition[] = [
  {
    id: "farmer",
    name: "Aster the Farmer",
    role: "FARMER",
    startingBalance: 90,
    startingInventory: createInventory({ GRAIN: 15, TOOLS: 2 }),
    production: { goodId: "GRAIN", quantityPerDay: 6 },
    consumption: { goodId: "TOOLS", quantityPerDay: 2 },
    conversion: null,
    wants: { TOOLS: 4 },
    reserves: { GRAIN: 6, TOOLS: 4 },
  },
  {
    id: "lumberjack",
    name: "Bram the Lumberjack",
    role: "LUMBERJACK",
    startingBalance: 90,
    startingInventory: createInventory({ GRAIN: 3, WOOD: 10 }),
    production: { goodId: "WOOD", quantityPerDay: 2 },
    consumption: { goodId: "GRAIN", quantityPerDay: 2 },
    conversion: null,
    wants: { GRAIN: 6 },
    reserves: { WOOD: 6, GRAIN: 6 },
  },
  {
    id: "blacksmith",
    name: "Cora the Blacksmith",
    role: "BLACKSMITH",
    startingBalance: 130,
    startingInventory: createInventory({ GRAIN: 4, WOOD: 6, TOOLS: 9 }),
    production: null,
    consumption: { goodId: "GRAIN", quantityPerDay: 4 },
    conversion: {
      inputGoodId: "WOOD",
      inputPerBatch: 2,
      outputGoodId: "TOOLS",
      outputPerBatch: 2,
      maxBatchesPerDay: 1,
    },
    wants: { GRAIN: 6, WOOD: 6 },
    reserves: { GRAIN: 6, WOOD: 6, TOOLS: 2 },
  },
];
