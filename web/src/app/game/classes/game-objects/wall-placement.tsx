import { THEME_TILES_MAP } from "~/constants/helpers";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";

export class WallPlacement extends Placement {
  isSolidForBody(_body: any): boolean {
    return true;
  }

  renderComponent(): JSX.Element | null {
    const wallTileCoordinate = THEME_TILES_MAP[this.level.theme as string].WALL;

    return <Sprite frameCoordinate={wallTileCoordinate} />;
  }
}
