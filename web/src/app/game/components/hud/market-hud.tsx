"use client";

import localFont from "next/font/local";
import React, { useState } from "react";
import { Modal } from "@mantine/core";
import { useAuction } from "../../contexts/auction-context";
import { useMarketUi } from "../../contexts/market-ui-context";
import { useWorldClock } from "../../contexts/world-clock-context";
import {
  CATEGORY_LABELS,
  RARITY_LABELS,
  itemConditionLabel,
  lootSaleValue,
  type InventoryItem,
} from "../../auction/types";
import type {
  GoodDefinition,
  GoodId,
  MerchantState,
  TradeLogEntry,
  WorldSnapshot,
} from "../../simulation/types";

const pixelFont = localFont({
  src: "../../../fonts/GAMERIA.ttf",
  display: "swap",
  fallback: ["monospace"],
});

/* -------------------------------------------------------------------------- */
/*  Design tokens                                                              */
/* -------------------------------------------------------------------------- */

const INK = "#2b1a08";
const PAPER = "#fff6d6";
const GOLD = "#f4c95d";
const WOOD_DARK = "#5e3b1a";

// Typography: the pixel face is reserved for titles, names, prices and buttons.
// Everything explanatory (descriptions, stock, journal lines) uses BODY_FONT.
// To use a webfont for body text, change `--mk-body` in the stylesheet below.
const fontVars = {
  "--mk-pixel": pixelFont.style.fontFamily,
} as React.CSSProperties;

const roleLabels: Record<MerchantState["role"], string> = {
  PAWNBROKER: "Pawnbroker",
  FURNITURE_DEALER: "Furniture dealer",
  SALVAGE_BUYER: "Salvage buyer",
};

/*
 * All market styling lives in one scoped stylesheet.
 *
 * globals.css forces Arial + letter-spacing on span/p/div/h1-h6, so every rule
 * here is class-based (specificity 0,1,0 beats those element selectors) and the
 * reset at the top re-inherits fonts/spacing inside the market only.
 */
const MARKET_CSS = `
.mk-root, .mk-entry {
  --ink: ${INK};
  --paper: ${PAPER};
  --paper-hi: #fffdf0;
  --paper-lo: #f3e3b0;
  --edge: #c9a867;
  --wood: #7d4f25;
  --wood-dk: ${WOOD_DARK};
  --gold: ${GOLD};
  --gold-dk: #d9a63a;
  --green: #8fc36f;
  --green-dk: #3f6b2c;
  --green-bg: #e3f2d3;
  --red: #9b3a2e;
  --red-bg: #f6d9cf;
  --muted: #6a4a26;
  --mk-body: "Trebuchet MS", "Segoe UI", Verdana, system-ui, sans-serif;
  font-family: var(--mk-body);
  letter-spacing: normal;
  color: var(--ink);
}
.mk-root *, .mk-entry * {
  font-family: inherit;
  letter-spacing: inherit;
  box-sizing: border-box;
}
.mk-pixel { font-family: var(--mk-pixel); font-weight: 400; letter-spacing: 0.04em; }

.mk-root {
  padding: 4px 18px 24px;
  font-size: 15px;
  line-height: 1.45;
  background-color: var(--paper-lo);
  background-image: repeating-linear-gradient(0deg, rgba(94,59,26,0.05) 0 2px, transparent 2px 4px);
}

/* ---- Frames --------------------------------------------------------------- */
.mk-panel {
  position: relative;
  margin-top: 22px;
  padding: 24px 14px 14px;
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 3px var(--paper-hi), inset 0 0 0 5px var(--edge), 4px 4px 0 var(--ink);
}
.mk-plank {
  position: absolute;
  top: -17px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 5px 12px 4px;
  font-size: 15px;
  line-height: 1.2;
  color: var(--paper-hi);
  background: var(--wood);
  border: 3px solid var(--ink);
  box-shadow: inset 0 -3px 0 var(--wood-dk), 2px 2px 0 var(--ink);
  text-shadow: 1px 1px 0 var(--ink);
}
.mk-plank::before, .mk-plank::after {
  content: "";
  width: 4px;
  height: 4px;
  background: var(--gold);
  box-shadow: 1px 1px 0 var(--ink);
}
.mk-hint { margin: 0 0 10px; font-size: 13.5px; color: var(--muted); }
.mk-label { margin: 0 0 4px; font-size: 12px; color: var(--muted); }

/* ---- Hero sign ------------------------------------------------------------ */
.mk-hero {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  color: var(--paper-hi);
  background-color: var(--wood);
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 3px, transparent 3px 46px);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 3px rgba(255,246,214,0.18), 4px 4px 0 var(--ink);
}
.mk-hero-town { min-width: 160px; flex: 1 1 200px; align-self: center; }
.mk-hero-town .mk-pixel { margin: 0; font-size: 20px; line-height: 1.25; text-shadow: 2px 2px 0 var(--ink); }
.mk-hero-sub { margin: 4px 0 0; font-size: 14px; color: #f3dfb0; }
.mk-plaque {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px 16px;
  color: var(--ink);
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge), 3px 3px 0 var(--ink);
}
.mk-plaque-title { margin: 0; font-size: 22px; line-height: 1.2; }
.mk-plaque-sub { margin: 2px 0 0; font-size: 14px; color: var(--muted); }
.mk-purse { align-items: flex-end; text-align: right; min-width: 150px; }
.mk-purse-amt { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 26px; line-height: 1.2; }

.mk-coin {
  flex: none;
  display: inline-block;
  width: 14px;
  height: 14px;
  background: var(--gold);
  border: 2px solid var(--ink);
  border-radius: 50%;
  box-shadow: inset -2px -2px 0 var(--gold-dk);
}
.mk-purse .mk-coin { width: 20px; height: 20px; }

/* ---- Alerts and events ---------------------------------------------------- */
.mk-alert {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 10px 12px;
  background: var(--red-bg);
  border: 3px solid var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
}
.mk-alert--warn { background: #fff0b8; }
.mk-alert-title { margin: 0 0 2px; font-size: 14px; }
.mk-alert-text { margin: 0; font-size: 14.5px; }
.mk-x {
  flex: none;
  width: 28px;
  height: 28px;
  line-height: 1;
  font-size: 18px;
  color: var(--ink);
  background: var(--paper);
  border: 2px solid var(--ink);
  cursor: pointer;
}
.mk-x:hover { background: var(--paper-hi); }
.mk-news {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 8px 12px;
  background: #fbe3a6;
  border: 3px dashed var(--wood);
}
.mk-news-title { margin: 0; font-size: 13px; color: var(--wood-dk); }

/* ---- Chips ---------------------------------------------------------------- */
.mk-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--ink);
  background: var(--paper);
  border: 2px solid var(--ink);
}
.mk-chip--gold { background: var(--gold); }
.mk-chip--green { background: var(--green-bg); }
.mk-chip--red { background: var(--red-bg); }
.mk-chip--grey { background: #e3dac6; }
.mk-chip--dim { opacity: 0.55; font-weight: 500; }

/* ---- Selectable rows (goods / merchants) ---------------------------------- */
.mk-list { display: flex; flex-direction: column; gap: 10px; }
.mk-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px 10px 20px;
  text-align: left;
  color: var(--ink);
  background: var(--paper-hi);
  border: 3px solid var(--edge);
  cursor: pointer;
}
.mk-row:hover { background: #fff0c4; border-color: var(--wood); }
.mk-row[aria-pressed="true"] {
  background: var(--gold);
  border-color: var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
}
.mk-row[aria-pressed="true"]::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 50%;
  margin-top: -7px;
  border-left: 9px solid var(--ink);
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
}
.mk-row:focus-visible, .mk-btn:focus-visible, .mk-arrow:focus-visible, .mk-x:focus-visible, .mk-action:focus-visible {
  outline: 3px dashed var(--ink);
  outline-offset: 2px;
}
.mk-row-body { min-width: 0; flex: 1; }
.mk-row-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 10px; }
.mk-row-name { margin: 0; font-size: 16px; line-height: 1.25; }
.mk-row-meta { margin: 4px 0 0; font-size: 14px; color: var(--muted); }
.mk-row[aria-pressed="true"] .mk-row-meta { color: var(--wood-dk); }
.mk-price { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 20px; line-height: 1.2; }
.mk-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin-top: 6px; }
.mk-chips-label { margin-right: 2px; font-size: 13px; color: var(--muted); }
.mk-row[aria-pressed="true"] .mk-chips-label { color: var(--wood-dk); }

/* Item / portrait slot: swap the letter for a sprite <img> when assets exist. */
.mk-slot {
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  font-size: 22px;
  line-height: 1;
  color: var(--wood-dk);
  background: #e6cf96;
  border: 3px solid var(--ink);
  box-shadow: inset 3px 3px 0 rgba(94,59,26,0.35), inset -3px -3px 0 rgba(255,253,240,0.55);
}
.mk-slot--lg { width: 68px; height: 68px; font-size: 30px; }
.mk-slot--round { background: #d9b98a; }

/* ---- Trade desk ----------------------------------------------------------- */
.mk-desk-top { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
@media (min-width: 700px) { .mk-desk-top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.mk-desk-slot {
  min-width: 0;
  padding: 10px;
  background: var(--paper-hi);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge);
}
.mk-desk-slot-row { display: flex; align-items: center; gap: 8px; }
.mk-desk-name { margin: 0; font-size: 17px; line-height: 1.25; overflow-wrap: anywhere; }
.mk-desk-detail { margin: 2px 0 0; font-size: 14px; color: var(--muted); }
.mk-arrow {
  flex: none;
  width: 30px;
  height: 44px;
  font-size: 22px;
  line-height: 1;
  color: var(--ink);
  background: var(--paper);
  border: 3px solid var(--ink);
  cursor: pointer;
}
.mk-arrow:hover { background: var(--gold); }

.mk-qty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--paper-lo);
  border: 3px solid var(--ink);
}
.mk-qty-ctl { display: flex; align-items: center; gap: 6px; }
.mk-step {
  width: 44px;
  height: 44px;
  font-size: 22px;
  line-height: 1;
  color: var(--ink);
  background: var(--gold);
  border: 3px solid var(--ink);
  box-shadow: 0 3px 0 var(--ink);
  cursor: pointer;
}
.mk-step:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); }
.mk-ticket { flex: 1 1 220px; text-align: right; }
.mk-ticket-line { margin: 0; font-size: 14.5px; color: var(--muted); }
.mk-ticket-total { display: inline-flex; align-items: center; gap: 8px; margin: 2px 0 0; font-size: 24px; line-height: 1.2; }
.mk-ticket-total .mk-coin { width: 18px; height: 18px; }

.mk-panes { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; margin-top: 12px; }
@media (min-width: 700px) { .mk-panes { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.mk-pane { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 3px solid var(--ink); box-shadow: 4px 4px 0 var(--ink); }
.mk-pane--buy { background: var(--green-bg); }
.mk-pane--sell { background: #f9e3b0; }
.mk-pane-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; }
.mk-pane-title { margin: 0; font-size: 20px; line-height: 1.2; }
.mk-pane-who { margin: 0; font-size: 14.5px; }
.mk-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mk-stat { min-width: 0; padding: 6px 8px; background: var(--paper-hi); border: 2px solid var(--ink); }
.mk-stat-label { margin: 0; font-size: 12.5px; line-height: 1.25; color: var(--muted); }
.mk-stat-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.mk-stat-val { margin: 2px 0 0; font-size: 20px; line-height: 1.2; }
.mk-money { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding: 6px 8px; background: var(--paper-hi); border: 2px dashed var(--wood); font-size: 14.5px; }
.mk-money-amt { display: inline-flex; align-items: center; gap: 6px; font-size: 18px; }
.mk-money-amt--out { color: var(--red); }
.mk-money-amt--in { color: var(--green-dk); }
.mk-after { margin: 0; font-size: 13.5px; color: var(--muted); }
.mk-after--bad { color: var(--red); font-weight: 700; }
.mk-note { margin: 0; padding: 8px 10px; font-size: 14px; line-height: 1.45; background: var(--paper); border: 2px solid var(--ink); }
.mk-footnote { margin: 12px 0 0; padding-top: 8px; font-size: 13.5px; color: var(--muted); border-top: 2px solid var(--edge); }

/* ---- Buttons -------------------------------------------------------------- */
.mk-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  font-family: var(--mk-pixel);
  font-size: 14px;
  line-height: 1.25;
  letter-spacing: 0.06em;
  text-align: center;
  color: var(--ink);
  background: var(--gold);
  border: 3px solid var(--ink);
  box-shadow: inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -4px 0 rgba(94,59,26,0.28), 0 4px 0 var(--ink);
  cursor: pointer;
  transition: transform 0.06s, box-shadow 0.06s;
}
.mk-btn:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.mk-btn:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -4px 0 rgba(94,59,26,0.28), 0 1px 0 var(--ink);
}
.mk-btn:disabled {
  color: #6a5a44;
  background: #ddd2b8;
  border-color: #8b7a60;
  box-shadow: 0 2px 0 #8b7a60;
  cursor: not-allowed;
}
.mk-btn--green { background: var(--green); }
.mk-btn--sm { min-height: 28px; padding: 2px 10px; font-size: 12px; box-shadow: inset 0 -3px 0 rgba(94,59,26,0.28), 0 2px 0 var(--ink); }
.mk-btn--block { width: 100%; }

.mk-actions { display: flex; flex-direction: column; gap: 10px; }
.mk-action {
  display: block;
  width: 100%;
  padding: 10px 12px 10px 14px;
  text-align: left;
  color: var(--ink);
  background: var(--gold);
  border: 3px solid var(--ink);
  box-shadow: inset 0 3px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(94,59,26,0.25), 0 4px 0 var(--ink);
  cursor: pointer;
  transition: transform 0.06s, box-shadow 0.06s;
}
.mk-action--rumour { background: #f0b27a; }
.mk-action:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.mk-action:active:not(:disabled) { transform: translateY(3px); box-shadow: inset 0 3px 0 rgba(255,255,255,0.4), 0 1px 0 var(--ink); }
.mk-action:disabled { color: #6a5a44; background: #ddd2b8; border-color: #8b7a60; box-shadow: 0 2px 0 #8b7a60; cursor: not-allowed; }
.mk-action-title { display: block; font-size: 15px; line-height: 1.25; }
.mk-action-desc { display: block; margin-top: 2px; font-size: 14px; }

/* ---- Ledger --------------------------------------------------------------- */
.mk-ledger { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.mk-ledger-row {
  padding: 8px 12px;
  background: var(--paper-hi);
  border: 2px solid var(--edge);
  border-left-width: 8px;
  overflow-wrap: anywhere;
}
.mk-ledger-row--buy { border-left-color: #b5473a; border-color: var(--edge) var(--edge) var(--edge) #b5473a; }
.mk-ledger-row--sell { border-left-color: var(--green-dk); border-color: var(--edge) var(--edge) var(--edge) var(--green-dk); }
.mk-ledger-row--npc { border-left-color: #b8ad95; border-color: var(--edge) var(--edge) var(--edge) #b8ad95; background: #fbf4dc; }
.mk-ledger-top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 12px; }
.mk-ledger-what { font-size: 15px; font-weight: 700; }
.mk-ledger-unit { font-weight: 400; color: var(--muted); }
.mk-ledger-amt { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.mk-ledger-amt--out { color: var(--red); }
.mk-ledger-amt--in { color: var(--green-dk); }
.mk-ledger-amt--npc { color: var(--muted); }
.mk-ledger-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-top: 4px; font-size: 13.5px; color: var(--muted); }
.mk-ledger-who { margin: 4px 0 0; font-size: 14px; }
.mk-empty { margin: 0; padding: 12px; font-size: 14.5px; background: var(--paper-hi); border: 2px dashed var(--wood); }

/* ---- Entry button (fixed in the game view) -------------------------------- */
.mk-entry { padding: 10px 18px; font-size: 15px; letter-spacing: 0.06em; }

/* ---- Modal scrollbar ------------------------------------------------------ */
.mk-scroll { scrollbar-color: #7d4f25 #f3e3b0; }
.mk-scroll::-webkit-scrollbar { width: 14px; }
.mk-scroll::-webkit-scrollbar-thumb { background: #7d4f25; border: 2px solid #2b1a08; }
`;

/* -------------------------------------------------------------------------- */
/*  Display helpers                                                            */
/* -------------------------------------------------------------------------- */

function demandCapacity(merchant: MerchantState, goodId: GoodId): number {
  return Math.max(
    0,
    (merchant.wants[goodId] ?? 0) - merchant.inventory[goodId]
  );
}

function offerFor(item: InventoryItem, economy: WorldSnapshot | null): number {
  if (!economy) {
    return item.baseValue;
  }

  const definition = economy.goods.find((good) => good.id === item.category);

  return lootSaleValue(
    item,
    economy.prices[item.category],
    definition?.basePrice ?? 1
  );
}

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                  */
/* -------------------------------------------------------------------------- */

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mk-panel">
      <h2 className="mk-plank mk-pixel">{title}</h2>
      {hint && <p className="mk-hint">{hint}</p>}
      {children}
    </section>
  );
}

function Coin() {
  return <span className="mk-coin" aria-hidden="true" />;
}

function Slot({
  children,
  large = false,
  round = false,
}: {
  children: React.ReactNode;
  large?: boolean;
  round?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`mk-slot mk-pixel ${large ? "mk-slot--lg" : ""} ${
        round ? "mk-slot--round" : ""
      }`}
    >
      {children}
    </span>
  );
}

function ActionButton({
  title,
  description,
  onClick,
  disabled = false,
  rumour = false,
}: {
  title: string;
  description: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  rumour?: boolean;
}) {
  return (
    <button
      type="button"
      className={`mk-action ${rumour ? "mk-action--rumour" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="mk-action-title mk-pixel">{title}</span>
      <span className="mk-action-desc">{description}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dealer HUD                                                                 */
/* -------------------------------------------------------------------------- */

const MarketHud = () => {
  const {
    data,
    economy,
    feedback,
    error: ledgerError,
    dismissError,
    advanceDay,
    fastForwardWeek,
    startRumour,
    sellItem,
    busy,
  } = useAuction();

  const { clock } = useWorldClock();

  const {
    isOpen,
    selectedMerchantId,
    openMarket,
    closeMarket,
    selectMerchant,
  } = useMarketUi();

  const [rumourGoodId, setRumourGoodId] = useState<GoodId>("electronics");

  if (!economy) {
    return (
      <button
        type="button"
        className="mk-btn mk-entry"
        disabled
        style={{
          ...fontVars,
          bottom: 16,
          position: "fixed",
          right: 16,
          zIndex: "var(--ui-popup-z-index)",
        }}
      >
        <Coin />
        Dealers · loading…
      </button>
    );
  }

  const snapshot = economy;
  const error = feedback?.tone === "error" ? feedback.message : ledgerError;
  const clearError = dismissError;

  const selectedMerchant =
    snapshot.merchants.find((merchant) => merchant.id === selectedMerchantId) ??
    snapshot.merchants[0];
  const merchantId = selectedMerchant.id;

  const playerItems = data?.state.inventory ?? [];
  const dealerItems = [...playerItems]
    .filter((item) => (selectedMerchant.wants[item.category] ?? 0) > 0)
    .sort((a, b) => offerFor(b, snapshot) - offerFor(a, snapshot));

  const latestTrades = snapshot.history
    .filter((entry): entry is TradeLogEntry => entry.type === "TRADE")
    .slice(-10)
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

  const goodName = (entryGoodId: GoodId) =>
    snapshot.goods.find((good) => good.id === entryGoodId)?.name ?? entryGoodId;

  const rumourGood =
    snapshot.goods.find((good) => good.id === rumourGoodId) ??
    snapshot.goods[0];
  const rumourActive = snapshot.activeEvents.some(
    (event) => event.goodId === rumourGood.id
  );

  const renderGoodChips = (merchant: MerchantState, goods: GoodDefinition[]) =>
    goods.map((good) => (
      <span
        key={good.id}
        className={`mk-chip ${
          merchant.inventory[good.id] > 0 ? "" : "mk-chip--dim"
        }`}
      >
        {good.name} {merchant.inventory[good.id]}
      </span>
    ));

  const wantedGoods = (merchant: MerchantState) =>
    snapshot.goods.filter((good) => (merchant.wants[good.id] ?? 0) > 0);

  const handleMerchantChange = (merchantIdValue: string) => {
    selectMerchant(merchantIdValue);
    clearError();
  };

  const handleRumourChange = (goodId: GoodId) => {
    setRumourGoodId(goodId);
    clearError();
  };

  return (
    <>
      <style>{MARKET_CSS}</style>

      <button
        type="button"
        className="mk-btn mk-entry"
        onClick={() => openMarket()}
        style={{
          ...fontVars,
          bottom: 16,
          position: "fixed",
          right: 16,
          zIndex: "var(--ui-popup-z-index)",
        }}
      >
        <Coin />
        Dealers · Day {snapshot.day}
      </button>

      <Modal
        opened={isOpen}
        onClose={closeMarket}
        title="DEALER ROW"
        size="min(1180px, 96vw)"
        centered
        zIndex={1000}
        overlayProps={{ backgroundOpacity: 0.72, blur: 2 }}
        classNames={{ body: "mk-scroll" }}
        styles={{
          content: {
            background: PAPER,
            border: `4px solid ${INK}`,
            borderRadius: 0,
            boxShadow: "8px 8px 0 rgba(0,0,0,0.5)",
          },
          header: {
            background: WOOD_DARK,
            borderBottom: `4px solid ${INK}`,
            margin: 0,
            padding: "10px 16px",
          },
          title: {
            color: GOLD,
            fontFamily: pixelFont.style.fontFamily,
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: "0.1em",
            textShadow: `2px 2px 0 ${INK}`,
          },
          close: {
            background: PAPER,
            border: `3px solid ${INK}`,
            borderRadius: 0,
            color: INK,
          },
          body: {
            maxHeight: "calc(90vh - 70px)",
            overflowY: "auto",
            padding: 0,
          },
        }}
      >
        <div className="mk-root" style={fontVars}>
          <header className="mk-hero">
            <div className="mk-hero-town">
              <p className="mk-pixel">{snapshot.player.stall.town}</p>
              <p className="mk-hero-sub">
                Your stall: {snapshot.player.stall.name}
              </p>
            </div>

            <div className="mk-plaque">
              <p className="mk-plaque-title mk-pixel">Day {snapshot.day}</p>
              <p className="mk-plaque-sub">{clock.timeLabel}</p>
            </div>

            <div className="mk-plaque mk-purse">
              <p className="mk-plaque-sub" style={{ marginTop: 0 }}>
                Your purse
              </p>
              <p className="mk-purse-amt mk-pixel">
                <Coin />
                {snapshot.player.balance}
              </p>
              <p className="mk-plaque-sub">coins</p>
            </div>
          </header>

          {error && (
            <div role="alert" className="mk-alert">
              <div>
                <p className="mk-alert-title mk-pixel">Deal blocked</p>
                <p className="mk-alert-text">{error}</p>
              </div>
              <button
                type="button"
                className="mk-x"
                aria-label="Dismiss dealer error"
                onClick={clearError}
              >
                ×
              </button>
            </div>
          )}

          {snapshot.validationErrors.length > 0 && (
            <div role="alert" className="mk-alert mk-alert--warn">
              <div>
                <p className="mk-alert-title mk-pixel">Simulation warning</p>
                <p className="mk-alert-text">
                  {snapshot.validationErrors.join(" ")}
                </p>
              </div>
            </div>
          )}

          {snapshot.activeEvents.length > 0 && (
            <div className="mk-news">
              <p className="mk-news-title mk-pixel">Dealer demand</p>
              {snapshot.activeEvents.map((event) => (
                <span
                  key={event.id}
                  className={`mk-chip ${
                    event.demandMultiplier >= 1
                      ? "mk-chip--gold"
                      : "mk-chip--grey"
                  }`}
                >
                  {goodName(event.goodId)} ×
                  {event.demandMultiplier.toFixed(2)} · {event.remainingDays}{" "}
                  day{event.remainingDays === 1 ? "" : "s"} left
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
            <div className="flex min-w-0 flex-col">
              <Panel
                title="Dealers"
                hint="Each specialist only buys the loot categories they can resell."
              >
                <div className="mk-list">
                  {snapshot.merchants.map((merchant) => {
                    const isSelected = merchant.id === merchantId;
                    const wants = wantedGoods(merchant);

                    return (
                      <button
                        key={merchant.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleMerchantChange(merchant.id)}
                        className="mk-row"
                        style={{ alignItems: "flex-start" }}
                      >
                        <Slot round>{merchant.name.charAt(0)}</Slot>
                        <div className="mk-row-body">
                          <div className="mk-row-top">
                            <p className="mk-row-name mk-pixel">
                              {merchant.name}
                            </p>
                            <span className="mk-chip mk-chip--green">
                              {roleLabels[merchant.role]}
                            </span>
                          </div>
                          <p className="mk-row-meta">
                            Purse {merchant.balance} coins · Buys{" "}
                            {wants.map((good) => good.name).join(", ")}
                          </p>
                          <div className="mk-chips">
                            <span className="mk-chips-label">Stock</span>
                            {renderGoodChips(
                              merchant,
                              snapshot.goods.filter(
                                (good) =>
                                  (merchant.wants[good.id] ?? 0) > 0 ||
                                  merchant.inventory[good.id] > 0
                              )
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel
                title="Dealer prices"
                hint="Prices move with dealer stock, demand and fresh headlines."
              >
                <div className="mk-list">
                  {snapshot.goods.map((good) => (
                    <div
                      key={good.id}
                      className="mk-row"
                      style={{ cursor: "default" }}
                    >
                      <Slot>{good.name.charAt(0)}</Slot>
                      <div className="mk-row-body">
                        <div className="mk-row-top">
                          <p className="mk-row-name mk-pixel">{good.name}</p>
                          <p className="mk-price mk-pixel">
                            {snapshot.prices[good.id]}
                            <Coin />
                          </p>
                        </div>
                        <p className="mk-row-meta">
                          Dealer stock {snapshot.marketStock[good.id]} · Demand ×
                          {snapshot.demandMultipliers[good.id].toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                title="Market controls"
                hint="Advance the town and work the rumour mill."
              >
                <div className="mk-actions">
                  <ActionButton
                    title="Advance day"
                    description="Dealers restock, NPCs trade, and new headlines hit the row."
                    onClick={() => void advanceDay()}
                  />
                  <ActionButton
                    title="Fast-forward 7 days"
                    description="Skip a week of dealer stock and demand shifts."
                    onClick={() => void fastForwardWeek()}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <p className="mk-label mk-pixel">Rumour category</p>
                  <div className="mk-chips">
                    {snapshot.goods.map((good) => (
                      <button
                        key={good.id}
                        type="button"
                        className={`mk-chip ${
                          rumourGood.id === good.id ? "mk-chip--gold" : ""
                        }`}
                        onClick={() => handleRumourChange(good.id)}
                      >
                        {good.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <ActionButton
                      title={`Start ${rumourGood.name.toLowerCase()} rumour`}
                      description={
                        rumourActive
                          ? `A ${rumourGood.name.toLowerCase()} rumour is already active.`
                          : "Stir up dealer demand for this loot category."
                      }
                      onClick={() => void startRumour(rumourGood.id)}
                      disabled={rumourActive}
                      rumour
                    />
                  </div>
                </div>
              </Panel>

              <Panel
                title="Town headlines"
                hint="Fresh headlines move dealer demand for two days."
              >
                {(data?.state.market.headlines ?? []).slice(0, 4).map((headline) => (
                  <div
                    key={headline.id}
                    className="mk-note"
                    style={{ marginBottom: 8 }}
                  >
                    <div className="mk-chips" style={{ marginTop: 0 }}>
                      <span className="mk-chip">
                        {CATEGORY_LABELS[headline.category] ?? headline.category}
                      </span>
                      <span className="mk-chip mk-chip--grey">
                        Day {headline.day}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0 0" }}>{headline.text}</p>
                  </div>
                ))}
              </Panel>
            </div>

            <div className="flex min-w-0 flex-col">
              <Panel
                title="Sell your haul"
                hint={`Selling to ${selectedMerchant.name} · ${
                  roleLabels[selectedMerchant.role]
                }`}
              >
                {playerItems.length === 0 ? (
                  <p className="mk-empty">
                    Your haul is empty. Win a storage unit and open the vault to
                    find loot.
                  </p>
                ) : dealerItems.length === 0 ? (
                  <p className="mk-empty">
                    {selectedMerchant.name} is not buying anything in your haul
                    right now. Pick another dealer or advance the day.
                  </p>
                ) : (
                  <div className="mk-list">
                    {dealerItems.map((item) => {
                      const offer = offerFor(item, snapshot);
                      const demand = demandCapacity(
                        selectedMerchant,
                        item.category
                      );
                      const canSell =
                        demand > 0 && selectedMerchant.balance >= offer;

                      return (
                        <div
                          key={item.id}
                          className="mk-row"
                          style={{ cursor: "default", alignItems: "flex-start" }}
                        >
                          <Slot large>{item.icon}</Slot>
                          <div className="mk-row-body">
                            <div className="mk-row-top">
                              <p className="mk-row-name mk-pixel">{item.name}</p>
                              <p className="mk-price mk-pixel">
                                {offer}
                                <Coin />
                              </p>
                            </div>
                            <p className="mk-row-meta">
                              {CATEGORY_LABELS[item.category]} ·{" "}
                              {RARITY_LABELS[item.rarity]} ·{" "}
                              {itemConditionLabel(item.condition)} · lot #
                              {item.sourceListing}
                            </p>
                            <div className="mk-chips">
                              <span className="mk-chip mk-chip--green">
                                Dealer demand {demand}
                              </span>
                              <span
                                className={`mk-chip ${
                                  canSell ? "mk-chip--gold" : "mk-chip--dim"
                                }`}
                              >
                                {canSell
                                  ? "Ready to sell"
                                  : "Dealer cannot take it"}
                              </span>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <button
                                type="button"
                                className="mk-btn mk-btn--sm"
                                disabled={busy || !canSell}
                                onClick={() =>
                                  void sellItem(item.id, selectedMerchant.id)
                                }
                              >
                                Sell to {selectedMerchant.name.split(" ")[0]}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="mk-footnote">
                  Selling moves one item into the dealer's stock. They only pay
                  for categories they actually want, and their purse limits each
                  deal.
                </p>
              </Panel>

              <Panel
                title="Market ledger"
                hint="Most recent dealer and player trades."
              >
                {latestTrades.length === 0 ? (
                  <p className="mk-empty">
                    No trades yet. Advance a day to let the dealers trade with
                    each other.
                  </p>
                ) : (
                  <ol className="mk-ledger">
                    {latestTrades.map((trade) => {
                      const playerBought = trade.buyerId === "player";
                      const playerSold = trade.sellerId === "player";
                      const tone = playerBought
                        ? "buy"
                        : playerSold
                        ? "sell"
                        : "npc";

                      return (
                        <li
                          key={trade.id}
                          className={`mk-ledger-row mk-ledger-row--${tone}`}
                        >
                          <div className="mk-ledger-top">
                            <span className="mk-ledger-what">
                              {trade.quantity} × {goodName(trade.goodId)}{" "}
                              <span className="mk-ledger-unit">
                                @ {trade.unitPrice}
                              </span>
                            </span>
                            <span
                              className={`mk-ledger-amt ${
                                playerBought
                                  ? "mk-ledger-amt--out"
                                  : playerSold
                                  ? "mk-ledger-amt--in"
                                  : "mk-ledger-amt--npc"
                              }`}
                            >
                              {playerBought ? "−" : playerSold ? "+" : ""}
                              {trade.totalPrice} coins
                            </span>
                          </div>
                          <div className="mk-ledger-meta">
                            <span
                              className={`mk-chip ${
                                playerBought
                                  ? "mk-chip--red"
                                  : playerSold
                                  ? "mk-chip--green"
                                  : "mk-chip--grey"
                              }`}
                            >
                              {playerBought
                                ? "You · Bought"
                                : playerSold
                                ? "You · Sold"
                                : "NPC"}
                            </span>
                            <span>
                              Day {trade.day} · {trade.timestamp.slice(11, 16)}
                            </span>
                          </div>
                          <p className="mk-ledger-who">
                            {actorName(trade.buyerId)} bought from{" "}
                            {actorName(trade.sellerId)}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Panel>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MarketHud;
