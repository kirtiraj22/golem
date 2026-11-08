import { BorshCoder, EventParser } from "@anchor-lang/core";
import { PublicKey, type PartiallyDecodedInstruction } from "@solana/web3.js";

import type { ChainInstructionDb, Json } from "@/lib/db/database.types";
import { notFound, unprocessable } from "@/lib/errors";
import { field, norm, toNumber } from "@/lib/solana/codec";
import { COMMITMENT, PROGRAM_ID } from "@/lib/solana/constants";
import { GOLEM_IDL } from "@/lib/solana/idl";

import { getConnection } from "./chain";

export type VerifiedInstruction = {
  index: number;
  name: ChainInstructionDb;
  campaign: string;
  asset: string | null;
  wallet: string;
  amountLamports: number | null;
  event: Json | null;
};

export type VerifiedTransaction = {
  signature: string;
  slot: number;
  blockTime: string | null;
  feePayer: string;
  instructions: VerifiedInstruction[];
};

const coder = new BorshCoder(GOLEM_IDL);
const parser = new EventParser(PROGRAM_ID, coder);

const INSTRUCTIONS: Record<string, ChainInstructionDb> = {
  createcampaign: "create_campaign",
  registerasset: "register_asset",
  fundcampaign: "fund_campaign",
  vote: "vote",
  closecampaign: "close_campaign",
  finalizeasset: "finalize_asset",
  claimreward: "claim_reward",
  refundcampaign: "refund_campaign",
};

const EVENT_FOR: Record<ChainInstructionDb, string> = {
  create_campaign: "CampaignCreated",
  register_asset: "AssetRegistered",
  fund_campaign: "CampaignFunded",
  vote: "VoteCast",
  close_campaign: "CampaignClosed",
  finalize_asset: "AssetFinalized",
  claim_reward: "RewardClaimed",
  refund_campaign: "CampaignRefunded",
};

const SIGNER_ACCOUNT: Record<ChainInstructionDb, string | null> = {
  create_campaign: "company",
  register_asset: "company",
  fund_campaign: "company",
  vote: "participant",
  close_campaign: "caller",
  finalize_asset: null,
  claim_reward: "participant",
  refund_campaign: "company",
};

const AMOUNT_INSTRUCTIONS = new Set<ChainInstructionDb>([
  "fund_campaign",
  "claim_reward",
  "refund_campaign",
]);

function jsonify(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (value instanceof PublicKey) return value.toBase58();
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonify);
  if (typeof value === "object") {
    if ("toArrayLike" in value) return String(value);
    const out: { [key: string]: Json } = {};
    for (const [key, entry] of Object.entries(value)) out[key] = jsonify(entry);
    return out;
  }
  return null;
}

export async function verifyTransaction(
  signature: string,
): Promise<VerifiedTransaction> {
  const parsed = await getConnection().getParsedTransaction(signature, {
    commitment: COMMITMENT,
    maxSupportedTransactionVersion: 0,
  });
  if (!parsed) throw notFound("Transaction not found or not yet confirmed");
  if (!parsed.meta) throw unprocessable("Transaction metadata is unavailable");
  if (parsed.meta.err) throw unprocessable("Transaction failed on-chain");

  const viaCpi = (parsed.meta.innerInstructions ?? []).some((group) =>
    group.instructions.some((ix) => ix.programId.equals(PROGRAM_ID)),
  );
  if (viaCpi) {
    throw unprocessable("Golem instructions invoked through CPI are not supported");
  }

  const feePayer = parsed.transaction.message.accountKeys[0].pubkey.toBase58();

  const golem: { position: number; ix: PartiallyDecodedInstruction }[] = [];
  parsed.transaction.message.instructions.forEach((ix, position) => {
    if (ix.programId.equals(PROGRAM_ID) && "data" in ix) golem.push({ position, ix });
  });
  if (golem.length === 0) {
    throw unprocessable("Transaction contains no Golem instructions");
  }

  const events = Array.from(parser.parseLogs(parsed.meta.logMessages ?? []));
  const aligned = events.length === golem.length;

  const instructions: VerifiedInstruction[] = golem.map(({ position, ix }, i) => {
    const decoded = coder.instruction.decode(ix.data, "base58");
    if (!decoded) throw unprocessable("Unrecognized Golem instruction data");
    const name = INSTRUCTIONS[norm(decoded.name)];
    if (!name) throw unprocessable("Unsupported Golem instruction");

    const idlInstruction = GOLEM_IDL.instructions.find(
      (candidate) => norm(candidate.name) === norm(decoded.name),
    );
    if (!idlInstruction) throw unprocessable("Instruction missing from IDL");

    const accounts = new Map<string, string>();
    idlInstruction.accounts.forEach((account, accountIndex) => {
      const key = ix.accounts[accountIndex];
      if (key) accounts.set(norm(account.name), key.toBase58());
    });

    const campaign = accounts.get("campaign");
    if (!campaign) throw unprocessable("Instruction has no campaign account");

    const signerAccount = SIGNER_ACCOUNT[name];
    const wallet = signerAccount ? accounts.get(norm(signerAccount)) : feePayer;
    if (!wallet) throw unprocessable("Instruction has no signer account");

    let event: Json | null = null;
    let amountLamports: number | null = null;
    if (aligned) {
      const emitted = events[i];
      if (emitted.name !== EVENT_FOR[name]) {
        throw unprocessable("Emitted event does not match the instruction");
      }
      event = { event: emitted.name, data: jsonify(emitted.data) };
      if (AMOUNT_INSTRUCTIONS.has(name)) {
        amountLamports = toNumber(field(emitted.data, "amount"));
      }
    }

    return {
      index: position,
      name,
      campaign,
      asset: accounts.get("asset") ?? null,
      wallet,
      amountLamports,
      event,
    };
  });

  return {
    signature,
    slot: parsed.slot,
    blockTime: parsed.blockTime
      ? new Date(parsed.blockTime * 1000).toISOString()
      : null,
    feePayer,
    instructions,
  };
}