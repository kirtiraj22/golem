import React from "react";
import { TILES } from "~/constants/tiles";
import {
  CELL_SIZE,
  Direction,
  directionUpdateMap,
  Z_INDEX_LAYER_SIZE,
} from "~/constants/helpers";
import Placement from "../placement";
import Body from "../../components/object-graphics/body";
import { GOOD_IDS } from "../../simulation/types";

export type MerchantRole =
  | "pawnbroker"
  | "furniture-dealer"
  | "salvage-buyer";

export type MerchantRoutinePoint = {
  x: number;
  y: number;
};

export type MerchantRoutine = {
  work: MerchantRoutinePoint;
  market: MerchantRoutinePoint;
};

type MerchantPlacementProperties = {
  simulationId: string;
  name: string;
  role: MerchantRole;
  frameCoordinate?: string;
  routine?: MerchantRoutine;
};

const DEFAULT_MERCHANT_FRAMES: Record<
  MerchantRole,
  { left: string; right: string }
> = {
  pawnbroker: {
    left: TILES.HERO_CONVEYOR_LEFT,
    right: TILES.HERO_CONVEYOR_RIGHT,
  },
  "furniture-dealer": {
    left: TILES.HERO_EDITING_LEFT,
    right: TILES.HERO_EDITING_RIGHT,
  },
  "salvage-buyer": {
    left: TILES.HERO_FIRE_LEFT,
    right: TILES.HERO_FIRE_RIGHT,
  },
};

const labelStyle: React.CSSProperties = {
  background: "#fff6d6",
  border: "1px solid #2b1a08",
  boxShadow: "1px 1px 0 #2b1a08",
  color: "#2b1a08",
  fontFamily: "monospace",
  fontSize: 6,
  fontWeight: 700,
  left: 8,
  letterSpacing: "0.04em",
  lineHeight: 1.35,
  padding: "1px 3px",
  pointerEvents: "none",
  position: "absolute",
  textTransform: "uppercase",
  top: -28,
  transform: "translateX(-50%)",
  whiteSpace: "nowrap",
};

const promptStyle: React.CSSProperties = {
  ...labelStyle,
  background: "#f4c95d",
  fontSize: 7,
  left: 8,
  padding: "1px 4px",
  top: -46,
};

function directionForDelta(dx: number, dy: number): Direction | null {
  if (dx < 0) {
    return Direction.Left;
  }

  if (dx > 0) {
    return Direction.Right;
  }

  if (dy < 0) {
    return Direction.Top;
  }

  if (dy > 0) {
    return Direction.Bottom;
  }

  return null;
}

/**
 * Market merchant with a tiny scheduled routine.
 *
 * The economy still owns all money and inventory. This placement only walks
 * between configured work/market cells and replays completed NPC trade
 * records as short, visible meetings.
 */
export class MerchantPlacement extends Placement {
  declare properties: MerchantPlacementProperties & Placement["properties"];

  private tickCounter = 0;
  private path: MerchantRoutinePoint[] = [];
  private lastRoutineKey = "";
  private waitingTicks = 0;
  private isHolding = false;
  private tradeTargetId: string | null = null;
  private pathFailed = false;
  private speedMultiplier = 1;

  get simulationId(): string {
    return this.properties.simulationId;
  }

  get displayName(): string {
    return this.properties.name;
  }

  get routinePhase(): "work" | "market" {
    return this.level?.getRoutinePhase?.() ?? "market";
  }

  get activityLabel(): string {
    if (this.isHolding || this.tradeTargetId) {
      return "TRADING";
    }

    if (this.movingPixelsRemaining > 0 || this.path.length > 0) {
      return "WALKING";
    }

    if (!this.properties.routine) {
      return "IDLE";
    }

    const target =
      this.routinePhase === "work"
        ? this.properties.routine.work
        : this.properties.routine.market;

    if (target.x === this.x && target.y === this.y) {
      return this.routinePhase === "work" ? "WORKING" : "AT MARKET";
    }

    return this.routinePhase === "work" ? "TO WORK" : "TO MARKET";
  }

  isSolidForBody(_body: any): boolean {
    return true;
  }

  zIndex(): number {
    return this.y * Z_INDEX_LAYER_SIZE + 3;
  }

  isHeroFacingMe(): boolean {
    const hero = this.level?.heroRef;
    const direction = hero?.facingDirection;

    if (!hero || !direction) {
      return false;
    }

    const delta =
      directionUpdateMap[direction as keyof typeof directionUpdateMap];

    return (
      Boolean(delta) &&
      hero.x + delta.x === this.x &&
      hero.y + delta.y === this.y
    );
  }

  isIdle(): boolean {
    return this.movingPixelsRemaining === 0 && this.path.length === 0;
  }

  isAdjacentTo(other: MerchantPlacement): boolean {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y) === 1;
  }

  faceToward(other: MerchantPlacement) {
    if (other.x < this.x) {
      this.spriteFacingDirection = Direction.Left;
    } else if (other.x > this.x) {
      this.spriteFacingDirection = Direction.Right;
    }
  }

  hasPathFailed(): boolean {
    return this.pathFailed;
  }

  prepareForTrade(sellerId: string) {
    this.path = [];
    this.lastRoutineKey = "";
    this.waitingTicks = 0;
    this.isHolding = false;
    this.tradeTargetId = sellerId;
    this.pathFailed = false;
    this.speedMultiplier = 1;
  }

  setTradePath(
    path: MerchantRoutinePoint[],
    sellerId: string,
    speedMultiplier = 1
  ) {
    this.path = path;
    this.tradeTargetId = sellerId;
    this.isHolding = false;
    this.pathFailed = false;
    this.speedMultiplier = speedMultiplier;
  }

  markTradeUnreachable() {
    this.path = [];
    this.pathFailed = true;
  }

  holdForTrade() {
    this.path = [];
    this.lastRoutineKey = "";
    this.isHolding = true;
    this.tradeTargetId = null;
    this.pathFailed = false;
  }

  releaseTrade() {
    this.path = [];
    this.lastRoutineKey = "";
    this.waitingTicks = 0;
    this.isHolding = false;
    this.tradeTargetId = null;
    this.pathFailed = false;
    this.speedMultiplier = 1;
  }

  tick() {
    this.tickCounter += 1;

    if (this.movingPixelsRemaining > 0) {
      this.tickMovingPixelProgress();
      return;
    }

    if (this.isHolding) {
      return;
    }

    if (this.tradeTargetId) {
      if (this.path.length > 0) {
        this.takeStep();
      }

      return;
    }

    this.tickRoutine();
  }

  private tickRoutine() {
    const routine = this.properties.routine;

    if (!routine) {
      return;
    }

    const target = this.routinePhase === "work" ? routine.work : routine.market;
    const routineKey = `${this.routinePhase}:${target.x},${target.y}`;

    if (this.x === target.x && this.y === target.y) {
      this.lastRoutineKey = routineKey;
      this.path = [];
      this.waitingTicks = 0;
      return;
    }

    if (this.waitingTicks > 0) {
      this.waitingTicks -= 1;
      return;
    }

    if (this.lastRoutineKey !== routineKey) {
      const path = this.level?.findMerchantPath?.(this, target.x, target.y) as
        | MerchantRoutinePoint[]
        | null
        | undefined;

      this.lastRoutineKey = routineKey;

      if (path) {
        this.path = path;
        this.pathFailed = false;
        this.waitingTicks = 0;
      } else {
        this.lastRoutineKey = "";
        this.waitingTicks = 30;
        return;
      }
    }

    if (this.path.length > 0) {
      this.takeStep();
    }
  }

  private takeStep() {
    const next = this.path[0];

    if (!next) {
      return;
    }

    if (this.level?.isMerchantCellBlocked?.(this, next.x, next.y)) {
      this.path = [];
      this.lastRoutineKey = "";
      this.pathFailed = true;
      this.waitingTicks = 20;
      return;
    }

    const direction = directionForDelta(next.x - this.x, next.y - this.y);

    if (!direction) {
      this.path.shift();
      return;
    }

    this.path.shift();
    this.movingPixelDirection = direction;

    if (direction === Direction.Left || direction === Direction.Right) {
      this.spriteFacingDirection = direction;
    }

    this.spriteWalkFrame = this.spriteWalkFrame === 0 ? 1 : 0;
    this.movingPixelsRemaining = CELL_SIZE;
  }

  private tickMovingPixelProgress() {
    this.movingPixelsRemaining -=
      this.travelPixelsPerFrame * this.speedMultiplier;

    if (this.movingPixelsRemaining > 0) {
      return;
    }

    const { x, y } = directionUpdateMap[this.movingPixelDirection];
    this.x += x;
    this.y += y;
    this.movingPixelsRemaining = 0;
  }

  private currentFrame(): string {
    const frames = DEFAULT_MERCHANT_FRAMES[this.properties.role];
    const leftFrame =
      this.properties.frameCoordinate ?? frames.left ?? TILES.HERO_LEFT;
    const rightFrame = frames.right ?? TILES.HERO_RIGHT;

    return this.spriteFacingDirection === Direction.Right
      ? rightFrame
      : leftFrame;
  }

  renderComponent(): React.JSX.Element {
    const moving = this.movingPixelsRemaining > 0;
    const workBob =
      !moving &&
      this.activityLabel === "WORKING" &&
      Math.floor(this.tickCounter / 30) % 2 === 0
        ? -1
        : 0;
    const yTranslate = moving
      ? this.movingPixelsRemaining < 2 ||
        this.movingPixelsRemaining > CELL_SIZE - 2
        ? -1
        : -2
      : workBob;

    const merchantState = this.level?.getMerchantState?.(this.simulationId);
    const balance =
      typeof merchantState?.balance === "number"
        ? ` · ${merchantState.balance}c`
        : "";
    const stock = merchantState?.inventory
      ? ` · ${GOOD_IDS.map(
          (goodId) =>
            `${goodId.charAt(0).toUpperCase()}${merchantState.inventory[goodId]}`
        ).join(" ")}`
      : "";

    return (
      <div className="relative">
        <Body
          frameCoordinate={this.currentFrame()}
          showShadow={true}
          yTranslate={yTranslate}
        />
        <div style={labelStyle}>
          <div>
            {this.properties.name}
            {balance}
          </div>
          <div style={{ fontSize: 5, opacity: 0.78 }}>
            {this.activityLabel}
            {stock}
          </div>
        </div>
        {this.isHeroFacingMe() && <div style={promptStyle}>E</div>}
      </div>
    );
  }
}
