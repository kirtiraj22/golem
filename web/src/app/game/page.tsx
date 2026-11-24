import Game from "./main";
import levelPreview from "./levels/level-preview";
import { requirePlayerProfile } from "~/lib/auth/require-session";

export const dynamic = "force-dynamic";

/**
 * Wallet onboarding is mandatory. The game world only mounts after the
 * server-verified wallet session cookie resolves to a player profile.
 */
export default async function Page() {
  const profile = await requirePlayerProfile();

  return (
    <Game
      levelConfig={levelPreview}
      playerProfile={{
        walletAddress: profile.wallet_address,
        username: profile.username,
      }}
    />
  );
}
