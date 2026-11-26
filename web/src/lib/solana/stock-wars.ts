// web/src/lib/solana/stock-wars.ts
// Shared (browser + server) helpers for the Stock Wars program. Hand-built instructions from the
// generated IDL (account order + discriminators verified from `idl-build` output). Only @solana/web3.js.
import { Buffer } from "buffer"; // transitive dep of @solana/web3.js; avoids relying on a global Buffer in the browser
import {
  PublicKey,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";

export const STOCK_WARS_PROGRAM_ID = new PublicKey(
  "GZNyBfvyMZZ67cXugKMz9uagcv2fsWP3F64ZhdAQPEiV"
);
export const DELEGATION_PROGRAM_ID = new PublicKey(
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
);
export const VRF_PROGRAM_ID = new PublicKey(
  "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
); // from ephemeral-vrf-sdk 0.18.0 consts
export const VRF_EPHEMERAL_QUEUE = new PublicKey(
  "5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc"
); // DEFAULT_EPHEMERAL_QUEUE

export const PLAYER_SEED = "player";
export const LOT_SEED = "lot";
export const MAX_BID = 9_000_000;
/** Passed as rival_bid to void a bid the house never accepted: > any legal escrow, still a safe integer. */
export const VOID_RIVAL_BID = Number.MAX_SAFE_INTEGER;

// Anchor discriminators (from the generated IDL).
const DISC = {
  init_player: [114, 27, 219, 144, 50, 15, 228, 66],
  delegate_player: [235, 159, 245, 102, 161, 199, 254, 89],
  init_lot_bid: [10, 250, 194, 205, 195, 128, 144, 132],
  delegate_lot_bid: [131, 55, 87, 184, 227, 169, 12, 113],
  apply_delta: [207, 38, 218, 99, 113, 12, 211, 124],
  place_bid: [238, 77, 148, 91, 200, 151, 92, 146],
  settle_lot: [21, 3, 57, 120, 104, 167, 119, 214],
  request_reveal: [68, 34, 124, 109, 202, 72, 142, 90],
} as const;
const ACCOUNT_DISC = {
  LotBid: [121, 212, 134, 202, 137, 21, 124, 46],
  PlayerState: [56, 3, 60, 86, 174, 16, 244, 195],
} as const;

const enc = new TextEncoder();

export function u64le(value: number | bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(value), true);
  return out;
}

function data(name: keyof typeof DISC, ...args: Uint8Array[]): Uint8Array {
  const total = 8 + args.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  out.set(DISC[name], 0);
  let o = 8;
  for (const a of args) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

// ---------- PDAs ----------
export function playerPda(wallet: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode(PLAYER_SEED), wallet.toBytes()],
    STOCK_WARS_PROGRAM_ID
  )[0];
}
export function lotPda(wallet: PublicKey, listing: number | bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode(LOT_SEED), wallet.toBytes(), u64le(listing)],
    STOCK_WARS_PROGRAM_ID
  )[0];
}
export function programIdentityPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode("identity")],
    STOCK_WARS_PROGRAM_ID
  )[0];
}
function delegationPdas(account: PublicKey) {
  return {
    buffer: PublicKey.findProgramAddressSync(
      [enc.encode("buffer"), account.toBytes()],
      STOCK_WARS_PROGRAM_ID
    )[0],
    record: PublicKey.findProgramAddressSync(
      [enc.encode("delegation"), account.toBytes()],
      DELEGATION_PROGRAM_ID
    )[0],
    metadata: PublicKey.findProgramAddressSync(
      [enc.encode("delegation-metadata"), account.toBytes()],
      DELEGATION_PROGRAM_ID
    )[0],
  };
}

const meta = (pubkey: PublicKey, isSigner: boolean, isWritable: boolean) => ({
  pubkey,
  isSigner,
  isWritable,
});

// ---------- instruction builders ----------
export function ixInitPlayer(wallet: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: [
      meta(wallet, true, true),
      meta(playerPda(wallet), false, true),
      meta(SystemProgram.programId, false, false),
    ],
    data: Buffer.from(data("init_player")),
  });
}

function delegateKeys(
  wallet: PublicKey,
  account: PublicKey,
  validator?: PublicKey
) {
  const d = delegationPdas(account);
  const keys = [
    meta(wallet, true, true),
    meta(d.buffer, false, true),
    meta(d.record, false, true),
    meta(d.metadata, false, true),
    meta(account, false, true),
    meta(STOCK_WARS_PROGRAM_ID, false, false), // owner_program
    meta(DELEGATION_PROGRAM_ID, false, false),
    meta(SystemProgram.programId, false, false),
  ];
  if (validator) keys.push(meta(validator, false, false)); // read as remaining_accounts[0] by the program
  return keys;
}

export function ixDelegatePlayer(
  wallet: PublicKey,
  validator?: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: delegateKeys(wallet, playerPda(wallet), validator),
    data: Buffer.from(data("delegate_player")),
  });
}
export function ixInitLotBid(
  wallet: PublicKey,
  listing: number
): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: [
      meta(wallet, true, true),
      meta(lotPda(wallet, listing), false, true),
      meta(SystemProgram.programId, false, false),
    ],
    data: Buffer.from(data("init_lot_bid", u64le(listing))),
  });
}
export function ixDelegateLotBid(
  wallet: PublicKey,
  listing: number,
  validator?: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: delegateKeys(wallet, lotPda(wallet, listing), validator),
    data: Buffer.from(data("delegate_lot_bid", u64le(listing))),
  });
}
export function ixPlaceBid(
  wallet: PublicKey,
  listing: number,
  amount: number
): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: [
      meta(wallet, true, false),
      meta(playerPda(wallet), false, true),
      meta(lotPda(wallet, listing), false, true),
    ],
    data: Buffer.from(data("place_bid", u64le(amount))),
  });
}
export function ixApplyDelta(
  authority: PublicKey,
  wallet: PublicKey,
  nonce: number,
  credit: number,
  debit: number
): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: [meta(authority, true, false), meta(playerPda(wallet), false, true)],
    data: Buffer.from(
      data("apply_delta", u64le(nonce), u64le(credit), u64le(debit))
    ),
  });
}
export function ixSettleLot(
  authority: PublicKey,
  wallet: PublicKey,
  listing: number,
  rivalBid: bigint | number
): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: [
      meta(authority, true, false),
      meta(playerPda(wallet), false, true),
      meta(lotPda(wallet, listing), false, true),
    ],
    data: Buffer.from(data("settle_lot", u64le(rivalBid))),
  });
}
/** `payer` = lot owner (first request) or the game authority (retry while Pending). */
export function ixRequestReveal(
  payer: PublicKey,
  wallet: PublicKey,
  listing: number
): TransactionInstruction {
  return new TransactionInstruction({
    programId: STOCK_WARS_PROGRAM_ID,
    keys: [
      meta(payer, true, true),
      meta(lotPda(wallet, listing), false, true),
      meta(VRF_EPHEMERAL_QUEUE, false, true),
      meta(programIdentityPda(), false, false),
      meta(VRF_PROGRAM_ID, false, false),
      meta(SYSVAR_SLOT_HASHES_PUBKEY, false, false),
      meta(SystemProgram.programId, false, false),
    ],
    data: Buffer.from(data("request_reveal")),
  });
}

// ---------- account decoders ----------
export type PlayerStateData = {
  authority: string;
  balance: number;
  syncNonce: number;
};
export type LotStatus = "open" | "won" | "lost";
export type RevealState = "none" | "pending" | "done";
export type LotBidData = {
  player: string;
  listing: number;
  escrow: number;
  rivalBid: number;
  pricePaid: number;
  status: LotStatus;
  reveal: RevealState;
  revealNonce: number;
  revealRandomHex: string;
};

function safe(v: bigint): number {
  if (v > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("On-chain value exceeds safe integer range");
  return Number(v);
}
function checkDisc(buf: Uint8Array, want: readonly number[], name: string) {
  for (let i = 0; i < 8; i += 1)
    if (buf[i] !== want[i]) throw new Error(`Not a ${name} account`);
}

export function decodePlayerState(buf: Uint8Array): PlayerStateData {
  checkDisc(buf, ACCOUNT_DISC.PlayerState, "PlayerState");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    authority: new PublicKey(buf.slice(8, 40)).toBase58(),
    balance: safe(dv.getBigUint64(40, true)),
    syncNonce: safe(dv.getBigUint64(48, true)),
  };
}

export function decodeLotBid(buf: Uint8Array): LotBidData {
  checkDisc(buf, ACCOUNT_DISC.LotBid, "LotBid");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 8;
  const player = new PublicKey(buf.slice(o, o + 32)).toBase58();
  o += 32;
  const listing = safe(dv.getBigUint64(o, true));
  o += 8;
  const escrow = safe(dv.getBigUint64(o, true));
  o += 8;
  const rivalBid = safe(dv.getBigUint64(o, true));
  o += 8;
  const pricePaid = safe(dv.getBigUint64(o, true));
  o += 8;
  const status = (["open", "won", "lost"] as const)[buf[o]!];
  o += 1;
  const reveal = (["none", "pending", "done"] as const)[buf[o]!];
  o += 1;
  const revealNonce = dv.getUint32(o, true);
  o += 4;
  const revealRandomHex = Array.from(buf.slice(o, o + 32), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  if (!status || !reveal) throw new Error("Corrupt LotBid enum");
  return {
    player,
    listing,
    escrow,
    rivalBid,
    pricePaid,
    status,
    reveal,
    revealNonce,
    revealRandomHex,
  };
}
