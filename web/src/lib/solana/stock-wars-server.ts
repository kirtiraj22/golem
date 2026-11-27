import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  DELEGATION_PROGRAM_ID,
  STOCK_WARS_PROGRAM_ID,
  VRF_PROGRAM_ID,
  decodeLotBid,
  decodePlayerState,
  ixApplyDelta,
  ixRequestReveal,
  ixSettleLot,
  lotPda,
  playerPda,
  type LotBidData,
  type PlayerStateData,
} from "./stock-wars";

export const ERR = {
  LotClosed: 6002,
  InsufficientBalance: 6007,
  BadSyncNonce: 6008,
} as const;

/** definite=true: the chain rejected it (nothing applied). definite=false: outcome unknown (timeout/network). */
export class ChainTxError extends Error {
  constructor(
    message: string,
    readonly definite: boolean,
    readonly code?: number
  ) {
    super(message);
  }
}
/** Account is delegated but not yet visible on the ER (clone lag) or ER is unreachable. */
export class ChainNotReadyError extends Error {}

let base: Connection | null = null;
let er: Connection | null = null;
let authority: Keypair | null = null;

export function baseConnection(): Connection {
  base ??= new Connection(
    process.env.SOLANA_RPC_URL?.trim() ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
      "https://api.devnet.solana.com",
    "confirmed"
  );
  return base;
}
export function erConnection(): Connection {
  er ??= new Connection(
    process.env.MAGICBLOCK_ER_RPC_URL?.trim() ||
      "https://devnet.magicblock.app",
    "confirmed"
  );
  return er;
}
export function gameAuthority(): Keypair {
  if (!authority) {
    const raw = process.env.GAME_AUTHORITY_SECRET_KEY?.trim();
    if (!raw) throw new Error("GAME_AUTHORITY_SECRET_KEY is not configured");
    authority = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(raw) as number[])
    );
    // The program rejects any other signer; fail loudly if the env key does not match the deployed constant.
    if (
      authority.publicKey.toBase58() !==
      "GZ1vGvyHCZHc5uqxRDigfK1tUEyjWZPD2XcdMxecvtGp"
    ) {
      throw new Error(
        "GAME_AUTHORITY_SECRET_KEY does not match the program's GAME_AUTHORITY"
      );
    }
  }
  return authority;
}

type Layer = "base" | "er";

type DelegationStatusResponse = {
  result?: { isDelegated?: boolean };
  error?: { message?: string };
};

/**
 * The ER RPC also serves base accounts, so `getAccountInfo` alone cannot tell
 * whether an account is actually delegated. Ask the router first; this is an
 * ER call, not a Helius call. `null` means the endpoint could not answer.
 */
async function isDelegatedOnEr(account: PublicKey): Promise<boolean | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(erConnection().rpcEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getDelegationStatus",
        params: [account.toBase58()],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as DelegationStatusResponse;
    if (payload.error || !payload.result) return null;
    return payload.result.isDelegated === true;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read the authoritative copy once. Delegated accounts are served by the ER
 * without touching Helius; only accounts that are not delegated use base Solana.
 */
async function readAt(
  account: PublicKey
): Promise<{ data: Uint8Array; layer: Layer } | null> {
  const delegated = await isDelegatedOnEr(account);

  if (delegated === true) {
    const erInfo = await erConnection().getAccountInfo(account, "confirmed");
    if (!erInfo)
      throw new ChainNotReadyError(
        "Delegated account not visible on the rollup yet"
      );
    if (!erInfo.owner.equals(STOCK_WARS_PROGRAM_ID))
      throw new Error("Account has an unexpected owner on the rollup");
    return { data: erInfo.data, layer: "er" };
  }

  const baseInfo = await baseConnection().getAccountInfo(account, "confirmed");
  if (!baseInfo) return null;
  if (baseInfo.owner.equals(DELEGATION_PROGRAM_ID)) {
    // Status was false/unknown but base says delegated (transition or old endpoint).
    const erInfo = await erConnection().getAccountInfo(account, "confirmed");
    if (!erInfo)
      throw new ChainNotReadyError(
        "Delegated account not visible on the rollup yet"
      );
    return { data: erInfo.data, layer: "er" };
  }
  if (baseInfo.owner.equals(STOCK_WARS_PROGRAM_ID))
    return { data: baseInfo.data, layer: "base" };
  throw new Error("Account has an unexpected owner");
}

/** Authoritative balance/nonce. Reads from whichever layer currently owns the account. */
export async function readPlayer(
  wallet: PublicKey
): Promise<(PlayerStateData & { layer: Layer }) | null> {
  const read = await readAt(playerPda(wallet));
  if (!read) return null;
  return { ...decodePlayerState(read.data), layer: read.layer };
}

export async function readLot(
  wallet: PublicKey,
  listing: number
): Promise<(LotBidData & { layer: Layer }) | null> {
  const read = await readAt(lotPda(wallet, listing));
  if (!read) return null;
  const lot = decodeLotBid(read.data);
  if (lot.player !== wallet.toBase58() || lot.listing !== listing)
    throw new Error("LotBid does not match its seeds");
  return { ...lot, layer: read.layer };
}

const CALLBACK_REVEAL_DISC = Buffer.from([
  148, 151, 238, 89, 30, 255, 110, 4,
]);
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const deliveredRevealCache = new Map<string, string>();

function decodeBase58(value: string): Uint8Array {
  const bytes = [0];
  for (const char of value) {
    const digit = BASE58.indexOf(char);
    if (digit < 0) throw new Error("Invalid base58 data");
    let carry = digit;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < value.length && value[i] === "1"; i += 1) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

/**
 * The deployed VRF callback needs ~386k CU on a delegated lot, but the oracle
 * only supplies ~255k. The callback therefore fails after the VRF output has
 * already been delivered in the transaction. Read that delivered output so the
 * off-chain game can finish the reveal without issuing another VRF request.
 */
export async function readDeliveredRevealRandomness(
  wallet: PublicKey,
  listing: number,
  nonce: number
): Promise<string | null> {
  const pda = lotPda(wallet, listing);
  const cacheKey = `${pda.toBase58()}:${nonce}`;
  const cached = deliveredRevealCache.get(cacheKey);
  if (cached) return cached;

  const conn = erConnection();
  let before: string | undefined;
  for (let page = 0; page < 2; page += 1) {
    const signatures = await conn.getSignaturesForAddress(pda, {
      limit: 25,
      before,
    });
    if (!signatures.length) break;

    for (const entry of signatures) {
      const tx = await conn.getTransaction(entry.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) continue;

      const logs = tx.meta?.logMessages ?? [];
      if (!logs.some((line) => line.includes("Instruction: CallbackReveal")))
        continue;

      const keys = tx.transaction.message.staticAccountKeys;
      const invokedVrf = tx.transaction.message.compiledInstructions.some(
        (ix) => keys[ix.programIdIndex]?.equals(VRF_PROGRAM_ID)
      );
      if (!invokedVrf) continue;

      for (const group of tx.meta?.innerInstructions ?? []) {
        for (const ix of group.instructions) {
          if (!("programIdIndex" in ix)) continue;
          if (!keys[ix.programIdIndex]?.equals(STOCK_WARS_PROGRAM_ID)) continue;
          const accounts = ix.accounts.map((i) => keys[i]?.toBase58());
          if (!accounts.includes(pda.toBase58())) continue;

          let data: Buffer;
          try {
            data = Buffer.from(decodeBase58(ix.data));
          } catch {
            continue;
          }
          if (
            data.length !== 44 ||
            !data.subarray(0, 8).equals(CALLBACK_REVEAL_DISC) ||
            data.readUInt32LE(40) !== nonce
          )
            continue;

          const randomness = data.subarray(8, 40).toString("hex");
          deliveredRevealCache.set(cacheKey, randomness);
          return randomness;
        }
      }
    }
    before = signatures[signatures.length - 1]?.signature;
  }
  return null;
}

function customCode(err: unknown): number | undefined {
  const text =
    typeof err === "string"
      ? err
      : JSON.stringify(err, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v
        );
  const hex = /custom program error: 0x([0-9a-f]+)/i.exec(text);
  if (hex) return parseInt(hex[1]!, 16);
  const obj = /"Custom":\s*(\d+)/.exec(text);
  return obj ? Number(obj[1]) : undefined;
}

async function sendAsAuthority(
  conn: Connection,
  ixs: TransactionInstruction[]
): Promise<string> {
  const kp = gameAuthority();
  let signature: string;
  try {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash(
      "confirmed"
    );
    const tx = new Transaction({
      feePayer: kp.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(...ixs);
    tx.sign(kp);
    signature = await conn.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
  } catch (e) {
    const code = customCode(
      (e as { message?: string; logs?: unknown })?.message ?? e
    );
    // Preflight (simulation) failure with a program error = definitely not applied.
    if (code !== undefined)
      throw new ChainTxError(`Program error ${code}`, true, code);
    throw new ChainTxError(`Send failed: ${(e as Error).message}`, false);
  }
  const deadline = Date.now() + 25_000;
  let delay = 300;
  while (Date.now() < deadline) {
    const { value } = await conn.getSignatureStatuses([signature]);
    const s = value[0];
    if (s?.err)
      throw new ChainTxError(
        `Transaction failed on-chain`,
        true,
        customCode(s.err)
      );
    if (
      s &&
      (s.confirmationStatus === "confirmed" ||
        s.confirmationStatus === "finalized")
    )
      return signature;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(1_200, Math.round(delay * 1.6));
  }
  throw new ChainTxError("Confirmation timed out; outcome unknown", false);
}

async function connFor(account: PublicKey): Promise<Connection> {
  const rollup = erConnection();
  if (await isDelegatedOnEr(account)) return rollup;

  const baseConn = baseConnection();
  const info = await baseConn.getAccountInfo(account, "confirmed");
  if (!info) throw new ChainTxError("Account does not exist", true);
  if (info.owner.equals(STOCK_WARS_PROGRAM_ID)) return baseConn;
  if (info.owner.equals(DELEGATION_PROGRAM_ID)) return rollup;
  throw new ChainTxError("Account has an unexpected owner", true);
}

/** Idempotent via `nonce` (program requires nonce == sync_nonce+1). Safe to retry with the same nonce. */
export async function applyDeltaOnChain(
  wallet: PublicKey,
  nonce: number,
  credit: number,
  debit: number,
  knownLayer?: Layer
): Promise<string> {
  const conn =
    knownLayer === undefined
      ? await connFor(playerPda(wallet))
      : knownLayer === "er"
        ? erConnection()
        : baseConnection();
  return sendAsAuthority(conn, [
    ixApplyDelta(gameAuthority().publicKey, wallet, nonce, credit, debit),
  ]);
}

/** Returns normally if settled now OR already settled (LotClosed). Caller re-reads the LotBid for the result. */
export async function settleLotOnChain(
  wallet: PublicKey,
  listing: number,
  rivalBid: bigint | number,
  knownLayer?: Layer
): Promise<void> {
  const conn =
    knownLayer === undefined
      ? await connFor(lotPda(wallet, listing))
      : knownLayer === "er"
        ? erConnection()
        : baseConnection();
  try {
    await sendAsAuthority(conn, [
      ixSettleLot(gameAuthority().publicKey, wallet, listing, rivalBid),
    ]);
  } catch (e) {
    if (e instanceof ChainTxError && e.code === ERR.LotClosed) return;
    throw e;
  }
}

/** Retry a stuck VRF request (program allows only the authority to do this, only while Pending). */
export async function retryRevealOnChain(
  wallet: PublicKey,
  listing: number,
  knownLayer?: Layer
): Promise<void> {
  const conn =
    knownLayer === undefined
      ? await connFor(lotPda(wallet, listing))
      : knownLayer === "er"
        ? erConnection()
        : baseConnection();
  await sendAsAuthority(conn, [
    ixRequestReveal(gameAuthority().publicKey, wallet, listing),
  ]);
}
