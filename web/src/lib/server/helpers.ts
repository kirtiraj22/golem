import { PublicKey } from "@solana/web3.js";

import type { Tables } from "@/lib/db/database.types";
import {
  badRequest,
  dbFailure,
  forbidden,
  notFound,
} from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { optionalSession, requireSession, type Session } from "./auth";

export const STORAGE_BUCKET = "campaign-assets";
const SIGNED_URL_TTL_SECONDS = 3600;

export type CampaignRow = Tables<"campaign_metadata">;

export function parsePubkey(value: string): string {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    throw badRequest("Invalid public key");
  }
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw badRequest("Invalid public key");
  }
}

export async function getCampaignRow(pubkey: string): Promise<CampaignRow> {
  const { data, error } = await supabaseAdmin()
    .from("campaign_metadata")
    .select("*")
    .eq("campaign_pubkey", pubkey)
    .maybeSingle();
  if (error) throw dbFailure(error);
  if (!data) throw notFound("Campaign not found");
  return data;
}

export async function getViewableCampaign(
  request: Request,
  pubkey: string,
): Promise<CampaignRow> {
  const row = await getCampaignRow(parsePubkey(pubkey));
  if (!row.is_listed) {
    const session = await optionalSession(request);
    if (!session || session.wallet !== row.company_wallet) {
      throw notFound("Campaign not found");
    }
  }
  return row;
}

export async function getOwnedCampaign(
  request: Request,
  pubkey: string,
): Promise<{ row: CampaignRow; session: Session }> {
  const session = await requireSession(request);
  const row = await getCampaignRow(parsePubkey(pubkey));
  if (row.company_wallet !== session.wallet) {
    throw forbidden("Only the campaign owner can do this");
  }
  return { row, session };
}

export async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data, error } = await supabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw dbFailure(error);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
  }
  return map;
}