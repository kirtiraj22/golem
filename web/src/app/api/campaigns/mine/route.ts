import { dbFailure, json, route } from "@/lib/errors";
import { myCampaignsQuerySchema, searchParams } from "@/lib/schemas";
import { requireSession } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";


export const GET = route<unknown>(async (request) => {
  const session = await requireSession(request);
  const query = myCampaignsQuerySchema.parse(searchParams(request));
  const from = (query.page - 1) * query.pageSize;
  const { data, error, count } = await supabaseAdmin()
    .from("campaign_metadata")
    .select("*", { count: "exact" })
    .eq("company_wallet", session.wallet)
    .order("created_at", { ascending: false })
    .range(from, from + query.pageSize - 1);
  if (error) throw dbFailure(error);
  return json({
    items: data ?? [],
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? 0,
  });
});