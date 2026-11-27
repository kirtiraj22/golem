import React from "react";
import { Z_INDEX_LAYER_SIZE } from "~/constants/helpers";
import Placement from "../placement";

export type ShopSignTone =
  | "auction"
  | "furniture"
  | "pawn"
  | "electronics"
  | "salvage"
  | "brand";

type ShopSignPlacementProperties = {
  label: string;
  sublabel?: string;
  tone?: ShopSignTone;
  mounted?: boolean;
};

const TONES: Record<ShopSignTone, { board: string; edge: string; ink: string }> = {
  auction: { board: "#f4c95d", edge: "#8a5a17", ink: "#2b1a08" },
  furniture: { board: "#e7cf9a", edge: "#7d4f25", ink: "#2b1a08" },
  pawn: { board: "#e8b27a", edge: "#7d4f25", ink: "#2b1a08" },
  electronics: { board: "#a9d7e2", edge: "#2f5e6b", ink: "#1d2b2e" },
  salvage: { board: "#c9a27a", edge: "#6b4427", ink: "#2b1a08" },
  brand: { board: "#fff6d6", edge: "#2b1a08", ink: "#2b1a08" },
};

/**
 * Readable shop board placed at a building entrance. This is deliberately
 * separate from the walkable merchant placement so shop labels stay fixed
 * while the dealer still performs their existing routine and trades.
 */
export class ShopSignPlacement extends Placement {
  declare properties: ShopSignPlacementProperties & Placement["properties"];

  zIndex(): number {
    // Wall-mounted signs sit one cell above the shop entrance. Offset their
    // layer so they render above the building but below the shopkeeper label.
    // Freestanding signs use their own row.
    const mountedOffset = this.properties.mounted === false ? 0 : 2;
    return (this.y + mountedOffset) * Z_INDEX_LAYER_SIZE + 8;
  }

  renderComponent(): React.JSX.Element {
    const tone = TONES[this.properties.tone ?? "brand"];

    return (
      <div
        style={{
          left: 8,
          pointerEvents: "none",
          position: "absolute",
          top: 16,
          transform: "translate(-50%, -100%)",
        }}
      >
        <div
          style={{
            background: tone.board,
            border: `2px solid ${tone.edge}`,
            boxShadow: "2px 2px 0 #2b1a08",
            color: tone.ink,
            fontFamily: "monospace",
            letterSpacing: "0.05em",
            lineHeight: 1.3,
            padding: "2px 6px 1px",
            textAlign: "center",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontSize: 7, fontWeight: 800 }}>{this.properties.label}</div>
          {this.properties.sublabel ? (
            <div style={{ fontSize: 5, opacity: 0.74 }}>
              {this.properties.sublabel}
            </div>
          ) : null}
        </div>
        <div
          style={{
            background: "#2b1a08",
            height: 4,
            margin: "0 auto",
            width: 2,
          }}
        />
      </div>
    );
  }
}
