import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "~/lib/api/errors";
import { buildChallengeMessage } from "~/lib/auth/challenge";
import { normalizeUsername, validateUsername } from "~/lib/auth/username";
import { parseSolanaAddress } from "~/lib/solana/address";
import { getSupabaseAdmin } from "~/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type ChallengeRequestBody = {
  walletAddress?: unknown;
  username?: unknown;
};

export async function POST(request: Request) {
  let body: ChallengeRequestBody;

  try {
    body = (await request.json()) as ChallengeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const walletAddress = parseSolanaAddress(body.walletAddress);
  const username = normalizeUsername(body.username);

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Connect a valid Solana wallet first." },
      { status: 400 }
    );
  }

  const usernameError = validateUsername(username);

  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 });
  }

  const nonce = randomBytes(32).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
  const domain = new URL(request.url).host;
  const message = buildChallengeMessage({
    domain,
    walletAddress,
    username,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  try {
    const { error } = await getSupabaseAdmin().from("auth_challenges").insert({
      nonce,
      wallet_address: walletAddress,
      message,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    return apiErrorResponse(
      error,
      "Could not create a wallet sign-in challenge."
    );
  }

  return NextResponse.json({
    nonce,
    message,
    expiresAt: expiresAt.toISOString(),
  });
}
