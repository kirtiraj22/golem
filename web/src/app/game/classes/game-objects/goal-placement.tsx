import { TILES } from "~/constants/tiles";
import Sprite from "../../components/object-graphics/sprite";
import Placement from "../placement";
import { PLACEMENT_TYPE_FLOUR } from "~/constants/helpers";

class GoalPlacement extends Placement {
  get isDisabled() {
    const nonCollectedFlour = this.level.placements.find((placement) => {
      return (
        placement.type === PLACEMENT_TYPE_FLOUR && !placement?.hasBeenCollected
      );
    });

    return Boolean(nonCollectedFlour);
  }

  completesLevelOnCollide() {
    return !this.isDisabled;
  }

  renderComponent() {
    return (
      <Sprite
        frameCoordinate={
          this.isDisabled ? TILES.GOAL_DISABLED : TILES.GOAL_ENABLED
        }
      />
    );
  }
}

export default GoalPlacement;
