import fs from "node:fs";
import { Connection } from "@solana/web3.js";

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

const signatures = process.argv.slice(2);

async function main() {
  for (const signature of signatures) {
    const tx = await er.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    console.log("signature", signature);
    if (!tx) {
      console.log("not found");
      continue;
    }
    console.log("slot", tx.slot, "err", JSON.stringify(tx.meta?.err));
    console.log("logs:");
    for (const line of tx.meta?.logMessages ?? []) console.log(line);
    console.log("message account keys:");
    tx.transaction.message.staticAccountKeys.forEach((k, i) =>
      console.log(i, k.toBase58(), tx.transaction.message.isAccountSigner(i), tx.transaction.message.isAccountWritable(i))
    );
    console.log("instructions:");
    for (const ix of tx.transaction.message.compiledInstructions) {
      const pid = tx.transaction.message.staticAccountKeys[ix.programIdIndex];
      console.log("program", pid.toBase58(), "accounts", ix.accountKeyIndexes.map((i) => tx.transaction.message.staticAccountKeys[i]?.toBase58()), "data", Buffer.from(ix.data).toString("hex"));
    }
    console.log("inner instructions:");
    for (const group of tx.meta?.innerInstructions ?? []) {
      for (const ix of group.instructions) {
        if ("programIdIndex" in ix) {
          const pid = tx.transaction.message.staticAccountKeys[ix.programIdIndex];
          console.log("inner", group.index, "program", pid.toBase58(), "accounts", ix.accounts.map((i) => tx.transaction.message.staticAccountKeys[i]?.toBase58()), "data", Buffer.from(ix.data, "base64").toString("hex"));
        } else {
          console.log("inner parsed", group.index, JSON.stringify(ix));
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
