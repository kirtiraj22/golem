import assert from "node:assert/strict";
import {
  createInitialWorld,
  fastForwardSevenDays,
  getPrice,
  getSnapshot,
  playerBuy,
  playerSell,
  playerSellAtPrice,
  tick,
  triggerLootRumour,
  validateState,
} from "../src/app/game/simulation/economy";
import {
  advanceEconomyDay,
  applyMarketHeadlines,
  ensureEconomyState,
  sellLootItem,
  startLootRumour,
} from "../src/app/game/simulation/game-economy";
import { GOODS } from "../src/app/game/simulation/goods";
import { GOOD_IDS } from "../src/app/game/simulation/types";

console.log("=== Stock Wars dealer economy verification ===");

const world = createInitialWorld();
const initial = getSnapshot(world);

assert.equal(initial.goods.length, 6);
assert.equal(initial.merchants.length, 3);
assert.deepEqual(
  initial.merchants.map((merchant) => merchant.role).sort(),
  ["FURNITURE_DEALER", "PAWNBROKER", "SALVAGE_BUYER"]
);
assert.equal(initial.player.stall.name, "The Copper Stall");
assert.equal(initial.player.stall.town, "Dealer Row");
assert.deepEqual(initial.validationErrors, []);
assert.deepEqual(validateState(world), []);

for (const goodId of GOOD_IDS) {
  const good = GOODS[goodId];
  assert.ok(initial.prices[goodId] >= good.minPrice);
  assert.ok(initial.prices[goodId] <= good.maxPrice);
}

console.log("Initial prices:", initial.prices);
console.log(
  "Initial balances:",
  Object.fromEntries([
    ["player", initial.player.balance],
    ...initial.merchants.map((merchant) => [merchant.id, merchant.balance]),
  ])
);

// Supply moves prices: abundance pushes down, scarcity pushes up.
const supplyTestState = createInitialWorld();
const baselineElectronicsPrice = getPrice(supplyTestState, "electronics");
supplyTestState.player.inventory.electronics += 40;
const abundantElectronicsPrice = getPrice(supplyTestState, "electronics");
assert.ok(
  abundantElectronicsPrice < baselineElectronicsPrice,
  "Abundant electronics should reduce the electronics price."
);

const scarcityTestState = createInitialWorld();
scarcityTestState.merchants[0].inventory.electronics = 0;
const scarceElectronicsPrice = getPrice(scarcityTestState, "electronics");
assert.ok(
  scarceElectronicsPrice > baselineElectronicsPrice,
  "Scarce electronics should increase the electronics price."
);
console.log(
  `Supply response: electronics ${scarceElectronicsPrice} (scarce) vs ${baselineElectronicsPrice} (normal) vs ${abundantElectronicsPrice} (abundant).`
);

// Invalid transactions must be rejected without mutating history.
const invalidWorld = createInitialWorld();
invalidWorld.player.inventory.electronics = 1;
const historyBeforeRejects = invalidWorld.history.length;

assert.throws(() => playerBuy(invalidWorld, "electronics", 0), /positive integer/);
assert.throws(
  () => playerSellAtPrice(invalidWorld, "electronics", 1, 0),
  /positive integer/
);
assert.throws(
  () =>
    playerSellAtPrice(
      invalidWorld,
      "electronics",
      1,
      20,
      "furniture-dealer"
    ),
  /only wants/
);
assert.throws(
  () => playerSell(invalidWorld, "electronics", 999999),
  /does not have/
);
assert.equal(invalidWorld.history.length, historyBeforeRejects);
console.log("Invalid dealer transactions: rejected without mutation.");

// A loot rumour is a demand shock for the chosen category.
const beforeRumour = getSnapshot(world);
const event = triggerLootRumour(world, "antiques", {
  durationDays: 2,
  demandMultiplier: 1.8,
});
const withRumour = getSnapshot(world);

assert.equal(event.goodId, "antiques");
assert.equal(withRumour.activeEvents.length, 1);
assert.equal(withRumour.demandMultipliers.antiques, 1.8);
assert.ok(
  withRumour.prices.antiques > beforeRumour.prices.antiques,
  "Antique price should rise during the rumour."
);
assert.ok(withRumour.history.some((entry) => entry.type === "EVENT_STARTED"));
console.log(
  `Rumour: antiques ${beforeRumour.prices.antiques} -> ${withRumour.prices.antiques} coins (x${withRumour.demandMultipliers.antiques} demand), ${event.remainingDays} days left.`
);

// One revealed loot item can be sold at a dealer-specific offer.
const beforeSale = getSnapshot(world);
world.player.inventory.electronics += 1;
// Loot arrives from outside the dealer loop, so the conservation baseline
// moves with it just as sellLootItem() does in the persisted game bridge.
world.initialStockTotals.electronics += 1;
playerSellAtPrice(world, "electronics", 1, 50, "pawnbroker");
const afterSale = getSnapshot(world);

assert.equal(afterSale.player.balance, beforeSale.player.balance + 50);
assert.equal(
  afterSale.player.inventory.electronics,
  beforeSale.player.inventory.electronics
);
assert.equal(afterSale.moneySupply, beforeSale.moneySupply);
assert.ok(
  afterSale.history.some(
    (entry) =>
      entry.type === "TRADE" &&
      entry.sellerId === "player" &&
      entry.buyerId === "pawnbroker" &&
      entry.totalPrice === 50
  )
);
console.log("Loot sale: one electronics item sold to the pawnbroker for 50 coins.");

// Run one normal day and prove the dealers produce, consume and trade.
const beforeDay1 = getSnapshot(world);
const day1 = tick(world);
const day1Entries = day1.history.filter((entry) => entry.day === 1);

assert.equal(day1.day, 1);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "PRODUCTION" &&
      entry.actorId === "pawnbroker" &&
      entry.goodId === "electronics"
  ),
  "Pawnbroker should restock electronics."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "PRODUCTION" &&
      entry.actorId === "furniture-dealer" &&
      entry.goodId === "furniture"
  ),
  "Furniture dealer should restock furniture."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "PRODUCTION" &&
      entry.actorId === "salvage-buyer" &&
      entry.goodId === "tools"
  ),
  "Salvage buyer should restock tools."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "CONSUMPTION" &&
      entry.actorId === "pawnbroker" &&
      entry.goodId === "collectibles"
  ),
  "Pawnbroker should consume collectibles."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "CONSUMPTION" &&
      entry.actorId === "furniture-dealer" &&
      entry.goodId === "antiques"
  ),
  "Furniture dealer should consume antiques."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "CONSUMPTION" &&
      entry.actorId === "salvage-buyer" &&
      entry.goodId === "misc"
  ),
  "Salvage buyer should consume misc valuables."
);
assert.equal(day1.moneySupply, beforeDay1.moneySupply);
assert.deepEqual(day1.validationErrors, []);
assert.deepEqual(validateState(world), []);
console.log("Day 1: production, consumption and NPC trades completed cleanly.");

const day8 = fastForwardSevenDays(world);
assert.equal(day8.day, 8);
assert.equal(day8.moneySupply, day1.moneySupply);
assert.deepEqual(day8.validationErrors, []);
assert.deepEqual(validateState(world), []);
console.log("Fast-forward: seven more days completed with a stable money supply.");

console.log("Dealer economy verification passed.");
