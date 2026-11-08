import { dbFailure, json, notFound, route } from "@/lib/errors";
import { walletSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";


type Context = { params: Promise<{ wallet: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const wallet = walletSchema.parse((await params).wallet);
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("wallet_address, display_name, bio, website_url, created_at")
    .eq("wallet_address", wallet)
    .maybeSingle();
  if (error) throw dbFailure(error);
  if (!data) throw notFound("Profile not found");
  return json({ profile: data });
});