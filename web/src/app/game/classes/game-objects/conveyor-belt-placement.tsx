import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import {
  BODY_SKINS,
  Direction,
  PLACEMENT_TYPE_FLOUR,
} from "~/constants/helpers";

const directionFrameMap = {
  [Direction.Left]: TILES.CONVEYOR_LEFT,
  [Direction.Right]: TILES.CONVEYOR_RIGHT,
  [Direction.Top]: TILES.CONVEYOR_UP,
  [Direction.Bottom]: TILES.CONVEYOR_DOWN,
};

export class ConveyorBeltPlacement extends Placement {
  direction: keyof typeof directionFrameMap;

  constructor(properties, level) {
    super(properties, level);
    this.direction = this.properties?.direction;
  }

  autoMovesBodyOnCollide(): string {
    return this.direction;
  }

  changesHeroSkinOnCollide(): string | null {
    return BODY_SKINS.CONVEYOR;
  }

  renderComponent() {
    return <Sprite frameCoordinate={directionFrameMap[this.direction]} />;
  }
}
