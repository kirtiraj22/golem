import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "~/lib/api/errors";
import {
  getSessionProfile,
  hashSessionToken,
  isValidSessionToken,
  SESSION_COOKIE,
} from "~/lib/auth/session";
import { getSupabaseAdmin } from "~/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getSessionProfile();

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 401 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return apiErrorResponse(error, "Could not load your player session.");
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (isValidSessionToken(token)) {
    try {
      const { error } = await getSupabaseAdmin()
        .from("wallet_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", hashSessionToken(token))
        .is("revoked_at", null);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      // Clearing the browser cookie is still the correct local behavior. The
      // server-side token will expire on its own if revocation cannot reach
      // Supabase.
      console.error("Could not revoke the wallet session.", error);
    }
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
