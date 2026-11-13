import React from "react";
import MapCell from "./map-cell";
import { LevelThemes, THEME_TILES_MAP } from "~/constants/helpers";

const LevelBackgroundTilesLayer = ({ level }) => {
  const widthWithWalls = level?.tilesWidth + 1;
  const heightWithWalls = level?.tilesHeight + 1;
  const tiles = THEME_TILES_MAP[level?.theme as LevelThemes];

  const getBackgroundTiles = (x, y) => {
    if (x === 0) {
      return tiles.LEFT;
    }

    if (x === widthWithWalls) {
      return tiles.RIGHT;
    }

    if (y === 0) {
      return tiles.TOP;
    }

    if (y === heightWithWalls) {
      return tiles.BOTTOM;
    }

    return tiles.FLOOR;
  };

  let canvases = [];

  for (let y = 0; y <= heightWithWalls; y++) {
    for (let x = 0; x <= widthWithWalls; x++) {
      if (y === heightWithWalls) {
        if (x === 0 || x === widthWithWalls) {
          continue;
        }
      }

      canvases.push(
        <MapCell
          x={x}
          y={y}
          key={`${x}_${y}`}
          frameCoordinate={getBackgroundTiles(x, y)}
        />
      );
    }
  }

  return <div>{canvases}</div>;
};

export default LevelBackgroundTilesLayer;
