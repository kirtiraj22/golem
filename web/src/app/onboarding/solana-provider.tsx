"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useMemo, type ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

const DEFAULT_RPC_ENDPOINT = "https://api.devnet.solana.com";

type SolanaProviderProps = {
  children: ReactNode;
};

/**
 * Client-only Solana wallet stack. `wallets={[]}` enables Wallet Standard
 * auto-discovery, so Phantom, Solflare, Backpack, and other standard wallets
 * are picked up without importing the full wallet-adapter bundle.
 */
export default function SolanaProvider({ children }: SolanaProviderProps) {
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || DEFAULT_RPC_ENDPOINT,
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
