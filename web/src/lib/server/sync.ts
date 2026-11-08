import { PublicKey } from "@solana/web3.js";

import { conflict, dbFailure, notFound } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { OnchainCampaignState } from "@/lib/types";

import { requireCampaignState } from "./chain";

async function inChunks<T>(
  items: T[],
  size: number,
  task: (item: T) => Promise<void>,
) {
  for (let start = 0; start < items.length; start += size) {
    await Promise.all(items.slice(start, start + size).map(task));
  }
}

export async function syncCampaign(
  campaignPubkey: string,
): Promise<OnchainCampaignState & { isListed: boolean }> {
  const admin = supabaseAdmin();

  const { data: row, error: rowError } = await admin
    .from("campaign_metadata")
    .select("campaign_pubkey, company_wallet, campaign_id, is_listed")
    .eq("campaign_pubkey", campaignPubkey)
    .maybeSingle();
  if (rowError) throw dbFailure(rowError);
  if (!row) throw notFound("Campaign not found");

  const state = await requireCampaignState(new PublicKey(campaignPubkey));
  const { campaign, assets } = state;

  if (
    campaign.company !== row.company_wallet ||
    campaign.campaignId !== row.campaign_id
  ) {
    throw conflict("Stored campaign metadata does not match on-chain state");
  }

  const isListed = row.is_listed || campaign.status !== "DRAFT";
  const syncedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from("campaign_metadata")
    .update({
      onchain_status: campaign.status,
      cached_registered_asset_count: campaign.registeredAssetCount,
      cached_finalized_asset_count: campaign.finalizedAssetCount,
      cached_total_claimed_lamports: campaign.totalClaimed,
      is_listed: isListed,
      last_synced_at: syncedAt,
    })
    .eq("campaign_pubkey", campaignPubkey);
  if (updateError) throw dbFailure(updateError);

  const { data: stored, error: storedError } = await admin
    .from("asset_metadata")
    .select("asset_index, content_hash")
    .eq("campaign_pubkey", campaignPubkey);
  if (storedError) throw dbFailure(storedError);

  const hashByIndex = new Map(
    (stored ?? []).map((item) => [item.asset_index, item.content_hash]),
  );
  const matching = assets.filter(
    (asset) => hashByIndex.get(asset.assetIndex) === asset.contentHash,
  );

  await inChunks(matching, 20, async (asset) => {
    const { error } = await admin
      .from("asset_metadata")
      .update({
        asset_pubkey: asset.pubkey,
        cached_ai_votes: asset.aiVotes,
        cached_human_votes: asset.humanVotes,
        cached_total_votes: asset.totalVotes,
        cached_result: asset.result,
        cached_winning_votes: asset.winningVotes,
        cached_reward_pool_lamports: asset.rewardPool,
        cached_finalized: asset.finalized,
        last_synced_at: syncedAt,
      })
      .eq("campaign_pubkey", campaignPubkey)
      .eq("asset_index", asset.assetIndex);
    if (error) throw dbFailure(error);
  });

  return { ...state, isListed };
}