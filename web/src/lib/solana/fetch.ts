import type { Connection, PublicKey } from "@solana/web3.js";

import type {
  OnchainAsset,
  OnchainCampaign,
  OnchainCampaignState,
  OnchainVote,
} from "@/lib/types";

import { decodeAsset, decodeCampaign, decodeVote } from "./accounts";
import { COMMITMENT, PROGRAM_ID } from "./constants";
import { findAssetPda, findCampaignPda, findVotePda } from "./pda";

export async function fetchCampaignAccount(
  connection: Connection,
  campaign: PublicKey,
): Promise<OnchainCampaign | null> {
  const info = await connection.getAccountInfo(campaign, COMMITMENT);
  if (!info || !info.owner.equals(PROGRAM_ID)) return null;
  const decoded = decodeCampaign(campaign, info.data);
  const [expected] = findCampaignPda(
    new (campaign.constructor as new (value: string) => PublicKey)(decoded.company),
    decoded.campaignId,
  );
  if (!expected.equals(campaign)) return null;
  return decoded;
}

export async function fetchAssetAccount(
  connection: Connection,
  asset: PublicKey,
): Promise<OnchainAsset | null> {
  const info = await connection.getAccountInfo(asset, COMMITMENT);
  if (!info || !info.owner.equals(PROGRAM_ID)) return null;
  return decodeAsset(asset, info.data);
}

export async function fetchCampaignWithAssets(
  connection: Connection,
  campaign: PublicKey,
): Promise<OnchainCampaignState | null> {
  const decoded = await fetchCampaignAccount(connection, campaign);
  if (!decoded) return null;

  const addresses: PublicKey[] = [];
  for (let index = 0; index < decoded.registeredAssetCount; index += 1) {
    addresses.push(findAssetPda(campaign, index)[0]);
  }

  const assets: OnchainAsset[] = [];
  for (let start = 0; start < addresses.length; start += 100) {
    const slice = addresses.slice(start, start + 100);
    const infos = await connection.getMultipleAccountsInfo(slice, COMMITMENT);
    infos.forEach((info, offset) => {
      if (!info || !info.owner.equals(PROGRAM_ID)) return;
      const asset = decodeAsset(slice[offset], info.data);
      if (asset.campaign === decoded.pubkey) assets.push(asset);
    });
  }
  assets.sort((a, b) => a.assetIndex - b.assetIndex);
  return { campaign: decoded, assets };
}

export async function fetchVoteAccount(
  connection: Connection,
  asset: PublicKey,
  participant: PublicKey,
): Promise<OnchainVote | null> {
  const [address] = findVotePda(asset, participant);
  const info = await connection.getAccountInfo(address, COMMITMENT);
  if (!info || !info.owner.equals(PROGRAM_ID)) return null;
  return decodeVote(address, info.data);
}

export async function fetchParticipantVotes(
  connection: Connection,
  assets: OnchainAsset[],
  participant: PublicKey,
  assetKeys: PublicKey[],
): Promise<Map<number, OnchainVote>> {
  const votes = new Map<number, OnchainVote>();
  const addresses = assetKeys.map((asset) => findVotePda(asset, participant)[0]);
  for (let start = 0; start < addresses.length; start += 100) {
    const slice = addresses.slice(start, start + 100);
    const infos = await connection.getMultipleAccountsInfo(slice, COMMITMENT);
    infos.forEach((info, offset) => {
      if (!info || !info.owner.equals(PROGRAM_ID)) return;
      const vote = decodeVote(slice[offset], info.data);
      const asset = assets[start + offset];
      if (asset && vote.asset === asset.pubkey) votes.set(asset.assetIndex, vote);
    });
  }
  return votes;
}

export function claimableReward(
  asset: OnchainAsset,
  vote: OnchainVote | null,
): number {
  if (!vote || vote.claimed || !asset.finalized || asset.winningVotes <= 0) {
    return 0;
  }
  const winning =
    asset.result === "AI_GENERATED"
      ? "AI_GENERATED"
      : asset.result === "HUMAN_CREATED"
        ? "HUMAN_CREATED"
        : null;
  if (!winning || vote.classification !== winning) return 0;
  return Math.floor(asset.rewardPool / asset.winningVotes);
}