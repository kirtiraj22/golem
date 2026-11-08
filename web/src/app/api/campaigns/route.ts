import { PublicKey } from "@solana/web3.js";

import {
  conflict,
  dbFailure,
  forbidden,
  json,
  readJson,
  route,
  unprocessable,
} from "@/lib/errors";
import {
  createCampaignMetadataSchema,
  listCampaignsQuerySchema,
  sanitizeSearch,
  searchParams,
} from "@/lib/schemas";
import { ensureProfile, requireSession } from "@/lib/server/auth";
import { fetchCampaign } from "@/lib/server/chain";
import { indexTransaction } from "@/lib/server/index-tx";
import { verifyTransaction } from "@/lib/server/verify-tx";
import { supabaseAdmin } from "@/lib/supabase/admin";


const SORTS = {
  newest: { column: "created_at", ascending: false },
  deadline: { column: "voting_deadline", ascending: true },
  budget: { column: "total_budget_lamports", ascending: false },
} as const;

export const GET = route<unknown>(async (request) => {
  const query = listCampaignsQuerySchema.parse(searchParams(request));
  let builder = supabaseAdmin()
    .from("campaign_metadata")
    .select("*", { count: "exact" })
    .eq("is_listed", true);

  if (query.status) builder = builder.eq("onchain_status", query.status);
  if (query.category) builder = builder.eq("category", query.category);
  if (query.tag) builder = builder.contains("tags", [query.tag]);
  if (query.company) builder = builder.eq("company_wallet", query.company);
  if (query.q) {
    const term = sanitizeSearch(query.q);
    if (term) builder = builder.ilike("title", `%${term}%`);
  }

  const sort = SORTS[query.sort];
  const from = (query.page - 1) * query.pageSize;
  const { data, error, count } = await builder
    .order(sort.column, { ascending: sort.ascending })
    .range(from, from + query.pageSize - 1);
  if (error) throw dbFailure(error);

  return json({
    items: data ?? [],
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? 0,
  });
});

export const POST = route<unknown>(async (request) => {
  const session = await requireSession(request);
  const body = createCampaignMetadataSchema.parse(await readJson(request));

  const verified = await verifyTransaction(body.signature);
  const created = verified.instructions.find(
    (ix) => ix.name === "create_campaign" && ix.wallet === session.wallet,
  );
  if (!created) {
    throw forbidden("Transaction does not contain a create_campaign signed by you");
  }

  const onchain = await fetchCampaign(new PublicKey(created.campaign));
  if (!onchain) throw unprocessable("Campaign account not found on-chain");
  if (onchain.company !== session.wallet) {
    throw forbidden("Campaign belongs to a different company wallet");
  }

  await ensureProfile(session.wallet);

  const { data, error } = await supabaseAdmin()
    .from("campaign_metadata")
    .insert({
      campaign_pubkey: onchain.pubkey,
      company_wallet: onchain.company,
      campaign_id: onchain.campaignId,
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? null,
      tags: body.tags,
      total_budget_lamports: onchain.totalBudget,
      expected_asset_count: onchain.expectedAssetCount,
      min_votes: onchain.minVotes,
      voting_deadline: new Date(onchain.votingDeadline * 1000).toISOString(),
      claim_deadline: new Date(onchain.claimDeadline * 1000).toISOString(),
      onchain_status: onchain.status,
      create_tx_signature: body.signature,
      is_listed: onchain.status !== "DRAFT",
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw conflict("Campaign metadata already exists");
    throw dbFailure(error);
  }

  await indexTransaction(verified);
  return json({ campaign: data }, 201);
});