import { LOCK_KEY_COLORS } from "~/constants/helpers";
import ElevatedSprite from "../../components/object-graphics/elevated-sprite";
import Placement from "../placement";
import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";

export class LockPlacement extends Placement {
  color: any;
  collectInFrames: number;

  constructor(properties, level) {
    super(properties, level);
    this.color = properties?.color ?? LOCK_KEY_COLORS.BLUE;
    this.collectInFrames = 0;
  }

  isSolidForBody(_body: any): boolean {
    return true;
  }

  canBeUnlocked(): boolean {
    const requiredKey = `KEY_${this.color}`;

    return this.level.inventory.has(requiredKey);
  }

  tick(): void {
    if (this.collectInFrames > 0) {
      this.collectInFrames -= 1;
      if (this.collectInFrames === 0) {
        this.level.deletePlacement(this);
      }
    }
  }

  unlock() {
    if (this.collectInFrames > 0) {
      return;
    }

    this.collectInFrames = 11;
  }

  renderComponent(): JSX.Element | null {
    let frameCoordinate =
      this.color === LOCK_KEY_COLORS.BLUE ? TILES.BLUE_LOCK : TILES.GREEN_LOCK;

    if (this.collectInFrames > 0) {
      frameCoordinate = TILES.UNLOCKED_LOCK;
    }
    return <Sprite frameCoordinate={frameCoordinate} />;
  }
}
