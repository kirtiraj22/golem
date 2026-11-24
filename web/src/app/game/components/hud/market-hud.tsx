"use client";

import localFont from "next/font/local";
import React, { useState } from "react";
import { Modal, NumberInput } from "@mantine/core";
import { useAuction } from "../../contexts/auction-context";
import { useMarketUi } from "../../contexts/market-ui-context";
import { useWorldClock } from "../../contexts/world-clock-context";
import type {
  GoodDefinition,
  GoodId,
  MerchantState,
  TradeLogEntry,
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
  FARMER: "Farmer",
  LUMBERJACK: "Lumberjack",
  BLACKSMITH: "Blacksmith",
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
.mk-scroll::-webkit-scrollbar-track { background: #f3e3b0; border-left: 3px solid ${INK}; }
.mk-scroll::-webkit-scrollbar-thumb { background: #7d4f25; border: 3px solid ${INK}; }

@media (prefers-reduced-motion: reduce) {
  .mk-btn, .mk-action { transition: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Display-only helpers (mirror playerBuy() / playerSell() constraints)       */
/* -------------------------------------------------------------------------- */

// The simulation remains the authority; these are display-only maximums.
function sellableAmount(merchant: MerchantState, goodId: GoodId): number {
  return Math.max(
    0,
    merchant.inventory[goodId] - (merchant.reserves[goodId] ?? 0)
  );
}

function demandCapacity(merchant: MerchantState, goodId: GoodId): number {
  return Math.max(
    0,
    (merchant.wants[goodId] ?? 0) - merchant.inventory[goodId]
  );
}

function affordableQuantity(balance: number, unitPrice: number): number {
  return unitPrice > 0 ? Math.max(0, Math.floor(balance / unitPrice)) : 0;
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

function ItemSlot({
  letter,
  large = false,
  round = false,
}: {
  letter: string;
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
      {letter.charAt(0).toUpperCase()}
    </span>
  );
}

function DeskSlot({
  label,
  letter,
  round,
  title,
  detail,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
}: {
  label: string;
  letter: string;
  round?: boolean;
  title: string;
  detail: React.ReactNode;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mk-desk-slot">
      <p className="mk-label mk-pixel">{label}</p>
      <div className="mk-desk-slot-row">
        <button
          type="button"
          className="mk-arrow"
          aria-label={prevLabel}
          onClick={onPrev}
        >
          ‹
        </button>
        <ItemSlot letter={letter} large round={round} />
        <div className="min-w-0 flex-1">
          <p className="mk-desk-name mk-pixel">{title}</p>
          <div className="mk-desk-detail">{detail}</div>
        </div>
        <button
          type="button"
          className="mk-arrow"
          aria-label={nextLabel}
          onClick={onNext}
        >
          ›
        </button>
      </div>
    </div>
  );
}

function TradePane({
  kind,
  counterpart,
  statLabel,
  statValue,
  maxLabel,
  max,
  onMax,
  moneyLabel,
  moneyAmount,
  hasQuantity,
  purseAfter,
  actionLabel,
  onAction,
  explanation,
}: {
  kind: "buy" | "sell";
  counterpart: string;
  statLabel: string;
  statValue: number;
  maxLabel: string;
  max: number;
  onMax: () => void;
  moneyLabel: string;
  moneyAmount: number;
  hasQuantity: boolean;
  purseAfter: number;
  actionLabel: string;
  onAction: () => void;
  explanation: string;
}) {
  const isBuy = kind === "buy";

  return (
    <div className={`mk-pane mk-pane--${kind}`}>
      <div className="mk-pane-head">
        <h3 className="mk-pane-title mk-pixel">{isBuy ? "Buy" : "Sell"}</h3>
        <span className="mk-chip">{isBuy ? "Merchant → You" : "You → Merchant"}</span>
      </div>

      <p className="mk-pane-who">
        {isBuy ? "From " : "To "}
        <strong>{counterpart}</strong>
      </p>

      <div className="mk-stats">
        <div className="mk-stat">
          <p className="mk-stat-label">{statLabel}</p>
          <p className="mk-stat-val mk-pixel">{statValue}</p>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-row">
            <p className="mk-stat-label">{maxLabel}</p>
            <button
              type="button"
              className="mk-btn mk-btn--sm"
              disabled={max < 1}
              onClick={onMax}
            >
              Max
            </button>
          </div>
          <p className="mk-stat-val mk-pixel">{max}</p>
        </div>
      </div>

      <div className="mk-money">
        <span>{moneyLabel}</span>
        <span
          className={`mk-money-amt mk-pixel ${
            isBuy ? "mk-money-amt--out" : "mk-money-amt--in"
          }`}
        >
          {hasQuantity ? (
            <>
              {isBuy ? "−" : "+"}
              {moneyAmount}
              <Coin />
            </>
          ) : (
            "—"
          )}
        </span>
      </div>

      {hasQuantity && (
        <p className={`mk-after ${purseAfter < 0 ? "mk-after--bad" : ""}`}>
          {purseAfter < 0
            ? `Short by ${Math.abs(purseAfter)} coins`
            : `Purse after: ${purseAfter} coins`}
        </p>
      )}

      <button
        type="button"
        className={`mk-btn mk-btn--block ${isBuy ? "mk-btn--green" : ""}`}
        disabled={max < 1}
        onClick={onAction}
      >
        {actionLabel}
      </button>

      {explanation && <p className="mk-note">{explanation}</p>}
    </div>
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
/*  Market HUD                                                                 */
/* -------------------------------------------------------------------------- */

const MarketHud = () => {
  const {
    economy,
    feedback,
    error: ledgerError,
    dismissError,
    advanceDay,
    fastForwardWeek,
    startRumour,
    buyGood,
    sellGood,
  } = useAuction();

  const { clock } = useWorldClock();

  const {
    isOpen,
    selectedMerchantId,
    openMarket,
    closeMarket,
    selectMerchant,
  } = useMarketUi();

  const [goodId, setGoodId] = useState<GoodId>("GRAIN");
  const [quantity, setQuantity] = useState<number | string>(1);

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
        Market · loading…
      </button>
    );
  }

  const snapshot = economy;
  const error = feedback?.tone === "error" ? feedback.message : ledgerError;
  const clearError = dismissError;

  const selectedGood =
    snapshot.goods.find((good) => good.id === goodId) ?? snapshot.goods[0];
  const selectedMerchant =
    snapshot.merchants.find((merchant) => merchant.id === selectedMerchantId) ??
    snapshot.merchants[0];
  const merchantId = selectedMerchant.id;

  const grainRumourActive = snapshot.activeEvents.some(
    (event) => event.goodId === "GRAIN"
  );

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

  const unitPrice = snapshot.prices[selectedGood.id];
  const tradeQuantity =
    typeof quantity === "number" ? quantity : Number(quantity);
  const currentQty =
    Number.isFinite(tradeQuantity) && tradeQuantity > 0 ? tradeQuantity : 0;

  const buyStock = sellableAmount(selectedMerchant, selectedGood.id);
  const playerAffordable = affordableQuantity(
    snapshot.player.balance,
    unitPrice
  );
  const maxBuy = Math.min(buyStock, playerAffordable);

  const sellDemand = demandCapacity(selectedMerchant, selectedGood.id);
  const merchantAffordable = affordableQuantity(
    selectedMerchant.balance,
    unitPrice
  );
  const maxSell = Math.min(
    snapshot.player.inventory[selectedGood.id],
    sellDemand,
    merchantAffordable
  );

  const buyCost = tradeQuantity > 0 ? tradeQuantity * unitPrice : 0;
  const sellRevenue = tradeQuantity > 0 ? tradeQuantity * unitPrice : 0;

  const otherSellers = snapshot.merchants.filter(
    (merchant) =>
      merchant.id !== selectedMerchant.id &&
      sellableAmount(merchant, selectedGood.id) > 0
  );
  const demandBuyers = snapshot.merchants.filter(
    (merchant) => demandCapacity(merchant, selectedGood.id) > 0
  );

  const buyExplanation =
    buyStock <= 0
      ? `${selectedMerchant.name} has no ${
          selectedGood.name
        } above their reserve.${
          otherSellers.length > 0
            ? ` Try ${otherSellers
                .map((merchant) => merchant.name)
                .join(" or ")}.`
            : ""
        }`
      : playerAffordable <= 0
      ? `You need at least ${unitPrice} coins to buy one ${selectedGood.name}.`
      : "";

  const sellExplanation =
    sellDemand <= 0
      ? `${selectedMerchant.name} already has enough ${
          selectedGood.name
        } and is not buying more.${
          demandBuyers.length > 0
            ? ` Try ${demandBuyers
                .map((merchant) => merchant.name)
                .join(" or ")}.`
            : ` No merchant currently wants ${selectedGood.name}.`
        }`
      : snapshot.player.inventory[selectedGood.id] <= 0
      ? `You have no ${selectedGood.name} to sell.`
      : merchantAffordable <= 0
      ? `${selectedMerchant.name} cannot afford one ${selectedGood.name} right now.`
      : "";

  const handleGoodChange = (value: string | null) => {
    if (!value) {
      return;
    }

    const nextGood = snapshot.goods.find((good) => good.id === value);
    if (nextGood) {
      setGoodId(nextGood.id);
      clearError();
    }
  };

  const handleMerchantChange = (value: string | null) => {
    if (!value) {
      return;
    }

    selectMerchant(value);
    clearError();
  };

  // Desk arrows: step through the same lists the rows select from.
  const cycleGood = (step: number) => {
    const count = snapshot.goods.length;
    const index = snapshot.goods.findIndex((good) => good.id === selectedGood.id);
    handleGoodChange(snapshot.goods[(index + step + count) % count].id);
  };

  const cycleMerchant = (step: number) => {
    const count = snapshot.merchants.length;
    const index = snapshot.merchants.findIndex(
      (merchant) => merchant.id === selectedMerchant.id
    );
    handleMerchantChange(snapshot.merchants[(index + step + count) % count].id);
  };

  const renderGoodChips = (merchant: MerchantState, goods: GoodDefinition[]) =>
    goods.map((good) => (
      <span
        key={good.id}
        className={`mk-chip ${merchant.inventory[good.id] > 0 ? "" : "mk-chip--dim"}`}
      >
        {good.name} {merchant.inventory[good.id]}
      </span>
    ));

  const wantedGoods = (merchant: MerchantState) =>
    snapshot.goods.filter((good) => (merchant.wants[good.id] ?? 0) > 0);

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
        Market · Day {snapshot.day}
      </button>

      <Modal
        opened={isOpen}
        onClose={closeMarket}
        title="MARKET ROW"
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
          {/* Header sign: location, clock, purse */}
          <header className="mk-hero">
            <div className="mk-hero-town">
              <p className="mk-pixel">{snapshot.player.stall.town}</p>
              <p className="mk-hero-sub">Stall: {snapshot.player.stall.name}</p>
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
                <p className="mk-alert-title mk-pixel">Trade blocked</p>
                <p className="mk-alert-text">{error}</p>
              </div>
              <button
                type="button"
                className="mk-x"
                aria-label="Dismiss trade error"
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
              <p className="mk-news-title mk-pixel">Town talk</p>
              {snapshot.activeEvents.map((event) => (
                <span key={event.id} className="mk-chip mk-chip--gold">
                  {goodName(event.goodId)} demand ×
                  {event.demandMultiplier.toFixed(2)} · {event.remainingDays}{" "}
                  day{event.remainingDays === 1 ? "" : "s"} left
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
            {/* Left column: pick what to trade and who with */}
            <div className="flex min-w-0 flex-col">
              <Panel title="Goods" hint="Prices react to stock and demand.">
                <div className="mk-list">
                  {snapshot.goods.map((good) => {
                    const isSelected = good.id === selectedGood.id;
                    const demand = snapshot.demandMultipliers[good.id];

                    return (
                      <button
                        key={good.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleGoodChange(good.id)}
                        className="mk-row"
                      >
                        <ItemSlot letter={good.name} />
                        <div className="mk-row-body">
                          <div className="mk-row-top">
                            <p className="mk-row-name mk-pixel">{good.name}</p>
                            <p className="mk-price mk-pixel">
                              {snapshot.prices[good.id]}
                              <Coin />
                            </p>
                          </div>
                          <p className="mk-row-meta">
                            Market {snapshot.marketStock[good.id]} · In your bag{" "}
                            {snapshot.player.inventory[good.id]}
                          </p>
                          {demand > 1 && (
                            <div className="mk-chips">
                              <span className="mk-chip mk-chip--red">
                                Demand ×{demand.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Merchants" hint="Who you trade with.">
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
                        <ItemSlot letter={merchant.name} round />
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
                            Purse {merchant.balance} coins
                          </p>
                          <div className="mk-chips">
                            <span className="mk-chips-label">Stock</span>
                            {renderGoodChips(merchant, snapshot.goods)}
                          </div>
                          <div className="mk-chips">
                            <span className="mk-chips-label">Wants</span>
                            {wants.length > 0 ? (
                              wants.map((good) => (
                                <span key={good.id} className="mk-chip mk-chip--gold">
                                  {good.name} {merchant.wants[good.id]}
                                </span>
                              ))
                            ) : (
                              <span className="mk-chip mk-chip--dim">Nothing</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Economy" hint="Automatic market days · manual controls">
                <div className="mk-actions">
                  <ActionButton
                    title="Advance day"
                    description="Run production, NPC trade and consumption on the server."
                    onClick={() => void advanceDay()}
                  />
                  <ActionButton
                    title="Fast-forward 7 days"
                    description="Skip ahead a full week of server market days."
                    onClick={() => void fastForwardWeek()}
                  />
                  <ActionButton
                    title="Start grain rumour"
                    description={
                      grainRumourActive
                        ? "A grain rumour is already spreading."
                        : "Stir up demand for grain around town."
                    }
                    onClick={() => void startRumour()}
                    disabled={grainRumourActive}
                    rumour
                  />
                </div>
              </Panel>
            </div>

            {/* Right column: the counter and the ledger */}
            <div className="flex min-w-0 flex-col">
              <Panel
                title="Trade desk"
                hint="Use the arrows or pick from the lists on the left."
              >
                <div className="mk-desk-top">
                  <DeskSlot
                    label="Good"
                    letter={selectedGood.name}
                    title={selectedGood.name}
                    detail={
                      <span className="inline-flex items-center gap-1.5">
                        {unitPrice} <Coin /> each
                      </span>
                    }
                    prevLabel="Previous good"
                    nextLabel="Next good"
                    onPrev={() => cycleGood(-1)}
                    onNext={() => cycleGood(1)}
                  />
                  <DeskSlot
                    label="Merchant"
                    letter={selectedMerchant.name}
                    round
                    title={selectedMerchant.name}
                    detail={`${roleLabels[selectedMerchant.role]} · ${
                      selectedMerchant.balance
                    } coins`}
                    prevLabel="Previous merchant"
                    nextLabel="Next merchant"
                    onPrev={() => cycleMerchant(-1)}
                    onNext={() => cycleMerchant(1)}
                  />
                </div>

                <div className="mk-qty">
                  <div>
                    <p className="mk-label mk-pixel">Quantity</p>
                    <div className="mk-qty-ctl">
                      <button
                        type="button"
                        className="mk-step"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(Math.max(1, currentQty - 1))}
                      >
                        −
                      </button>
                      <NumberInput
                        aria-label="Quantity"
                        value={quantity}
                        onChange={setQuantity}
                        min={1}
                        step={1}
                        allowDecimal={false}
                        hideControls
                        styles={{
                          root: { width: 92 },
                          input: {
                            background: "#fffdf0",
                            border: `3px solid ${INK}`,
                            borderRadius: 0,
                            color: INK,
                            fontFamily: pixelFont.style.fontFamily,
                            fontSize: 22,
                            height: 44,
                            letterSpacing: "0.02em",
                            textAlign: "center",
                          },
                        }}
                      />
                      <button
                        type="button"
                        className="mk-step"
                        aria-label="Increase quantity"
                        onClick={() => setQuantity(currentQty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mk-ticket">
                    <p className="mk-ticket-line">
                      {currentQty} × {selectedGood.name} @ {unitPrice} coins
                    </p>
                    <p className="mk-ticket-total mk-pixel">
                      {buyCost}
                      <Coin />
                    </p>
                  </div>
                </div>

                <div className="mk-panes">
                  <TradePane
                    kind="buy"
                    counterpart={selectedMerchant.name}
                    statLabel="Stock for sale"
                    statValue={buyStock}
                    maxLabel="Max you can buy"
                    max={maxBuy}
                    onMax={() => setQuantity(maxBuy)}
                    moneyLabel="You pay"
                    moneyAmount={buyCost}
                    hasQuantity={tradeQuantity > 0}
                    purseAfter={snapshot.player.balance - buyCost}
                    actionLabel={`Buy ${selectedGood.name}`}
                    onAction={() =>
                      void buyGood(
                        selectedGood.id,
                        tradeQuantity,
                        selectedMerchant.id
                      )
                    }
                    explanation={buyExplanation}
                  />
                  <TradePane
                    kind="sell"
                    counterpart={selectedMerchant.name}
                    statLabel="Remaining demand"
                    statValue={sellDemand}
                    maxLabel="Max you can sell"
                    max={maxSell}
                    onMax={() => setQuantity(maxSell)}
                    moneyLabel="You earn"
                    moneyAmount={sellRevenue}
                    hasQuantity={tradeQuantity > 0}
                    purseAfter={snapshot.player.balance + sellRevenue}
                    actionLabel={`Sell ${selectedGood.name}`}
                    onAction={() =>
                      void sellGood(
                        selectedGood.id,
                        tradeQuantity,
                        selectedMerchant.id
                      )
                    }
                    explanation={sellExplanation}
                  />
                </div>

                <p className="mk-footnote">
                  Buy moves goods from the merchant to you. Sell moves goods
                  from you to the merchant.
                </p>
              </Panel>

              <Panel title="Market ledger" hint="Most recent 10 trades.">
                {latestTrades.length === 0 ? (
                  <p className="mk-empty">
                    No trades yet. Advance a day to let the merchants trade.
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