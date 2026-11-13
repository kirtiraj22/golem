import {
  PLACEMENT_TYPE_CELEBRATION,
  PLACEMENT_TYPE_CONVEYOR,
  PLACEMENT_TYPE_FIRE,
  PLACEMENT_TYPE_FIRE_PICKUP,
  PLACEMENT_TYPE_FLOUR,
  PLACEMENT_TYPE_FLYING_ENEMY,
  PLACEMENT_TYPE_GOAL,
  PLACEMENT_TYPE_GROUND_ENEMY,
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_ICE,
  PLACEMENT_TYPE_ICE_PICKUP,
  PLACEMENT_TYPE_INFECTED_HERO,
  PLACEMENT_TYPE_KEY,
  PLACEMENT_TYPE_LOCK,
  PLACEMENT_TYPE_ROAMING_ENEMY,
  PLACEMENT_TYPE_SWITCH,
  PLACEMENT_TYPE_SWITCH_DOOR,
  PLACEMENT_TYPE_TELEPORT,
  PLACEMENT_TYPE_THIEF,
  PLACEMENT_TYPE_WALL,
  PLACEMENT_TYPE_WATER,
  PLACEMENT_TYPE_WATER_PICKUP,
} from "~/constants/helpers";
import HeroPlacement from "./game-objects/hero-placement";
import GoalPlacement from "./game-objects/goal-placement";
import { WallPlacement } from "./game-objects/wall-placement";
import { FlourPlacement } from "./game-objects/flour-placement";
import { CelebrationPlacement } from "./game-objects/celebration-placement";
import { GroundEnemyPlacement } from "./game-objects/ground-enemy-placement";
import { LockPlacement } from "./game-objects/lock-placement";
import { KeyPlacement } from "./game-objects/key-placement";
import { WaterPlacement } from "./game-objects/water-placement";
import { WaterPickupPlacement } from "./game-objects/water-pickup-placement";
import { FlyingEnemyPlacement } from "./game-objects/flying-enemy-placement";
import { RoamingEnemyPlacement } from "./game-objects/roaming-enemy-placement";
import { ConveyorBeltPlacement } from "./game-objects/conveyor-belt-placement";
import { IcePlacement } from "./game-objects/ice-placement";
import { IcePickupPlacement } from "./game-objects/ice-pickup-placement";
import { FirePlacement } from "./game-objects/fire-placement";
import { FirePickupPlacement } from "./game-objects/fire-pickup-placement";
import { SwitchableDoorPlacement } from "./game-objects/switchable-door-placement";
import { DoorSwitchPlacement } from "./game-objects/door-switch-placement";
import { TeleportPlacement } from "./game-objects/teleport-placement";
import { ThiefPlacement } from "./game-objects/thief-placement";
import { InfectedHeroPlacement } from "./game-objects/infected-hero-placement";

const placementTypeClassMap = {
  [PLACEMENT_TYPE_HERO]: HeroPlacement,
  [PLACEMENT_TYPE_GOAL]: GoalPlacement,
  [PLACEMENT_TYPE_WALL]: WallPlacement,
  [PLACEMENT_TYPE_FLOUR]: FlourPlacement,
  [PLACEMENT_TYPE_CELEBRATION]: CelebrationPlacement,
  [PLACEMENT_TYPE_GROUND_ENEMY]: GroundEnemyPlacement,
  [PLACEMENT_TYPE_FLYING_ENEMY]: FlyingEnemyPlacement,
  [PLACEMENT_TYPE_LOCK]: LockPlacement,
  [PLACEMENT_TYPE_KEY]: KeyPlacement,
  [PLACEMENT_TYPE_WATER]: WaterPlacement,
  [PLACEMENT_TYPE_WATER_PICKUP]: WaterPickupPlacement,
  [PLACEMENT_TYPE_ROAMING_ENEMY]: RoamingEnemyPlacement,
  [PLACEMENT_TYPE_CONVEYOR]: ConveyorBeltPlacement,
  [PLACEMENT_TYPE_ICE]: IcePlacement,
  [PLACEMENT_TYPE_ICE_PICKUP]: IcePickupPlacement,
  [PLACEMENT_TYPE_FIRE]: FirePlacement,
  [PLACEMENT_TYPE_FIRE_PICKUP]: FirePickupPlacement,
  [PLACEMENT_TYPE_SWITCH_DOOR]: SwitchableDoorPlacement,
  [PLACEMENT_TYPE_SWITCH]: DoorSwitchPlacement,
  [PLACEMENT_TYPE_TELEPORT]: TeleportPlacement,
  [PLACEMENT_TYPE_THIEF]: ThiefPlacement,
  [PLACEMENT_TYPE_INFECTED_HERO]: InfectedHeroPlacement,
};

class PlacementFactory {
  createPlacement(config, level) {
    const PlacementClass =
      placementTypeClassMap[config.type as keyof typeof placementTypeClassMap];

    if (!PlacementClass) {
      console.warn("TYPE NOT FOUND", config.type);
    }

    const instance = new PlacementClass(config, level);
    (instance as any).id = Math.floor(Math.random() * 999999) + 1;

    return instance;
  }
}

const placementFactory = new PlacementFactory();

export default placementFactory;
