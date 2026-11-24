import { NextResponse } from "next/server";
import { apiErrorResponse } from "~/lib/api/errors";
import {
  createSessionToken,
  hashSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "~/lib/auth/session";
import { normalizeUsername, validateUsername } from "~/lib/auth/username";
import { parseSolanaAddress } from "~/lib/solana/address";
import { verifySolanaSignature } from "~/lib/solana/verify";
import { getSupabaseAdmin } from "~/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyRequestBody = {
  walletAddress?: unknown;
  nonce?: unknown;
  username?: unknown;
  signature?: unknown;
};

export async function POST(request: Request) {
  let body: VerifyRequestBody;

  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const walletAddress = parseSolanaAddress(body.walletAddress);
  const nonce = typeof body.nonce === "string" ? body.nonce.trim() : "";
  const username = normalizeUsername(body.username);
  const signatureBase64 =
    typeof body.signature === "string" ? body.signature : "";

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

  if (!/^[0-9a-f]{32,128}$/.test(nonce)) {
    return NextResponse.json(
      { error: "Invalid sign-in challenge." },
      { status: 400 }
    );
  }

  if (!signatureBase64) {
    return NextResponse.json(
      { error: "The wallet did not return a signature." },
      { status: 400 }
    );
  }

  const signature = Buffer.from(signatureBase64, "base64");

  if (signature.length !== 64) {
    return NextResponse.json(
      { error: "The wallet returned an invalid signature." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: challenge, error: challengeError } = await supabase
      .from("auth_challenges")
      .select("*")
      .eq("nonce", nonce)
      .maybeSingle();

    if (challengeError) {
      throw new Error(challengeError.message);
    }

    if (!challenge) {
      return NextResponse.json(
        { error: "Sign-in challenge not found. Please try again." },
        { status: 401 }
      );
    }

    if (challenge.wallet_address !== walletAddress) {
      return NextResponse.json(
        { error: "This sign-in challenge belongs to a different wallet." },
        { status: 401 }
      );
    }

    if (challenge.consumed_at) {
      return NextResponse.json(
        { error: "This sign-in challenge was already used. Please try again." },
        { status: 409 }
      );
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This sign-in challenge expired. Please try again." },
        { status: 410 }
      );
    }

    // The signed message must contain the same wallet and display name that
    // the server issued. This prevents swapping either value after signing.
    const messageLines = challenge.message.split("\n");
    const walletLine = messageLines.find((line) => line.startsWith("Wallet: "));
    const nameLine = messageLines.find((line) =>
      line.startsWith("Display name: ")
    );

    if (walletLine !== `Wallet: ${walletAddress}`) {
      return NextResponse.json(
        { error: "The signed challenge does not match this wallet." },
        { status: 401 }
      );
    }

    if (nameLine !== `Display name: ${username}`) {
      return NextResponse.json(
        { error: "The signed challenge does not match this trader name." },
        { status: 400 }
      );
    }

    const signatureValid = verifySolanaSignature(
      walletAddress,
      Buffer.from(challenge.message, "utf8"),
      signature
    );

    if (!signatureValid) {
      return NextResponse.json(
        { error: "Wallet signature verification failed." },
        { status: 401 }
      );
    }

    // Consume the challenge atomically. A concurrent replay gets no row back.
    const { data: consumed, error: consumeError } = await supabase
      .from("auth_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("nonce", nonce)
      .is("consumed_at", null)
      .select("nonce")
      .maybeSingle();

    if (consumeError) {
      throw new Error(consumeError.message);
    }

    if (!consumed) {
      return NextResponse.json(
        { error: "This sign-in challenge was already used. Please try again." },
        { status: 409 }
      );
    }

    const { data: profileResult, error: profileError } = await supabase.rpc(
      "upsert_player_profile",
      {
        p_wallet_address: walletAddress,
        p_username: username,
      }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const profile = Array.isArray(profileResult)
      ? profileResult[0]
      : profileResult;

    if (!profile) {
      return NextResponse.json(
        { error: "Could not load your player profile." },
        { status: 500 }
      );
    }

    const token = createSessionToken();
    const sessionExpiresAt = new Date(
      Date.now() + SESSION_TTL_SECONDS * 1000
    ).toISOString();

    const { error: sessionError } = await supabase
      .from("wallet_sessions")
      .insert({
        token_hash: hashSessionToken(token),
        wallet_address: walletAddress,
        expires_at: sessionExpiresAt,
      });

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const response = NextResponse.json({ profile });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    return apiErrorResponse(error, "Could not verify your wallet signature.");
  }
}
