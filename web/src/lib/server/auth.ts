import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";

import { PublicKey } from "@solana/web3.js";

import {
  badRequest,
  dbFailure,
  unauthorized,
} from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export type Session = { sessionId: string; wallet: string };

export const sha256Hex = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

export function verifyWalletSignature(
  wallet: string,
  message: string,
  signatureBase64: string,
): boolean {
  try {
    const signature = Buffer.from(signatureBase64, "base64");
    if (signature.length !== 64) return false;
    const publicKey = Buffer.from(new PublicKey(wallet).toBytes());
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, publicKey]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(message, "utf8"), key, signature);
  } catch {
    return false;
  }
}

function buildMessage(wallet: string, nonce: string, issuedAt: Date, expiresAt: Date) {
  return [
    "Golem wants you to sign in with your Solana wallet.",
    "This signature does not send a transaction and costs no fees.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expires At: ${expiresAt.toISOString()}`,
  ].join("\n");
}

export async function createChallenge(wallet: string) {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
  const message = buildMessage(wallet, nonce, issuedAt, expiresAt);
  const { error } = await supabaseAdmin().from("auth_challenges").insert({
    nonce,
    wallet_address: wallet,
    message,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw dbFailure(error);
  return { nonce, message, expiresAt: expiresAt.toISOString() };
}

export async function ensureProfile(wallet: string) {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .upsert(
      { wallet_address: wallet },
      { onConflict: "wallet_address", ignoreDuplicates: true },
    );
  if (error) throw dbFailure(error);
}

export async function completeChallenge(
  wallet: string,
  nonce: string,
  signatureBase64: string,
) {
  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: challenge, error: fetchError } = await admin
    .from("auth_challenges")
    .select("nonce, message")
    .eq("nonce", nonce)
    .eq("wallet_address", wallet)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();
  if (fetchError) throw dbFailure(fetchError);
  if (!challenge) throw unauthorized("Challenge is invalid or expired");

  if (!verifyWalletSignature(wallet, challenge.message, signatureBase64)) {
    throw unauthorized("Signature verification failed");
  }

  const { data: consumed, error: consumeError } = await admin
    .from("auth_challenges")
    .update({ consumed_at: nowIso })
    .eq("nonce", nonce)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .select("nonce")
    .maybeSingle();
  if (consumeError) throw dbFailure(consumeError);
  if (!consumed) throw unauthorized("Challenge was already used");

  await ensureProfile(wallet);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error: sessionError } = await admin.from("wallet_sessions").insert({
    token_hash: sha256Hex(token),
    wallet_address: wallet,
    expires_at: expiresAt,
  });
  if (sessionError) throw dbFailure(sessionError);

  return { token, expiresAt };
}

export async function optionalSession(request: Request): Promise<Session | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer ([0-9a-f]{64})$/);
  if (!match) throw badRequest("Malformed Authorization header");
  const { data, error } = await supabaseAdmin()
    .from("wallet_sessions")
    .select("id, wallet_address")
    .eq("token_hash", sha256Hex(match[1]))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw dbFailure(error);
  if (!data) return null;
  return { sessionId: data.id, wallet: data.wallet_address };
}

export async function requireSession(request: Request): Promise<Session> {
  const session = await optionalSession(request);
  if (!session) throw unauthorized("Session is missing, invalid or expired");
  return session;
}

export async function revokeSession(sessionId: string) {
  const { error } = await supabaseAdmin()
    .from("wallet_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw dbFailure(error);
}