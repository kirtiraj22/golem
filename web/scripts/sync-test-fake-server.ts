// Simulated chain enforcing the program's rules (strict nonce, no overdraw, settle idempotency).
import { VOID_RIVAL_BID } from "../src/lib/solana/stock-wars";
export class ChainNotReadyError extends Error {}
export class ChainTxError extends Error {
  constructor(m: string, readonly definite: boolean, readonly code?: number) {
    super(m);
  }
}
export const ERR = {
  LotClosed: 6002,
  InsufficientBalance: 6007,
  BadSyncNonce: 6008,
} as const;
export const chain = {
  player: null as null | {
    authority: string;
    balance: number;
    syncNonce: number;
    layer: "er";
  },
  lots: new Map<number, any>(),
  sends: 0,
  // failure injection for the NEXT applyDelta call
  next: null as null | "timeout-applied" | "timeout-lost",
};
export async function readPlayer(w: any) {
  return chain.player ? { ...chain.player } : null;
}
export async function readLot(_w: any, l: number) {
  const x = chain.lots.get(l);
  return x ? { ...x, layer: "er" } : null;
}
export async function applyDeltaOnChain(
  _w: any,
  nonce: number,
  credit: number,
  debit: number
) {
  const p = chain.player!;
  const inject = chain.next;
  chain.next = null;
  if (inject === "timeout-lost") throw new ChainTxError("timeout", false);
  if (nonce !== p.syncNonce + 1)
    throw new ChainTxError("nonce", true, ERR.BadSyncNonce);
  if (p.balance + credit < debit)
    throw new ChainTxError("insufficient", true, ERR.InsufficientBalance);
  p.balance = p.balance + credit - debit;
  p.syncNonce = nonce;
  chain.sends += 1;
  if (inject === "timeout-applied") throw new ChainTxError("timeout", false);
  return "sig";
}
export async function settleLotOnChain(_w: any, l: number, rival: number) {
  const x = chain.lots.get(l);
  if (x.status !== "open") return; // LotClosed swallowed like the real module
  x.rivalBid = rival;
  if (x.escrow > 0 && x.escrow > rival) {
    x.status = "won";
    x.pricePaid = x.escrow;
  } else {
    x.status = "lost";
    chain.player!.balance += x.escrow;
  }
  x.escrow = 0;
  chain.sends += 1;
}
export async function retryRevealOnChain() {}
