import fs from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  lotPda,
  STOCK_WARS_PROGRAM_ID,
  VRF_PROGRAM_ID,
} from "../src/lib/solana/stock-wars";

const raw = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  let value = line.slice(i + 1);
  if (value.startsWith('"') && value.endsWith('"')) value = JSON.parse(value);
  process.env[line.slice(0, i)] = value;
}

const er = new Connection(
  process.env.MAGICBLOCK_ER_RPC_URL?.trim() || "https://devnet.magicblock.app",
  "confirmed"
);
const wallet = new PublicKey("8r4mGjR7Xv69orLAnx8w4QJ9nj9sLdMsqU6m9yfMfwJ2");
const lot = lotPda(wallet, 129);
const DISC: Record<string, string> = {
  "3e2e2e": "place_bid",
  "4a3a3a": "settle_lot",
};

async function listAll(address: PublicKey, label: string) {
  let before: string | undefined;
  const all: Awaited<ReturnType<Connection["getSignaturesForAddress"]>> = [];
  for (let page = 0; page < 6; page += 1) {
    const list = await er.getSignaturesForAddress(address, {
      limit: 100,
      before,
    });
    if (!list.length) break;
    all.push(...list);
    before = list[list.length - 1]!.signature;
    if (list.length < 100) break;
  }
  console.log(label, "count", all.length);
  for (const s of all) {
    console.log(
      label,
      s.signature,
      s.slot,
      s.blockTime ? new Date(s.blockTime * 1000).toISOString() : "",
      s.err ? JSON.stringify(s.err) : "ok"
    );
  }
  return all;
}

async function inspect(signature: string) {
  const tx = await er.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return;
  console.log("=== tx", signature, "slot", tx.slot, "err", JSON.stringify(tx.meta?.err));
  console.log("logs:");
  for (const line of tx.meta?.logMessages ?? []) console.log(line);
  console.log("outer ixs:");
  for (const ix of tx.transaction.message.compiledInstructions) {
    const pid = tx.transaction.message.staticAccountKeys[ix.programIdIndex]!;
    console.log(
      " ",
      pid.toBase58(),
      Buffer.from(ix.data).toString("hex").slice(0, 80),
      "accounts",
      ix.accountKeyIndexes.map((i) =>
        tx.transaction.message.staticAccountKeys[i]?.toBase58()
      )
    );
  }
  console.log("inner ixs:");
  for (const group of tx.meta?.innerInstructions ?? []) {
    for (const ix of group.instructions) {
      if ("programIdIndex" in ix) {
        const pid = tx.transaction.message.staticAccountKeys[ix.programIdIndex]!;
        console.log(
          " ",
          group.index,
          pid.toBase58(),
          Buffer.from(ix.data, "base64").toString("hex").slice(0, 120)
        );
      }
    }
  }
}

async function main() {
  const lotSigs = await listAll(lot, "lot");
  const nonCallback = lotSigs.filter(
    (s) => !s.err || !JSON.stringify(s.err).includes("ProgramFailedToComplete")
  );
  for (const s of nonCallback) await inspect(s.signature);
  const walletSigs = await listAll(wallet, "wallet");
  for (const s of walletSigs) {
    const tx = await er.getTransaction(s.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) continue;
    const logs = tx.meta?.logMessages ?? [];
    if (
      logs.some((l) => l.includes("RequestReveal")) ||
      logs.some((l) => l.includes("SettleLot")) ||
      logs.some((l) => l.includes("CallbackReveal"))
    ) {
      console.log("*** relevant wallet tx", s.signature);
      await inspect(s.signature);
    }
  }
  console.log("done", STOCK_WARS_PROGRAM_ID.toBase58(), VRF_PROGRAM_ID.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
