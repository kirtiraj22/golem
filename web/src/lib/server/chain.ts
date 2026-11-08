import { Connection, PublicKey } from "@solana/web3.js";

import { notFound, unprocessable } from "@/lib/errors";
import { decodeAsset, decodeCampaign } from "@/lib/solana/accounts";
import { COMMITMENT, PROGRAM_ID, RPC_URL } from "@/lib/solana/constants";
import { findAssetPda, findCampaignPda } from "@/lib/solana/pda";
import type {
  OnchainAsset,
  OnchainCampaign,
  OnchainCampaignState,
} from "@/lib/types";

let connection: Connection | null = null;

export function getConnection(): Connection {
  connection ??= new Connection(RPC_URL, COMMITMENT);
  return connection;
}

export async function fetchCampaign(
  pubkey: PublicKey,
): Promise<OnchainCampaign | null> {
  const info = await getConnection().getAccountInfo(pubkey, COMMITMENT);
  if (!info) return null;
  if (!info.owner.equals(PROGRAM_ID)) {
    throw unprocessable("Account is not owned by the Golem program");
  }
  let campaign: OnchainCampaign;
  try {
    campaign = decodeCampaign(pubkey, info.data);
  } catch {
    throw unprocessable("Account is not a Golem campaign");
  }
  const [expected] = findCampaignPda(
    new PublicKey(campaign.company),
    campaign.campaignId,
  );
  if (!expected.equals(pubkey)) {
    throw unprocessable("Campaign address does not match its PDA seeds");
  }
  return campaign;
}

export async function fetchAsset(pubkey: PublicKey): Promise<OnchainAsset | null> {
  const info = await getConnection().getAccountInfo(pubkey, COMMITMENT);
  if (!info) return null;
  if (!info.owner.equals(PROGRAM_ID)) {
    throw unprocessable("Account is not owned by the Golem program");
  }
  try {
    return decodeAsset(pubkey, info.data);
  } catch {
    throw unprocessable("Account is not a Golem asset");
  }
}

export async function fetchCampaignState(
  pubkey: PublicKey,
): Promise<OnchainCampaignState | null> {
  const campaign = await fetchCampaign(pubkey);
  if (!campaign) return null;

  const addresses: PublicKey[] = [];
  for (let index = 0; index < campaign.registeredAssetCount; index += 1) {
    addresses.push(findAssetPda(pubkey, index)[0]);
  }

  const assets: OnchainAsset[] = [];
  for (let start = 0; start < addresses.length; start += 100) {
    const slice = addresses.slice(start, start + 100);
    const infos = await getConnection().getMultipleAccountsInfo(slice, COMMITMENT);
    infos.forEach((info, offset) => {
      if (!info || !info.owner.equals(PROGRAM_ID)) return;
      const asset = decodeAsset(slice[offset], info.data);
      if (asset.campaign === campaign.pubkey) assets.push(asset);
    });
  }
  assets.sort((a, b) => a.assetIndex - b.assetIndex);
  return { campaign, assets };
}

export async function requireCampaignState(
  pubkey: PublicKey,
): Promise<OnchainCampaignState> {
  const state = await fetchCampaignState(pubkey);
  if (!state) throw notFound("Campaign account not found on-chain");
  return state;
}