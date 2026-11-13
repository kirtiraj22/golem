import { TILES } from "~/constants/tiles";
import { PlacementTypeAnimationFrames } from "./placement-type-animation-frames";

const WATER_ANIMATION_SPEED = 30;
const WATER_SEQUENCE = [TILES.WATER1, TILES.WATER2];

const FIRE_ANIMATION_SPEED = 10;
const FIRE_SEQUENCE = [TILES.FIRE1, TILES.FIRE2, TILES.FIRE3];

export class LevelAnimatedFrames {
  waterFrames: PlacementTypeAnimationFrames;
  fireFrames: PlacementTypeAnimationFrames;

  constructor() {
    this.waterFrames = new PlacementTypeAnimationFrames(
      WATER_SEQUENCE,
      WATER_ANIMATION_SPEED
    );

    this.fireFrames = new PlacementTypeAnimationFrames(
      FIRE_SEQUENCE,
      FIRE_ANIMATION_SPEED
    );
  }

  get waterFrame() {
    return this.waterFrames.activeFrame;
  }
  get fireFrame() {
    return this.fireFrames.activeFrame;
  }

  tick() {
    this.waterFrames.tick();
    this.fireFrames.tick();
  }
}
