import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";

export class DoorSwitchPlacement extends Placement {
  switchesDoorsOnCollide(body) {
    return body.interactWithGround;
  }

  renderComponent(): JSX.Element | null {
    return <Sprite frameCoordinate={TILES.PURPLE_BUTTON} />;
  }
}
