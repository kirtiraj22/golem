"use client";

import { PublicKey } from "@solana/web3.js";
import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth";
import { useProgram } from "@/components/use-program";
import { useWallet } from "@/components/wallet";
import type { AssetRow, CampaignRow } from "@/lib/solana/api";
import {
  claimFlow,
  closeFlow,
  finalizeFlow,
  fundFlow,
  refundFlow,
  uploadAndRegisterAsset,
  voteFlow,
} from "@/lib/solana/client";
import { claimableReward, fetchCampaignWithAssets, fetchParticipantVotes } from "@/lib/solana/fetch";
import { lamportsToSol } from "@/lib/solana/format";
import { findAssetPda } from "@/lib/solana/pda";
import { createConnection } from "@/lib/solana/program";
import type { Classification, OnchainAsset, OnchainCampaign, OnchainVote } from "@/lib/types";

function fmtUnix(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

function statusTone(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE": return "border-green-600/30 text-green-700 dark:text-green-400";
    case "CLOSED": return "border-amber-600/30 text-amber-700 dark:text-amber-400";
    case "SETTLED": return "border-blue-600/30 text-blue-700 dark:text-blue-400";
    default: return "border-black/15 dark:border-white/15";
  }
}

function resultLabel(result: string) {
  switch (result) {
    case "AI_GENERATED": return "AI-generated (majority)";
    case "HUMAN_CREATED": return "Human-created (majority)";
    case "TIE": return "Tie";
    case "INSUFFICIENT_VOTES": return "Insufficient votes";
    default: return "Pending";
  }
}

function CampaignContent({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = use(params);
  const campaignPk = useMemo(() => {
    try { return new PublicKey(pubkey); } catch { return null; }
  }, [pubkey]);
  const { api, signedIn } = useAuth();
  const { address } = useWallet();
  const program = useProgram();
  const connection = useMemo(() => createConnection(), []);

  const [metadata, setMetadata] = useState<CampaignRow | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [chain, setChain] = useState<{ campaign: OnchainCampaign; assets: OnchainAsset[] } | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [assetsMeta, setAssetsMeta] = useState<AssetRow[]>([]);
  const [votes, setVotes] = useState<Map<number, OnchainVote>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setClock(Math.floor(Date.now() / 1000)), 0);
    return () => clearTimeout(id);
  }, [chain]);

  const loadMetadata = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const res = await api.getCampaign(pubkey);
      setMetadata(res.campaign);
      setCompanyName(res.company?.display_name ?? res.company?.wallet_address ?? null);
    } catch (e) {
      setMetaError(e instanceof Error ? e.message : "Failed to load campaign metadata");
      setMetadata(null);
    } finally {
      setMetaLoading(false);
    }
  }, [api, pubkey]);

  const loadChain = useCallback(async () => {
    if (!campaignPk) return;
    setChainError(null);
    try {
      const state = await fetchCampaignWithAssets(connection, campaignPk);
      setChain(state);
      if (state && address) {
        try {
          const participant = new PublicKey(address);
          const assetKeys = state.assets.map((asset) => findAssetPda(campaignPk, asset.assetIndex)[0]);
          setVotes(await fetchParticipantVotes(connection, state.assets, participant, assetKeys));
        } catch {
          setVotes(new Map());
        }
      } else {
        setVotes(new Map());
      }
    } catch (e) {
      setChainError(e instanceof Error ? e.message : "Failed to load on-chain state");
    }
  }, [campaignPk, connection, address]);

  const loadAssetsMeta = useCallback(async () => {
    try {
      const res = await api.listAssets(pubkey);
      setAssetsMeta(res.items);
    } catch {
      setAssetsMeta([]);
    }
  }, [api, pubkey]);

  const refresh = useCallback(async () => {
    await Promise.all([loadMetadata(), loadChain(), loadAssetsMeta()]);
  }, [loadMetadata, loadChain, loadAssetsMeta]);

  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setActionError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(`${label} completed. On-chain state refreshed.`);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  }

  if (!campaignPk) return <p className="text-sm text-red-500">Invalid campaign address.</p>;

  const onchain = chain?.campaign ?? null;
  const isOwner = !!address && !!onchain && onchain.company === address;
  const now = clock;
  const canFund = isOwner && onchain?.status === "DRAFT" && onchain.registeredAssetCount === onchain.expectedAssetCount;
  const canClose = !!onchain && onchain.status === "ACTIVE" && (isOwner || now >= onchain.votingDeadline);
  const canFinalize = !!onchain && (onchain.status === "CLOSED" || (onchain.status === "ACTIVE" && now >= onchain.votingDeadline));
  const canRefund = isOwner && onchain?.status === "CLOSED" && now > onchain.claimDeadline && onchain.finalizedAssetCount === onchain.expectedAssetCount;

  const metaByIndex = new Map(assetsMeta.map((a) => [a.asset_index, a]));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-black/10 p-5 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{metadata?.title ?? (metaLoading ? "Loading…" : "Campaign")}</h1>
            <p className="mt-1 break-all font-mono text-xs opacity-60">{pubkey}</p>
            {companyName ? <p className="mt-1 text-sm opacity-75">Company: {companyName}</p> : null}
          </div>
          <span className={`rounded-full border px-2 py-1 text-xs ${statusTone(onchain?.status)}`}>
            On-chain: {onchain?.status ?? "not found"}
          </span>
        </div>
        {metadata?.description ? <p className="mt-3 text-sm opacity-85">{metadata.description}</p> : null}
        {metaError ? <p className="mt-2 text-sm text-red-500">Metadata: {metaError}{!signedIn ? " (sign in if this is your draft)" : ""}</p> : null}
        {chainError ? <p className="mt-2 text-sm text-red-500">On-chain: {chainError}</p> : null}
        <p className="mt-3 text-xs opacity-65">Results show majority human consensus on-chain, not verified ground truth.</p>
      </div>

      {onchain ? (
        <div className="grid gap-3 rounded-xl border border-black/10 p-4 text-sm dark:border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          <div><span className="opacity-65">Budget</span><div className="font-medium">{lamportsToSol(onchain.totalBudget)} SOL</div></div>
          <div><span className="opacity-65">Assets</span><div className="font-medium">{onchain.registeredAssetCount}/{onchain.expectedAssetCount} registered</div></div>
          <div><span className="opacity-65">Finalized</span><div className="font-medium">{onchain.finalizedAssetCount}/{onchain.expectedAssetCount}</div></div>
          <div><span className="opacity-65">Min votes</span><div className="font-medium">{onchain.minVotes}</div></div>
          <div><span className="opacity-65">Voting ends</span><div className="font-medium">{fmtUnix(onchain.votingDeadline)}</div></div>
          <div><span className="opacity-65">Claims end</span><div className="font-medium">{fmtUnix(onchain.claimDeadline)}</div></div>
          <div><span className="opacity-65">Total claimed</span><div className="font-medium">{lamportsToSol(onchain.totalClaimed)} SOL</div></div>
          <div><span className="opacity-65">Role</span><div className="font-medium">{!address ? "No wallet" : isOwner ? "Company owner" : "Participant/visitor"}</div></div>
        </div>
      ) : !chainError ? <p className="text-sm opacity-70">Loading on-chain state…</p> : null}

      {notice ? <p className="rounded-md border border-green-600/30 bg-green-500/5 p-3 text-sm text-green-700 dark:text-green-300">{notice}</p> : null}
      {actionError ? <p className="rounded-md border border-red-600/30 bg-red-500/5 p-3 text-sm text-red-600">{actionError}</p> : null}

      {isOwner && onchain?.status === "DRAFT" ? (
        <section className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
          <h2 className="font-medium">Upload & register asset</h2>
          <p className="text-sm opacity-75">Uploads to storage, computes SHA-256, then registers the hash on-chain sequentially. Do this for each image in order.</p>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm" />
            <button type="button" disabled={!file || !program || !signedIn || !!busy}
              onClick={() => file && program && run("Upload/register asset", async () => { await uploadAndRegisterAsset(program, api, campaignPk, file); setFile(null); })}
              className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50">
              {busy === "Upload/register asset" ? "Working…" : "Upload & register"}
            </button>
          </div>
          {canFund ? (
            <button type="button" disabled={!program || !!busy}
              onClick={() => program && run("Fund campaign", async () => { await fundFlow(program, api, campaignPk); })}
              className="rounded-md border border-green-600/40 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 disabled:opacity-50">
              {busy === "Fund campaign" ? "Funding…" : `Fund ${lamportsToSol(onchain.totalBudget)} SOL escrow`}
            </button>
          ) : (
            <p className="text-xs opacity-65">Funding unlocks when all {onchain.expectedAssetCount} assets are registered on-chain.</p>
          )}
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {canClose ? (
          <button type="button" disabled={!program || !!busy}
            onClick={() => program && run("Close campaign", async () => { await closeFlow(program, api, campaignPk); })}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 disabled:opacity-50">
            {busy === "Close campaign" ? "Closing…" : "Close campaign"}
          </button>
        ) : null}
        {canFinalize && chain && chain.assets.some((a) => !a.finalized) ? (
          <button type="button" disabled={!program || !!busy}
            onClick={() => program && run("Finalize assets", async () => {
              const pending = chain.assets.filter((a) => !a.finalized).map((a) => a.assetIndex);
              await finalizeFlow(program, api, campaignPk, pending);
            })}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 disabled:opacity-50">
            {busy === "Finalize assets" ? "Finalizing…" : "Finalize pending assets"}
          </button>
        ) : null}
        {canRefund ? (
          <button type="button" disabled={!program || !!busy}
            onClick={() => program && run("Refund campaign", async () => { await refundFlow(program, api, campaignPk); })}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 disabled:opacity-50">
            {busy === "Refund campaign" ? "Refunding…" : "Refund remaining escrow"}
          </button>
        ) : null}
        <button type="button" disabled={!!busy} onClick={() => void refresh()}
          className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 disabled:opacity-50">
          Refresh
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Assets (on-chain authoritative)</h2>
        {!chain ? <p className="text-sm opacity-70">No on-chain campaign loaded.</p> : null}
        {chain && chain.assets.length === 0 ? <p className="text-sm opacity-70">No assets registered on-chain yet.</p> : null}
        <div className="grid gap-4">
          {chain?.assets.map((asset) => {
            const meta = metaByIndex.get(asset.assetIndex);
            const myVote = votes.get(asset.assetIndex) ?? null;
            const reward = claimableReward(asset, myVote);
            const canVote = !!program && onchain?.status === "ACTIVE" && now < onchain.votingDeadline && !myVote;
            const canClaim = !!program && !!onchain && onchain.status === "CLOSED" && asset.finalized && now <= onchain.claimDeadline && reward > 0 && !myVote?.claimed;
            return (
              <article key={asset.assetIndex} className="grid gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10 md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-lg border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.03]">
                  {meta?.image_url ? (
                    <img src={meta.image_url} alt={meta.caption || `Asset ${asset.assetIndex}`} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-xs opacity-60">
                      {signedIn ? "No image metadata" : "Sign in to view metadata/images"}
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">Asset #{asset.assetIndex}</h3>
                    <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/15">
                      {resultLabel(asset.result)}
                    </span>
                    {asset.finalized ? <span className="text-xs text-green-700 dark:text-green-400">Finalized</span> : <span className="text-xs opacity-60">Not finalized</span>}
                  </div>
                  <p className="break-all font-mono text-xs opacity-55">Hash: {asset.contentHash}</p>
                  <div className="grid gap-1 opacity-85 sm:grid-cols-2 lg:grid-cols-3">
                    <div>AI votes: {asset.aiVotes}</div>
                    <div>Human votes: {asset.humanVotes}</div>
                    <div>Total: {asset.totalVotes}</div>
                    <div>Winning votes: {asset.winningVotes}</div>
                    <div>Reward pool: {lamportsToSol(asset.rewardPool)} SOL</div>
                    <div>Claimed: {lamportsToSol(asset.totalClaimed)} SOL</div>
                  </div>
                  <div className="text-xs opacity-75">
                    Your vote: {myVote ? `${myVote.classification}${myVote.claimed ? " (claimed)" : ""}` : address ? "None found on-chain" : "Connect wallet"}
                    {reward > 0 ? ` · Claimable: ${lamportsToSol(reward)} SOL` : ""}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canVote ? (
                      <>
                        <button type="button" disabled={!!busy} className="rounded-md border border-black/15 px-3 py-1.5 text-xs dark:border-white/15 disabled:opacity-50"
                          onClick={() => program && run(`Vote AI #${asset.assetIndex}`, async () => { await voteFlow(program, api, campaignPk, asset.assetIndex, "AI_GENERATED" as Classification); })}>
                          Vote AI-generated
                        </button>
                        <button type="button" disabled={!!busy} className="rounded-md border border-black/15 px-3 py-1.5 text-xs dark:border-white/15 disabled:opacity-50"
                          onClick={() => program && run(`Vote Human #${asset.assetIndex}`, async () => { await voteFlow(program, api, campaignPk, asset.assetIndex, "HUMAN_CREATED" as Classification); })}>
                          Vote Human-created
                        </button>
                      </>
                    ) : null}
                    {canClaim ? (
                      <button type="button" disabled={!!busy} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
                        onClick={() => program && run(`Claim #${asset.assetIndex}`, async () => { await claimFlow(program, api, campaignPk, asset.assetIndex); })}>
                        Claim reward
                      </button>
                    ) : null}
                    {!asset.finalized && canFinalize ? (
                      <button type="button" disabled={!!busy || !program} className="rounded-md border border-black/15 px-3 py-1.5 text-xs dark:border-white/15 disabled:opacity-50"
                        onClick={() => program && run(`Finalize #${asset.assetIndex}`, async () => { await finalizeFlow(program, api, campaignPk, [asset.assetIndex]); })}>
                        Finalize
                      </button>
                    ) : null}
                  </div>
                  {!signedIn && onchain?.status !== "DRAFT" ? <p className="text-xs opacity-55">Sign in to use the API session where required; voting/claiming transactions are signed by your wallet.</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}


export default function CampaignPage({ params }: { params: Promise<{ pubkey: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm opacity-70">Loading campaign…</p>}>
      <CampaignContent params={params} />
    </Suspense>
  );
}
