"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth";
import type { CampaignRow } from "@/lib/solana/api";
import { lamportsToSol } from "@/lib/solana/format";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function Home() {
  const { api } = useAuth();
  const [items, setItems] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listCampaigns({ page: 1, pageSize: 20, sort: "newest" });
        if (alive) setItems(res.items);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load campaigns");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-black/10 p-5 dark:border-white/10">
        <h1 className="text-2xl font-semibold">Human consensus campaigns</h1>
        <p className="mt-2 max-w-3xl text-sm opacity-80">
          Companies fund image classification campaigns with native SOL on Solana Devnet. Participants vote
          <strong> AI-generated</strong> or <strong>Human-created</strong>. Results reflect majority consensus,
          not verified ground truth. Voters who match the majority can claim their share after finalization.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/campaigns/new" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
            Create campaign
          </Link>
          <Link href="/dashboard" className="rounded-md border border-black/10 px-4 py-2 text-sm dark:border-white/15">
            My dashboard
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Listed campaigns</h2>
        {loading ? <p className="text-sm opacity-70">Loading campaigns…</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="text-sm opacity-70">No listed campaigns yet. Create one and fund it to make it visible.</p>
        ) : null}
        <div className="grid gap-3">
          {items.map((c) => (
            <Link
              key={c.campaign_pubkey}
              href={`/campaigns/${c.campaign_pubkey}`}
              className="rounded-xl border border-black/10 p-4 hover:bg-black/[.02] dark:border-white/10 dark:hover:bg-white/[.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{c.title}</h3>
                  <p className="mt-1 text-xs font-mono opacity-60">{c.campaign_pubkey}</p>
                </div>
                <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/15">
                  {c.onchain_status ?? "UNKNOWN"}
                </span>
              </div>
              <div className="mt-3 grid gap-1 text-sm opacity-80 sm:grid-cols-2 lg:grid-cols-4">
                <div>Budget: {lamportsToSol(c.total_budget_lamports ?? 0)} SOL</div>
                <div>Assets: {c.expected_asset_count ?? 0}</div>
                <div>Voting ends: {formatDate(c.voting_deadline)}</div>
                <div>Claims end: {formatDate(c.claim_deadline)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
