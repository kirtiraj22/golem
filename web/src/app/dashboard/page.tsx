"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth";
import { useWallet } from "@/components/wallet";
import type { CampaignRow } from "@/lib/solana/api";
import { lamportsToSol } from "@/lib/solana/format";

export default function DashboardPage() {
  const { address } = useWallet();
  const { api, signedIn, signIn, profile, loading } = useAuth();
  const [loadedCampaigns, setLoadedCampaigns] = useState<CampaignRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    const id = setTimeout(() => {
      void (async () => {
        setBusy(true);
        setError(null);
        try {
          const res = await api.myCampaigns(1, 50);
          if (alive) setLoadedCampaigns(res.items);
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : "Failed to load campaigns");
        } finally {
          if (alive) setBusy(false);
        }
      })();
    }, 0);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [api, signedIn]);

  const campaigns = signedIn ? loadedCampaigns : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm opacity-80">Manage campaigns you created and track on-chain state from each campaign page.</p>
      </div>

      <section className="rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
        <h2 className="font-medium">Wallet & session</h2>
        <div className="mt-2 space-y-1 opacity-85">
          <div>Connected wallet: {address ?? "Not connected"}</div>
          <div>Signed in: {signedIn ? `Yes (${profile?.wallet_address ?? address ?? ""})` : "No"}</div>
        </div>
        {address && !signedIn ? (
          <button type="button" disabled={loading} onClick={() => void signIn()}
            className="mt-3 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50">
            Sign in
          </button>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">My campaigns</h2>
          <Link href="/campaigns/new" className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15">New campaign</Link>
        </div>
        {!signedIn ? <p className="text-sm opacity-70">Sign in to load campaigns owned by your wallet.</p> : null}
        {busy ? <p className="text-sm opacity-70">Loading…</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {signedIn && !busy && !error && campaigns.length === 0 ? (
          <p className="text-sm opacity-70">No campaigns found for this wallet. Create a campaign to get started.</p>
        ) : null}
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <Link key={c.campaign_pubkey} href={`/campaigns/${c.campaign_pubkey}`}
              className="rounded-xl border border-black/10 p-4 hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.03]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="mt-1 break-all font-mono text-xs opacity-60">{c.campaign_pubkey}</div>
                </div>
                <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/15">
                  {c.onchain_status ?? "DRAFT"}
                </span>
              </div>
              <div className="mt-2 grid gap-1 text-sm opacity-80 sm:grid-cols-3">
                <div>Budget: {lamportsToSol(c.total_budget_lamports ?? 0)} SOL</div>
                <div>Assets: {c.expected_asset_count ?? 0}</div>
                <div>Listed: {c.is_listed ? "Yes" : "No (draft/funding state)"}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
        <h2 className="font-medium">Participant actions</h2>
        <p className="mt-2 opacity-80">
          To vote or claim rewards, open a listed campaign and connect the wallet you want to use. Votes, results, and
          claims are verified from Solana account state on-chain. Golem reports majority human consensus, not verified
          ground truth.
        </p>
      </section>
    </div>
  );
}
