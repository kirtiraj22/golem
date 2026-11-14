import Game from "../game/main";
import level1 from "../game/levels/level-1";

export default function GameLegacyPage() {
  return <Game levelConfig={level1} showLegacyHud />;
}
