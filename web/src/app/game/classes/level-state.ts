import {
  LevelThemes,
  PLACEMENT_TYPE_FLOUR,
  PLACEMENT_TYPE_GOAL,
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_INFECTED_HERO,
  PLACEMENT_TYPE_ROAMING_ENEMY,
  PLACEMENT_TYPE_WALL,
} from "~/constants/helpers";
import placementFactory from "./placement-factory";
import { GameLoop } from "./game-loop";
import { DirectionControls } from "./direction-controls";
import level1 from "../levels/level-1";
import { Inventory } from "./inventory";
import { LevelAnimatedFrames } from "./level-animated-frame";
import { Camera } from "./camera";
import soundManager, { SFX } from "./sounds";
import { Battle } from "./battle";
import { DialogEvent } from "./dialog-event";
import progressEntry from "./progress-entry";

interface Placement {
  id: number;
  x: number;
  y: number;
  frameCoordinate: string;
}

interface LevelStateData {
  theme: LevelThemes;
  tilesWidth: number;
  tilesHeight: number;
  placements: Placement[];
  isCompleted: boolean;
  deathOutcome: any;
  cameraTransformX: string;
  cameraTransformY: string;
  inventory: any;
  heroRef?: any;
  battle?: any;
  custscenes?: Array<{ type: string; text: string }>;
  clearCutscene: () => void;
  restart: () => void;
}

class LevelState {
  onEmit: (data: any) => void;
  directionsControls: DirectionControls;
  theme: LevelThemes | undefined;
  tilesWidth: number | undefined;
  tilesHeight: number | undefined;
  placements: any[] | undefined;
  heroRef: any;
  gameLoop: any;
  isCompleted: boolean | undefined;
  inventory: Inventory | undefined;
  deathOutcome: any;
  animatedFrames: LevelAnimatedFrames | undefined;
  camera: Camera | undefined;
  battle: Battle | undefined;
  cutscenes: Array<{ type: string; text: string }> | undefined;

  constructor(onEmit: (data: any) => void) {
    this.onEmit = onEmit;
    this.directionsControls = new DirectionControls();

    this.start();
  }

  start(): void {
    const level = level1;

    this.isCompleted = false;
    this.deathOutcome = null;

    this.theme = level.theme;
    this.tilesWidth = level.tilesWidth;
    this.tilesHeight = level.tilesHeight;
    this.placements = level.placements?.map((config) =>
      placementFactory.createPlacement(config, this)
    );

    this.inventory = new Inventory();
    this.cutscenes = [];

    this.heroRef = this.placements.find(
      (placement) => placement.type === PLACEMENT_TYPE_HERO
    );

    /**
     * Create a battle
     */
    this.battle = new Battle();

    /**
     * Create a camera
     */
    this.camera = new Camera(this);

    /**
     * Create a frame animation manager
     */
    this.animatedFrames = new LevelAnimatedFrames();

    this.startGameLoop();
  }

  startGameLoop() {
    this.gameLoop?.stop();
    this.gameLoop = new GameLoop(() => {
      this.tick();
    });
  }

  addPlacement(config: any) {
    this.placements?.push(placementFactory.createPlacement(config, this));
  }

  deletePlacement(placementToRemove: any) {
    this.placements = this.placements?.filter((placement) => {
      return placement?.id !== placementToRemove?.id;
    });
  }

  tick() {
    if (this.directionsControls.direction) {
      this.heroRef.controllerMoveRequested(this.directionsControls.direction);
    }

    // Work on animation frames
    this.animatedFrames?.tick();

    this?.placements?.forEach((placement) => {
      placement.tick();
    });

    this?.camera?.tick();

    // // emit changes
    this.onEmit(this.getState());
  }

  forceRender() {
    this.onEmit(this.getState());
  }

  isPositionOutOfBounds(x, y) {
    return (
      x === 0 ||
      y === 0 ||
      x >= this.tilesWidth! + 1 ||
      y >= this.tilesHeight! + 1
    );
  }

  getState(): LevelStateData {
    return {
      theme: this.theme!,
      tilesWidth: this.tilesWidth!,
      tilesHeight: this.tilesHeight!,
      placements: this.placements!,
      isCompleted: this.isCompleted!,
      deathOutcome: this.deathOutcome,
      cameraTransformX: this?.camera?.transformX!,
      cameraTransformY: this?.camera?.transformY!,
      heroRef: this?.heroRef,
      inventory: this.inventory,
      custscenes: this.cutscenes,
      clearCutscene: () => this.clearCutscene(),
      battle: {
        instance: this?.battle,
        isOpen: this.battle?.isOpen || false,
        onComplete: (winner: any) => this.onBattleCompleted(winner),
      },
      restart: () => {
        this.start();
      },
    };
  }

  stealInventory() {
    this.placements?.forEach((placement) => {
      placement?.resetHasBeenCollected();
    });

    this.inventory.clear();
  }

  switchAllDoors() {
    this.placements?.forEach((placement) => {
      if (placement.toggleIsRaised) {
        placement.toggleIsRaised();
      }
    });
  }

  addCutscene(cutscenes) {
    this.cutscenes = cutscenes;
    this.gameLoop?.pause();
  }

  clearCutscene() {
    this.cutscenes = [];
    this.forceRender();
  }

  initializeBattle({ player, opponent }) {
    this.gameLoop?.pause();
    this.battle?.init({ player, opponent });
  }

  onBattleCompleted(result) {
    if (result?.opponent?.health === 0) {
      this.battle?.stop();
      this.battle?.combatans?.opponent?.defeated();
      this.heroRef.stats = result?.player;

      progressEntry.save({ stats: result?.player });
      this.gameLoop.continue();
    }

    if (result?.player?.health === 0) {
      this.battle?.stop();
      progressEntry.reset();

      this.setDeathOutcome(PLACEMENT_TYPE_INFECTED_HERO);
      soundManager.playSFX(SFX.GAME_OVER);
      this.forceRender();
    }
  }

  setDeathOutcome(causeOfDeath: any) {
    this.deathOutcome = causeOfDeath;
    this.gameLoop.stop();
  }

  completeLevel() {
    this.isCompleted = true;
    this.gameLoop.stop();
  }

  destroy(): void {
    this.gameLoop?.stop();
    this.directionsControls?.unbind();
  }
}

export default LevelState;
