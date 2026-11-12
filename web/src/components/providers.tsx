"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "./auth";
import { WalletProvider } from "./wallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>{children}</AuthProvider>
    </WalletProvider>
  );
}
