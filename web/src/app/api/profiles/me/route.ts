import { dbFailure, json, notFound, readJson, route } from "@/lib/errors";
import { profileUpdateSchema } from "@/lib/schemas";
import { ensureProfile, requireSession } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";


export const GET = route<unknown>(async (request) => {
  const session = await requireSession(request);
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("*")
    .eq("wallet_address", session.wallet)
    .maybeSingle();
  if (error) throw dbFailure(error);
  if (!data) throw notFound("Profile not found");
  return json({ profile: data });
});

export const PUT = route<unknown>(async (request) => {
  const session = await requireSession(request);
  const body = profileUpdateSchema.parse(await readJson(request));
  await ensureProfile(session.wallet);
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .update(body)
    .eq("wallet_address", session.wallet)
    .select("*")
    .single();
  if (error) throw dbFailure(error);
  return json({ profile: data });
});