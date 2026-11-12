"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { GolemApi, sessionTokenStore, type ProfileRow } from "@/lib/solana/api";
import { useWallet } from "./wallet";

type AuthState = {
  api: GolemApi;
  signedIn: boolean;
  wallet: string | null;
  profile: ProfileRow | null;
  loading: boolean;
  error: string | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, address } = useWallet();
  const [api] = useState(() => new GolemApi(sessionTokenStore()));

  const [signedIn, setSignedIn] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!api.isSignedIn()) {
      setProfile(null);
      setSignedIn(false);
      setWallet(null);
      return;
    }
    try {
      const { profile: p } = await api.getMyProfile();
      setProfile(p);
      setSignedIn(true);
      setWallet(p.wallet_address);
    } catch {
      await api.signOut().catch(() => {});
      setProfile(null);
      setSignedIn(false);
      setWallet(null);
    }
  }, [api]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await refreshProfile();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [refreshProfile]);

  useEffect(() => {
    if (!address || !wallet || wallet === address) return;
    void api.signOut().finally(() => {
      setSignedIn(false);
      setWallet(null);
      setProfile(null);
    });
  }, [address, wallet, api]);

  const signIn = useCallback(async () => {
    if (!publicKey) throw new Error("Connect a wallet first");
    setLoading(true);
    setError(null);
    try {
      const result = await api.signIn(publicKey, signMessage);
      setSignedIn(true);
      setWallet(result.wallet);
      await refreshProfile();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign-in failed";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage, api, refreshProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await api.signOut();
    } finally {
      setSignedIn(false);
      setWallet(null);
      setProfile(null);
      setLoading(false);
    }
  }, [api]);

  const value = useMemo<AuthState>(() => ({
    api,
    signedIn,
    wallet,
    profile,
    loading,
    error,
    signIn,
    signOut,
    refreshProfile,
  }), [api, signedIn, wallet, profile, loading, error, signIn, signOut, refreshProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
