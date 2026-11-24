import type { InventoryItem, StorageLot } from "./types";
import { saleValue } from "./types";

export function formatCoins(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value
  );
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatClockTime(iso: string, now: number): string {
  return formatCountdown(Date.parse(iso) - now);
}

export function lotPhaseLabel(lot: StorageLot, now: number): string {
  if (lot.status === "preview") {
    return `BIDDING OPENS ${formatClockTime(lot.previewEndsAt, now)}`;
  }

  if (lot.status === "live") {
    return `CLOSES ${formatClockTime(lot.endsAt, now)}`;
  }

  if (lot.status === "won") {
    return lot.revealStatus === "revealed" ? "VAULT OPENED" : "YOU WON";
  }

  return `LOST TO ${lot.rivalName.toUpperCase()}`;
}

export function lotStatusLabel(lot: StorageLot): string {
  if (lot.status === "preview") return "PREVIEW";
  if (lot.status === "won") {
    return lot.revealStatus === "revealed" ? "REVEALED" : "WON";
  }
  if (lot.status === "lost") return "LOST";
  if (lot.playerBid > 0) {
    return lot.isLeading ? "LEADING" : "OUTBID";
  }
  return "OPEN";
}

export function lotStatusColor(lot: StorageLot): string {
  if (lot.status === "won") return "#a8d98a";
  if (lot.status === "lost") return "#e7b0a0";
  if (lot.status === "preview") return "#d9d0c0";
  if (lot.playerBid > 0) {
    return lot.isLeading ? "#a8d98a" : "#ffcf70";
  }
  return "#fff6d6";
}

export function haulValue(
  inventory: InventoryItem[],
  multipliers: Record<string, number>
): number {
  return inventory.reduce(
    (total, item) =>
      total +
      saleValue(item, multipliers as Parameters<typeof saleValue>[1]),
    0
  );
}

export function shortWallet(wallet: string): string {
  return wallet.length > 10
    ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
    : wallet;
}
