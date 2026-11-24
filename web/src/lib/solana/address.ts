import { PublicKey } from "@solana/web3.js";

/**
 * Parse a Solana address with the official web3.js PublicKey implementation and
 * return its canonical base58 form. Returns null for malformed input.
 */
export function parseSolanaAddress(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new PublicKey(trimmed).toBase58();
  } catch {
    return null;
  }
}
