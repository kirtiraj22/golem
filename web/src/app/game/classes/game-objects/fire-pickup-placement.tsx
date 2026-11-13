import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";

export class FirePickupPlacement extends Placement {
  addsItemToInventoryOnCollide(): string | null {
    return this.type;
  }

  renderComponent(): JSX.Element | null {
    return <Sprite frameCoordinate={TILES.FIRE_PICKUP} />;
  }
}
