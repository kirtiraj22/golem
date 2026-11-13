import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import Body from "../../components/object-graphics/body";
import {
  BODY_SKINS,
  Direction,
  HERO_RUN_1,
  HERO_RUN_2,
  PLACEMENT_TYPE_CELEBRATION,
  Z_INDEX_LAYER_SIZE,
  directionUpdateMap,
} from "~/constants/helpers";
import { Collision } from "../collision";
import { BodyPlacement } from "./body-placement";
import progressEntry from "../progress-entry";

const heroSkinMap = {
  [BODY_SKINS.NORMAL]: [TILES.HERO_LEFT, TILES.HERO_RIGHT],
  [BODY_SKINS.WATER]: [TILES.HERO_WATER_LEFT, TILES.HERO_WATER_RIGHT],
  [BODY_SKINS.FIRE]: [TILES.HERO_FIRE_LEFT, TILES.HERO_FIRE_RIGHT],
  [BODY_SKINS.DEATH]: [TILES.HERO_DEATH_LEFT, TILES.HERO_DEATH_RIGHT],
  // [BODY_SKINS.CONVEYOR]: [TILES.HERO_CONVEYOR_LEFT, TILES.HERO_CONVEYOR_RIGHT],
  [BODY_SKINS.CONVEYOR]: [TILES.HERO_DEATH_LEFT, TILES.HERO_DEATH_RIGHT],
  [BODY_SKINS.SCARED]: [TILES.HERO_DEATH_LEFT, TILES.HERO_DEATH_RIGHT],
  [BODY_SKINS.ICE]: [TILES.HERO_ICE_LEFT, TILES.HERO_ICE_RIGHT],
  [BODY_SKINS.TELEPORT]: [TILES.HERO_TELEPORT_LEFT, TILES.HERO_TELEPORT_RIGHT],
  [HERO_RUN_1]: [TILES.HERO_RUN_1_LEFT, TILES.HERO_RUN_1_RIGHT],
  [HERO_RUN_2]: [TILES.HERO_RUN_2_LEFT, TILES.HERO_RUN_2_RIGHT],
};

class HeroPlacement extends BodyPlacement {
  canCollectItem: boolean;
  canCompleteLevel: boolean;
  interactWithGround: boolean;
  canStartBattle: boolean;
  stats: {
    name: string;
    health: number;
    level: number;
  };

  constructor(properties, level) {
    super(properties, level);
    this.canCollectItem = true;
    this.canStartBattle = true;
    this.canCompleteLevel = true;
    this.interactWithGround = true;

    this.stats = !!progressEntry.get().stats
      ? progressEntry.get().stats
      : {
          name: "Peter",
          health: 100,
          level: 1,
        };
  }

  controllerMoveRequested(direction: Direction) {
    if (this.movingPixelsRemaining > 0) {
      return;
    }

    /**
     * Start Battle Scene
     */
    const faceToFaceEnemy = this.getInfectedHeroAtNextPosition(direction);
    if (faceToFaceEnemy) {
      this.level.initializeBattle({
        player: this,
        opponent: faceToFaceEnemy,
      });
    }

    /**
     * Making sure the next place is unlockable object
     */
    const possibleLock = this.getLockAtNextPosition(direction);
    if (possibleLock) {
      possibleLock.unlock();
    }

    /**
     * Making sure the next place is not solid object
     */
    if (this.isSolidAtNextPosition(direction)) {
      return;
    }

    this.movingPixelsRemaining = 16;
    this.movingPixelDirection = direction;
    this.updateFacingDirection();
    this.updateWalkFrame();
  }

  onAutoMovement(_direction: Direction): any {
    this.controllerMoveRequested(_direction);
  }

  getFrame() {
    const index = this.spriteFacingDirection === Direction.Left ? 0 : 1;

    if (this.level.deathOutcome) {
      return heroSkinMap[BODY_SKINS.DEATH][index];
    }

    if (this.movingPixelsRemaining > 0 && this.skin === BODY_SKINS.NORMAL) {
      const walkKey = this.spriteWalkFrame === 0 ? HERO_RUN_1 : HERO_RUN_2;
      return heroSkinMap[walkKey][index];
    }

    return heroSkinMap[this.skin][index];
  }

  zIndex(): number {
    return this.y * Z_INDEX_LAYER_SIZE + 2;
  }

  renderComponent() {
    const shouldShowShadow = this.skin !== BODY_SKINS.WATER;

    return (
      <Body
        frameCoordinate={this.getFrame()}
        yTranslate={this.getYTranslate()}
        showShadow={shouldShowShadow}
      />
    );
  }
}

export default HeroPlacement;
