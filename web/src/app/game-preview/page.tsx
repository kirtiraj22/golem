import Game from "../game/main";
import levelPreview from "../game/levels/level-preview";
import { requirePlayerProfile } from "~/lib/auth/require-session";

export const dynamic = "force-dynamic";

export default async function GamePreviewPage() {
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
