import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { chain } from "./fake-server";
import * as C from "../src/app/lib/game/chain-sync";
import { VOID_RIVAL_BID } from "../src/lib/solana/stock-wars";

const W = Keypair.generate().publicKey.toBase58();
const mkLot = (n: number, o: any = {}) => ({
  id: "l" + n,
  listingNumber: n,
  status: "live",
  endsAt: new Date(Date.now() - 1000).toISOString(),
  playerBid: 0,
  rivalBid: 100,
  startingBid: 50,
  currentBid: 100,
  isLeading: false,
  ...o,
});
let row: { state: any; version: number };
const ops: C.SaveOps = {
  async saveIfChanged(_w, version, state) {
    if (row.version !== version) return null;
    row = { state: JSON.parse(JSON.stringify(state)), version: version + 1 };
    return row.state;
  },
  async readSave() {
    return JSON.parse(JSON.stringify(row));
  },
};
const reset = (state: any, chainBal = 0) => {
  row = { state, version: 1 };
  chain.sends = 0;
  chain.next = null;
  chain.lots.clear();
  chain.player = { authority: W, balance: chainBal, syncNonce: 0, layer: "er" };
};
const fresh = () => JSON.parse(JSON.stringify(row.state));
let passed = 0;
const t = async (n: string, f: () => Promise<void>) => {
  await f();
  passed++;
  console.log("ok -", n);
};

await t(
  "link seeds chain with balance + legacy held bids; mirror follows chain; held bids cancelled",
  async () => {
    reset({
      balance: 2400,
      day: 1,
      lots: [
        mkLot(1, {
          status: "live",
          endsAt: new Date(Date.now() + 9e5).toISOString(),
          playerBid: 300,
          isLeading: true,
        }),
      ],
    });
    const r = await C.linkChain(W, row.version, fresh(), ops);
    assert.ok(r);
    assert.equal(chain.player!.balance, 2700);
    assert.equal(chain.player!.syncNonce, 1);
    assert.equal(row.state.balance, 2700);
    assert.equal(row.state.chain.linked, true);
    assert.equal(row.state.chain.pending, undefined);
    assert.equal(row.state.lots[0].playerBid, 0);
  }
);
await t(
  "link is not repeatable (no second mint): re-link when already linked is a no-op",
  async () => {
    const sends = chain.sends;
    await C.linkChain(W, row.version, fresh(), ops);
    assert.equal(chain.sends, sends);
    assert.equal(chain.player!.balance, 2700);
  }
);
await t("link refuses without on-chain profile / seeds nothing", async () => {
  reset({ balance: 10, day: 1, lots: [] });
  chain.player = null;
  await assert.rejects(C.linkChain(W, 1, fresh(), ops), C.ChainSyncError);
  assert.equal(chain.sends, 0);
});
await t(
  "NPC sale credit: applied once, mirror updated only after confirmation",
  async () => {
    reset(
      { balance: 0, day: 1, lots: [], chain: { linked: true, syncNonce: 1 } },
      1000
    );
    chain.player!.syncNonce = 1;
    row.state.balance = 1000;
    const before = fresh();
    const next = fresh();
    next.balance += 150;
    const saved = await C.saveWithChain({
      wallet: W,
      version: row.version,
      before,
      next,
      ops,
    });
    assert.ok(saved);
    assert.equal(chain.player!.balance, 1150);
    assert.equal(row.state.balance, 1150);
    assert.equal(row.state.chain.syncNonce, 2);
    assert.equal(chain.sends, 1);
  }
);
await t(
  "debit beyond free chain balance is rejected and ROLLED BACK (state restored, nonce unchanged)",
  async () => {
    const before = fresh();
    const next = fresh();
    next.balance -= 5000;
    next.inventory = ["goods"];
    await assert.rejects(
      C.saveWithChain({ wallet: W, version: row.version, before, next, ops }),
      /Not enough free coins/
    );
    assert.equal(chain.player!.balance, 1150);
    assert.equal(chain.player!.syncNonce, 2);
    assert.equal(row.state.inventory, undefined);
    assert.equal(row.state.chain.pending, undefined);
    assert.equal(row.state.balance, 1150);
  }
);
await t(
  "unknown outcome, tx DID land: retry finalizes WITHOUT re-sending (no double credit)",
  async () => {
    const bal = chain.player!.balance;
    chain.next = "timeout-applied";
    const before = fresh();
    const next = fresh();
    next.balance += 40;
    await assert.rejects(
      C.saveWithChain({ wallet: W, version: row.version, before, next, ops }),
      C.ChainSyncError
    );
    assert.ok(row.state.chain.pending);
    assert.equal(row.state.balance, bal); // mirror NOT advanced before confirmation
    const sends = chain.sends;
    assert.equal(await C.resolvePending(W, fresh(), ops), true);
    assert.equal(chain.sends, sends);
    assert.equal(chain.player!.balance, bal + 40);
    assert.equal(row.state.balance, bal + 40);
    assert.equal(row.state.chain.pending, undefined);
  }
);
await t(
  "unknown outcome, tx did NOT land: retry re-sends same nonce exactly once",
  async () => {
    const bal = chain.player!.balance;
    chain.next = "timeout-lost";
    const before = fresh();
    const next = fresh();
    next.balance -= 10;
    await assert.rejects(
      C.saveWithChain({ wallet: W, version: row.version, before, next, ops }),
      C.ChainSyncError
    );
    const sends = chain.sends;
    await C.resolvePending(W, fresh(), ops);
    await C.resolvePending(W, fresh(), ops);
    assert.equal(chain.sends, sends + 1);
    assert.equal(chain.player!.balance, bal - 10);
    assert.equal(row.state.balance, bal - 10);
  }
);
await t("lost CAS race: nothing is sent to the chain", async () => {
  const before = fresh();
  const next = fresh();
  next.balance += 99;
  const sends = chain.sends;
  const r = await C.saveWithChain({
    wallet: W,
    version: row.version - 1,
    before,
    next,
    ops,
  }); // stale version
  assert.equal(r, null);
  assert.equal(chain.sends, sends);
});
await t(
  "reconcile makes the mirror follow chain (e.g. after wallet-signed bid)",
  async () => {
    chain.player!.balance -= 200;
    const s = fresh();
    await C.reconcileBalance(W, s);
    assert.equal(s.balance, chain.player!.balance);
  }
);
const chainLot = (n: number, escrow: number) =>
  chain.lots.set(n, {
    player: W,
    listing: n,
    escrow,
    rivalBid: 0,
    pricePaid: 0,
    status: "open",
    reveal: "none",
    revealRandomHex: "",
  });
await t(
  "settle: win / loss(refund) / tie goes to rival / accepted-vs-escrow mismatch is voided",
  async () => {
    reset(
      {
        balance: 1000,
        day: 1,
        chain: { linked: true, syncNonce: 1 },
        lots: [
          mkLot(1, { playerBid: 500, rivalBid: 400 }),
          mkLot(2, { playerBid: 300, rivalBid: 350 }),
          mkLot(3, { playerBid: 200, rivalBid: 200 }),
          mkLot(4, { playerBid: 100, rivalBid: 50 }),
        ],
      },
      1000
    );
    chainLot(1, 500);
    chainLot(2, 300);
    chainLot(3, 200);
    chainLot(4, 900); // lot4: chain escrow 900 != accepted 100 (late/rejected raise)
    const res = await C.settleDueLots(W, fresh(), new Date());
    assert.equal(res.get(1)!.won, true);
    assert.equal(res.get(1)!.pricePaid, 500);
    assert.equal(res.get(2)!.won, false);
    assert.equal(res.get(3)!.won, false);
    assert.equal(res.get(4)!.won, false);
    assert.equal(res.get(4)!.voided, true);
    assert.equal(res.get(4)!.rivalBid, 50);
    assert.equal(chain.player!.balance, 1000 + 300 + 200 + 900);
    const sends = chain.sends;
    const again = await C.settleDueLots(W, fresh(), new Date()); // idempotent
    assert.equal(chain.sends, sends);
    assert.equal(again.get(1)!.won, true);
    assert.equal(chain.player!.balance, 1000 + 300 + 200 + 900);
  }
);
await t(
  "verifyChainBid rejects a bid that is not in contract state",
  async () => {
    chainLot(9, 400);
    await C.verifyChainBid(W, 9, 400);
    await assert.rejects(C.verifyChainBid(W, 9, 500), C.ChainSyncError);
    await assert.rejects(C.verifyChainBid(W, 77, 1), C.ChainSyncError);
  }
);
console.log(`\n${passed} sync-logic tests passed`);
