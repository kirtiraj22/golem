import React from "react";
import { TILES } from "~/constants/tiles";
import {
  Direction,
  directionUpdateMap,
  Z_INDEX_LAYER_SIZE,
} from "~/constants/helpers";
import Placement from "../placement";
import Body from "../../components/object-graphics/body";

type AuctioneerPlacementProperties = {
  name: string;
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
  top: -30,
  transform: "translateX(-50%)",
  whiteSpace: "nowrap",
};

const promptStyle: React.CSSProperties = {
  ...labelStyle,
  background: "#f4c95d",
  fontSize: 7,
  padding: "1px 4px",
  top: -48,
};

/**
 * Stationary auction-house steward. Interaction is delegated back to
 * LevelState so the React auction modal remains the only UI authority.
 */
export class AuctioneerPlacement extends Placement {
  declare properties: AuctioneerPlacementProperties & Placement["properties"];
  private tickCounter = 0;

  get displayName(): string {
    return this.properties.name;
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

  tick() {
    this.tickCounter += 1;
  }

  renderComponent(): React.JSX.Element {
    const speaking = Math.floor(this.tickCounter / 45) % 2 === 0;
    const frame = speaking ? TILES.HERO_EDITING_RIGHT : TILES.HERO_EDITING_LEFT;

    return (
      <div className="relative">
        <Body
          frameCoordinate={frame}
          showShadow={true}
          yTranslate={speaking ? -1 : 0}
        />
        <div style={labelStyle}>
          <div>{this.properties.name}</div>
          <div style={{ fontSize: 5, opacity: 0.78 }}>AUCTIONEER · STORAGE LOTS</div>
        </div>
        {this.isHeroFacingMe() && <div style={promptStyle}>E · AUCTIONS</div>}
      </div>
    );
  }
}
