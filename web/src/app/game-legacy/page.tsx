import Game from "../game/main";
import level1 from "../game/levels/level-1";
import { requirePlayerProfile } from "~/lib/auth/require-session";

export const dynamic = "force-dynamic";

/**
 * LEGACY game route. Kept for reference, but still requires the same verified
 * wallet onboarding session as the active game.
 */
export default async function GameLegacyPage() {
  const profile = await requirePlayerProfile();

  return (
    <Game
      levelConfig={level1}
      showLegacyHud
      playerProfile={{
        walletAddress: profile.wallet_address,
        username: profile.username,
      }}
    />
  );
}
