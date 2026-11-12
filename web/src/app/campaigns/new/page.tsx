"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth";
import { useProgram } from "@/components/use-program";
import { useWallet } from "@/components/wallet";
import { createCampaignFlow } from "@/lib/solana/client";
import { solToLamports } from "@/lib/solana/format";

function toUnixSeconds(local: string): number {
  const ms = new Date(local).getTime();
  if (Number.isNaN(ms)) throw new Error("Invalid date");
  return Math.floor(ms / 1000);
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { address } = useWallet();
  const { signedIn, signIn, api } = useAuth();
  const program = useProgram();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetSol, setBudgetSol] = useState("0.1");
  const [assetCount, setAssetCount] = useState("3");
  const [minVotes, setMinVotes] = useState("1");
  const [votingDeadline, setVotingDeadline] = useState("");
  const [claimDeadline, setClaimDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const [minVoting, setMinVoting] = useState("");
  useEffect(() => {
    const id = setTimeout(() => {
      const d = new Date(Date.now() + 30 * 60 * 1000);
      setMinVoting(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxSig(null);
    try {
      if (!address) throw new Error("Connect a wallet first");
      if (!signedIn) {
        await signIn();
      }
      if (!program) throw new Error("Wallet is not ready to sign transactions");
      if (title.trim().length < 3) throw new Error("Title must be at least 3 characters");

      const expectedAssetCount = Number(assetCount);
      if (!Number.isInteger(expectedAssetCount) || expectedAssetCount < 1 || expectedAssetCount > 500) {
        throw new Error("Asset count must be between 1 and 500");
      }
      const totalBudgetLamports = solToLamports(budgetSol);
      if (totalBudgetLamports < BigInt(expectedAssetCount)) {
        throw new Error("Budget must be at least 1 lamport per asset");
      }
      const minVotesNum = BigInt(minVotes);
      if (minVotesNum < 1n) throw new Error("Minimum votes must be at least 1");

      const voting = toUnixSeconds(votingDeadline);
      const claim = toUnixSeconds(claimDeadline);
      const now = Math.floor(Date.now() / 1000);
      if (voting <= now) throw new Error("Voting deadline must be in the future");
      if (claim <= voting) throw new Error("Claim deadline must be after the voting deadline");

      setBusy(true);
      const result = await createCampaignFlow(program, api, {
        title: title.trim(),
        description: description.trim() || null,
        expectedAssetCount,
        totalBudgetLamports,
        minVotes: minVotesNum,
        votingDeadline: voting,
        claimDeadline: claim,
      });
      setTxSig(result.signature);
      router.push(`/campaigns/${result.campaign.toBase58()}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Create campaign</h1>
        <p className="mt-1 text-sm opacity-80">
          Creates a draft campaign on Solana Devnet. You will upload/register images and fund the escrow after creation.
          Escrow uses native SOL only.
        </p>
      </div>
      {!address ? <p className="text-sm text-amber-600">Connect your wallet to continue.</p> : null}
      {address && !signedIn ? <p className="text-sm text-amber-600">Sign in after connecting so campaign metadata can be saved.</p> : null}
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-black/10 p-4 dark:border-white/10">
        <label className="block text-sm">
          <span className="font-medium">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120}
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={3}
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Budget (SOL)</span>
            <input value={budgetSol} onChange={(e) => setBudgetSol(e.target.value)} required inputMode="decimal"
              className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Asset count</span>
            <input value={assetCount} onChange={(e) => setAssetCount(e.target.value)} required type="number" min={1} max={500}
              className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Min votes / asset</span>
            <input value={minVotes} onChange={(e) => setMinVotes(e.target.value)} required type="number" min={1}
              className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Voting deadline</span>
            <input value={votingDeadline} onChange={(e) => setVotingDeadline(e.target.value)} required type="datetime-local" min={minVoting}
              className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Claim deadline</span>
            <input value={claimDeadline} onChange={(e) => setClaimDeadline(e.target.value)} required type="datetime-local" min={votingDeadline || minVoting}
              className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15" />
          </label>
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {txSig ? <p className="break-all text-xs opacity-70">Transaction: {txSig}</p> : null}
        <button type="submit" disabled={busy || !address}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">
          {busy ? "Creating on Solana…" : "Create campaign"}
        </button>
      </form>
    </div>
  );
}
