import Link from "next/link";

import { WalletButton } from "./wallet-button";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Golem
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/" className="opacity-80 hover:opacity-100">Campaigns</Link>
              <Link href="/campaigns/new" className="opacity-80 hover:opacity-100">Create</Link>
              <Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
            </nav>
          </div>
          <WalletButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-xs opacity-60">
        Golem measures human consensus on Solana Devnet (native SOL). Majority results are not verified ground truth.
      </footer>
    </div>
  );
}
