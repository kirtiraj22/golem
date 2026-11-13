import React from "react";
import {
  PLACEMENT_TYPE_FIRE_PICKUP,
  PLACEMENT_TYPE_ICE_PICKUP,
  PLACEMENT_TYPE_WATER_PICKUP,
} from "~/constants/helpers";
import { TILES } from "~/constants/tiles";
import Sprite from "../object-graphics/sprite";

const showInventory = [
  { key: PLACEMENT_TYPE_FIRE_PICKUP, tile: TILES.FIRE_PICKUP },
  { key: PLACEMENT_TYPE_ICE_PICKUP, tile: TILES.ICE_PICKUP },
  { key: PLACEMENT_TYPE_WATER_PICKUP, tile: TILES.WATER_PICKUP },
  { key: "KEY_BLUE", tile: TILES.BLUE_KEY },
  { key: "KEY_GREEN", tile: TILES.GREEN_KEY },
];

const InventoryList = ({ level }) => {
  return (
    <div className="flex items-center">
      {showInventory
        .filter((inventory) => level.inventory.has(inventory.key))
        .map((inventory) => (
          <div key={inventory.key} className="flex gap-[4px]">
            <Sprite frameCoordinate={inventory.tile} />
          </div>
        ))}
    </div>
  );
};

export default InventoryList;
