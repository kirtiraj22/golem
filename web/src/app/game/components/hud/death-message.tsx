import React from "react";
import LevelFailedSvg from "../object-graphics/level-failed-svg";
import Sprite from "../object-graphics/sprite";
import { TILES } from "~/constants/tiles";
import {
  PLACEMENT_TYPE_FIRE,
  PLACEMENT_TYPE_WATER,
  PLACEMENT_TYPE_GROUND_ENEMY,
  PLACEMENT_TYPE_ROAMING_ENEMY,
  PLACEMENT_TYPE_FLYING_ENEMY,
  PLACEMENT_TYPE_CIABATTA,
  PLACEMENT_TYPE_INFECTED_HERO,
} from "~/constants/helpers";
import progressEntry from "../../classes/progress-entry";

const showDeathType = (deathType: string) => {
  switch (deathType) {
    case PLACEMENT_TYPE_FIRE:
      return <Sprite frameCoordinate={TILES.FIRE1} />;
    case PLACEMENT_TYPE_WATER:
      return <Sprite frameCoordinate={TILES.WATER1} />;
    case PLACEMENT_TYPE_GROUND_ENEMY:
      return (
        <div
          style={{
            paddingBottom: 12,
          }}
        >
          <Sprite frameCoordinate={TILES.ENEMY_RIGHT} size={32} />
        </div>
      );
    case PLACEMENT_TYPE_ROAMING_ENEMY:
      return (
        <div
          style={{
            paddingBottom: 12,
          }}
        >
          <Sprite frameCoordinate={TILES.ENEMY_ROAMING} size={32} />
        </div>
      );
    case PLACEMENT_TYPE_FLYING_ENEMY:
      return (
        <div
          style={{
            paddingBottom: 12,
          }}
        >
          <Sprite frameCoordinate={TILES.ENEMY_FLYING_RIGHT} size={32} />
        </div>
      );
    case PLACEMENT_TYPE_CIABATTA:
      return (
        <div
          style={{
            paddingBottom: 4,
          }}
        >
          <Sprite frameCoordinate={TILES.CIABATTA_RIGHT} size={48} />
        </div>
      );
    case PLACEMENT_TYPE_INFECTED_HERO:
      return (
        <div>
          <Sprite frameCoordinate={TILES.HERO_INFECTED_RIGHT} size={32} />
        </div>
      );
    default:
      return null;
  }
};

const DeathMessage = ({ level }) => {
  const onRestartLevel = () => {
    progressEntry.reset();
    level?.restart();
  };

  return (
    <div className="outer-container absolute inset-0 z-[var(--ui-popup-z-index)] flex items-center justify-center">
      <div className="popup-container relative">
        <button onClick={onRestartLevel}>
          <LevelFailedSvg />
          <div className="flex items-center h-[38px] w-[42px] absolute left-[4px] top-[18px]">
            {showDeathType(level?.deathOutcome)}
          </div>
        </button>
      </div>
    </div>
  );
};

export default DeathMessage;
