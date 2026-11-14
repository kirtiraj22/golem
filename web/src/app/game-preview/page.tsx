import Game from "../game/main";
import levelPreview from "../game/levels/level-preview";

export default function GamePreviewPage() {
  return <Game levelConfig={levelPreview} />;
}
