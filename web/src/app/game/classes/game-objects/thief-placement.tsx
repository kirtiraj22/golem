import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import { BODY_SKINS, PLACEMENT_TYPE_HERO } from "~/constants/helpers";

export class ThiefPlacement extends Placement {
  stealsInventoryOnCollide(body) {
    return body.type === PLACEMENT_TYPE_HERO;
  }
  changesHeroSkinOnCollide(): string | null {
    return BODY_SKINS.SCARED;
  }

  renderComponent(): JSX.Element | null {
    return <Sprite frameCoordinate={TILES.THIEF} />;
  }
}
