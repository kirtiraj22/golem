import fs from "node:fs";
import { Connection } from "@solana/web3.js";
import bs58 from "bs58";

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
    console.log("=== tx", signature, "slot", tx?.slot, "err", JSON.stringify(tx?.meta?.err));
    if (!tx) continue;
    console.log("logs:");
    for (const line of tx.meta?.logMessages ?? []) console.log(line);
    console.log("outer:");
    for (const ix of tx.transaction.message.compiledInstructions) {
      const pid = tx.transaction.message.staticAccountKeys[ix.programIdIndex]!;
      const data = Buffer.from(ix.data);
      console.log(
        pid.toBase58(),
        "len",
        data.length,
        "hex",
        data.toString("hex"),
        "accounts",
        ix.accountKeyIndexes.map((i) => tx.transaction.message.staticAccountKeys[i]?.toBase58())
      );
    }
    console.log("inner:");
    for (const group of tx.meta?.innerInstructions ?? []) {
      for (const ix of group.instructions) {
        if (!("programIdIndex" in ix)) continue;
        const pid = tx.transaction.message.staticAccountKeys[ix.programIdIndex]!;
        let data: Uint8Array;
        try {
          data = bs58.decode(ix.data);
        } catch {
          data = Buffer.from(ix.data, "base64");
        }
        console.log(
          group.index,
          pid.toBase58(),
          "len",
          data.length,
          "hex",
          Buffer.from(data).toString("hex"),
          "accounts",
          ix.accounts.map((i) => tx.transaction.message.staticAccountKeys[i]?.toBase58())
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
