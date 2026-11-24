import {
  LevelThemes,
  PLACEMENT_TYPE_AUCTIONEER,
  PLACEMENT_TYPE_FLOUR,
  PLACEMENT_TYPE_GOAL,
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_INFECTED_HERO,
  PLACEMENT_TYPE_MERCHANT,
  PLACEMENT_TYPE_ROAMING_ENEMY,
  PLACEMENT_TYPE_WALL,
  directionUpdateMap,
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
import type { AtlasTerrainGrid } from "./atlas-sprite-config";
import type { MerchantState, TradeLogEntry } from "../simulation/types";

interface Placement {
  id: number;
  x: number;
  y: number;
  frameCoordinate: string;
}

export type TradeNotice = {
  id: number;
  x: number;
  y: number;
  text: string;
  ticksRemaining: number;
};

type ActiveNpcTrade = {
  trade: TradeLogEntry;
  buyer: any;
  seller: any;
  phase: "approach" | "pause";
  pathAssigned: boolean;
  pauseTicks: number;
  startedAtTick: number;
};

const GOOD_LABELS: Record<string, string> = {
  GRAIN: "Grain",
  WOOD: "Wood",
  TOOLS: "Tools",
};

interface LevelStateData {
  theme: LevelThemes;
  tilesWidth: number;
  tilesHeight: number;
  placements: Placement[];
  terrain?: AtlasTerrainGrid;
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
  tradeNotices: TradeNotice[];
  gameMinutes: number;
  merchantStates: Record<string, MerchantState>;
}

class LevelState {
  onEmit: (data: any) => void;
  onMerchantInteract: ((merchantId: string) => void) | undefined;
  onAuctionInteract: (() => void) | undefined;
  directionsControls: DirectionControls;
  interactionKeyDownHandler: (event: KeyboardEvent) => void;
  inputEnabled: boolean;
  levelConfig: any;
  terrain: AtlasTerrainGrid | undefined;
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
  gameMinutes = 6 * 60;
  marketDay = 1;
  merchantStates: Record<string, MerchantState> = {};
  pendingTrades: TradeLogEntry[] = [];
  activeTrade: ActiveNpcTrade | null = null;
  tradeNotices: TradeNotice[] = [];
  noticeSequence = 0;
  tickCount = 0;

  constructor(
    onEmit: (data: any) => void,
    levelConfig: any = level1,
    onMerchantInteract?: (merchantId: string) => void,
    onAuctionInteract?: () => void
  ) {
    this.onEmit = onEmit;
    this.onMerchantInteract = onMerchantInteract;
    this.onAuctionInteract = onAuctionInteract;
    this.levelConfig = levelConfig;
    this.inputEnabled = true;
    this.directionsControls = new DirectionControls();
    this.interactionKeyDownHandler = (event) => {
      if (!this.inputEnabled || event.repeat) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() !== "e") {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      this.interactWithFacingMerchant();
    };

    document.addEventListener("keydown", this.interactionKeyDownHandler);

    this.start();
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    this.directionsControls.setEnabled(enabled);
  }

  setGameClock(minutes: number, day: number) {
    this.gameMinutes = minutes;
    this.marketDay = day;
  }

  getRoutinePhase(): "work" | "market" {
    // The closing market is where the simulation's daily NPC trades happen,
    // so everyone is back in the square from 10:00 until the day rolls over.
    return this.gameMinutes < 10 * 60 ? "work" : "market";
  }

  setMerchantStates(merchants: MerchantState[]) {
    this.merchantStates = Object.fromEntries(
      merchants.map((merchant) => [merchant.id, merchant])
    );
  }

  getMerchantState(id: string): MerchantState | undefined {
    return this.merchantStates[id];
  }

  enqueueTrades(trades: TradeLogEntry[]) {
    const npcTrades = trades.filter(
      (trade) => trade.buyerId !== "player" && trade.sellerId !== "player"
    );

    if (npcTrades.length > 0) {
      this.pendingTrades.push(...npcTrades);
    }
  }

  getMerchantPlacement(merchantId: string): any | undefined {
    return this.placements?.find(
      (placement) =>
        placement.type === PLACEMENT_TYPE_MERCHANT &&
        placement.simulationId === merchantId
    );
  }

  isMerchantCellBlocked(merchant: any, x: number, y: number): boolean {
    if (this.isPositionOutOfBounds(x, y)) {
      return true;
    }

    return Boolean(
      this.placements?.some((placement) => {
        if (!placement || placement.id === merchant.id) {
          return false;
        }

        // Treat the player as a polite obstacle so NPCs do not walk through
        // the hero while going about their routines.
        if (placement.type === PLACEMENT_TYPE_HERO) {
          return placement.x === x && placement.y === y;
        }

        return (
          placement.x === x &&
          placement.y === y &&
          placement.isSolidForBody?.(merchant)
        );
      })
    );
  }

  findMerchantPath(
    merchant: any,
    targetX: number,
    targetY: number
  ): Array<{ x: number; y: number }> | null {
    if (this.isMerchantCellBlocked(merchant, targetX, targetY)) {
      return null;
    }

    return this.findMerchantPathToAny(merchant, [{ x: targetX, y: targetY }]);
  }

  findMerchantPathToSeller(
    merchant: any,
    seller: any
  ): Array<{ x: number; y: number }> | null {
    const candidates = [
      { x: seller.x + 1, y: seller.y },
      { x: seller.x - 1, y: seller.y },
      { x: seller.x, y: seller.y + 1 },
      { x: seller.x, y: seller.y - 1 },
    ].filter(
      (candidate) =>
        !this.isMerchantCellBlocked(merchant, candidate.x, candidate.y)
    );

    if (candidates.length === 0) {
      return null;
    }

    if (
      candidates.some(
        (candidate) => candidate.x === merchant.x && candidate.y === merchant.y
      )
    ) {
      return [];
    }

    return this.findMerchantPathToAny(merchant, candidates);
  }

  private findMerchantPathToAny(
    merchant: any,
    targets: Array<{ x: number; y: number }>
  ): Array<{ x: number; y: number }> | null {
    const startKey = `${merchant.x},${merchant.y}`;
    const targetKeys = new Set(
      targets.map((target) => `${target.x},${target.y}`)
    );

    if (targetKeys.size === 0) {
      return null;
    }

    if (targetKeys.has(startKey)) {
      return [];
    }

    const queue: Array<{ x: number; y: number; key: string }> = [
      { x: merchant.x, y: merchant.y, key: startKey },
    ];
    const parents = new Map<string, string | null>([[startKey, null]]);
    const steps = Object.values(directionUpdateMap);
    let head = 0;

    while (head < queue.length) {
      const current = queue[head];
      head += 1;

      for (const step of steps) {
        const nextX = current.x + step.x;
        const nextY = current.y + step.y;
        const nextKey = `${nextX},${nextY}`;

        if (parents.has(nextKey)) {
          continue;
        }

        if (this.isMerchantCellBlocked(merchant, nextX, nextY)) {
          continue;
        }

        parents.set(nextKey, current.key);

        if (targetKeys.has(nextKey)) {
          const path: Array<{ x: number; y: number }> = [];
          let cursor: string | null = nextKey;

          while (cursor && cursor !== startKey) {
            const [x, y] = cursor.split(",").map(Number);
            path.push({ x, y });
            cursor = parents.get(cursor) ?? null;
          }

          return path.reverse();
        }

        queue.push({ x: nextX, y: nextY, key: nextKey });
      }
    }

    return null;
  }

  private tickTradeQueue() {
    const active = this.activeTrade;

    if (active) {
      if (active.phase === "approach") {
        if (this.tickCount - active.startedAtTick > 60 * 25) {
          active.pathAssigned = true;
          active.buyer.markTradeUnreachable();
          this.beginTradePause(active);
          return;
        }

        if (!active.pathAssigned) {
          if (!active.buyer.isIdle() || !active.seller.isIdle()) {
            return;
          }

          const path = this.findMerchantPathToSeller(
            active.buyer,
            active.seller
          );

          if (!path) {
            active.buyer.markTradeUnreachable();
            active.pathAssigned = true;
          } else {
            active.buyer.setTradePath(
              path,
              active.seller.simulationId,
              this.pendingTrades.length > 3 ? 4 : 2
            );
            active.pathAssigned = true;

            if (path.length === 0) {
              this.beginTradePause(active);
            }
          }

          return;
        }

        if (active.buyer.isAdjacentTo(active.seller) && active.buyer.isIdle()) {
          this.beginTradePause(active);
        } else if (active.buyer.hasPathFailed()) {
          this.beginTradePause(active);
        }

        return;
      }

      active.pauseTicks -= 1;

      if (active.pauseTicks <= 0) {
        active.buyer.releaseTrade();
        active.seller.releaseTrade();
        this.activeTrade = null;
      }

      return;
    }

    const trade = this.pendingTrades.shift();

    if (!trade) {
      return;
    }

    const buyer = this.getMerchantPlacement(trade.buyerId);
    const seller = this.getMerchantPlacement(trade.sellerId);

    if (!buyer || !seller || buyer.id === seller.id) {
      return;
    }

    seller.holdForTrade();
    buyer.prepareForTrade(seller.simulationId);

    this.activeTrade = {
      trade,
      buyer,
      seller,
      phase: "approach",
      pathAssigned: false,
      pauseTicks: 0,
      startedAtTick: this.tickCount,
    };
  }

  private beginTradePause(active: ActiveNpcTrade) {
    if (active.phase === "pause") {
      return;
    }

    active.phase = "pause";
    active.pauseTicks = this.pendingTrades.length > 3 ? 24 : 75;
    active.buyer.holdForTrade();
    active.seller.holdForTrade();
    active.buyer.faceToward(active.seller);
    active.seller.faceToward(active.buyer);
    this.emitTradeNotice(active.trade, active.buyer, active.seller);
  }

  private emitTradeNotice(trade: TradeLogEntry, buyer: any, seller: any) {
    const goodName = GOOD_LABELS[trade.goodId] ?? trade.goodId;
    const midX = ((buyer.x + seller.x) / 2) * 16 + 8;
    const midY = Math.min(buyer.y, seller.y) * 16 - 2;

    this.tradeNotices.push({
      id: ++this.noticeSequence,
      x: midX,
      y: midY,
      text: `${buyer.displayName ?? trade.buyerId} bought ${
        trade.quantity
      } ${goodName} from ${seller.displayName ?? trade.sellerId} · ${
        trade.totalPrice
      }c`,
      ticksRemaining: 150,
    });

    this.tradeNotices = this.tradeNotices.slice(-6);
  }

  private tickTradeNotices() {
    this.tradeNotices = this.tradeNotices
      .map((notice) => ({
        ...notice,
        ticksRemaining: notice.ticksRemaining - 1,
      }))
      .filter((notice) => notice.ticksRemaining > 0);
  }

  interactWithFacingMerchant() {
    const hero = this.heroRef;
    const direction = hero?.facingDirection;

    if (!hero || !direction) {
      return;
    }

    const delta =
      directionUpdateMap[direction as keyof typeof directionUpdateMap];

    if (!delta) {
      return;
    }

    const auctioneer = this.placements?.find(
      (placement) =>
        placement.type === PLACEMENT_TYPE_AUCTIONEER &&
        placement.x === hero.x + delta.x &&
        placement.y === hero.y + delta.y
    );

    if (auctioneer) {
      this.onAuctionInteract?.();
      return;
    }

    const merchant = this.placements?.find(
      (placement) =>
        placement.type === PLACEMENT_TYPE_MERCHANT &&
        placement.x === hero.x + delta.x &&
        placement.y === hero.y + delta.y
    );

    if (merchant?.simulationId) {
      this.onMerchantInteract?.(merchant.simulationId);
    }
  }

  start(): void {
    const level = this.levelConfig;

    this.isCompleted = false;
    this.deathOutcome = null;

    this.theme = level.theme;
    this.tilesWidth = level.tilesWidth;
    this.tilesHeight = level.tilesHeight;
    this.terrain = level.terrain;
    this.placements = level.placements?.map((config) =>
      placementFactory.createPlacement(config, this)
    );

    this.inventory = new Inventory();
    this.cutscenes = [];
    this.pendingTrades = [];
    this.activeTrade = null;
    this.tradeNotices = [];
    this.tickCount = 0;

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
    this.tickCount += 1;

    if (this.directionsControls.direction) {
      this.heroRef.controllerMoveRequested(this.directionsControls.direction);
    }

    // Work on animation frames
    this.animatedFrames?.tick();

    this?.placements?.forEach((placement) => {
      placement.tick();
    });

    this?.camera?.tick();

    this.tickTradeQueue();
    this.tickTradeNotices();

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
      terrain: this.terrain,
      placements: this.placements!,
      isCompleted: this.isCompleted!,
      deathOutcome: this.deathOutcome,
      cameraTransformX: this?.camera?.transformX!,
      cameraTransformY: this?.camera?.transformY!,
      heroRef: this?.heroRef,
      inventory: this.inventory,
      custscenes: this.cutscenes,
      clearCutscene: () => this.clearCutscene(),
      tradeNotices: this.tradeNotices,
      gameMinutes: this.gameMinutes,
      merchantStates: this.merchantStates,
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
    document.removeEventListener("keydown", this.interactionKeyDownHandler);
  }
}

export default LevelState;
