import { createPublicKey, verify as verifySignature } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

// DER prefix for a raw Ed25519 public key in SubjectPublicKeyInfo form.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Verify a Solana wallet message signature using Node's built-in Ed25519
 * implementation. This is the ownership proof used by the onboarding API.
 *
 * The wallet address is decoded with the official web3.js PublicKey type, and
 * the signature must be the 64-byte Ed25519 signature of the exact challenge
 * message.
 */
export function verifySolanaSignature(
  walletAddress: string,
  message: Uint8Array,
  signature: Uint8Array
): boolean {
  try {
    if (signature.length !== 64) {
      return false;
    }

    const publicKeyBytes = new PublicKey(walletAddress).toBytes();

    if (publicKeyBytes.length !== 32) {
      return false;
    }

    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki",
    });

    return verifySignature(
      null,
      Buffer.from(message),
      publicKey,
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
