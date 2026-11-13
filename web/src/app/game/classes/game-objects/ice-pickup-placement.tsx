import { TILES } from "~/constants/tiles";
import ElevatedSprite from "../../components/object-graphics/elevated-sprite";
import Placement from "../placement";
import { PLACEMENT_TYPE_FLOUR } from "~/constants/helpers";
import Sprite from "../../components/object-graphics/sprite";

export class IcePickupPlacement extends Placement {
  addsItemToInventoryOnCollide(): string | null {
    return this.type;
  }

  renderComponent(): JSX.Element | null {
    return <Sprite frameCoordinate={TILES.ICE_PICKUP} />;
  }
}
