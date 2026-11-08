import type { AssetResultDb, CampaignStatusDb } from "@/lib/db/database.types";

export type Classification = "AI_GENERATED" | "HUMAN_CREATED";
export type CampaignStatus = CampaignStatusDb;
export type AssetResult = AssetResultDb;

export type OnchainCampaign = {
  pubkey: string;
  company: string;
  campaignId: number;
  totalBudget: number;
  expectedAssetCount: number;
  registeredAssetCount: number;
  minVotes: number;
  votingDeadline: number;
  claimDeadline: number;
  status: CampaignStatus;
  finalizedAssetCount: number;
  totalClaimed: number;
};

export type OnchainAsset = {
  pubkey: string;
  campaign: string;
  assetIndex: number;
  contentHash: string;
  aiVotes: number;
  humanVotes: number;
  totalVotes: number;
  result: AssetResult;
  winningVotes: number;
  rewardPool: number;
  totalClaimed: number;
  finalized: boolean;
};

export type OnchainVote = {
  pubkey: string;
  asset: string;
  participant: string;
  classification: Classification;
  claimed: boolean;
};

export type OnchainCampaignState = {
  campaign: OnchainCampaign;
  assets: OnchainAsset[];
};

export const MAX_ASSETS = 500;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_SAFE_ID = Number.MAX_SAFE_INTEGER;