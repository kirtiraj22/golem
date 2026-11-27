import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { PublicKey } from "@solana/web3.js";
import { buildChallengeMessage } from "../auth/challenge";
import { parseSolanaAddress } from "./address";
import { verifySolanaSignature } from "./verify";

function createWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const rawPublicKey = (
    publicKey.export({ format: "der", type: "spki" }) as Buffer
  ).subarray(-32);
  const address = new PublicKey(rawPublicKey).toBase58();

  return { address, privateKey };
}

const wallet = createWallet();
const message = new TextEncoder().encode(
  [
    "Stock Wars",
    "",
    "Domain: localhost:3001",
    `Wallet: ${wallet.address}`,
    "Display name: CopperFox",
    "Nonce: 0123456789abcdef0123456789abcdef",
    "Issued At: 2026-11-22T00:00:00.000Z",
    "Expiration Time: 2026-11-22T00:05:00.000Z",
    "",
    "Sign this message to create or load your player profile.",
    "This request will not trigger a blockchain transaction or cost any fees.",
  ].join("\n")
);
const signature = sign(null, Buffer.from(message), wallet.privateKey);

test("verifies the exact server-issued challenge message", () => {
  const challengeMessage = buildChallengeMessage({
    domain: "localhost:3001",
    walletAddress: wallet.address,
    username: "CopperFox",
    nonce: "0123456789abcdef0123456789abcdef",
    issuedAt: "2026-11-22T00:00:00.000Z",
    expiresAt: "2026-11-22T00:05:00.000Z",
  });
  const challengeSignature = sign(
    null,
    Buffer.from(challengeMessage),
    wallet.privateKey
  );

  assert.equal(
    verifySolanaSignature(
      wallet.address,
      Buffer.from(challengeMessage),
      challengeSignature
    ),
    true
  );

  const tamperedChallenge = challengeMessage.replace(
    "Display name: CopperFox",
    "Display name: SilverFox"
  );

  assert.equal(
    verifySolanaSignature(
      wallet.address,
      Buffer.from(tamperedChallenge),
      challengeSignature
    ),
    false
  );
});

test("accepts a valid Ed25519 wallet signature", () => {
  assert.equal(verifySolanaSignature(wallet.address, message, signature), true);
});

test("rejects a signature for a different message", () => {
  const tampered = new TextEncoder().encode("tampered challenge");

  assert.equal(
    verifySolanaSignature(wallet.address, tampered, signature),
    false
  );
});

test("rejects a signature from a different wallet", () => {
  const other = createWallet();

  assert.equal(verifySolanaSignature(other.address, message, signature), false);
});

test("rejects malformed addresses and signatures", () => {
  assert.equal(verifySolanaSignature("not-a-wallet", message, signature), false);
  assert.equal(
    verifySolanaSignature(wallet.address, message, new Uint8Array(63)),
    false
  );
});

test("parses and canonicalizes Solana addresses with PublicKey", () => {
  assert.equal(parseSolanaAddress(wallet.address), wallet.address);
  assert.equal(parseSolanaAddress(` ${wallet.address} `), wallet.address);
  assert.equal(parseSolanaAddress("not-a-wallet"), null);
  assert.equal(parseSolanaAddress(""), null);
  assert.equal(parseSolanaAddress(null), null);
  assert.equal(parseSolanaAddress(42), null);
});
