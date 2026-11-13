import React from "react";
import { PLACEMENT_TYPE_FLOUR } from "~/constants/helpers";
import Sprite from "../object-graphics/sprite";
import { TILES } from "~/constants/tiles";

const FlourCount = ({ level }) => {
  const count = level.placements.filter(
    (placement) =>
      placement.type === PLACEMENT_TYPE_FLOUR && !placement?.hasBeenCollected
  ).length;

  return (
    <div className="flex items-center">
      <Sprite frameCoordinate={TILES.FLOUR} />
      {count}
    </div>
  );
};

export default FlourCount;
