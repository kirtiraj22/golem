import { LOCK_KEY_COLORS } from "~/constants/helpers";
import Placement from "../placement";
import ElevatedSprite from "../../components/object-graphics/elevated-sprite";
import { TILES } from "~/constants/tiles";

export class KeyPlacement extends Placement {
  color: any;

  constructor(properties, level) {
    super(properties, level);
    this.color = properties?.color ?? LOCK_KEY_COLORS.BLUE;
  }

  addsItemToInventoryOnCollide(): string | null {
    return `KEY_${this.color}`;
  }

  renderComponent(): JSX.Element | null {
    const frameCoordinate =
      this.color === LOCK_KEY_COLORS.BLUE ? TILES.BLUE_KEY : TILES.GREEN_KEY;

    return <ElevatedSprite frameCoordinate={frameCoordinate} />;
  }
}
