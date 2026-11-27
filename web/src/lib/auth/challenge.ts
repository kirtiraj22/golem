export type ChallengeMessageInput = {
  domain: string;
  walletAddress: string;
  username: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
};

/**
 * The exact text the wallet signs. Keeping this server-generated means the
 * client can never substitute a different wallet, name, or nonce after the
 * challenge is issued.
 */
export function buildChallengeMessage(input: ChallengeMessageInput): string {
  return [
    "Stock Wars",
    "",
    `Domain: ${input.domain}`,
    `Wallet: ${input.walletAddress}`,
    `Display name: ${input.username}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
    "",
    "Sign this message to create or load your player profile.",
    "This request will not trigger a blockchain transaction or cost any fees.",
  ].join("\n");
}
