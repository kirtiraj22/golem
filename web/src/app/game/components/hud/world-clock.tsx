"use client";

import React from "react";
import { useAuction } from "../../contexts/auction-context";
import { useWorldClock } from "../../contexts/world-clock-context";

const panelStyle: React.CSSProperties = {
  background: "#fff6d6",
  border: "2px solid #2b1a08",
  boxShadow: "3px 3px 0 #2b1a08",
  color: "#2b1a08",
  fontFamily: "monospace",
  letterSpacing: "0.04em",
  pointerEvents: "none",
  position: "fixed",
  zIndex: "var(--ui-popup-z-index)",
};

const WorldClock = () => {
  const { data } = useAuction();
  const { clock } = useWorldClock();
  const day = data?.state.day ?? "—";

  return (
    <div
      style={{
        ...panelStyle,
        left: "50%",
        padding: "5px 10px",
        textAlign: "center",
        top: 12,
        transform: "translateX(-50%)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>
        DAY {day} · {clock.timeLabel}
      </div>
      <div style={{ fontSize: 8, lineHeight: 1.4, opacity: 0.7 }}>
        SERVER-SYNCED MARKET LEDGER
      </div>
    </div>
  );
};

export default WorldClock;
