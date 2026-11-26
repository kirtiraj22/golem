import { Keypair } from "@solana/web3.js";
import fs from "node:fs";
import * as S from "./src/lib/solana/stock-wars";
const idl = JSON.parse(fs.readFileSync("idl_program.json", "utf8"));
const byName: any = Object.fromEntries(
  idl.instructions.map((i: any) => [i.name, i])
);
const w = Keypair.generate().publicKey,
  auth = Keypair.generate().publicKey,
  val = Keypair.generate().publicKey;
const u64 = (n: number) => Array.from(S.u64le(n));
const cases: [string, any, number[]][] = [
  ["init_player", S.ixInitPlayer(w), []],
  ["delegate_player", S.ixDelegatePlayer(w), []],
  ["init_lot_bid", S.ixInitLotBid(w, 7), u64(7)],
  ["delegate_lot_bid", S.ixDelegateLotBid(w, 7), u64(7)],
  [
    "apply_delta",
    S.ixApplyDelta(auth, w, 3, 100, 40),
    [...u64(3), ...u64(100), ...u64(40)],
  ],
  ["place_bid", S.ixPlaceBid(w, 7, 555), u64(555)],
  ["settle_lot", S.ixSettleLot(auth, w, 7, 99), u64(99)],
  ["request_reveal", S.ixRequestReveal(w, w, 7), []],
];
let bad = 0;
for (const [name, ix, args] of cases) {
  const spec = byName[name];
  const keys = ix.keys;
  if (keys.length !== spec.accounts.length) {
    console.log("FAIL count", name, keys.length, spec.accounts.length);
    bad++;
    continue;
  }
  spec.accounts.forEach((a: any, i: number) => {
    if (
      !!a.writable !== keys[i].isWritable ||
      !!a.signer !== keys[i].isSigner
    ) {
      console.log(
        "FAIL flags",
        name,
        a.name,
        "idl",
        !!a.writable,
        !!a.signer,
        "ts",
        keys[i].isWritable,
        keys[i].isSigner
      );
      bad++;
    }
  });
  const want = [...spec.discriminator, ...args];
  if (Buffer.compare(Buffer.from(ix.data), Buffer.from(want)) !== 0) {
    console.log("FAIL data", name);
    bad++;
  }
}
// delegate extras order check by name
const d = byName["delegate_lot_bid"].accounts.map((a: any) => a.name).join(",");
console.log("delegate order:", d);
const dk = S.ixDelegateLotBid(w, 7, val).keys;
console.log(
  "validator appended as remaining account:",
  dk.length === 9 && dk[8].pubkey.equals(val) && !dk[8].isSigner
);
console.log(
  "PDA sample:",
  S.playerPda(w).toBase58().length > 0,
  S.lotPda(w, 7).toBase58().length > 0
);
// decoder round trip with hand-built LotBid bytes
const buf = new Uint8Array(8 + 32 + 8 * 4 + 1 + 1 + 4 + 32 + 1);
buf.set([121, 212, 134, 202, 137, 21, 124, 46]);
buf.set(w.toBytes(), 8);
const dv = new DataView(buf.buffer);
dv.setBigUint64(40, 7n, true);
dv.setBigUint64(48, 500n, true);
dv.setBigUint64(56, 400n, true);
dv.setBigUint64(64, 0n, true);
buf[72] = 1;
buf[73] = 2;
dv.setUint32(74, 3, true);
buf.fill(0xab, 78, 110);
console.log(S.decodeLotBid(buf));
console.log(bad === 0 ? "ALL IDL CHECKS PASS" : `FAILURES: ${bad}`);
