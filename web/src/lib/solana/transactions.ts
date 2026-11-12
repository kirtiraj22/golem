import { BN } from "@anchor-lang/core";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

import { MAX_ASSETS, MAX_SAFE_ID, type Classification } from "@/lib/types";

import { encodeClassification, hexToBytes } from "./codec";
import { findAssetPda, findCampaignPda, findVotePda } from "./pda";
import { requireWalletKey, type GolemProgram } from "./program";

export type CreateCampaignParams = {
  campaignId: number;
  expectedAssetCount: number;
  totalBudgetLamports: bigint;
  minVotes: bigint;
  votingDeadline: number;
  claimDeadline: number;
};

const U64_MAX = (1n << 64n) - 1n;

function u64(value: bigint): BN {
  if (value < 0n || value > U64_MAX) throw new Error("Value does not fit in u64");
  return new BN(value.toString());
}

function i64(value: number): BN {
  if (!Number.isSafeInteger(value)) throw new Error("Invalid timestamp");
  return new BN(value.toString());
}

function checkIndex(assetIndex: number) {
  if (!Number.isInteger(assetIndex) || assetIndex < 0 || assetIndex >= MAX_ASSETS) {
    throw new Error("Invalid asset index");
  }
}

export function generateCampaignId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

export async function createCampaign(
  program: GolemProgram,
  params: CreateCampaignParams,
): Promise<{ signature: string; campaign: PublicKey }> {
  const company = requireWalletKey(program);
  if (
    !Number.isSafeInteger(params.campaignId) ||
    params.campaignId < 0 ||
    params.campaignId > MAX_SAFE_ID
  ) {
    throw new Error("campaignId must be a non-negative safe integer");
  }
  if (
    !Number.isInteger(params.expectedAssetCount) ||
    params.expectedAssetCount < 1 ||
    params.expectedAssetCount > MAX_ASSETS
  ) {
    throw new Error(`Asset count must be between 1 and ${MAX_ASSETS}`);
  }
  if (params.totalBudgetLamports > BigInt(MAX_SAFE_ID)) {
    throw new Error("Budget is too large");
  }
  if (params.minVotes > BigInt(MAX_SAFE_ID)) {
    throw new Error("Minimum votes is too large");
  }
  const [campaign] = findCampaignPda(company, params.campaignId);
  const signature = await program.methods
    .createCampaign(
      u64(BigInt(params.campaignId)),
      params.expectedAssetCount,
      u64(params.totalBudgetLamports),
      u64(params.minVotes),
      i64(params.votingDeadline),
      i64(params.claimDeadline),
    )
    .accounts({
      company,
      campaign,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  return { signature, campaign };
}

export async function registerAsset(
  program: GolemProgram,
  campaign: PublicKey,
  assetIndex: number,
  contentHashHex: string,
): Promise<{ signature: string; asset: PublicKey }> {
  const company = requireWalletKey(program);
  checkIndex(assetIndex);
  const [asset] = findAssetPda(campaign, assetIndex);
  const signature = await program.methods
    .registerAsset(assetIndex, hexToBytes(contentHashHex))
    .accounts({
      company,
      campaign,
      asset,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  return { signature, asset };
}

export async function fundCampaign(
  program: GolemProgram,
  campaign: PublicKey,
): Promise<string> {
  const company = requireWalletKey(program);
  return program.methods
    .fundCampaign()
    .accounts({
      company,
      campaign,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function vote(
  program: GolemProgram,
  campaign: PublicKey,
  assetIndex: number,
  classification: Classification,
): Promise<{ signature: string; asset: PublicKey; vote: PublicKey }> {
  const participant = requireWalletKey(program);
  checkIndex(assetIndex);
  const [asset] = findAssetPda(campaign, assetIndex);
  const [votePda] = findVotePda(asset, participant);
  const signature = await program.methods
    .vote(encodeClassification(classification))
    .accounts({
      participant,
      campaign,
      asset,
      vote: votePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  return { signature, asset, vote: votePda };
}

export async function closeCampaign(
  program: GolemProgram,
  campaign: PublicKey,
): Promise<string> {
  const caller = requireWalletKey(program);
  return program.methods
    .closeCampaign()
    .accounts({ caller, campaign })
    .rpc();
}

export async function finalizeAsset(
  program: GolemProgram,
  campaign: PublicKey,
  assetIndex: number,
): Promise<string> {
  checkIndex(assetIndex);
  const [asset] = findAssetPda(campaign, assetIndex);
  return program.methods
    .finalizeAsset()
    .accounts({ campaign, asset })
    .rpc();
}

export async function finalizeAssets(
  program: GolemProgram,
  campaign: PublicKey,
  assetIndices: number[],
  perTransaction = 4,
): Promise<string[]> {
  const signatures: string[] = [];
  for (let start = 0; start < assetIndices.length; start += perTransaction) {
    const slice = assetIndices.slice(start, start + perTransaction);
    const transaction = new Transaction();
    for (const assetIndex of slice) {
      checkIndex(assetIndex);
      const [asset] = findAssetPda(campaign, assetIndex);
      transaction.add(
        await program.methods
          .finalizeAsset()
          .accounts({ campaign, asset })
          .instruction(),
      );
    }
    signatures.push(await program.provider.sendAndConfirm!(transaction));
  }
  return signatures;
}

export async function claimReward(
  program: GolemProgram,
  campaign: PublicKey,
  assetIndex: number,
): Promise<string> {
  const participant = requireWalletKey(program);
  checkIndex(assetIndex);
  const [asset] = findAssetPda(campaign, assetIndex);
  const [votePda] = findVotePda(asset, participant);
  return program.methods
    .claimReward()
    .accounts({ participant, campaign, asset, vote: votePda })
    .rpc();
}

export async function refundCampaign(
  program: GolemProgram,
  campaign: PublicKey,
): Promise<string> {
  const company = requireWalletKey(program);
  return program.methods
    .refundCampaign()
    .accounts({ company, campaign })
    .rpc();
}

export function describeError(error: unknown): string {
  const record = error as {
    error?: { errorMessage?: string; errorCode?: { code?: string } };
    message?: string;
    logs?: string[];
  };
  if (record?.error?.errorMessage) return record.error.errorMessage;
  if (record?.error?.errorCode?.code) return record.error.errorCode.code;
  const logged = record?.logs?.find((line) => line.includes("Error Message:"));
  if (logged) return logged.split("Error Message:")[1].trim();
  return record?.message ?? "Transaction failed";
}