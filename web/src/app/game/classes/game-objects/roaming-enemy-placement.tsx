import { TILES } from "~/constants/tiles";
import Body from "../../components/object-graphics/body";
import Placement from "../placement";
import { GroundEnemyPlacement } from "./ground-enemy-placement";
import { Direction } from "~/constants/helpers";
import { Collision } from "../collision";

export class RoamingEnemyPlacement extends GroundEnemyPlacement {
  tickBetweenMovesInterval: number;
  ticksUntilNextMove: number;

  constructor(properties, level) {
    super(properties, level);
    this.attackDamage = 35;
    this.tickBetweenMovesInterval = 8;
    this.ticksUntilNextMove = this.tickBetweenMovesInterval;
    this.turnAroundAtWater = true;
    this.interactWithGround = true;
  }

  onPostMove(): void | null {
    /**
     * Do not chose next move on automove
     */

    const collision = new Collision(this, this.level);

    if (collision.withPlacementMovesBody()) {
      return;
    }

    const directions = [
      Direction.Left,
      Direction.Right,
      Direction.Bottom,
      Direction.Top,
    ];

    this.movingPixelDirection =
      directions[Math.floor(Math.random() * directions.length)];
  }

  renderComponent(): JSX.Element | null {
    return <Body frameCoordinate={TILES.ENEMY_ROAMING} yTranslate={0} />;
  }
}
