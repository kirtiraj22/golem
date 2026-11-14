import { THEME_TILES_MAP } from "~/constants/helpers";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import { NEW_TILES } from "~/constants/tiles";

export class WallPlacement extends Placement {
  isSolidForBody(_body: any): boolean {
    return true;
  }

  renderComponent(): JSX.Element | null {
    const wallTileCoordinate = THEME_TILES_MAP[this.level.theme as string].WALL;
    // const wallTileCoordinate = NEW_TILES.HOME_TOP_MIDDLE;

    return <Sprite frameCoordinate={wallTileCoordinate} />;
  }
}
