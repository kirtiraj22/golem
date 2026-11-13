import {
  BODY_SKINS,
  directionUpdateMap,
  Direction,
  PLACEMENT_TYPE_CELEBRATION,
  Z_INDEX_LAYER_SIZE,
} from "~/constants/helpers";
import { Collision } from "../collision";
import Placement from "../placement";
import soundManager, { SFX } from "../sounds";

export class BodyPlacement extends Placement {
  getLockAtNextPosition(direction: Direction) {
    const collision = this.getCollisionAtNextPosition(direction);
    return collision.withLock();
  }

  getInfectedHeroAtNextPosition(direction: Direction) {
    const collision = this.getCollisionAtNextPosition(direction);
    return collision.withActivateBattleScreen();
  }

  isSolidAtNextPosition(direction: Direction) {
    /**
     * Check for ice cornder
     */
    const onIceCorner = new Collision(this, this.level).withIceCorner();
    if (onIceCorner?.blocksMovementDirection(direction)) {
      return true;
    }

    const collision = this.getCollisionAtNextPosition(direction);

    const isOutOfBounds = this.level.isPositionOutOfBounds(
      collision.x,
      collision.y
    );

    if (isOutOfBounds) {
      return true;
    }

    return Boolean(collision.withSolidPlacement());
  }

  updateFacingDirection() {
    if (
      this.movingPixelDirection === Direction.Left ||
      this.movingPixelDirection === Direction.Right
    ) {
      this.spriteFacingDirection = this.movingPixelDirection;
    }
  }

  updateWalkFrame() {
    this.spriteWalkFrame = this.spriteWalkFrame === 1 ? 0 : 1;
  }

  tick() {
    this.tickMovingPixelProgress();
    this.tickAttemptAiMove();
  }

  tickMovingPixelProgress() {
    if (this.movingPixelsRemaining === 0) {
      return;
    }

    this.movingPixelsRemaining -= this.travelPixelsPerFrame;

    if (this.movingPixelsRemaining <= 0) {
      this.movingPixelsRemaining = 0;
      this.onDoneMoving();
    }
  }

  onAutoMovement(_direction) {
    return null;
  }

  onDoneMoving() {
    const { x, y } = directionUpdateMap[this.movingPixelDirection];
    this.x += x;
    this.y += y;
    this.handleCollisions();
    this.onPostMove();
  }

  handleCollisions() {
    this.skin = BODY_SKINS.NORMAL;
    const collisions = new Collision(this, this.level);

    /**
     * Changes hero Collision
     */
    const changesHeroSkin = collisions.withChangesHeroSkin();
    if (changesHeroSkin) {
      this.skin = changesHeroSkin.changesHeroSkinOnCollide();
    }

    /**
     * Add to Inventory Collision
     */
    const collideThatAddsToInventory =
      collisions.withPlacementsAddsToInventory();

    if (collideThatAddsToInventory) {
      collideThatAddsToInventory.collect();
      this.level.addPlacement({
        type: PLACEMENT_TYPE_CELEBRATION,
        x: this.x,
        y: this.y,
      });
      soundManager.playSFX(SFX.COLLECT);
    }

    /**
     * Automove Collision
     */
    const autoMovePlacement = collisions.withPlacementMovesBody();
    if (autoMovePlacement) {
      this.onAutoMovement(autoMovePlacement.autoMovesBodyOnCollide(this));
    }

    /**
     * Death Collision
     */
    const takesDamage = collisions.withSelfGetDamaged();
    if (takesDamage) {
      this.level.deathOutcome = takesDamage.type;
      this.level.gameLoop.stop();
    }

    /**
     * Complete Level Collision
     */
    const completesLevel = collisions.withCompletesLevel();
    if (completesLevel) {
      this.level.completeLevel();
      soundManager.playSFX(SFX.WIN);
    }

    /**
     * Switch Door
     */
    if (collisions.withDoorSwitch()) {
      this.level.switchAllDoors();
    }

    /**
     * Teleports
     */
    const teleport = collisions.withTeleport();
    if (teleport) {
      const position = teleport.teleportsToPositionOnCollide(this);
      soundManager.playSFX(SFX.TELEPORT);

      this.x = position.x;
      this.y = position.y;
    }

    /**
     * Resets Inventory
     */

    if (collisions.withStealsInventory()) {
      this.level.stealInventory();
    }
  }

  onPostMove(): null | void {}

  getYTranslate() {
    // Stand on ground when not moving
    if (this.movingPixelsRemaining === 0 || this.skin !== BODY_SKINS.NORMAL) {
      return 0;
    }

    //Elevate ramp up or down at beginning/end of movement
    const PIXELS_FROM_END = 2;
    if (
      this.movingPixelsRemaining < PIXELS_FROM_END ||
      this.movingPixelsRemaining > 16 - PIXELS_FROM_END
    ) {
      return -1;
    }

    // Highest in the middle of the movement
    return -2;
  }
  zIndex(): number {
    return this.y * Z_INDEX_LAYER_SIZE + 1;
  }

  collect() {}
}
