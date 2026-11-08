import { dbFailure } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { syncCampaign } from "./sync";
import type { VerifiedTransaction } from "./verify-tx";

export type IndexResult = {
  signature: string;
  indexed: number;
  skipped: number;
  campaigns: string[];
  syncErrors: { campaign: string; message: string }[];
};

export async function indexTransaction(
  tx: VerifiedTransaction,
): Promise<IndexResult> {
  const admin = supabaseAdmin();
  const campaigns = [...new Set(tx.instructions.map((ix) => ix.campaign))];

  const { data, error } = await admin
    .from("campaign_metadata")
    .select("campaign_pubkey")
    .in("campaign_pubkey", campaigns);
  if (error) throw dbFailure(error);
  const known = new Set((data ?? []).map((row) => row.campaign_pubkey));

  const rows = tx.instructions
    .filter((ix) => known.has(ix.campaign))
    .map((ix) => ({
      signature: tx.signature,
      instruction_index: ix.index,
      instruction: ix.name,
      campaign_pubkey: ix.campaign,
      asset_pubkey: ix.asset,
      wallet_address: ix.wallet,
      amount_lamports: ix.amountLamports,
      slot: tx.slot,
      block_time: tx.blockTime,
      event_data: ix.event,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await admin
      .from("chain_transactions")
      .upsert(rows, {
        onConflict: "signature,instruction_index",
        ignoreDuplicates: true,
      });
    if (insertError) throw dbFailure(insertError);
  }

  const syncErrors: { campaign: string; message: string }[] = [];
  for (const campaign of known) {
    try {
      await syncCampaign(campaign);
    } catch (syncError) {
      syncErrors.push({
        campaign,
        message: syncError instanceof Error ? syncError.message : "Sync failed",
      });
    }
  }

  return {
    signature: tx.signature,
    indexed: rows.length,
    skipped: tx.instructions.length - rows.length,
    campaigns: [...known],
    syncErrors,
  };
}