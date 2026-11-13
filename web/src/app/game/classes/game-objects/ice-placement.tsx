import { TILES } from "~/constants/tiles";
import ElevatedSprite from "../../components/object-graphics/elevated-sprite";
import Placement from "../placement";
import {
  BODY_SKINS,
  Direction,
  ICE_CORNERS,
  PLACEMENT_TYPE_FLOUR,
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_ICE_PICKUP,
} from "~/constants/helpers";
import Sprite from "../../components/object-graphics/sprite";

const iceTileCornerFramesMap = {
  [ICE_CORNERS.TOP_LEFT]: TILES.ICE_TOP_LEFT,
  [ICE_CORNERS.TOP_RIGHT]: TILES.ICE_TOP_RIGHT,
  [ICE_CORNERS.BOTTOM_LEFT]: TILES.ICE_BOTTOM_LEFT,
  [ICE_CORNERS.BOTTOM_RIGHT]: TILES.ICE_BOTTOM_RIGHT,
};

const iceTileCornerRedirection = {
  TOP_LEFT: {
    [Direction.Top]: Direction.Right,
    [Direction.Left]: Direction.Bottom,
  },
  TOP_RIGHT: {
    [Direction.Top]: Direction.Left,
    [Direction.Right]: Direction.Bottom,
  },
  BOTTOM_LEFT: {
    [Direction.Left]: Direction.Top,
    [Direction.Bottom]: Direction.Right,
  },
  BOTTOM_RIGHT: {
    [Direction.Right]: Direction.Top,
    [Direction.Bottom]: Direction.Left,
  },
};

const iceTileCornerBlockedMoves = {
  TOP_LEFT: {
    [Direction.Top]: true,
    [Direction.Left]: true,
  },
  TOP_RIGHT: {
    [Direction.Top]: true,
    [Direction.Right]: true,
  },
  BOTTOM_LEFT: {
    [Direction.Bottom]: true,
    [Direction.Left]: true,
  },
  BOTTOM_RIGHT: {
    [Direction.Bottom]: true,
    [Direction.Right]: true,
  },
};

export class IcePlacement extends Placement {
  corner: keyof typeof ICE_CORNERS;

  constructor(properties, level) {
    super(properties, level);
    this.corner = properties.corner || null;
  }

  isSolidForBody(_body: any): boolean {
    const bodyIsBelow = this.y < _body.y;
    const bodyIsAbove = this.y > _body.y;
    const bodyIsToLeft = this.x > _body.x;
    const bodyIsToRight = this.x < _body.x;

    if (bodyIsBelow && this.corner?.includes("BOTTOM")) return true;
    if (bodyIsAbove && this.corner?.includes("TOP")) return true;
    if (bodyIsToLeft && this.corner?.includes("LEFT")) return true;
    if (bodyIsToRight && this.corner?.includes("RIGHT")) return true;

    return false;
  }

  blocksMovementDirection(direction: Direction) {
    if (this.corner) {
      return iceTileCornerBlockedMoves[this.corner][direction];
    }

    return false;
  }

  autoMovesBodyOnCollide(body): string {
    if (
      body.type === PLACEMENT_TYPE_HERO &&
      this.level.inventory.has(PLACEMENT_TYPE_ICE_PICKUP)
    ) {
      return null;
    }

    const possibleRedirects = iceTileCornerRedirection[this.corner];
    if (possibleRedirects) {
      return possibleRedirects[body.movingPixelDirection];
    }

    return body.movingPixelDirection;
  }

  changesHeroSkinOnCollide(): string | null {
    if (this.level.inventory.has(PLACEMENT_TYPE_ICE_PICKUP)) {
      return BODY_SKINS.ICE;
    }
    return BODY_SKINS.SCARED;
  }

  renderComponent(): JSX.Element | null {
    const frameCoordinate = this.corner
      ? iceTileCornerFramesMap[this.corner]
      : TILES.ICE;

    return <Sprite frameCoordinate={frameCoordinate} />;
  }
}
