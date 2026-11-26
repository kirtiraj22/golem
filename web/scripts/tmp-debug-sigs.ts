import fs from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { lotPda } from "../src/lib/solana/stock-wars";

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
const base = new Connection(
  process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    "https://api.devnet.solana.com",
  "confirmed"
);
const wallet = new PublicKey("8r4mGjR7Xv69orLAnx8w4QJ9nj9sLdMsqU6m9yfMfwJ2");
const lot = lotPda(wallet, 129);

async function sigs(conn: Connection, address: PublicKey, label: string) {
  try {
    const list = await conn.getSignaturesForAddress(address, { limit: 25 });
    console.log(label, list.length);
    for (const s of list) {
      console.log(
        label,
        s.signature,
        s.slot,
        s.blockTime ? new Date(s.blockTime * 1000).toISOString() : "",
        s.err ? JSON.stringify(s.err) : "ok",
        s.memo ?? ""
      );
    }
    return list;
  } catch (e) {
    console.log(label, "error", e instanceof Error ? e.message : e);
    return [];
  }
}

async function main() {
  console.log("lot", lot.toBase58());
  await sigs(er, lot, "ER-lot");
  await sigs(base, lot, "BASE-lot");
  await sigs(er, wallet, "ER-wallet");
  await sigs(base, wallet, "BASE-wallet");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
