import React from "react";
import { TILES } from "~/constants/tiles";
import { Z_INDEX_LAYER_SIZE } from "~/constants/helpers";
import Placement from "../placement";
import Body from "../../components/object-graphics/body";

type ShopkeeperPlacementProperties = {
  name: string;
  roleLabel: string;
  frameCoordinate?: string;
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

/**
 * Ambient shopkeeper used to give the electronics storefront a visible owner.
 * Existing dealer interaction remains on MerchantPlacement; this NPC is
 * intentionally decorative and never intercepts the E prompt.
 */
export class ShopkeeperPlacement extends Placement {
  declare properties: ShopkeeperPlacementProperties & Placement["properties"];

  isSolidForBody(_body: any): boolean {
    return true;
  }

  zIndex(): number {
    return this.y * Z_INDEX_LAYER_SIZE + 3;
  }

  renderComponent(): React.JSX.Element {
    return (
      <div className="relative">
        <Body
          frameCoordinate={
            this.properties.frameCoordinate ?? TILES.HERO_EDITING_RIGHT
          }
          showShadow
        />
        <div style={labelStyle}>
          <div>{this.properties.name}</div>
          <div style={{ fontSize: 5, opacity: 0.78 }}>
            {this.properties.roleLabel}
          </div>
        </div>
      </div>
    );
  }
}
