import { PublicKey } from "@solana/web3.js";

import { json, route } from "@/lib/errors";
import { analyticsQuerySchema, searchParams } from "@/lib/schemas";
import { analyticsToCsv, buildAnalytics } from "@/lib/server/analytics";
import { requireCampaignState } from "@/lib/server/chain";
import { getViewableCampaign } from "@/lib/server/helpers";


type Context = { params: Promise<{ pubkey: string }> };

export const GET = route<Context>(async (request, { params }) => {
  const campaign = await getViewableCampaign(request, (await params).pubkey);
  const query = analyticsQuerySchema.parse(searchParams(request));

  const state = await requireCampaignState(new PublicKey(campaign.campaign_pubkey));
  const analytics = buildAnalytics(state);

  if (query.format === "csv") {
    return new Response(analyticsToCsv(analytics.assets), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="golem-${campaign.campaign_pubkey}.csv"`,
      },
    });
  }
  return json(analytics);
});