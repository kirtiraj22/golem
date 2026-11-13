import { time } from "console";
import { CELL_SIZE, Direction } from "~/constants/helpers";

const CAMERA_SPEED = 0.04;
const CAMERA_LOOKAHEAD = 2;
const USE_SMOOTH_CAMERA = true;

export class Camera {
  public level: any;
  cameraX: any;
  cameraY: any;
  transformOffset: number;

  constructor(level: any) {
    this.level = level;
    const [heroX, heroY] = this.level.heroRef.displayXY();
    this.cameraX = heroX;
    this.cameraY = heroY;
    this.transformOffset = -5.5 * CELL_SIZE;
  }

  get transformX() {
    return -this.cameraX - this.transformOffset + "px";
  }

  get transformY() {
    return -this.cameraY - this.transformOffset + "px";
  }

  static lerp(currentValue, destinationValue, time) {
    return currentValue * (1 - time) + destinationValue * time;
  }

  tick() {
    const hero = this.level.heroRef;
    const [heroX, heroY] = hero.displayXY();

    let cameraDestinationX = heroX;
    let cameraDestinationY = heroY;

    //If moving, put the camera slightly ahead of where Hero is going
    if (hero.movingPixelsRemaining > 0) {
      if (hero.movingPixelDirection === Direction.Bottom) {
        cameraDestinationY += CAMERA_LOOKAHEAD * CELL_SIZE;
      } else if (hero.movingPixelDirection === Direction.Top) {
        cameraDestinationY -= CAMERA_LOOKAHEAD * CELL_SIZE;
      } else if (hero.movingPixelDirection === Direction.Left) {
        cameraDestinationX -= CAMERA_LOOKAHEAD * CELL_SIZE;
      } else if (hero.movingPixelDirection === Direction.Right) {
        cameraDestinationX += CAMERA_LOOKAHEAD * CELL_SIZE;
      }
    }

    if (USE_SMOOTH_CAMERA) {
      this.cameraX = Camera.lerp(
        this.cameraX,
        cameraDestinationX,
        CAMERA_SPEED
      );
      this.cameraY = Camera.lerp(
        this.cameraY,
        cameraDestinationY,
        CAMERA_SPEED
      );
    } else {
      this.cameraX = cameraDestinationX;
      this.cameraY = cameraDestinationY;
    }
  }
}
