"use client";

import React from "react";
import { useEconomy } from "../../contexts/economy-context";
import type { GoodId, TradeLogEntry } from "../../simulation/types";

const INK = "#2b1a08";
const PAPER = "rgba(255, 246, 214, 0.96)";
const MUTED = "#4a3118";

const feedStyle: React.CSSProperties = {
  background: PAPER,
  border: "2px solid #2b1a08",
  bottom: 16,
  boxShadow: "3px 3px 0 #2b1a08",
  boxSizing: "border-box",
  color: INK,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: 11,
  left: 16,
  letterSpacing: "0.01em",
  lineHeight: 1.45,
  maxWidth: "min(340px, calc(100vw - 190px))",
  overflowWrap: "anywhere",
  padding: "8px 10px",
  pointerEvents: "none",
  position: "fixed",
  zIndex: "var(--ui-popup-z-index)",
};

const MarketActivityFeed = () => {
  const { snapshot } = useEconomy();

  const latestTrades = snapshot.history
    .filter((entry): entry is TradeLogEntry => entry.type === "TRADE")
    .slice(-4)
    .reverse();

  const actorName = (actorId: string) => {
    if (actorId === "player") {
      return snapshot.player.stall.name;
    }

    return (
      snapshot.merchants.find((merchant) => merchant.id === actorId)?.name ??
      actorId
    );
  };

  const goodName = (goodId: GoodId) =>
    snapshot.goods.find((good) => good.id === goodId)?.name ?? goodId;

  return (
    <div style={feedStyle}>
      <div
        style={{
          borderBottom: "1px solid #8b6b3f",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          marginBottom: 5,
          paddingBottom: 4,
          textTransform: "uppercase",
        }}
      >
        MARKET ACTIVITY
      </div>
      {latestTrades.length === 0 ? (
        <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.5 }}>
          The square is quiet. Trades appear here.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 5 }}>
          {latestTrades.map((trade) => (
            <div key={trade.id} style={{ fontSize: 11, lineHeight: 1.45 }}>
              <span style={{ color: MUTED, fontWeight: 700 }}>
                D{trade.day}
              </span>{" "}
              <strong>{actorName(trade.buyerId)}</strong> bought{" "}
              <strong>
                {trade.quantity} {goodName(trade.goodId)}
              </strong>{" "}
              from <strong>{actorName(trade.sellerId)}</strong>{" "}
              <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                · {trade.totalPrice}c
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketActivityFeed;
