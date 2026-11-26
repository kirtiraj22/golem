import fs from "node:fs";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  decodeLotBid,
  decodePlayerState,
  DELEGATION_PROGRAM_ID,
  lotPda,
  playerPda,
  STOCK_WARS_PROGRAM_ID,
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

const base = new Connection(
  process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    clusterApiUrl("devnet"),
  "confirmed"
);
const er = new Connection(
  process.env.MAGICBLOCK_ER_RPC_URL?.trim() || "https://devnet.magicblock.app",
  "confirmed"
);
const wallet = new PublicKey("8r4mGjR7Xv69orLAnx8w4QJ9nj9sLdMsqU6m9yfMfwJ2");

async function delegationStatus(url: string, account: PublicKey) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getDelegationStatus",
        params: [account.toBase58()],
      }),
    });
    return await res.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const pda = playerPda(wallet);
  console.log("wallet", wallet.toBase58());
  console.log("playerPda", pda.toBase58());
  console.log(
    "player delegation",
    JSON.stringify(await delegationStatus(er.rpcEndpoint, pda))
  );
  const [b, e] = await Promise.all([
    base.getAccountInfo(pda, "confirmed"),
    er.getAccountInfo(pda, "confirmed"),
  ]);
  console.log(
    "player base",
    b
      ? { owner: b.owner.toBase58(), len: b.data.length, lamports: b.lamports }
      : null
  );
  console.log(
    "player er",
    e
      ? {
          owner: e.owner.toBase58(),
          len: e.data.length,
          lamports: e.lamports,
          decoded: decodePlayerState(e.data),
        }
      : null
  );

  for (let listing = 126; listing <= 133; listing += 1) {
    const lot = lotPda(wallet, listing);
    const [bi, ei, ds] = await Promise.all([
      base.getAccountInfo(lot, "confirmed"),
      er.getAccountInfo(lot, "confirmed"),
      delegationStatus(er.rpcEndpoint, lot),
    ]);
    console.log(
      "lot",
      listing,
      JSON.stringify({
        pda: lot.toBase58(),
        base: bi
          ? { owner: bi.owner.toBase58(), len: bi.data.length }
          : null,
        er: ei
          ? {
              owner: ei.owner.toBase58(),
              len: ei.data.length,
              decoded: decodeLotBid(ei.data),
            }
          : null,
        delegation: ds,
        baseOwnerIsProgram: bi?.owner.equals(STOCK_WARS_PROGRAM_ID),
        baseOwnerIsDelegation: bi?.owner.equals(DELEGATION_PROGRAM_ID),
      })
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
