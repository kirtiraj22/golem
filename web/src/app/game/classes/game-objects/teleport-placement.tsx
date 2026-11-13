import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import { BODY_SKINS, PLACEMENT_TYPE_TELEPORT } from "~/constants/helpers";

export class TeleportPlacement extends Placement {
  changesHeroSkinOnCollide(): string | null {
    return BODY_SKINS.TELEPORT;
  }

  teleportsToPositionOnCollide(body): any {
    if (body.interactWithGround) {
      const allTeleports = this.level.placements.filter(
        (placement) => placement.type === PLACEMENT_TYPE_TELEPORT
      );

      if (allTeleports.length > 1) {
        const myIndex = allTeleports.findIndex(
          (placement) => placement?.id === this.id
        );
        const next = allTeleports[myIndex + 1] ?? allTeleports[0];

        return {
          x: next.x,
          y: next.y,
        };
      }
    }
    return null;
  }

  renderComponent(): JSX.Element | null {
    return <Sprite frameCoordinate={TILES.TELEPORT1} />;
  }
}
