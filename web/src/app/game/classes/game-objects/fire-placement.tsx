import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import {
  BODY_SKINS,
  PLACEMENT_TYPE_FIRE_PICKUP,
  PLACEMENT_TYPE_HERO,
} from "~/constants/helpers";

export class FirePlacement extends Placement {
  damagesBodyOnCollide(_body: any): string | null {
    if (
      _body.type === PLACEMENT_TYPE_HERO &&
      !this.level.inventory.has(PLACEMENT_TYPE_FIRE_PICKUP)
    ) {
      return this.type;
    }

    return null;
  }

  changesHeroSkinOnCollide(): string | null {
    return BODY_SKINS.FIRE;
  }

  renderComponent(): JSX.Element | null {
    const fireFrames = this.level?.animatedFrames?.fireFrame;

    return <Sprite frameCoordinate={fireFrames} />;
  }
}
