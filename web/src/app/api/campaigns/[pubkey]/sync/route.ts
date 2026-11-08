import { json, route } from "@/lib/errors";
import { getCampaignRow, parsePubkey } from "@/lib/server/helpers";
import { syncCampaign } from "@/lib/server/sync";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dbFailure } from "@/lib/errors";


type Context = { params: Promise<{ pubkey: string }> };

const MIN_INTERVAL_MS = 3000;

export const POST = route<Context>(async (_request, { params }) => {
  const pubkey = parsePubkey((await params).pubkey);
  const row = await getCampaignRow(pubkey);

  if (
    row.last_synced_at &&
    Date.now() - new Date(row.last_synced_at).getTime() < MIN_INTERVAL_MS
  ) {
    return json({ campaign: row, throttled: true });
  }

  await syncCampaign(pubkey);
  const { data, error } = await supabaseAdmin()
    .from("campaign_metadata")
    .select("*")
    .eq("campaign_pubkey", pubkey)
    .single();
  if (error) throw dbFailure(error);
  return json({ campaign: data, throttled: false });
});