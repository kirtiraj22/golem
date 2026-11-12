import type { PublicKey } from "@solana/web3.js";

import type { Tables } from "@/lib/db/database.types";
import type { AnalyticsResponse } from "@/lib/solana/api-types";

import { toBase64 } from "./format";

export type CampaignRow = Tables<"campaign_metadata">;
export type AssetRow = Tables<"asset_metadata"> & { image_url: string | null };
export type ProfileRow = Tables<"profiles">;
export type TransactionRow = Tables<"chain_transactions">;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type IndexResponse = {
  signature: string;
  indexed: number;
  skipped: number;
  campaigns: string[];
  syncErrors: { campaign: string; message: string }[];
  slot: number;
  blockTime: string | null;
  instructions: {
    index: number;
    name: string;
    campaign: string;
    asset: string | null;
    wallet: string;
    amountLamports: number | null;
  }[];
};

export type UploadedAsset = {
  asset: AssetRow;
  assetIndex: number;
  contentHash: string;
  contentHashBytes: number[];
};

export type CreateCampaignBody = {
  signature: string;
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
};

export type ListCampaignsParams = {
  status?: "ACTIVE" | "CLOSED" | "SETTLED";
  category?: string;
  tag?: string;
  company?: string;
  q?: string;
  sort?: "newest" | "deadline" | "budget";
  page?: number;
  pageSize?: number;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type TokenStore = {
  get(): string | null;
  set(token: string | null): void;
};

export function memoryTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    get: () => token,
    set: (value) => {
      token = value;
    },
  };
}

export function sessionTokenStore(key = "golem.session"): TokenStore {
  let fallback: string | null = null;
  return {
    get() {
      try {
        return window.sessionStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(value) {
      fallback = value;
      try {
        if (value) window.sessionStorage.setItem(key, value);
        else window.sessionStorage.removeItem(key);
      } catch {
        return;
      }
    },
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryNotFound<T>(task: () => Promise<T>, attempts = 6): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      last = error;
      if (!(error instanceof ApiClientError) || error.status !== 404) throw error;
      await delay(1500);
    }
  }
  throw last;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export class GolemApi {
  private readonly tokens: TokenStore;
  private readonly baseUrl: string;

  constructor(tokens: TokenStore = memoryTokenStore(), baseUrl = "") {
    this.tokens = tokens;
    this.baseUrl = baseUrl;
  }

  isSignedIn(): boolean {
    return this.tokens.get() !== null;
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown; form?: FormData; auth?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.tokens.get();
    if (init.auth !== false && token) headers.authorization = `Bearer ${token}`;
    let body: BodyInit | undefined;
    if (init.form) {
      body = init.form;
    } else if (init.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(init.body);
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers,
      body,
    });
    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const failure = (parsed as { error?: { code?: string; message?: string; details?: unknown } } | null)
        ?.error;
      if (response.status === 401) this.tokens.set(null);
      throw new ApiClientError(
        response.status,
        failure?.code ?? "request_failed",
        failure?.message ?? `Request failed with status ${response.status}`,
        failure?.details,
      );
    }
    return parsed as T;
  }

  async signIn(
    wallet: PublicKey,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  ): Promise<{ wallet: string; expiresAt: string }> {
    const address = wallet.toBase58();
    const challenge = await this.request<{ nonce: string; message: string }>(
      "/api/auth/challenge",
      { method: "POST", body: { wallet: address }, auth: false },
    );
    const signature = await signMessage(new TextEncoder().encode(challenge.message));
    const session = await this.request<{ token: string; expiresAt: string; wallet: string }>(
      "/api/auth/verify",
      {
        method: "POST",
        body: { wallet: address, nonce: challenge.nonce, signature: toBase64(signature) },
        auth: false,
      },
    );
    this.tokens.set(session.token);
    return { wallet: session.wallet, expiresAt: session.expiresAt };
  }

  async signOut(): Promise<void> {
    try {
      await this.request<{ ok: true }>("/api/auth/logout", { method: "POST" });
    } finally {
      this.tokens.set(null);
    }
  }

  getMyProfile() {
    return this.request<{ profile: ProfileRow }>("/api/profiles/me");
  }

  updateMyProfile(body: {
    display_name?: string | null;
    bio?: string | null;
    website_url?: string | null;
  }) {
    return this.request<{ profile: ProfileRow }>("/api/profiles/me", {
      method: "PUT",
      body,
    });
  }

  getProfile(wallet: string) {
    return this.request<{
      profile: Pick<ProfileRow, "wallet_address" | "display_name" | "bio" | "website_url" | "created_at">;
    }>(`/api/profiles/${wallet}`, { auth: false });
  }

  listCampaigns(params: ListCampaignsParams = {}) {
    return this.request<Paginated<CampaignRow>>(
      `/api/campaigns${query({ ...params })}`,
      { auth: false },
    );
  }

  myCampaigns(page = 1, pageSize = 20) {
    return this.request<Paginated<CampaignRow>>(
      `/api/campaigns/mine${query({ page, pageSize })}`,
    );
  }

  getCampaign(pubkey: string) {
    return this.request<{
      campaign: CampaignRow;
      company: Pick<ProfileRow, "wallet_address" | "display_name" | "website_url"> | null;
    }>(`/api/campaigns/${pubkey}`);
  }

  createCampaign(body: CreateCampaignBody) {
    return retryNotFound(() =>
      this.request<{ campaign: CampaignRow }>("/api/campaigns", {
        method: "POST",
        body,
      }),
    );
  }

  updateCampaign(
    pubkey: string,
    body: {
      title?: string;
      description?: string | null;
      category?: string | null;
      tags?: string[];
    },
  ) {
    return this.request<{ campaign: CampaignRow }>(`/api/campaigns/${pubkey}`, {
      method: "PATCH",
      body,
    });
  }

  syncCampaign(pubkey: string) {
    return this.request<{ campaign: CampaignRow; throttled: boolean }>(
      `/api/campaigns/${pubkey}/sync`,
      { method: "POST" },
    );
  }

  listAssets(pubkey: string) {
    return this.request<{ items: AssetRow[] }>(`/api/campaigns/${pubkey}/assets`);
  }

  uploadAsset(pubkey: string, file: File, caption?: string) {
    const form = new FormData();
    form.set("file", file);
    if (caption) form.set("caption", caption);
    return this.request<UploadedAsset>(`/api/campaigns/${pubkey}/assets`, {
      method: "POST",
      form,
    });
  }

  confirmAssetRegistration(pubkey: string, assetIndex: number, signature: string) {
    return retryNotFound(() =>
      this.request<{ asset: AssetRow }>(
        `/api/campaigns/${pubkey}/assets/${assetIndex}`,
        { method: "POST", body: { signature } },
      ),
    );
  }

  deleteAsset(pubkey: string, assetIndex: number) {
    return this.request<{ ok: true }>(
      `/api/campaigns/${pubkey}/assets/${assetIndex}`,
      { method: "DELETE" },
    );
  }

  listTransactions(
    pubkey: string,
    params: { instruction?: string; wallet?: string; page?: number; pageSize?: number } = {},
  ) {
    return this.request<Paginated<TransactionRow>>(
      `/api/campaigns/${pubkey}/transactions${query({ ...params })}`,
    );
  }

  getAnalytics(pubkey: string) {
    return this.request<AnalyticsResponse>(`/api/campaigns/${pubkey}/analytics`);
  }

  async downloadAnalyticsCsv(pubkey: string): Promise<string> {
    const token = this.tokens.get();
    const response = await fetch(
      `${this.baseUrl}/api/campaigns/${pubkey}/analytics?format=csv`,
      { headers: token ? { authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) {
      throw new ApiClientError(response.status, "request_failed", "CSV export failed");
    }
    return response.text();
  }

  verifyTransaction(signature: string) {
    return retryNotFound(() =>
      this.request<IndexResponse>("/api/transactions/verify", {
        method: "POST",
        body: { signature },
        auth: false,
      }),
    );
  }
}