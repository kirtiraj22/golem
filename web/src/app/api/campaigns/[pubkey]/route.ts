import { dbFailure, json, readJson, route } from "@/lib/errors";
import { updateCampaignMetadataSchema } from "@/lib/schemas";
import { getOwnedCampaign, getViewableCampaign } from "@/lib/server/helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";


type Context = { params: Promise<{ pubkey: string }> };

export const GET = route<Context>(async (request, { params }) => {
  const campaign = await getViewableCampaign(request, (await params).pubkey);
  const { data: owner, error } = await supabaseAdmin()
    .from("profiles")
    .select("wallet_address, display_name, website_url")
    .eq("wallet_address", campaign.company_wallet)
    .maybeSingle();
  if (error) throw dbFailure(error);
  return json({ campaign, company: owner });
});

export const PATCH = route<Context>(async (request, { params }) => {
  const { row } = await getOwnedCampaign(request, (await params).pubkey);
  const body = updateCampaignMetadataSchema.parse(await readJson(request));
  const { data, error } = await supabaseAdmin()
    .from("campaign_metadata")
    .update(body)
    .eq("campaign_pubkey", row.campaign_pubkey)
    .select("*")
    .single();
  if (error) throw dbFailure(error);
  return json({ campaign: data });
});