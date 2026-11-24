"use client";

import React from "react";
import { useAuction } from "../../contexts/auction-context";
import AuctionHouseModal from "../auction/auction-modal";
import { formatCoins, haulValue } from "../../auction/format";

const INK = "#2b1a08";
const PAPER = "rgba(255, 246, 214, 0.97)";
const MUTED = "#4a3118";

const panelStyle: React.CSSProperties = {
  background: PAPER,
  border: "2px solid #2b1a08",
  boxShadow: "3px 3px 0 #2b1a08",
  boxSizing: "border-box",
  color: INK,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  left: 16,
  letterSpacing: "0.02em",
  lineHeight: 1.4,
  padding: "7px 9px",
  position: "fixed",
  top: 12,
  width: 196,
  zIndex: "var(--ui-popup-z-index)",
};

const AuctionHud = () => {
  const { data, loading, error, openAuction } = useAuction();
  const state = data?.state;
  const active = state
    ? state.lots.filter(
        (lot) => lot.status === "preview" || lot.status === "live"
      )
    : [];
  const leading = active.filter(
    (lot) => lot.playerBid > 0 && lot.isLeading
  ).length;
  const outbid = active.filter(
    (lot) => lot.playerBid > 0 && !lot.isLeading
  ).length;
  const wonToOpen = state
    ? state.lots.filter(
        (lot) => lot.status === "won" && lot.revealStatus === "ready"
      ).length
    : 0;
  const haul = state
    ? haulValue(state.inventory, state.market.multipliers)
    : 0;

  let statusLine = "OPENING LEDGER…";

  if (error) {
    statusLine = "LEDGER OFFLINE";
  } else if (state) {
    if (wonToOpen > 0) {
      statusLine = `${wonToOpen} VAULT${wonToOpen === 1 ? "" : "S"} READY`;
    } else if (outbid > 0) {
      statusLine = `${outbid} OUTBID`;
    } else if (leading > 0) {
      statusLine = `${leading} LEADING`;
    } else {
      statusLine = `${active.length} LOTS ON THE BLOCK`;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => openAuction()}
        style={{
          ...panelStyle,
          cursor: "pointer",
          textAlign: "left",
          background: wonToOpen > 0 ? "#fff0b8" : PAPER,
        }}
        aria-label="Open storage auction house"
        title="Open the storage auction house"
      >
        <div
          style={{
            borderBottom: "1px solid #8b6b3f",
            display: "flex",
            fontSize: 9,
            fontWeight: 800,
            justifyContent: "space-between",
            letterSpacing: "0.08em",
            marginBottom: 5,
            paddingBottom: 4,
          }}
        >
          <span>STORAGE AUCTIONS</span>
          <span>{loading && !state ? "···" : "E"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: MUTED, fontSize: 9, fontWeight: 700 }}>PURSE</span>
          <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
            {state ? `${formatCoins(state.balance)}c` : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: MUTED, fontSize: 9, fontWeight: 700 }}>HAUL</span>
          <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
            {state ? `${state.inventory.length} · ${formatCoins(haul)}c` : "—"}
          </span>
        </div>
        <div
          style={{
            borderTop: "1px solid #d8c9a6",
            color: outbid > 0 ? "#8a2c1c" : MUTED,
            fontSize: 9,
            fontWeight: 800,
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          {statusLine}
        </div>
      </button>
      <AuctionHouseModal />
    </>
  );
};

export default AuctionHud;
