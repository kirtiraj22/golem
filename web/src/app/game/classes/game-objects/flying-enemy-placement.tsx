import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import Body from "../../components/object-graphics/body";
import { Direction } from "~/constants/helpers";
import { BodyPlacement } from "./body-placement";
import { GroundEnemyPlacement } from "./ground-enemy-placement";

export class FlyingEnemyPlacement extends GroundEnemyPlacement {
  tickBetweenMovesInterval: number;
  ticksUntilNextMove: number;

  constructor(properties, level) {
    super(properties, level);
    this.attackDamage = 30;
    this.tickBetweenMovesInterval = 20;
    this.ticksUntilNextMove = this.tickBetweenMovesInterval;
    this.turnAroundAtWater = false;
    this.interactWithGround = false;
  }

  renderComponent(): JSX.Element | null {
    const frameCoordinate =
      this.spriteFacingDirection === Direction.Left
        ? TILES.ENEMY_FLYING_LEFT
        : TILES.ENEMY_FLYING_RIGHT;

    return (
      <Body
        frameCoordinate={frameCoordinate}
        yTranslate={this.getYTranslate()}
        showShadow={true}
      />
    );
  }
}
