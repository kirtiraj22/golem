import { dbFailure, json, route } from "@/lib/errors";
import { searchParams, transactionsQuerySchema } from "@/lib/schemas";
import { getViewableCampaign } from "@/lib/server/helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";


type Context = { params: Promise<{ pubkey: string }> };

export const GET = route<Context>(async (request, { params }) => {
  const campaign = await getViewableCampaign(request, (await params).pubkey);
  const query = transactionsQuerySchema.parse(searchParams(request));

  let builder = supabaseAdmin()
    .from("chain_transactions")
    .select("*", { count: "exact" })
    .eq("campaign_pubkey", campaign.campaign_pubkey);
  if (query.instruction) builder = builder.eq("instruction", query.instruction);
  if (query.wallet) builder = builder.eq("wallet_address", query.wallet);

  const from = (query.page - 1) * query.pageSize;
  const { data, error, count } = await builder
    .order("slot", { ascending: false })
    .range(from, from + query.pageSize - 1);
  if (error) throw dbFailure(error);

  return json({
    items: data ?? [],
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? 0,
  });
});