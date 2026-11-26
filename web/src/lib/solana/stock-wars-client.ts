// web/src/lib/solana/stock-wars-client.ts
"use client";
// Wallet-signed transactions for the existing AuctionContext. Uses the EXISTING wallet-adapter provider
// (SolanaProvider) - no second onboarding flow, no extra signMessage prompts (session login is untouched).
// Wallet prompts happen only for: first-time profile setup, first bid on each lot, each bid, and the
// first VRF reveal request (Pending reveal retries are server-authority-only and never prompt).
// NPC sales/purchases never come through here (backend apply_delta).
import { useCallback, useMemo, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  DELEGATION_PROGRAM_ID,
  decodeLotBid,
  ixDelegateLotBid,
  ixDelegatePlayer,
  ixInitLotBid,
  ixInitPlayer,
  ixPlaceBid,
  ixRequestReveal,
  lotPda,
  playerPda,
  STOCK_WARS_PROGRAM_ID,
} from "./stock-wars";

const ER_URL =
  process.env.NEXT_PUBLIC_MAGICBLOCK_ER_RPC_URL?.trim() ||
  "https://devnet.magicblock.app";
const VALIDATOR = process.env.NEXT_PUBLIC_MAGICBLOCK_VALIDATOR?.trim();

const PROGRAM_ERRORS: Record<number, string> = {
  6000: "This reveal was already requested. The game authority retries it; no wallet signature is needed.",
  6001: "That bid account does not belong to your wallet.",
  6002: "This lot is already settled.",
  6005: "Your new bid must be higher than your current bid.",
  6006: "That bid is outside the house limit.",
  6007: "You do not have enough free coins for that raise.",
};

type DelegationStatusResponse = {
  result?: { isDelegated?: boolean };
  error?: { message?: string };
};

/**
 * The ER RPC also serves base accounts, so an account existing there does not
 * prove it is delegated. Ask the router instead; this is an ER call, not Helius.
 * `null` means the endpoint could not answer and the caller should fall back.
 */
async function isDelegatedOnEr(account: PublicKey): Promise<boolean | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(ER_URL, {
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

function friendly(e: unknown): Error {
  const msg = errorDetails(e);
  const hex = /custom program error: 0x([0-9a-f]+)/i.exec(msg);
  const code = hex
    ? parseInt(hex[1]!, 16)
    : Number(/"Custom":\s*(\d+)/.exec(msg)?.[1]);
  if (code && PROGRAM_ERRORS[code])
    return new Error(`${PROGRAM_ERRORS[code]}\n\n${msg}`);
  if (/reject|denied|cancel/i.test(msg))
    return new Error("Transaction cancelled in your wallet.");
  return new Error(msg || "The transaction failed.");
}

/** Wallet adapters wrap the real RPC error. Walk the chain so logs/cause/simulation are visible. */
function errorDetails(e: unknown): string {
  const lines: string[] = [];
  const seen = new Set<unknown>();
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const text = value.trim();
    if (text && text !== "Unexpected error" && !lines.includes(text))
      lines.push(text);
  };
  const walk = (value: unknown, depth: number) => {
    if (value == null || depth > 5) return;
    if (typeof value === "string") {
      add(value);
      return;
    }
    if (typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    const v = value as Record<string, unknown>;
    add(v.name);
    add(v.message);
    for (const key of ["logs", "transactionLogs", "programLogs"]) {
      const list = v[key];
      if (Array.isArray(list)) list.forEach(add);
    }
    if (v.err !== undefined) {
      try {
        add(typeof v.err === "string" ? v.err : JSON.stringify(v.err));
      } catch {
        add("Transaction error");
      }
    }
    if (v.code !== undefined) add(`Error code ${String(v.code)}`);
    if (v.simulation !== undefined) walk(v.simulation, depth + 1);
    if (v.error !== undefined) walk(v.error, depth + 1);
    if (v.cause !== undefined) walk(v.cause, depth + 1);
  };
  walk(e, 0);
  return lines.join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Simulate on the connection that will actually receive the tx, before opening the wallet. */
async function simulateOrThrow(
  connection: Connection,
  tx: Transaction,
  label: string
): Promise<void> {
  // The legacy simulateTransaction overload cannot pass sigVerify:false.
  // Simulate the same message as a v0 transaction instead; the real tx stays legacy.
  const probe = new VersionedTransaction(
    new TransactionMessage({
      payerKey: tx.feePayer!,
      recentBlockhash: tx.recentBlockhash!,
      instructions: tx.instructions,
    }).compileToV0Message()
  );
  const sim = await connection.simulateTransaction(probe, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
  });
  if (!sim.value.err) return;
  const logs = (sim.value.logs ?? []).filter(Boolean).join("\n");
  throw new Error(
    `${label} simulation failed: ${JSON.stringify(sim.value.err)}${
      logs ? `\n${logs}` : ""
    }`
  );
}

async function txLogs(
  connection: Connection,
  signature: string
): Promise<string> {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    return (tx?.meta?.logMessages ?? []).filter(Boolean).join("\n");
  } catch {
    return "";
  }
}

export function useStockWarsChain(sessionWallet: string) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const er = useMemo(() => new Connection(ER_URL, "confirmed"), []);
  const validator = useMemo(
    () => (VALIDATOR ? new PublicKey(VALIDATOR) : undefined),
    []
  );
  // Once a lot is visible on the ER, later bids on that same lot need neither
  // a base read nor the one-time setup transaction. This also prevents a
  // duplicate setup prompt after a state refresh.
  const readyLots = useRef<Set<string>>(new Set());
  const profileReady = useRef<string | null>(null);

  const requireWallet = useCallback((): PublicKey => {
    if (!publicKey || !signTransaction) {
      setVisible(true); // existing WalletModalProvider
      throw new Error("Connect your wallet to place on-chain bids.");
    }
    if (publicKey.toBase58() !== sessionWallet)
      throw new Error("Connect the same wallet you signed in with.");
    return publicKey;
  }, [publicKey, signTransaction, sessionWallet, setVisible]);

  /**
   * Base-layer tx: wallet signs, but THIS app submits to the configured RPC.
   * Do not use the adapter's sendTransaction(): wallet-standard wallets such as
   * Phantom may submit through their own RPC/network instead of the one above.
   */
  const sendBase = useCallback(
    async (ixs: TransactionInstruction[], label: string) => {
      const wallet = requireWallet();
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({
        feePayer: wallet,
        blockhash,
        lastValidBlockHeight,
      }).add(...ixs);
      await simulateOrThrow(connection, tx, label);
      const signed = await signTransaction!(tx);
      // We already simulated above; do not pay for a second RPC preflight.
      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        { skipPreflight: true, maxRetries: 3 }
      );
      const res = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      if (res.value.err) {
        const logs = await txLogs(connection, signature);
        throw new Error(
          `${label} failed on-chain: ${JSON.stringify(res.value.err)}${
            logs ? `\n${logs}` : ""
          }`
        );
      }
    },
    [connection, requireWallet, signTransaction]
  );

  /** ER tx: verify on the rollup, then wallet signs and we submit to the rollup RPC. */
  const sendEr = useCallback(
    async (ixs: TransactionInstruction[], label: string) => {
      const wallet = requireWallet();
      const { blockhash, lastValidBlockHeight } = await er.getLatestBlockhash(
        "confirmed"
      );
      const tx = new Transaction({
        feePayer: wallet,
        blockhash,
        lastValidBlockHeight,
      }).add(...ixs);
      await simulateOrThrow(er, tx, label);
      const signed = await signTransaction!(tx);
      // The ER simulation above is the preflight; skip a duplicate one here.
      const signature = await er.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
      });
      const deadline = Date.now() + 20_000;
      let delay = 300;
      while (Date.now() < deadline) {
        const { value } = await er.getSignatureStatuses([signature]);
        const s = value[0];
        if (s?.err) {
          const logs = await txLogs(er, signature);
          throw new Error(
            `Rollup rejected the transaction: ${JSON.stringify(s.err)}${
              logs ? `\n${logs}` : ""
            }`
          );
        }
        if (
          s &&
          (s.confirmationStatus === "confirmed" ||
            s.confirmationStatus === "finalized")
        )
          return signature;
        await sleep(delay);
        delay = Math.min(1_500, Math.round(delay * 1.7));
      }
      throw new Error(
        "The rollup did not confirm in time. Your bid may still land - refresh before retrying."
      );
    },
    [er, requireWallet, signTransaction]
  );

  const waitOnEr = useCallback(
    async (pda: PublicKey) => {
      const deadline = Date.now() + 15_000;
      let delay = 250;
      while (Date.now() < deadline) {
        if (await er.getAccountInfo(pda, "confirmed")) return;
        await sleep(delay);
        delay = Math.min(1_000, Math.round(delay * 1.7));
      }
      throw new Error(
        "Your account is not visible on the rollup yet. Try again in a few seconds."
      );
    },
    [er]
  );

  /** One wallet approval: create (if missing) + delegate the profile. */
  const ensureProfile = useCallback(
    async (onWalletPrompt?: () => void) => {
      const wallet = requireWallet();
      const key = wallet.toBase58();
      if (profileReady.current === key) return;
      const pda = playerPda(wallet);
      try {
        // Delegated profile? The ER already has it; no Helius or setup needed.
        if ((await isDelegatedOnEr(pda)) === true) {
          await waitOnEr(pda);
          profileReady.current = key;
          return;
        }

        const info = await connection.getAccountInfo(pda, "confirmed");
        if (!info) {
          onWalletPrompt?.();
          await sendBase(
            [ixInitPlayer(wallet), ixDelegatePlayer(wallet, validator)],
            "Profile setup"
          );
        } else if (info.owner.equals(STOCK_WARS_PROGRAM_ID)) {
          onWalletPrompt?.();
          await sendBase(
            [ixDelegatePlayer(wallet, validator)],
            "Profile setup"
          );
        } else if (!info.owner.equals(DELEGATION_PROGRAM_ID)) {
          throw new Error("Unexpected profile account owner.");
        }
        await waitOnEr(pda);
        profileReady.current = key;
      } catch (e) {
        throw friendly(e);
      }
    },
    [connection, er, requireWallet, sendBase, validator, waitOnEr]
  );

  /**
   * One-time base setup per auction. The ER is checked first, so an already
   * delegated lot never touches Helius. Successful lots are cached in memory.
   */
  const ensureLot = useCallback(
    async (listing: number, onWalletPrompt?: () => void) => {
      const wallet = requireWallet();
      const key = `${wallet.toBase58()}:${listing}`;
      if (readyLots.current.has(key)) return;
      const pda = lotPda(wallet, listing);
      try {
        if ((await isDelegatedOnEr(pda)) === true) {
          await waitOnEr(pda);
          readyLots.current.add(key);
          return;
        }

        const info = await connection.getAccountInfo(pda, "confirmed");
        if (!info) {
          onWalletPrompt?.();
          await sendBase(
            [
              ixInitLotBid(wallet, listing),
              ixDelegateLotBid(wallet, listing, validator),
            ],
            "Lot setup"
          );
        } else if (info.owner.equals(STOCK_WARS_PROGRAM_ID)) {
          onWalletPrompt?.();
          await sendBase(
            [ixDelegateLotBid(wallet, listing, validator)],
            "Lot setup"
          );
        } else if (!info.owner.equals(DELEGATION_PROGRAM_ID)) {
          throw new Error("Unexpected bid account owner.");
        }
        await waitOnEr(pda);
        readyLots.current.add(key);
      } catch (e) {
        throw friendly(e);
      }
    },
    [connection, er, requireWallet, sendBase, validator, waitOnEr]
  );

  /** Place/raise a bid on the ER. Resolves only after the rollup confirmed it. */
  const bid = useCallback(
    async (listing: number, amount: number) => {
      const wallet = requireWallet();
      try {
        await sendEr([ixPlaceBid(wallet, listing, amount)], "Bid");
      } catch (e) {
        throw friendly(e);
      }
    },
    [requireWallet, sendEr]
  );

  /**
   * The deployed program allows the lot owner to make the FIRST reveal request
   * (RevealState::None) and only GAME_AUTHORITY to retry while Pending. Read the
   * on-chain state first so a Pending/Done reveal never asks the player to sign
   * a request the program will reject with UnauthorizedAuthority (6000).
   * The server verifies Pending reveals and authority-retries them when stuck.
   */
  const requestReveal = useCallback(
    async (listing: number, onWalletPrompt?: () => void) => {
      const wallet = requireWallet();
      const pda = lotPda(wallet, listing);
      try {
        const info = await er.getAccountInfo(pda, "confirmed");
        if (!info) {
          throw new Error(
            "Your lot is not visible on the rollup yet. Try again in a few seconds."
          );
        }
        const lot = decodeLotBid(info.data);
        if (lot.player !== wallet.toBase58() || lot.listing !== listing) {
          throw new Error("The on-chain lot does not match this wallet/listing.");
        }
        if (lot.reveal !== "none") {
          // Pending is authority-only for retries; Done is read by the server.
          // Either way the player has nothing to approve here.
          return;
        }

        onWalletPrompt?.();
        try {
          await sendEr([ixRequestReveal(wallet, wallet, listing)], "Reveal");
        } catch (e) {
          // Between our read and simulation another request can land. If the
          // lot is now Pending/Done, route it to the server instead of failing.
          const latest = await er.getAccountInfo(pda, "confirmed");
          if (latest && decodeLotBid(latest.data).reveal !== "none") return;
          throw e;
        }
      } catch (e) {
        throw friendly(e);
      }
    },
    [er, requireWallet, sendEr]
  );

  return { ensureProfile, ensureLot, bid, requestReveal };
}
