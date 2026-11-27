"use client";

import localFont from "next/font/local";
import { Pixelify_Sans } from "next/font/google";
import React, { useMemo } from "react";
import { Modal } from "@mantine/core";
import { useAuction } from "../../contexts/auction-context";
import { useTownNewsUi } from "../../contexts/town-news-ui-context";
import { useWorldClock } from "../../contexts/world-clock-context";
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type MarketHeadline,
} from "../../auction/types";
import type { DemandShockEvent, WorldSnapshot } from "../../simulation/types";

// Display face: masthead, day plate, market numbers, key caps.
const newsPixelFont = localFont({
  src: "../../../fonts/GAMERIA.ttf",
  display: "swap",
  fallback: ["monospace"],
});

// Reading face: a handheld-RPG style pixel font (think GBA dialogue text) for
// headlines and every label. Served by next/font at build time, so there is no
// runtime request and no new dependency. To use a different pixel font, swap
// this one import (e.g. a local .ttf via localFont) and nothing else changes.
const newsTextFont = Pixelify_Sans({
  subsets: ["latin"],
  display: "swap",
  fallback: ["Trebuchet MS", "system-ui", "sans-serif"],
});

/* -------------------------------------------------------------------------- */
/*  Design tokens (shared with the Market HUD)                                 */
/* -------------------------------------------------------------------------- */

const INK = "#2b1a08";
const PAPER = "#fff6d6";
const GOLD = "#f4c95d";
const WOOD = "#7d4f25";
const WOOD_DARK = "#5e3b1a";

/*
 * Scoped stylesheet. globals.css forces Arial + letter-spacing on
 * span/p/div/h1-h6, so every rule is class-based and the reset at the top
 * re-inherits fonts/spacing inside the wire only. The modal title lives
 * outside .tn-root, so .tn-head carries the same tokens and reset.
 *
 * Reading model: every story answers the same four questions in the same
 * columns, so players learn the layout once:
 *   Demand (colour + arrow + %)  ·  Goods  ·  Headline  ·  Buyers  ·  Time left
 */
const NEWS_CSS = `
.tn-root, .tn-head {
  --ink: ${INK};
  --paper: ${PAPER};
  --paper-hi: #fffdf0;
  --paper-lo: #f3e3b0;
  --edge: #d3b777;
  --wood: ${WOOD};
  --wood-dk: ${WOOD_DARK};
  --gold: ${GOLD};
  --gold-dk: #d9a63a;
  --green-dk: #3f6b2c;
  --green-bg: #a9d98a;
  --red: #9b3a2e;
  --red-bg: #eea896;
  --muted: #6a4a26;
  --tn-pixel: ${newsPixelFont.style.fontFamily};
  --tn-body: ${newsTextFont.style.fontFamily}, "Trebuchet MS", system-ui, sans-serif;
  --tone-bg: #f8d98a;
  --tone-fg: ${INK};
  --tone-text: ${WOOD_DARK};
  font-family: var(--tn-body);
  letter-spacing: normal;
  color: var(--ink);
}
.tn-root *, .tn-head * {
  font-family: inherit;
  letter-spacing: inherit;
  box-sizing: border-box;
}
.tn-root .tn-pixel, .tn-head .tn-pixel {
  font-family: var(--tn-pixel);
  font-weight: 400;
  letter-spacing: 0.05em;
}

.tn-tone--up { --tone-bg: var(--green-bg); --tone-fg: #1d4a12; --tone-text: var(--green-dk); }
.tn-tone--down { --tone-bg: var(--red-bg); --tone-fg: #6b1d14; --tone-text: var(--red); }
.tn-tone--flat { --tone-bg: #f8d98a; --tone-fg: ${INK}; --tone-text: var(--wood-dk); }

/* Pixel arrows: stepped shapes, no font glyphs involved. */
.tn-tri { flex: none; display: inline-block; width: 20px; height: 16px; background: currentColor; }
.tn-tri--up {
  clip-path: polygon(40% 0, 60% 0, 60% 25%, 80% 25%, 80% 50%, 100% 50%, 100% 100%, 0 100%, 0 50%, 20% 50%, 20% 25%, 40% 25%);
}
.tn-tri--down {
  clip-path: polygon(0 0, 100% 0, 100% 50%, 80% 50%, 80% 75%, 60% 75%, 60% 100%, 40% 100%, 40% 75%, 20% 75%, 20% 50%, 0 50%);
}
.tn-tri--flat { height: 4px; }

/* ---- Masthead + edition (modal header) ------------------------------------ */
.tn-header {
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 3px, transparent 3px 46px);
}
.tn-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; width: 100%; }
.tn-head-title {
  color: var(--gold);
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: 0.1em;
  text-shadow: 3px 3px 0 var(--ink);
}
.tn-head-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  margin-left: auto;
  color: #f3dfb0;
  font-size: 16px;
  line-height: 1.3;
}
.tn-day {
  padding: 3px 10px 2px;
  color: var(--ink);
  background: var(--gold);
  border: 2px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  font-size: 13px;
  line-height: 1.2;
}
.tn-town { color: var(--paper-hi); font-weight: 700; }

/* ---- Page ----------------------------------------------------------------- */
.tn-root {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  font-size: 16px;
  line-height: 1.35;
  background-color: var(--paper-lo);
  background-image: repeating-linear-gradient(0deg, rgba(94,59,26,0.05) 0 2px, transparent 2px 4px);
}
.tn-page { flex: 1 0 auto; padding: 18px 18px 6px; }

.tn-new {
  display: inline-block;
  padding: 0 6px;
  color: var(--ink);
  background: var(--gold);
  border: 2px solid var(--ink);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  vertical-align: middle;
}
.tn-older {
  display: inline-block;
  padding: 0 6px;
  color: var(--muted);
  background: #e3dac6;
  border: 2px solid var(--edge);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  vertical-align: middle;
}
.tn-pips { display: inline-flex; gap: 3px; }
.tn-pip { width: 10px; height: 10px; background: transparent; border: 2px solid currentColor; opacity: 0.7; }
.tn-pip--on { background: var(--gold); border-color: var(--ink); opacity: 1; }

/* ---- Lead story ----------------------------------------------------------- */
.tn-lead {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: stretch;
  gap: 24px;
  padding: 20px 26px 20px 20px;
  color: var(--paper-hi);
  background-color: var(--wood);
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 3px, transparent 3px 46px);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 3px rgba(255,246,214,0.18), 4px 4px 0 var(--ink);
}
.tn-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 132px;
  padding: 14px 8px 12px;
  color: var(--tone-fg);
  background: var(--tone-bg);
  border: 3px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink), inset 0 0 0 2px rgba(255,253,240,0.45);
  text-align: center;
}
.tn-gauge-icon { font-size: 30px; line-height: 1; }
.tn-gauge-move { display: flex; align-items: center; gap: 8px; }
.tn-gauge .tn-tri { width: 24px; height: 20px; }
.tn-gauge .tn-tri--flat { height: 5px; }
.tn-gauge-pct { font-size: 28px; line-height: 1.1; white-space: nowrap; }
.tn-gauge-dir { font-size: 15px; font-weight: 700; line-height: 1.2; }

.tn-lead-text { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.tn-lead-kicker { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; color: #f3dfb0; font-size: 16px; line-height: 1.3; }
.tn-lead-kicker strong { font-weight: 700; color: var(--paper-hi); }
.tn-lead .tn-headline {
  margin: 8px 0 0;
  color: var(--paper-hi);
  font-size: clamp(26px, 3.4vw, 36px);
  font-weight: 700;
  line-height: 1.12;
  text-shadow: 3px 3px 0 var(--ink);
  text-wrap: balance;
}
.tn-lead .tn-summary { max-width: 58ch; margin: 10px 0 0; color: #fbeccb; font-size: 16px; line-height: 1.45; }
.tn-lead-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 36px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px solid rgba(255,246,214,0.28);
}
.tn-lead-fact { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tn-lead-label { color: #d9c18a; font-size: 13px; line-height: 1.2; }
.tn-lead-value { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; color: var(--paper-hi); font-size: 16px; font-weight: 700; line-height: 1.25; }

/* ---- Latest headlines: one aligned board ---------------------------------- */
.tn-section { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 22px 2px 10px; }
.tn-section-title { margin: 0; color: var(--wood-dk); font-size: 14px; line-height: 1.2; }
.tn-section-count { color: var(--muted); font-size: 14px; }

.tn-board { background: var(--paper-hi); border: 3px solid var(--ink); box-shadow: 4px 4px 0 var(--ink); }
.tn-board-head,
.tn-row { display: grid; grid-template-columns: 112px 116px minmax(0, 1fr) 190px 118px; }
.tn-board-head {
  background: var(--paper-lo);
  border-bottom: 2px solid var(--edge);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.2;
}
.tn-board-head > span { padding: 7px 12px; }
.tn-board-head > span:first-child { padding-left: 4px; padding-right: 4px; text-align: center; }
.tn-row + .tn-row { border-top: 1px solid var(--edge); }

.tn-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 4px;
  color: var(--tone-fg);
  background: var(--tone-bg);
  border-right: 3px solid var(--ink);
}
.tn-tab-pct { font-size: 19px; line-height: 1.1; white-space: nowrap; }

.tn-cell { display: flex; flex-direction: column; justify-content: center; min-width: 0; padding: 12px; }
.tn-goods { align-items: flex-start; gap: 2px; }
.tn-goods-icon { font-size: 24px; line-height: 1; }
.tn-goods-name { font-size: 15px; font-weight: 700; line-height: 1.2; }
.tn-row .tn-headline { margin: 0; color: var(--ink); font-size: 19px; font-weight: 700; line-height: 1.2; text-wrap: balance; }
.tn-news { align-items: flex-start; gap: 6px; }
.tn-buyers { color: var(--ink); font-size: 15px; line-height: 1.3; }
.tn-time { gap: 5px; color: var(--ink); font-size: 15px; line-height: 1.25; }
.tn-time .tn-pips { color: var(--wood-dk); }
.tn-time-text { color: var(--muted); }

/* ---- Empty / loading ------------------------------------------------------ */
.tn-empty {
  padding: 26px 28px;
  color: var(--paper-hi);
  background-color: var(--wood);
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 3px, transparent 3px 46px);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 3px rgba(255,246,214,0.18), 4px 4px 0 var(--ink);
}
.tn-empty-title { margin: 0 0 6px; color: var(--gold); font-size: 19px; line-height: 1.3; text-shadow: 2px 2px 0 var(--ink); }
.tn-empty-copy { max-width: 56ch; margin: 0; color: #fbeccb; font-size: 16px; line-height: 1.45; }

/* ---- Footer rail ---------------------------------------------------------- */
.tn-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 20px;
  margin-top: 18px;
  padding: 9px 18px;
  color: #f3dfb0;
  background: var(--wood-dk);
  border-top: 4px solid var(--ink);
  font-size: 15px;
}
.tn-keys { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 18px; }
.tn-key { display: inline-flex; align-items: center; gap: 8px; }
.tn-keycap {
  min-width: 26px;
  padding: 2px 8px 1px;
  color: var(--ink);
  background: var(--paper);
  border: 2px solid var(--ink);
  box-shadow: 0 3px 0 var(--ink);
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
}

/* ---- Modal pieces --------------------------------------------------------- */
.tn-close:focus-visible { outline: 3px dashed var(--paper); outline-offset: 2px; }
.tn-scroll { scrollbar-color: #7d4f25 #f3e3b0; }
.tn-scroll::-webkit-scrollbar { width: 14px; }
.tn-scroll::-webkit-scrollbar-thumb { background: #7d4f25; border: 2px solid #2b1a08; }

/* Narrower modal: keep the same order, drop the column header. */
@media (max-width: 1000px) {
  .tn-board-head { display: none; }
  .tn-row { grid-template-columns: 84px minmax(0, 1fr); }
  .tn-tab { grid-row: 1 / span 4; }
  .tn-cell { grid-column: 2; padding: 4px 14px; }
  .tn-goods { flex-direction: row; align-items: center; gap: 8px; padding-top: 12px; }
  .tn-goods-icon { font-size: 20px; }
  .tn-buyers::before { content: attr(data-label); margin-right: 6px; color: var(--muted); }
  .tn-time { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding-bottom: 12px; }
}
@media (max-width: 620px) {
  .tn-head-title { font-size: 21px; }
  .tn-head-meta { margin-left: 0; }
  .tn-page { padding: 14px 12px 6px; }
  .tn-lead { grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 16px; }
  .tn-gauge { flex-direction: row; justify-content: center; width: auto; justify-self: start; gap: 12px; padding: 8px 14px; }
  .tn-gauge-icon { font-size: 24px; }
  .tn-gauge-pct { font-size: 22px; }
  .tn-gauge-dir { display: none; }
  .tn-row { grid-template-columns: 68px minmax(0, 1fr); }
  .tn-tab-pct { font-size: 15px; }
  .tn-footer { padding: 9px 12px; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Presentation helpers                                                       */
/* -------------------------------------------------------------------------- */

type Direction = "up" | "down" | "flat";

type StoryView = {
  headline: MarketHeadline;
  lead: string;
  summary: string;
  categoryLabel: string;
  categoryIcon: string;
  dealerLabel: string;
  direction: Direction;
  impactLabel: string;
  changeLabel: string;
  arrow: string;
  effect: DemandShockEvent | undefined;
  durationDays: number;
  remainingDays: number | null;
  durationLabel: string;
  isFresh: boolean;
};

const EMPTY_HEADLINES: MarketHeadline[] = [];

function splitArticle(text: string): { lead: string; summary: string } {
  const clean = text.trim();
  const firstStop = clean.search(/[.!?](?:\s|$)/);

  if (firstStop === -1) {
    return { lead: clean || "Town wire report", summary: "" };
  }

  return {
    lead: clean.slice(0, firstStop + 1).trim() || "Town wire report",
    summary: clean.slice(firstStop + 1).trim(),
  };
}

function presentationSummary(
  categoryLabel: string,
  changePct: number,
  direction: Direction,
  isFresh: boolean
): string {
  if (direction === "flat") {
    return "No directional move was recorded. Prices continue to follow dealer stock and ordinary town trade.";
  }

  const movement = direction === "up" ? "higher" : "lower";
  const timing = isFresh
    ? "in today's town ledger"
    : "when this edition was printed";

  return (
    `Dealer demand for ${categoryLabel} printed ${movement} by ` +
    `${Math.abs(changePct)}% ${timing}. The shift feeds the same two-day ` +
    "dealer-demand effect that moves prices."
  );
}

function buildStoryView(
  headline: MarketHeadline,
  economy: WorldSnapshot | null,
  day: number
): StoryView {
  const category = headline.category;
  const changePct = Number.isFinite(headline.changePct)
    ? headline.changePct
    : 0;
  const direction: Direction =
    changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
  const isFresh = headline.day === day;

  const good = economy?.goods.find((candidate) => candidate.id === category);
  const categoryLabel =
    CATEGORY_LABELS[category] ?? good?.name ?? "General Market";
  const categoryIcon = CATEGORY_ICONS[category] ?? "✦";

  const interestedDealers =
    economy?.merchants.filter(
      (merchant) => (merchant.wants[category] ?? 0) > 0
    ) ?? [];
  const dealerLabel = interestedDealers.length
    ? interestedDealers.map((merchant) => merchant.name).join(" · ")
    : "Town dealers";

  // Headlines become demand events with their text as the event label, so the
  // live event is the authoritative source for duration and remaining days.
  const effect = economy?.activeEvents.find(
    (event) => event.goodId === category && event.label === headline.text
  );
  const durationDays = effect
    ? Math.max(1, effect.endsAtDay - effect.startedAtDay)
    : changePct === 0
      ? 0
      : 2;
  const remainingDays = effect ? Math.max(0, effect.remainingDays) : null;

  let durationLabel: string;
  if (effect && remainingDays !== null) {
    durationLabel =
      `${durationDays}-day effect · ${remainingDays} day` +
      `${remainingDays === 1 ? "" : "s"} left`;
  } else if (changePct !== 0) {
    durationLabel = `${durationDays}-day effect · concluded`;
  } else {
    durationLabel = "No directional effect";
  }

  const { lead, summary: printedSummary } = splitArticle(headline.text ?? "");
  const summary =
    printedSummary ||
    presentationSummary(categoryLabel, changePct, direction, isFresh);

  return {
    headline,
    lead,
    summary,
    categoryLabel,
    categoryIcon,
    dealerLabel,
    direction,
    impactLabel:
      direction === "up"
        ? "Demand rising"
        : direction === "down"
          ? "Demand falling"
          : "Market steady",
    changeLabel:
      direction === "up"
        ? `+${changePct}%`
        : direction === "down"
          ? `−${Math.abs(changePct)}%`
          : "0%",
    arrow: direction === "up" ? "↑" : direction === "down" ? "↓" : "—",
    effect,
    durationDays,
    remainingDays,
    durationLabel,
    isFresh,
  };
}

/* -------------------------------------------------------------------------- */
/*  Story pieces                                                               */
/* -------------------------------------------------------------------------- */

/** Short "time left" wording derived from the existing effect calculation. */
function timeLeftText(story: StoryView): string {
  if (story.effect && story.remainingDays !== null) {
    return `${story.remainingDays} day${story.remainingDays === 1 ? "" : "s"} left`;
  }
  return story.durationDays > 0 ? "Ended" : "No effect";
}

function Arrow({ direction }: { direction: Direction }) {
  return <span className={`tn-tri tn-tri--${direction}`} aria-hidden="true" />;
}

function Pips({ story }: { story: StoryView }) {
  const pipCount = Math.min(story.durationDays, 7);
  if (!story.effect || story.remainingDays === null || pipCount === 0) {
    return null;
  }
  const litCount = Math.min(story.remainingDays, pipCount);

  return (
    <span className="tn-pips" aria-hidden="true">
      {Array.from({ length: pipCount }, (_, index) => (
        <span
          key={index}
          className={`tn-pip ${index < litCount ? "tn-pip--on" : ""}`}
        />
      ))}
    </span>
  );
}

function Freshness({ story }: { story: StoryView }) {
  return story.isFresh ? (
    <span className="tn-new">NEW</span>
  ) : (
    <span className="tn-older">Day {story.headline.day}</span>
  );
}

function LeadStory({ story }: { story: StoryView }) {
  // Headlines read as headlines, not sentences.
  const headlineText = story.lead.replace(/\.$/, "");

  return (
    <article className={`tn-lead tn-tone--${story.direction}`}>
      <div
        className="tn-gauge"
        aria-label={`Market impact: ${story.impactLabel}, ${story.changeLabel}`}
      >
        <span className="tn-gauge-icon" aria-hidden="true">
          {story.categoryIcon}
        </span>
        <span className="tn-gauge-move">
          <Arrow direction={story.direction} />
          <span className="tn-gauge-pct tn-pixel">{story.changeLabel}</span>
        </span>
        <span className="tn-gauge-dir">{story.impactLabel}</span>
      </div>

      <div className="tn-lead-text">
        <div className="tn-lead-kicker">
          <strong>{story.categoryLabel}</strong>
          <Freshness story={story} />
        </div>
        <h3 className="tn-headline">{headlineText}</h3>
        <p className="tn-summary">{story.summary}</p>
        <div className="tn-lead-facts">
          <div className="tn-lead-fact">
            <span className="tn-lead-label">Buyers</span>
            <span className="tn-lead-value">{story.dealerLabel}</span>
          </div>
          <div className="tn-lead-fact" title={story.durationLabel}>
            <span className="tn-lead-label">Time left</span>
            <span className="tn-lead-value">
              <Pips story={story} />
              {timeLeftText(story)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function HeadlineRow({ story }: { story: StoryView }) {
  const headlineText = story.lead.replace(/\.$/, "");

  return (
    <article
      className={`tn-row tn-tone--${story.direction}`}
      aria-label={`${story.categoryLabel}: ${story.impactLabel}, ${story.changeLabel}`}
    >
      <div className="tn-tab">
        <Arrow direction={story.direction} />
        <span className="tn-tab-pct tn-pixel">{story.changeLabel}</span>
      </div>

      <div className="tn-cell tn-goods">
        <span className="tn-goods-icon" aria-hidden="true">
          {story.categoryIcon}
        </span>
        <span className="tn-goods-name">{story.categoryLabel}</span>
      </div>

      <div className="tn-cell tn-news">
        <Freshness story={story} />
        <h3 className="tn-headline">{headlineText}</h3>
      </div>

      <div className="tn-cell tn-buyers" data-label="Buyers:">
        {story.dealerLabel}
      </div>

      <div className="tn-cell tn-time" title={story.durationLabel}>
        <Pips story={story} />
        <span className="tn-time-text">{timeLeftText(story)}</span>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Town wire                                                                  */
/* -------------------------------------------------------------------------- */

const TownHeadlines = () => {
  const { isOpen, closeHeadlines } = useTownNewsUi();
  const { data, economy, loading } = useAuction();
  const { clock } = useWorldClock();

  const headlines = data?.state.market.headlines ?? EMPTY_HEADLINES;
  const day = economy?.day ?? data?.state.day ?? 1;
  const town = economy?.player.stall.town ?? "Rook's Riverside";

  const stories = useMemo(
    () =>
      [...headlines]
        .map((headline) => buildStoryView(headline, economy, day))
        .sort((a, b) => {
          if (a.isFresh !== b.isFresh) {
            return a.isFresh ? -1 : 1;
          }
          return b.headline.day - a.headline.day;
        }),
    [headlines, economy, day]
  );

  const featured = useMemo(() => {
    const freshMovers = stories
      .filter((story) => story.isFresh && story.headline.changePct !== 0)
      .sort(
        (a, b) =>
          Math.abs(b.headline.changePct) - Math.abs(a.headline.changePct)
      );
    return freshMovers[0] ?? stories[0] ?? null;
  }, [stories]);

  const laterStories = featured
    ? stories.filter((story) => story.headline.id !== featured.headline.id)
    : [];

  const freshCount = stories.filter((story) => story.isFresh).length;
  const liveCount = economy?.activeEvents.length ?? 0;
  const dayLabel = String(day).padStart(2, "0");
  const isLoading = loading && !data;

  return (
    <>
      <style>{NEWS_CSS}</style>
      <Modal
        opened={isOpen}
        onClose={closeHeadlines}
        title={
          <span className="tn-head">
            <span className="tn-head-title tn-pixel">TOWN WIRE</span>
            <span className="tn-head-meta">
              <span className="tn-day tn-pixel">Day {dayLabel}</span>
              <span className="tn-town">{town}</span>
              <span>{clock.timeLabel}</span>
            </span>
          </span>
        }
        size="min(1120px, 96vw)"
        centered
        zIndex={1200}
        overlayProps={{ backgroundOpacity: 0.72, blur: 2 }}
        classNames={{ header: "tn-header", body: "tn-scroll", close: "tn-close" }}
        closeButtonProps={{ "aria-label": "Close town headlines" }}
        styles={{
          content: {
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh",
            overflow: "hidden",
            background: PAPER,
            border: `4px solid ${INK}`,
            borderRadius: 0,
            boxShadow: "8px 8px 0 rgba(0,0,0,0.5)",
          },
          header: {
            flex: "none",
            backgroundColor: WOOD_DARK,
            borderBottom: `4px solid ${INK}`,
            margin: 0,
            padding: "12px 18px",
          },
          title: { flex: 1, margin: 0 },
          close: {
            background: PAPER,
            border: `3px solid ${INK}`,
            borderRadius: 0,
            color: INK,
          },
          body: {
            flex: "1 1 auto",
            minHeight: 0,
            margin: 0,
            padding: 0,
            overflowY: "auto",
          },
        }}
      >
        <div className="tn-root">
          <div className="tn-page">
            {featured ? (
              <>
                <LeadStory story={featured} />

                {laterStories.length > 0 && (
                  <section>
                    <div className="tn-section">
                      <h2 className="tn-section-title tn-pixel">
                        Latest headlines
                      </h2>
                      <span className="tn-section-count">
                        {laterStories.length}{" "}
                        {laterStories.length === 1 ? "story" : "stories"}
                      </span>
                    </div>
                    <div className="tn-board">
                      <div className="tn-board-head" aria-hidden="true">
                        <span>Demand</span>
                        <span>Goods</span>
                        <span>Headline</span>
                        <span>Buyers</span>
                        <span>Time left</span>
                      </div>
                      {laterStories.map((story) => (
                        <HeadlineRow key={story.headline.id} story={story} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="tn-empty">
                <h3 className="tn-empty-title tn-pixel">
                  {isLoading
                    ? "Setting the type…"
                    : "No fresh town headlines"}
                </h3>
                <p className="tn-empty-copy">
                  {isLoading
                    ? "The town wire is still answering. The bulletin will appear here in a moment."
                    : "The bulletin board is quiet. Fresh stories arrive when the town's market day turns, and they move dealer demand for two days."}
                </p>
              </div>
            )}
          </div>

          <footer className="tn-footer">
            <div className="tn-keys">
              <span className="tn-key">
                <span className="tn-keycap tn-pixel">N</span> Toggle bulletin
              </span>
              <span className="tn-key">
                <span className="tn-keycap tn-pixel">ESC</span> Close
              </span>
            </div>
            <span>
              {freshCount} new today · {liveCount} live{" "}
              {liveCount === 1 ? "effect" : "effects"}
            </span>
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default TownHeadlines;