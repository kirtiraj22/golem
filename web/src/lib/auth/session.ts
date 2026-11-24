import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { PlayerProfile } from "~/lib/auth/types";
import { getSupabaseAdmin } from "~/lib/supabase/server";

export type { PlayerProfile };

export const SESSION_COOKIE = "copper_stall_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidSessionToken(token: unknown): token is string {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
}

export async function getSessionWallet(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("wallet_sessions")
    .select("wallet_address")
    .eq("token_hash", hashSessionToken(token))
    .gt("expires_at", new Date().toISOString())
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not validate the player session: ${error.message}`);
  }

  return data?.wallet_address ?? null;
}

export async function getSessionProfile(): Promise<PlayerProfile | null> {
  const walletAddress = await getSessionWallet();

  if (!walletAddress) {
    return null;
  }

  const lastSeenAt = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("player_profiles")
    .update({ last_seen_at: lastSeenAt })
    .eq("wallet_address", walletAddress)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load the player profile: ${error.message}`);
  }

  return data ?? null;
}
