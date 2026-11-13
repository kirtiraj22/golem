import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";

export class SwitchableDoorPlacement extends Placement {
  isRaised: boolean;

  constructor(properties, level) {
    super(properties, level);
    this.isRaised = properties.isRaised ?? false;
  }

  toggleIsRaised() {
    this.isRaised = !this.isRaised;
  }

  isSolidForBody(_body: any): boolean {
    return this.isRaised;
  }

  renderComponent(): JSX.Element | null {
    const frameCoordinate = this.isRaised
      ? TILES.PURPLE_DOOR_SOLID
      : TILES.PURPLE_DOOR_OUTLINE;

    return <Sprite frameCoordinate={frameCoordinate} />;
  }
}
