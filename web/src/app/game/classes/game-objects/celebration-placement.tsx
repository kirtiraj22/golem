import { Z_INDEX_LAYER_SIZE } from "~/constants/helpers";
import Placement from "../placement";
import Sprite from "../../components/object-graphics/sprite";
import { TILES } from "~/constants/tiles";

export class CelebrationPlacement extends Placement {
  frame: number;
  constructor(properties, level) {
    super(properties, level);
    this.frame = 1;
  }

  tick(): void {
    if (this.frame <= 8) {
      this.frame += 0.5;

      return;
    }

    this.level.deletePlacement(this);
  }

  zIndex(): number {
    return this.y * Z_INDEX_LAYER_SIZE + 2;
  }

  renderComponent(): JSX.Element | null {
    const frameCoordinate = `PARTICLE_${Math.ceil(this.frame)}`;

    return (
      <Sprite frameCoordinate={TILES[frameCoordinate as keyof typeof TILES]} />
    );
  }
}
