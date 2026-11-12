import type { PublicKey } from "@solana/web3.js";

import type { Classification } from "@/lib/types";

import type { CampaignRow, GolemApi, IndexResponse } from "./api";
import { sha256HexOfBytes } from "./format";
import type { GolemProgram } from "./program";
import {
  claimReward,
  closeCampaign,
  createCampaign,
  finalizeAssets,
  fundCampaign,
  generateCampaignId,
  refundCampaign,
  registerAsset,
  vote,
  type CreateCampaignParams,
} from "./transactions";

export type Settled = {
  signature: string;
  indexed: IndexResponse | null;
  indexError: string | null;
};

export async function settle(api: GolemApi, signature: string): Promise<Settled> {
  try {
    const indexed = await api.verifyTransaction(signature);
    return { signature, indexed, indexError: null };
  } catch (error) {
    return {
      signature,
      indexed: null,
      indexError: error instanceof Error ? error.message : "Indexing failed",
    };
  }
}

export type CreateCampaignInput = Omit<CreateCampaignParams, "campaignId"> & {
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
};

export async function createCampaignFlow(
  program: GolemProgram,
  api: GolemApi,
  input: CreateCampaignInput,
): Promise<{ campaign: PublicKey; signature: string; metadata: CampaignRow }> {
  const { title, description, category, tags, ...params } = input;
  const { signature, campaign } = await createCampaign(program, {
    ...params,
    campaignId: generateCampaignId(),
  });
  const { campaign: metadata } = await api.createCampaign({
    signature,
    title,
    description: description ?? null,
    category: category ?? null,
    tags: tags ?? [],
  });
  return { campaign, signature, metadata };
}

export async function uploadAndRegisterAsset(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
  file: File,
  caption?: string,
): Promise<{ assetIndex: number; contentHash: string; signature: string; asset: PublicKey }> {
  const localHash = await sha256HexOfBytes(await file.arrayBuffer());
  const uploaded = await api.uploadAsset(campaign.toBase58(), file, caption);
  if (uploaded.contentHash !== localHash) {
    await api.deleteAsset(campaign.toBase58(), uploaded.assetIndex);
    throw new Error("Server hash does not match the local file hash");
  }
  return registerUploadedAsset(
    program,
    api,
    campaign,
    uploaded.assetIndex,
    uploaded.contentHash,
  );
}

export async function registerUploadedAsset(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
  assetIndex: number,
  contentHash: string,
): Promise<{ assetIndex: number; contentHash: string; signature: string; asset: PublicKey }> {
  const { signature, asset } = await registerAsset(
    program,
    campaign,
    assetIndex,
    contentHash,
  );
  await api.confirmAssetRegistration(campaign.toBase58(), assetIndex, signature);
  return { assetIndex, contentHash, signature, asset };
}

export async function fundFlow(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
): Promise<Settled> {
  return settle(api, await fundCampaign(program, campaign));
}

export async function voteFlow(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
  assetIndex: number,
  classification: Classification,
): Promise<Settled> {
  const { signature } = await vote(program, campaign, assetIndex, classification);
  return settle(api, signature);
}

export async function closeFlow(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
): Promise<Settled> {
  return settle(api, await closeCampaign(program, campaign));
}

export async function finalizeFlow(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
  assetIndices: number[],
): Promise<Settled[]> {
  const signatures = await finalizeAssets(program, campaign, assetIndices);
  const results: Settled[] = [];
  for (const signature of signatures) results.push(await settle(api, signature));
  return results;
}

export async function claimFlow(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
  assetIndex: number,
): Promise<Settled> {
  return settle(api, await claimReward(program, campaign, assetIndex));
}

export async function refundFlow(
  program: GolemProgram,
  api: GolemApi,
  campaign: PublicKey,
): Promise<Settled> {
  return settle(api, await refundCampaign(program, campaign));
}