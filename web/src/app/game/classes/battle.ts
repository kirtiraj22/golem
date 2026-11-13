import {
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_INFECTED_HERO,
} from "~/constants/helpers";
import { Combatan } from "./combatant";
import { TILES } from "~/constants/tiles";
import { attacks } from "./battle-state";

export class Battle {
  isOpen: boolean;
  level: any;
  combatans: {};
  distortions: never[];

  constructor() {
    this.isOpen = false;
    this.distortions = [];
    this.combatans = {};
  }

  init({ player, opponent }) {
    this.isOpen = true;
    this.combatans = {
      player,
      opponent,
    };
    this.distortions = opponent?.distortions;
  }

  stop() {
    this.isOpen = false;
  }
}
