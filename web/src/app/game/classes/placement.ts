import {
  BODY_SKINS,
  CELL_SIZE,
  Direction,
  directionUpdateMap,
} from "~/constants/helpers";
import { Collision } from "./collision";

interface PlacementProperties {
  id: string;
  type: string;
  x: number;
  y: number;
  direction: Direction;
}

class Placement {
  type: string;
  id: string;
  x: number;
  y: number;
  travelPixelsPerFrame: number;
  movingPixelsRemaining: number;
  movingPixelDirection: Direction;
  spriteFacingDirection: Direction;
  spriteWalkFrame: number;
  hasBeenCollected: boolean;
  skin: string;
  canBeStolen: boolean;

  constructor(
    public properties: PlacementProperties,
    public level: number | string | any
  ) {
    this.id = properties.id;
    this.type = properties.type;
    this.x = properties.x;
    this.y = properties.y;
    this.level = level;

    this.skin = BODY_SKINS.NORMAL;
    this.travelPixelsPerFrame = 1.5;
    this.movingPixelsRemaining = 0;
    this.movingPixelDirection = Direction.Left;
    this.spriteFacingDirection = Direction.Left;
    this.spriteWalkFrame = 0;

    this.hasBeenCollected = false;
    this.canBeStolen = true;
  }

  getCollisionAtNextPosition(direction: Direction) {
    const { x, y } = directionUpdateMap[direction];
    const nextX = this.x + x;
    const nextY = this.y + y;

    return new Collision(this, this.level, { x: nextX, y: nextY });
  }

  tick() {}

  tickAttemptAiMove(): null | void {
    return null;
  }

  isSolidForBody(_body) {
    return false;
  }

  isFacingEachOther(_body) {
    return false;
  }

  startBattleWhenCollide(_body) {}

  changesHeroSkinOnCollide(): string | null {
    return null;
  }

  displayXY() {
    if (this.movingPixelsRemaining > 0) {
      return this.displayMovingXY();
    }

    const x = this.x * CELL_SIZE;
    const y = this.y * CELL_SIZE;
    return [x, y];
  }

  displayMovingXY() {
    const x = this.x * CELL_SIZE;
    const y = this.y * CELL_SIZE;

    const progressPixels = CELL_SIZE - this.movingPixelsRemaining;
    switch (this.movingPixelDirection) {
      case Direction.Top:
        return [x, y - progressPixels];
      case Direction.Left:
        return [x - progressPixels, y];
      case Direction.Right:
        return [x + progressPixels, y];
      case Direction.Bottom:
        return [x, y + progressPixels];

      default:
        return [x, y + progressPixels];
    }
  }

  collect() {
    this.hasBeenCollected = true;
    this.level.inventory.add(this.addsItemToInventoryOnCollide());
  }

  resetHasBeenCollected() {
    if (this.canBeStolen && this.hasBeenCollected) {
      this.hasBeenCollected = false;
    }
  }

  stealsInventoryOnCollide() {
    return null;
  }

  zIndex() {
    return 1;
  }

  switchesDoorsOnCollide() {
    return null;
  }

  canBeUnlocked() {
    return false;
  }

  damagesBodyOnCollide(_body: any) {
    return null;
  }

  teleportsToPositionOnCollide() {
    return null;
  }

  addsItemToInventoryOnCollide(): string | null {
    return null;
  }

  autoMovesBodyOnCollide(): boolean | string {
    return false;
  }

  completesLevelOnCollide() {
    return false;
  }

  renderComponent(): JSX.Element | null {
    return null;
  }
}

export default Placement;
