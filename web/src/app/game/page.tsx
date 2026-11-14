import Game from "./main";
import levelPreview from "./levels/level-preview";

export default function Page() {
  return <Game levelConfig={levelPreview} />;
}
