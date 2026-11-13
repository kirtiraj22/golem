import { Battle } from "./battle";
import { BattleEvent } from "./battle-event";
import { TurnCycle } from "./turn-cycle";

interface BattleStateData {}

export const actions = {
  DAMAGE_ONE: {
    name: "Overgeneralization",
    success: [
      { type: "message", text: "{CASTER} uses {ACTION}" },
      // { type: "message", text: "Overgeneralization Identified" },
      // { type: "message", text: "Not everyone are bad" },
    ],
    failed: {},
  },
  DAMAGE_TWO: {
    name: "Personalization",
    success: [
      { type: "message", text: "{CASTER} uses {ACTION}" },
      // { type: "message", text: "Personalization Identified" },
      // { type: "message", text: "Its not always your fault" },
    ],
    failed: {},
  },
};

export const attacks = {
  "001": {
    name: "Gray Samurai",
    actions: ["DAMAGE_ONE"],
  },
  "002": {
    name: "General Bomb",
    actions: ["DAMAGE_TWO"],
  },
};

class BattleState {
  battle: Battle;
  onEmit: (data: any) => void;
  events?: Array<any>;
  turnCycle: TurnCycle | undefined;

  constructor(battle: Battle, onEmit: (data: any) => void) {
    this.battle = battle;
    this.onEmit = onEmit;
    // this.dialogEvent = new DialogEvent();

    this.start();
  }

  start(): void {
    this.turnCycle = new TurnCycle({
      battle: this.battle,
      onNewEvent: (event: any) => {
        return new Promise((resolve) => {
          const battleEvent = new BattleEvent(event, this.battle);

          console.log("sending", event);
        });
      },
    });

    this.turnCycle.init();
    // this.onEmit(this);
    // const level = levels[this.id!];
    // this.startGameLoop();
  }

  startGameLoop() {
    // this.gameLoop?.stop();
    // this.gameLoop = new GameLoop(() => {
    //   this.tick();
    // });
  }

  tick() {
    // this.onEmit(this.getState());
  }

  getState(): BattleStateData {
    return {
      // theme: this.theme!,
      // tilesWidth: this.tilesWidth!,
      // tilesHeight: this.tilesHeight!,
      // placements: this.placements!,
      // isCompleted: this.isCompleted!,
      // deathOutcome: this.deathOutcome,
      // cameraTransformX: this?.camera?.transformX!,
      // cameraTransformY: this?.camera?.transformY!,
      // heroRef: this?.heroRef,
      // inventory: this.inventory,
      // battleScreenIsOpen: this.battleScreenIsOpen,
      // restart: () => {
      //   this.start();
      // },
    };
  }

  destroy() {}
}

export default BattleState;
