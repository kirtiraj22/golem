import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import Body from "../../components/object-graphics/body";
import { Direction, PLACEMENT_TYPE_HERO } from "~/constants/helpers";
import { BodyPlacement } from "./body-placement";
import soundManager, { SFX } from "../sounds";
import progressEntry from "../progress-entry";

export class GroundEnemyPlacement extends BodyPlacement {
  tickBetweenMovesInterval: number;
  ticksUntilNextMove: number;
  turnAroundAtWater: boolean;
  attackDamage: number;
  interactWithGround: boolean;
  throwDamagesInFrame: number;

  constructor(properties, level) {
    super(properties, level);
    this.attackDamage = 20;
    this.tickBetweenMovesInterval = 16;
    this.ticksUntilNextMove = this.tickBetweenMovesInterval;
    this.turnAroundAtWater = true;
    this.movingPixelDirection = properties.initialDirection ?? Direction.Right;
    this.interactWithGround = true;

    this.throwDamagesInFrame = 0;
  }

  tickAttemptAiMove() {
    this.checkOverlapWithHero();

    if (this.ticksUntilNextMove > 0) {
      this.ticksUntilNextMove -= 1;
      return;
    }
    this.internalMoveRequested(this.movingPixelDirection);
  }

  checkOverlapWithHero() {
    const [myX, myY] = this.displayXY();
    const [heroX, heroY] = this.level.heroRef.displayXY();

    const xDiff = Math.abs(myX - heroX);
    const yDiff = Math.abs(myY - heroY);

    if (xDiff <= 2 && yDiff <= 2) {
      this.throwDamages();
      if (this.level.heroRef.stats.health <= 0) {
        progressEntry.reset();

        soundManager.playSFX(SFX.GAME_OVER);
        this.level.setDeathOutcome(this.type);
      }
    }
  }

  throwDamages() {
    if (this.throwDamagesInFrame > 0) {
      return;
    }
    this.throwDamagesInFrame = 11;
  }

  tick(): void {
    super.tick();
    if (this.throwDamagesInFrame > 0) {
      this.throwDamagesInFrame -= 1;
      if (this.throwDamagesInFrame === 0) {
        progressEntry.save({
          stats: {
            ...this.level.heroRef.stats,
            health: this.level.heroRef.stats.health - 30,
          },
        });

        this.level.heroRef.stats.health -= 30;
        soundManager.playSFX(SFX.DAMAGE);
      }
    }
  }

  internalMoveRequested(direction: Direction) {
    if (this.movingPixelsRemaining > 0) {
      return;
    }

    if (this.isSolidAtNextPosition(direction)) {
      this.switchDirection();
      return;
    }

    this.ticksUntilNextMove = this.tickBetweenMovesInterval;
    this.movingPixelsRemaining = 16;
    this.movingPixelDirection = direction;
    this.updateFacingDirection();
    this.updateWalkFrame();
  }

  onAutoMovement(_direction: Direction): null {
    this.internalMoveRequested(_direction);
  }

  switchDirection() {
    const currentDirection = this.movingPixelDirection;

    if (
      currentDirection === Direction.Right ||
      currentDirection === Direction.Left
    ) {
      this.movingPixelDirection =
        this.movingPixelDirection === Direction.Left
          ? Direction.Right
          : Direction.Left;
    } else {
      this.movingPixelDirection =
        this.movingPixelDirection === Direction.Top
          ? Direction.Bottom
          : Direction.Top;
    }
  }

  renderComponent(): JSX.Element | null {
    const frameCoordinate =
      this.spriteFacingDirection === Direction.Left
        ? TILES.ENEMY_LEFT
        : TILES.ENEMY_RIGHT;

    return (
      <Body
        frameCoordinate={frameCoordinate}
        yTranslate={this.getYTranslate()}
        showShadow={true}
      />
    );
  }
}
