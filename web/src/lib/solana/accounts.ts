import { BorshAccountsCoder } from "@anchor-lang/core";
import type { PublicKey } from "@solana/web3.js";

import type {
  OnchainAsset,
  OnchainCampaign,
  OnchainVote,
} from "@/lib/types";

import {
  bytesToHex,
  decodeClassification,
  decodeResult,
  decodeStatus,
  field,
  toNumber,
} from "./codec";
import { GOLEM_IDL } from "./idl";

const coder = new BorshAccountsCoder(GOLEM_IDL);

export function decodeCampaign(pubkey: PublicKey, data: Buffer): OnchainCampaign {
  const d: unknown = coder.decode("Campaign", data);
  return {
    pubkey: pubkey.toBase58(),
    company: (field(d, "company") as PublicKey).toBase58(),
    campaignId: toNumber(field(d, "campaignId")),
    totalBudget: toNumber(field(d, "totalBudget")),
    expectedAssetCount: toNumber(field(d, "expectedAssetCount")),
    registeredAssetCount: toNumber(field(d, "registeredAssetCount")),
    minVotes: toNumber(field(d, "minVotes")),
    votingDeadline: toNumber(field(d, "votingDeadline")),
    claimDeadline: toNumber(field(d, "claimDeadline")),
    status: decodeStatus(field(d, "status")),
    finalizedAssetCount: toNumber(field(d, "finalizedAssetCount")),
    totalClaimed: toNumber(field(d, "totalClaimed")),
  };
}

export function decodeAsset(pubkey: PublicKey, data: Buffer): OnchainAsset {
  const d: unknown = coder.decode("Asset", data);
  return {
    pubkey: pubkey.toBase58(),
    campaign: (field(d, "campaign") as PublicKey).toBase58(),
    assetIndex: toNumber(field(d, "assetIndex")),
    contentHash: bytesToHex(field(d, "contentHash")),
    aiVotes: toNumber(field(d, "aiVotes")),
    humanVotes: toNumber(field(d, "humanVotes")),
    totalVotes: toNumber(field(d, "totalVotes")),
    result: decodeResult(field(d, "result")),
    winningVotes: toNumber(field(d, "winningVotes")),
    rewardPool: toNumber(field(d, "rewardPool")),
    totalClaimed: toNumber(field(d, "totalClaimed")),
    finalized: Boolean(field(d, "finalized")),
  };
}

export function decodeVote(pubkey: PublicKey, data: Buffer): OnchainVote {
  const d: unknown = coder.decode("Vote", data);
  return {
    pubkey: pubkey.toBase58(),
    asset: (field(d, "asset") as PublicKey).toBase58(),
    participant: (field(d, "participant") as PublicKey).toBase58(),
    classification: decodeClassification(field(d, "classification")),
    claimed: Boolean(field(d, "claimed")),
  };
}