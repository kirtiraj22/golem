import { redirect } from "next/navigation";
import type { PlayerProfile } from "~/lib/auth/types";
import { getSessionProfile } from "./session";

/**
 * Server-side onboarding gate. Any game route that calls this will only mount
 * after a wallet-signed session resolves to a player profile.
 */
export async function requirePlayerProfile(): Promise<PlayerProfile> {
  try {
    const profile = await getSessionProfile();

    if (profile) {
      return profile;
    }
  } catch {
    // Missing Supabase configuration or an unreachable database both fail
    // closed: the player returns to onboarding instead of entering as a guest.
  }

  redirect("/?onboarding=required");
}
