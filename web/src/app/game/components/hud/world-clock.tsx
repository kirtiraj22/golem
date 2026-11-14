"use client";

import React from "react";
import { useEconomy } from "../../contexts/economy-context";

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

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const WorldClock = () => {
  const { snapshot, clock } = useEconomy();

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
        DAY {snapshot.day} · {clock.timeLabel}
      </div>
      <div style={{ fontSize: 8, lineHeight: 1.4, opacity: 0.7 }}>
        MARKET CLOSES IN {formatCountdown(clock.msUntilDayEnd)}
      </div>
    </div>
  );
};

export default WorldClock;
