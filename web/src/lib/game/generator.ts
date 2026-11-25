import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  ITEM_CATALOGUE,
  ITEMS_BY_KEY,
  RARITY_WEIGHTS,
  RIVAL_NAMES,
  STORAGE_LOT_TEMPLATES,
  silhouettesForCategories,
  type StorageLotTemplate,
} from "~/app/game/auction/catalog";
import {
  CATEGORY_LABELS,
  CONDITION_MULTIPLIERS,
  ITEM_CATEGORIES,
  type GameMarket,
  type InventoryItem,
  type ItemCategory,
  type ItemCondition,
  type ItemRarity,
  type ServerStorageLot,
} from "~/app/game/auction/types";
import { createInitialEconomy } from "~/app/game/simulation/game-economy";

function createRng(seed: string): () => number {
  const digest = createHash("sha256").update(seed).digest();
  let state = digest.readUInt32LE(0) || 1;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}

function weightedRarity(
  rng: () => number,
  boost?: ItemRarity
): ItemRarity {
  const weights: Record<ItemRarity, number> = { ...RARITY_WEIGHTS };

  if (boost === "rare") {
    weights.rare *= 2.4;
    weights.legendary *= 1.35;
  }

  if (boost === "legendary") {
    weights.rare *= 1.8;
    weights.legendary *= 4;
  }

  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;

  for (const rarity of ["legendary", "rare", "uncommon", "common"] as const) {
    roll -= weights[rarity];
    if (roll <= 0) {
      return rarity;
    }
  }

  return "common";
}

function conditionFor(rng: () => number): ItemCondition {
  const roll = rng();
  if (roll < 0.14) return "mint";
  if (roll < 0.5) return "good";
  if (roll < 0.82) return "worn";
  return "rough";
}

function definitionFor(
  rng: () => number,
  template: StorageLotTemplate,
  rarity: ItemRarity
) {
  const category = pick(rng, template.categories);
  const exact = ITEM_CATALOGUE.filter(
    (item) => item.category === category && item.rarity === rarity
  );

  if (exact.length > 0) {
    return pick(rng, exact);
  }

  const categoryItems = ITEM_CATALOGUE.filter(
    (item) => item.category === category
  );

  if (categoryItems.length > 0) {
    return pick(rng, categoryItems);
  }

  return pick(rng, ITEM_CATALOGUE);
}

function generatedItem(
  rng: () => number,
  template: StorageLotTemplate,
  listingNumber: number,
  day: number
): InventoryItem {
  const definition = definitionFor(
    rng,
    template,
    weightedRarity(rng, template.rarityBoost)
  );
  const condition = conditionFor(rng);

  return {
    id: randomUUID(),
    definitionKey: definition.key,
    name: definition.name,
    category: definition.category,
    rarity: definition.rarity,
    icon: definition.icon,
    condition,
    baseValue: definition.baseValue,
    acquiredDay: day,
    sourceListing: listingNumber,
  };
}

function previewClues(
  rng: () => number,
  contents: InventoryItem[],
  template: StorageLotTemplate
): string[] {
  const categories = Array.from(
    new Set(contents.map((item) => item.category))
  );
  const category = categories.length > 0 ? pick(rng, categories) : "misc";
  const best = contents.reduce<InventoryItem | null>((current, item) => {
    if (!current) return item;
    const order: ItemRarity[] = ["common", "uncommon", "rare", "legendary"];
    return order.indexOf(item.rarity) > order.indexOf(current.rarity)
      ? item
      : current;
  }, null);

  const clues = [
    `${contents.length} lots inside. A ${CATEGORY_LABELS[
      category
    ].toLowerCase()} silhouette sits closest to the door.`,
    `${template.sizeLabel} unit. The cardboard is soft at the corners, but the tarp is intact.`,
  ];

  if (best && (best.rarity === "rare" || best.rarity === "legendary")) {
    clues.push(
      "There is one heavy, carefully wrapped bundle at the back. The auctioneer will not touch it."
    );
  } else {
    clues.push(
      "Nothing rattles when the door is tapped. The auctioneer calls that a good sign."
    );
  }

  return clues;
}

function contentValue(contents: InventoryItem[]): number {
  return contents.reduce(
    (total, item) =>
      total + Math.round(item.baseValue * CONDITION_MULTIPLIERS[item.condition]),
    0
  );
}

export function createStorageLot(
  now: Date,
  listingNumber: number,
  day: number
): ServerStorageLot {
  const seed = randomBytes(32).toString("hex");
  const rng = createRng(seed);
  const template = pick(rng, STORAGE_LOT_TEMPLATES);
  const itemCount =
    template.itemCount.min +
    Math.floor(rng() * (template.itemCount.max - template.itemCount.min + 1));
  const contents = Array.from({ length: itemCount }, () =>
    generatedItem(rng, template, listingNumber, day)
  );
  const previewMs = template.previewSeconds * 1000;
  const liveMs = template.liveSeconds * 1000;
  const previewEndsAt = new Date(now.getTime() + previewMs);
  const endsAt = new Date(previewEndsAt.getTime() + liveMs);
  const rivalName = pick(rng, RIVAL_NAMES);
  const estimatedValue = contentValue(contents);
  const rivalCeiling = Math.max(
    template.startingBid + 40,
    Math.round(estimatedValue * (0.46 + rng() * 0.34))
  );
  const rivalNextBidAt = new Date(
    previewEndsAt.getTime() + (8_000 + rng() * 12_000)
  );

  return {
    id: randomUUID(),
    listingNumber,
    unitNumber: `#${String(10 + listingNumber * 7).padStart(3, "0")}`,
    facility: template.facility,
    title: template.title,
    teaser: template.teaser,
    sizeLabel: template.sizeLabel,
    status: "preview",
    previewEndsAt: previewEndsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    startingBid: template.startingBid,
    currentBid: template.startingBid,
    playerBid: 0,
    rivalBid: template.startingBid,
    rivalName,
    isLeading: false,
    previewClues: previewClues(rng, contents, template),
    silhouettes: silhouettesForCategories(
      contents.map((item) => item.category)
    ),
    revealStatus: "locked",
    contents,
    rivalCeiling,
    rivalNextBidAt: rivalNextBidAt.toISOString(),
    contentsClaimed: false,
  };
}

export function createInitialMarket(day: number): GameMarket {
  return {
    refreshedDay: day,
    multipliers: {
      electronics: 1,
      furniture: 1,
      antiques: 1,
      tools: 1,
      collectibles: 1,
      misc: 1,
    },
    headlines: [
      {
        id: randomUUID(),
        day,
        category: "collectibles",
        text: "Collector convention opens downtown. Display pieces are moving.",
        changePct: 0,
      },
    ],
  };
}

export function createInitialGameState(now = new Date()): {
  state: import("~/app/game/auction/types").PlayerGameState;
} {
  const day = 1;
  const balance = 2400;
  const lots = Array.from({ length: 3 }, (_, index) =>
    createStorageLot(now, index + 1, day)
  );

  return {
    state: {
      version: 1,
      balance,
      day,
      reputation: 0,
      lots,
      inventory: [],
      history: [
        {
          id: randomUUID(),
          day,
          at: now.toISOString(),
          type: "DAY",
          message:
            "Rook opens the gates. Three storage lots are on the block today.",
        },
      ],
      market: createInitialMarket(day),
      economy: createInitialEconomy(balance),
      nextListingNumber: lots.length + 1,
      createdAt: now.toISOString(),
    },
  };
}

const HEADLINE_TEMPLATES: Record<
  ItemCategory,
  { up: string[]; down: string[] }
> = {
  electronics: {
    up: [
      "Repair shop shortage sends old electronics higher.",
      "A viral restoration video sparks a run on vintage gear.",
    ],
    down: [
      "A warehouse full of imported gadgets floods the market.",
      "Repair shops report a quiet week for vintage electronics.",
    ],
  },
  collectibles: {
    up: [
      "Collector convention opens downtown. Display pieces are moving.",
      "A retired appraiser starts buying card and comic lots again.",
    ],
    down: [
      "Online listings surge after an estate clear-out.",
      "Collectors turn cautious before the weekend show.",
    ],
  },
  tools: {
    up: [
      "Contractors restock before the bridge repair project.",
      "A local workshop fire leaves tool demand high.",
    ],
    down: [
      "A tool importer clears surplus stock at the docks.",
      "Construction slows and pawn shop shelves fill up.",
    ],
  },
  furniture: {
    up: [
      "A boutique hotel is furnishing rooms with reclaimed pieces.",
      "Designers are paying silly money for mid-century wood.",
    ],
    down: [
      "A furniture warehouse holds a noisy clearance sale.",
      "Buyers are holding off on big pieces this week.",
    ],
  },
  antiques: {
    up: [
      "A museum curator is quietly buying oddities and old furniture.",
      "Tourists arrive for the riverside heritage fair.",
    ],
    down: [
      "The antique fair was cancelled and sellers are stuck.",
      "Everyone seems to be clearing out attic clutter at once.",
    ],
  },
  misc: {
    up: [
      "A picker is paying cash for unlabelled boxes and odd little treasures.",
      "The weekend flea market is short on curios and small valuables.",
    ],
    down: [
      "A house clearance floods the stalls with unsorted bric-a-brac.",
      "Buyers are walking past anything that needs a second look.",
    ],
  },
};

export function nextMarketDay(
  previous: GameMarket,
  day: number,
  rngSeed = randomBytes(16).toString("hex")
): GameMarket {
  const rng = createRng(rngSeed);
  const headings: GameMarket["headlines"] = [];
  const multipliers = ITEM_CATEGORIES.reduce((result, category) => {
    result[category] = previous.multipliers[category] ?? 1;
    return result;
  }, {} as Record<ItemCategory, number>);

  for (const category of ITEM_CATEGORIES) {
    if (rng() < 0.32) {
      const direction = rng() < 0.55 ? 1 : -1;
      const changePct = Math.round((0.04 + rng() * 0.16) * 100) * direction;
      multipliers[category] = Math.min(
        1.55,
        Math.max(0.55, Number((multipliers[category] + changePct / 100).toFixed(2)))
      );

      const pool =
        direction > 0
          ? HEADLINE_TEMPLATES[category].up
          : HEADLINE_TEMPLATES[category].down;
      headings.push({
        id: randomUUID(),
        day,
        category,
        text: pick(rng, pool),
        changePct,
      });
    }
  }

  if (headings.length === 0) {
    const category = pick(rng, ITEM_CATEGORIES);
    headings.push({
      id: randomUUID(),
      day,
      category,
      text: "A quiet day at the docks. Prices hold steady.",
      changePct: 0,
    });
  }

  return {
    refreshedDay: day,
    multipliers,
    headlines: [
      ...headings,
      ...previous.headlines.filter((headline) =>
        ITEM_CATEGORIES.includes(headline.category)
      ),
    ].slice(0, 8),
  };
}

export function definitionForItem(item: InventoryItem) {
  return ITEMS_BY_KEY[item.definitionKey] ?? null;
}
