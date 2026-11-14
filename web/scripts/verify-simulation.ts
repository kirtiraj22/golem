import assert from "node:assert/strict";
import {
  createInitialWorld,
  fastForwardDays,
  fastForwardSevenDays,
  getPrice,
  getSnapshot,
  playerBuy,
  playerSell,
  tick,
  triggerGrainRumour,
  validateState,
} from "../src/app/game/simulation/economy";
import { GOODS } from "../src/app/game/simulation/goods";
import type {
  Inventory,
  SimulationLogEntry,
  WorldSnapshot,
} from "../src/app/game/simulation/types";
import { GOOD_IDS } from "../src/app/game/simulation/types";

function getMerchant(snapshot: WorldSnapshot, id: string) {
  const merchant = snapshot.merchants.find((candidate) => candidate.id === id);
  assert.ok(merchant, `Expected merchant ${id} to exist.`);
  return merchant;
}

function sumTrades(
  history: SimulationLogEntry[],
  actorId: string,
  role: "buyer" | "seller"
): number {
  return history.reduce((total, entry) => {
    if (entry.type !== "TRADE") {
      return total;
    }
    if (role === "buyer" && entry.buyerId === actorId) {
      return total + entry.totalPrice;
    }
    if (role === "seller" && entry.sellerId === actorId) {
      return total + entry.totalPrice;
    }
    return total;
  }, 0);
}

function sumTradeQuantity(
  history: SimulationLogEntry[],
  actorId: string,
  role: "buyer" | "seller",
  goodId: keyof Inventory
): number {
  return history.reduce((total, entry) => {
    if (
      entry.type === "TRADE" &&
      entry.goodId === goodId &&
      ((role === "buyer" && entry.buyerId === actorId) ||
        (role === "seller" && entry.sellerId === actorId))
    ) {
      return total + entry.quantity;
    }
    return total;
  }, 0);
}

function expectedInventoryAfterDay(
  before: WorldSnapshot,
  after: WorldSnapshot,
  merchantId: string,
  goodId: keyof Inventory
): number {
  const start = getMerchant(before, merchantId).inventory[goodId];
  const bought = sumTradeQuantity(
    after.history.filter((entry) => entry.day === after.day),
    merchantId,
    "buyer",
    goodId
  );
  const sold = sumTradeQuantity(
    after.history.filter((entry) => entry.day === after.day),
    merchantId,
    "seller",
    goodId
  );

  let expected = start + bought - sold;

  for (const entry of after.history) {
    if (entry.day !== after.day) {
      continue;
    }
    if (entry.type === "PRODUCTION" && entry.actorId === merchantId) {
      if (entry.goodId === goodId) {
        expected += entry.quantity;
      }
      if (entry.inputGoodId === goodId) {
        expected -= entry.inputQuantity ?? 0;
      }
    }
    if (
      entry.type === "CONSUMPTION" &&
      entry.actorId === merchantId &&
      entry.goodId === goodId
    ) {
      expected -= entry.quantity;
    }
  }

  return expected;
}

console.log("=== Golem market economy verification ===");

const world = createInitialWorld();
const initial = getSnapshot(world);

assert.equal(initial.goods.length, 3);
assert.equal(initial.merchants.length, 3);
assert.deepEqual(initial.merchants.map((merchant) => merchant.role).sort(), [
  "BLACKSMITH",
  "FARMER",
  "LUMBERJACK",
]);
assert.equal(initial.player.stall.name, "The Copper Stall");
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
const baselineGrainPrice = getPrice(supplyTestState, "GRAIN");
supplyTestState.player.inventory.GRAIN += 40;
const abundantGrainPrice = getPrice(supplyTestState, "GRAIN");
assert.ok(
  abundantGrainPrice < baselineGrainPrice,
  "Abundant grain should reduce the grain price."
);

const scarcityTestState = createInitialWorld();
scarcityTestState.merchants[0].inventory.GRAIN -= 12;
const scarceGrainPrice = getPrice(scarcityTestState, "GRAIN");
assert.ok(
  scarceGrainPrice > baselineGrainPrice,
  "Scarce grain should increase the grain price."
);
console.log(
  `Supply response: grain price ${scarceGrainPrice} (scarce) vs ${baselineGrainPrice} (normal) vs ${abundantGrainPrice} (abundant).`
);

// Invalid player transactions must be rejected without changing state.
const historyBeforeRejects = initial.history.length;
assert.throws(() => playerBuy(world, "GRAIN", 0), /positive integer/);
assert.throws(() => playerBuy(world, "GRAIN", -2), /positive integer/);
assert.throws(() => playerBuy(world, "GRAIN", 1.5), /positive integer/);
assert.throws(
  () => playerBuy(world, "GRAIN", 999999, "farmer"),
  /available for sale/
);
assert.throws(
  () => playerBuy(world, "GRAIN", 1, "not-a-merchant"),
  /Unknown merchant/
);
assert.throws(() => playerSell(world, "TOOLS", 999999), /does not have/);
assert.throws(() => playerSell(world, "GRAIN", 1, "farmer"), /only wants/);
assert.equal(getSnapshot(world).history.length, historyBeforeRejects);
console.log("Invalid player transactions: rejected without mutation.");

// The rumour is a demand shock: it should lift the grain price immediately.
const beforeRumour = getSnapshot(world);
const event = triggerGrainRumour(world, {
  durationDays: 2,
  demandMultiplier: 1.8,
});
const withRumour = getSnapshot(world);

assert.equal(event.goodId, "GRAIN");
assert.equal(withRumour.activeEvents.length, 1);
assert.equal(withRumour.demandMultipliers.GRAIN, 1.8);
assert.ok(
  withRumour.prices.GRAIN > beforeRumour.prices.GRAIN,
  "Grain price should rise during the rumour."
);
assert.ok(withRumour.history.some((entry) => entry.type === "EVENT_STARTED"));
console.log(
  `Rumour: grain ${beforeRumour.prices.GRAIN} -> ${withRumour.prices.GRAIN} coins (x${withRumour.demandMultipliers.GRAIN} demand), ${event.remainingDays} days left.`
);

// Run one normal tick and prove NPC trades transferred both money and goods.
const beforeDay1 = getSnapshot(world);
const day1 = tick(world);
const day1Entries = day1.history.filter((entry) => entry.day === 1);
const day1Trades = day1Entries.filter((entry) => entry.type === "TRADE");
const npcTrades = day1Trades.filter(
  (entry) =>
    entry.type === "TRADE" &&
    entry.buyerId !== "player" &&
    entry.sellerId !== "player"
);

assert.equal(day1.day, 1);
assert.ok(npcTrades.length >= 3, "Expected several autonomous NPC trades.");
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "PRODUCTION" &&
      entry.actorId === "farmer" &&
      entry.goodId === "GRAIN" &&
      entry.quantity === 6
  ),
  "Farmer should produce 6 grain on day 1."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "PRODUCTION" &&
      entry.actorId === "lumberjack" &&
      entry.goodId === "WOOD" &&
      entry.quantity === 2
  ),
  "Lumberjack should produce 2 wood on day 1."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "PRODUCTION" &&
      entry.actorId === "blacksmith" &&
      entry.goodId === "TOOLS" &&
      entry.quantity === 2 &&
      entry.inputGoodId === "WOOD" &&
      entry.inputQuantity === 2
  ),
  "Blacksmith should convert 2 wood into 2 tools on day 1."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "CONSUMPTION" &&
      entry.actorId === "farmer" &&
      entry.goodId === "TOOLS" &&
      entry.quantity === 2
  ),
  "Farmer should consume 2 tools on day 1."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "CONSUMPTION" &&
      entry.actorId === "lumberjack" &&
      entry.goodId === "GRAIN" &&
      entry.quantity === 2
  ),
  "Lumberjack should consume 2 grain on day 1."
);
assert.ok(
  day1Entries.some(
    (entry) =>
      entry.type === "CONSUMPTION" &&
      entry.actorId === "blacksmith" &&
      entry.goodId === "GRAIN" &&
      entry.quantity === 4
  ),
  "Blacksmith should consume 4 grain on day 1."
);
assert.ok(
  day1Trades.every(
    (entry) => entry.totalPrice === entry.quantity * entry.unitPrice
  )
);

for (const merchantBefore of beforeDay1.merchants) {
  const merchantAfter = getMerchant(day1, merchantBefore.id);
  const bought = sumTrades(day1Entries, merchantBefore.id, "buyer");
  const sold = sumTrades(day1Entries, merchantBefore.id, "seller");

  assert.equal(
    merchantAfter.balance,
    merchantBefore.balance - bought + sold,
    `Money transfer mismatch for ${merchantBefore.id}.`
  );

  for (const goodId of GOOD_IDS) {
    assert.equal(
      merchantAfter.inventory[goodId],
      expectedInventoryAfterDay(beforeDay1, day1, merchantBefore.id, goodId),
      `Item transfer mismatch for ${merchantBefore.id} ${goodId}.`
    );
  }
}

console.log(`Day 1 autonomous trades: ${npcTrades.length}`);
for (const trade of npcTrades.slice(0, 6)) {
  if (trade.type === "TRADE") {
    console.log(
      `  ${trade.buyerId} bought ${trade.quantity} ${trade.goodId} from ${trade.sellerId} at ${trade.unitPrice} each (${trade.totalPrice} total).`
    );
  }
}
console.log("Day 1 merchant balances reconciled from trade history.");

// Finish the seven-day fast-forward. The rumour must expire, but the economy
// must keep producing, consuming, trading, and pricing every day.
const sevenDays = fastForwardDays(world, 6);

assert.equal(world.day, 7);
assert.equal(sevenDays.day, 7);
assert.equal(sevenDays.activeEvents.length, 0);
assert.equal(sevenDays.demandMultipliers.GRAIN, 1);
assert.ok(sevenDays.history.some((entry) => entry.type === "EVENT_ENDED"));
assert.equal(sevenDays.moneySupply, initial.moneySupply);
assert.deepEqual(sevenDays.validationErrors, []);

const tradesByDay = new Map<number, number>();
for (const entry of sevenDays.history) {
  if (entry.type === "TRADE") {
    tradesByDay.set(entry.day, (tradesByDay.get(entry.day) ?? 0) + 1);
  }
}
for (let day = 1; day <= 7; day += 1) {
  assert.ok(
    (tradesByDay.get(day) ?? 0) > 0,
    `Expected autonomous trading on day ${day}.`
  );
}
console.log(
  `Seven days simulated. Trades by day:`,
  Object.fromEntries(tradesByDay)
);
console.log(
  `Rumour expired. Grain price after expiry: ${sevenDays.prices.GRAIN} coins.`
);

// A second world proves the explicit seven-day API works from a fresh state.
const freshWorld = createInitialWorld();
const freshSevenDays = fastForwardSevenDays(freshWorld);
assert.equal(freshWorld.day, 7);
assert.ok(
  freshSevenDays.history.filter((entry) => entry.type === "TRADE").length > 0
);
assert.deepEqual(freshSevenDays.validationErrors, []);
console.log(
  "fastForwardSevenDays() ran 7 full production/trade/consumption days."
);

// Identical inputs must produce identical histories and snapshots.
const deterministicA = createInitialWorld();
const deterministicB = createInitialWorld();
triggerGrainRumour(deterministicA, { durationDays: 3, demandMultiplier: 1.6 });
triggerGrainRumour(deterministicB, { durationDays: 3, demandMultiplier: 1.6 });
fastForwardSevenDays(deterministicA);
fastForwardSevenDays(deterministicB);
assert.deepEqual(
  getSnapshot(deterministicA),
  getSnapshot(deterministicB),
  "The simulation should be deterministic."
);
console.log("Determinism: identical worlds produced identical snapshots.");

// Player trades are validated and move money and stock in both directions.
const beforeBuy = getSnapshot(world);
const grainPrice = beforeBuy.prices.GRAIN;
const farmerBeforeBuy = getMerchant(beforeBuy, "farmer");
const afterBuy = playerBuy(world, "GRAIN", 2, "farmer");
const buyLog = afterBuy.history[afterBuy.history.length - 1];

assert.equal(buyLog.type, "TRADE");
if (buyLog.type === "TRADE") {
  assert.equal(buyLog.buyerId, "player");
  assert.equal(buyLog.sellerId, "farmer");
  assert.equal(buyLog.goodId, "GRAIN");
  assert.equal(buyLog.quantity, 2);
  assert.equal(buyLog.unitPrice, grainPrice);
  assert.equal(buyLog.totalPrice, grainPrice * 2);
}

assert.equal(
  afterBuy.player.balance,
  beforeBuy.player.balance - grainPrice * 2
);
assert.equal(
  afterBuy.player.inventory.GRAIN,
  beforeBuy.player.inventory.GRAIN + 2
);
assert.equal(
  getMerchant(afterBuy, "farmer").balance,
  farmerBeforeBuy.balance + grainPrice * 2
);
assert.equal(
  getMerchant(afterBuy, "farmer").inventory.GRAIN,
  farmerBeforeBuy.inventory.GRAIN - 2
);
console.log(
  `Player bought 2 GRAIN for ${grainPrice * 2} coins from the farmer.`
);

const beforeSell = getSnapshot(world);
const toolPrice = beforeSell.prices.TOOLS;
const farmerBeforeSell = getMerchant(beforeSell, "farmer");
const farmerRoom =
  (farmerBeforeSell.wants.TOOLS ?? 0) - farmerBeforeSell.inventory.TOOLS;

assert.ok(farmerRoom >= 2, "Farmer should want two more tools.");
const afterSell = playerSell(world, "TOOLS", 2, "farmer");
const sellLog = afterSell.history[afterSell.history.length - 1];

assert.equal(sellLog.type, "TRADE");
if (sellLog.type === "TRADE") {
  assert.equal(sellLog.buyerId, "farmer");
  assert.equal(sellLog.sellerId, "player");
  assert.equal(sellLog.goodId, "TOOLS");
  assert.equal(sellLog.quantity, 2);
  assert.equal(sellLog.unitPrice, toolPrice);
  assert.equal(sellLog.totalPrice, toolPrice * 2);
}

assert.equal(
  afterSell.player.balance,
  beforeSell.player.balance + toolPrice * 2
);
assert.equal(
  afterSell.player.inventory.TOOLS,
  beforeSell.player.inventory.TOOLS - 2
);
assert.equal(
  getMerchant(afterSell, "farmer").balance,
  farmerBeforeSell.balance - toolPrice * 2
);
assert.equal(
  getMerchant(afterSell, "farmer").inventory.TOOLS,
  farmerBeforeSell.inventory.TOOLS + 2
);
assert.deepEqual(afterSell.validationErrors, []);
console.log(`Player sold 2 TOOLS for ${toolPrice * 2} coins to the farmer.`);

console.log("\nFinal snapshot:");
console.log(
  JSON.stringify(
    {
      day: afterSell.day,
      prices: afterSell.prices,
      demandMultipliers: afterSell.demandMultipliers,
      marketStock: afterSell.marketStock,
      player: {
        balance: afterSell.player.balance,
        inventory: afterSell.player.inventory,
        stall: afterSell.player.stall,
      },
      merchants: afterSell.merchants.map((merchant) => ({
        id: merchant.id,
        role: merchant.role,
        balance: merchant.balance,
        inventory: merchant.inventory,
      })),
      activeEvents: afterSell.activeEvents,
      historyEntries: afterSell.history.length,
      validationErrors: afterSell.validationErrors,
    },
    null,
    2
  )
);

console.log("\nAll market simulation checks passed.");
