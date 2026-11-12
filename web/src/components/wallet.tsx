"use client";

import { PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Signable = Transaction | VersionedTransaction;

type InjectedWallet = {
  publicKey?: { toBase58(): string } | PublicKey | null;
  isConnected?: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: { toBase58(): string } } | void>;
  disconnect(): Promise<void>;
  signTransaction?<T extends Signable>(tx: T): Promise<T>;
  signAllTransactions?<T extends Signable>(txs: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array } | Uint8Array>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
};

function detectWallet(): InjectedWallet | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const phantom = (w.phantom as Record<string, unknown> | undefined)?.solana as InjectedWallet | undefined;
  return (
    phantom ??
    (w.solflare as InjectedWallet | undefined) ??
    (w.backpack as InjectedWallet | undefined) ??
    (w.solana as InjectedWallet | undefined) ??
    null
  );
}

function toPublicKey(value: unknown): PublicKey | null {
  if (!value) return null;
  if (value instanceof PublicKey) return value;
  try {
    const text = (value as { toBase58?: () => string }).toBase58?.();
    return text ? new PublicKey(text) : null;
  } catch {
    return null;
  }
}

export type WalletState = {
  wallet: InjectedWallet | null;
  publicKey: PublicKey | null;
  address: string | null;
  connecting: boolean;
  error: string | null;
  available: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction<T extends Signable>(tx: T): Promise<T>;
  signAllTransactions<T extends Signable>(txs: T[]): Promise<T[]>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
};

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [detected, setDetected] = useState<InjectedWallet | null>(null);
  const [wallet, setWallet] = useState<InjectedWallet | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = detectWallet();
      setDetected(next);
      setWallet(next);
      setAvailable(!!next);
      if (next?.isConnected !== false) {
        setPublicKey(toPublicKey(next?.publicKey ?? null));
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!detected) return;
    const onConnect = (pk?: unknown) => {
      setPublicKey(toPublicKey(pk ?? detected.publicKey));
      setError(null);
    };
    const onDisconnect = () => setPublicKey(null);
    const onAccount = (pk?: unknown) => setPublicKey(pk ? toPublicKey(pk) : null);
    detected.on?.("connect", onConnect);
    detected.on?.("disconnect", onDisconnect);
    detected.on?.("accountChanged", onAccount);
    void detected.connect({ onlyIfTrusted: true }).then((res) => {
      const pk = toPublicKey((res as { publicKey?: unknown } | void)?.publicKey ?? detected.publicKey);
      if (pk) setPublicKey(pk);
    }).catch(() => {});
    return () => {
      detected.off?.("connect", onConnect);
      detected.off?.("disconnect", onDisconnect);
      detected.off?.("accountChanged", onAccount);
    };
  }, [detected]);

  const connect = useCallback(async () => {
    const next = detectWallet();
    if (!next) {
      setError("No Solana wallet found. Install Phantom or another compatible wallet.");
      setAvailable(false);
      return;
    }
    setWallet(next);
    setAvailable(true);
    setConnecting(true);
    setError(null);
    try {
      const res = await next.connect();
      const pk = toPublicKey((res as { publicKey?: unknown } | void)?.publicKey ?? next.publicKey);
      if (!pk) throw new Error("Wallet did not provide a public key");
      setPublicKey(pk);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await wallet?.disconnect();
    } finally {
      setPublicKey(null);
    }
  }, [wallet]);

  const signTransaction = useCallback(async <T extends Signable>(tx: T): Promise<T> => {
    if (!wallet?.signTransaction) throw new Error("Connected wallet cannot sign transactions");
    return wallet.signTransaction(tx);
  }, [wallet]);

  const signAllTransactions = useCallback(async <T extends Signable>(txs: T[]): Promise<T[]> => {
    if (wallet?.signAllTransactions) return wallet.signAllTransactions(txs);
    if (!wallet?.signTransaction) throw new Error("Connected wallet cannot sign transactions");
    const out: T[] = [];
    for (const tx of txs) out.push(await wallet.signTransaction(tx));
    return out;
  }, [wallet]);

  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!wallet?.signMessage) throw new Error("Connected wallet cannot sign messages");
    const result = await wallet.signMessage(message, "utf8");
    if (result instanceof Uint8Array) return result;
    return result.signature;
  }, [wallet]);

  const value = useMemo<WalletState>(() => ({
    wallet,
    publicKey,
    address: publicKey?.toBase58() ?? null,
    connecting,
    error,
    available,
    connect,
    disconnect,
    signTransaction,
    signAllTransactions,
    signMessage,
  }), [wallet, publicKey, connecting, error, available, connect, disconnect, signTransaction, signAllTransactions, signMessage]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
