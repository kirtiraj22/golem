import React, { memo } from "react";
import { CELL_SIZE } from "~/constants/helpers";
import type { AtlasTerrainGrid } from "../../classes/atlas-sprite-config";
import AtlasSprite from "../object-graphics/atlas-sprite";

type PreviewTerrainLayerProps = {
  terrain: AtlasTerrainGrid;
};

/**
 * Renders a static, arbitrary terrain grid from the preview spritesheets.
 * The layer is memoized because the terrain does not change during play.
 */
const PreviewTerrainLayer = ({ terrain }: PreviewTerrainLayerProps) => {
  return (
    <>
      {terrain.map((row, y) =>
        row.map((tile, x) => {
          if (!tile) {
            return null;
          }

          return (
            <div
              key={`terrain-${x}-${y}`}
              style={{
                position: "absolute",
                left: x * CELL_SIZE,
                top: y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            >
              <AtlasSprite sprite={tile} />
            </div>
          );
        })
      )}
    </>
  );
};

export default memo(PreviewTerrainLayer);
