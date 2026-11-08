import { PublicKey } from "@solana/web3.js";

import { PROGRAM_ID } from "./constants";

const encoder = new TextEncoder();

function u64le(value: bigint | number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(value), true);
  return out;
}

function u32le(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

export function findCampaignPda(
  company: PublicKey,
  campaignId: bigint | number,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("campaign"), company.toBytes(), u64le(campaignId)],
    programId,
  );
}

export function findAssetPda(
  campaign: PublicKey,
  assetIndex: number,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("asset"), campaign.toBytes(), u32le(assetIndex)],
    programId,
  );
}

export function findVotePda(
  asset: PublicKey,
  participant: PublicKey,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("vote"), asset.toBytes(), participant.toBytes()],
    programId,
  );
}