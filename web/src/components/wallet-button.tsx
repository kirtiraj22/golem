"use client";

import { useState } from "react";

import { useAuth } from "./auth";
import { useWallet } from "./wallet";

function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { available, address, connecting, connect, disconnect, error } = useWallet();
  const { signedIn, signIn, signOut, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSignIn() {
    setBusy(true);
    setMsg(null);
    try {
      await signIn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setMsg(null);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  if (!address) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void connect()}
          disabled={connecting}
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
        {!available ? <span className="text-xs opacity-70">Install a Solana wallet</span> : null}
        {error ? <span className="text-xs text-red-500">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-mono dark:border-white/15">
        {short(address)}
      </span>
      {signedIn ? (
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={busy || loading}
          className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 disabled:opacity-50"
        >
          Sign out
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={busy || loading}
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Signing…" : "Sign in"}
        </button>
      )}
      <button
        type="button"
        onClick={() => void disconnect()}
        className="text-xs underline opacity-70"
      >
        Disconnect
      </button>
      {msg ? <span className="text-xs text-red-500">{msg}</span> : null}
    </div>
  );
}
