import { TILES } from "~/constants/tiles";
import ElevatedSprite from "../../components/object-graphics/elevated-sprite";
import Placement from "../placement";
import { PLACEMENT_TYPE_FLOUR } from "~/constants/helpers";

export class FlourPlacement extends Placement {
  constructor(properties, level) {
    super(properties, level);
    this.canBeStolen = false;
  }

  addsItemToInventoryOnCollide(): string | null {
    return PLACEMENT_TYPE_FLOUR;
  }

  renderComponent(): JSX.Element | null {
    return <ElevatedSprite frameCoordinate={TILES.FLOUR} />;
  }
}
