import type { AssetResult, CampaignStatus, Classification } from "@/lib/types";

export const norm = (value: string): string =>
  value.replace(/_/g, "").toLowerCase();

const toSnake = (value: string): string =>
  value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

export function field(source: unknown, name: string): unknown {
  const record = source as Record<string, unknown>;
  if (name in record) return record[name];
  const snake = toSnake(name);
  if (snake in record) return record[snake];
  throw new Error(`Missing field ${name}`);
}

export function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value));
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Integer outside the safe range");
  }
  return parsed;
}

export function bytesToHex(value: unknown): string {
  return Array.from(value as ArrayLike<number>, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function hexToBytes(hex: string): number[] {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("Invalid SHA-256 hex");
  const out: number[] = [];
  for (let i = 0; i < 64; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

const STATUS: Record<string, CampaignStatus> = {
  draft: "DRAFT",
  active: "ACTIVE",
  closed: "CLOSED",
  settled: "SETTLED",
};

const RESULT: Record<string, AssetResult> = {
  pending: "PENDING",
  aigenerated: "AI_GENERATED",
  humancreated: "HUMAN_CREATED",
  tie: "TIE",
  insufficientvotes: "INSUFFICIENT_VOTES",
};

const CLASSIFICATION: Record<string, Classification> = {
  aigenerated: "AI_GENERATED",
  humancreated: "HUMAN_CREATED",
};

function variant<T extends string>(value: unknown, table: Record<string, T>): T {
  const keys = Object.keys(value as object);
  if (keys.length !== 1) throw new Error("Invalid enum value");
  const label = table[norm(keys[0])];
  if (!label) throw new Error("Unknown enum variant");
  return label;
}

export const decodeStatus = (value: unknown) => variant(value, STATUS);
export const decodeResult = (value: unknown) => variant(value, RESULT);
export const decodeClassification = (value: unknown) =>
  variant(value, CLASSIFICATION);

export function encodeClassification(
  classification: Classification,
): { aiGenerated: Record<string, never> } | { humanCreated: Record<string, never> } {
  return classification === "AI_GENERATED"
    ? { aiGenerated: {} }
    : { humanCreated: {} };
}