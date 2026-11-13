import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import {
  BODY_SKINS,
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_WATER_PICKUP,
} from "~/constants/helpers";

export class WaterPlacement extends Placement {
  changesHeroSkinOnCollide(): string | null {
    return BODY_SKINS.WATER;
  }

  damagesBodyOnCollide(_body: any): any {
    return (
      _body.type === PLACEMENT_TYPE_HERO &&
      !this.level.inventory.has(PLACEMENT_TYPE_WATER_PICKUP)
    );
  }

  isSolidForBody(_body: any): boolean {
    return _body.turnAroundAtWater || false;
  }

  renderComponent(): JSX.Element | null {
    const waterFrames = this.level?.animatedFrames?.waterFrame;

    return <Sprite frameCoordinate={waterFrames} />;
  }
}
