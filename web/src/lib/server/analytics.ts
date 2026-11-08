import type { AssetResult, OnchainCampaignState } from "@/lib/types";

export const CONSENSUS_DISCLAIMER =
  "Results represent human majority consensus and are not verified ground truth.";

export type AssetAnalytics = {
  assetIndex: number;
  asset: string;
  contentHash: string;
  aiVotes: number;
  humanVotes: number;
  totalVotes: number;
  finalized: boolean;
  result: AssetResult;
  projectedResult: AssetResult;
  winningVotes: number;
  consensusRatio: number | null;
  rewardPool: number;
  rewardPerWinner: number;
  totalClaimed: number;
  remainingClaimable: number;
};

function projectResult(
  aiVotes: number,
  humanVotes: number,
  totalVotes: number,
  minVotes: number,
): AssetResult {
  if (totalVotes < minVotes) return "INSUFFICIENT_VOTES";
  if (aiVotes > humanVotes) return "AI_GENERATED";
  if (humanVotes > aiVotes) return "HUMAN_CREATED";
  return "TIE";
}

export function buildAnalytics(state: OnchainCampaignState) {
  const { campaign, assets } = state;
  const perAssetPool = Math.floor(campaign.totalBudget / campaign.expectedAssetCount);

  const rows: AssetAnalytics[] = assets.map((asset) => {
    const projectedResult = projectResult(
      asset.aiVotes,
      asset.humanVotes,
      asset.totalVotes,
      campaign.minVotes,
    );
    const leading = Math.max(asset.aiVotes, asset.humanVotes);
    const rewardPerWinner =
      asset.finalized && asset.winningVotes > 0
        ? Math.floor(asset.rewardPool / asset.winningVotes)
        : 0;
    return {
      assetIndex: asset.assetIndex,
      asset: asset.pubkey,
      contentHash: asset.contentHash,
      aiVotes: asset.aiVotes,
      humanVotes: asset.humanVotes,
      totalVotes: asset.totalVotes,
      finalized: asset.finalized,
      result: asset.result,
      projectedResult,
      winningVotes: asset.winningVotes,
      consensusRatio: asset.totalVotes > 0 ? leading / asset.totalVotes : null,
      rewardPool: asset.rewardPool,
      rewardPerWinner,
      totalClaimed: asset.totalClaimed,
      remainingClaimable: asset.finalized
        ? Math.max(0, asset.rewardPool - asset.totalClaimed)
        : 0,
    };
  });

  const distribution: Record<AssetResult, number> = {
    PENDING: 0,
    AI_GENERATED: 0,
    HUMAN_CREATED: 0,
    TIE: 0,
    INSUFFICIENT_VOTES: 0,
  };
  for (const row of rows) distribution[row.finalized ? row.result : "PENDING"] += 1;

  const totalVotes = rows.reduce((sum, row) => sum + row.totalVotes, 0);

  return {
    disclaimer: CONSENSUS_DISCLAIMER,
    campaign: {
      pubkey: campaign.pubkey,
      company: campaign.company,
      status: campaign.status,
      totalBudget: campaign.totalBudget,
      expectedAssetCount: campaign.expectedAssetCount,
      registeredAssetCount: campaign.registeredAssetCount,
      finalizedAssetCount: campaign.finalizedAssetCount,
      minVotes: campaign.minVotes,
      votingDeadline: campaign.votingDeadline,
      claimDeadline: campaign.claimDeadline,
      perAssetRewardPool: perAssetPool,
      totalClaimed: campaign.totalClaimed,
      claimedRatio:
        campaign.totalBudget > 0 ? campaign.totalClaimed / campaign.totalBudget : 0,
    },
    totals: {
      totalVotes,
      averageVotesPerAsset: rows.length > 0 ? totalVotes / rows.length : 0,
      assetsMeetingMinVotes: rows.filter((row) => row.totalVotes >= campaign.minVotes)
        .length,
      resultDistribution: distribution,
      remainingClaimable: rows.reduce((sum, row) => sum + row.remainingClaimable, 0),
    },
    assets: rows,
  };
}

export function analyticsToCsv(rows: AssetAnalytics[]): string {
  const header = [
    "asset_index",
    "asset",
    "content_hash",
    "ai_votes",
    "human_votes",
    "total_votes",
    "finalized",
    "result",
    "projected_result",
    "winning_votes",
    "consensus_ratio",
    "reward_pool_lamports",
    "reward_per_winner_lamports",
    "total_claimed_lamports",
  ];
  const lines = rows.map((row) =>
    [
      row.assetIndex,
      row.asset,
      row.contentHash,
      row.aiVotes,
      row.humanVotes,
      row.totalVotes,
      row.finalized,
      row.result,
      row.projectedResult,
      row.winningVotes,
      row.consensusRatio === null ? "" : row.consensusRatio.toFixed(6),
      row.rewardPool,
      row.rewardPerWinner,
      row.totalClaimed,
    ].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}