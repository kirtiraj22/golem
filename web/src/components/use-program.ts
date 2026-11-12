"use client";

import { useMemo } from "react";

import { createProgram, type GolemProgram } from "@/lib/solana/program";
import { useWallet } from "./wallet";

export function useProgram(): GolemProgram | null {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  return useMemo(() => {
    if (!publicKey) return null;
    try {
      return createProgram({
        publicKey,
        signTransaction,
        signAllTransactions,
      });
    } catch {
      return null;
    }
  }, [publicKey, signTransaction, signAllTransactions]);
}
