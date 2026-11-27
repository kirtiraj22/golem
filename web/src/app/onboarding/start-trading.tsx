"use client";

import { WalletError, type WalletName } from "@solana/wallet-adapter-base";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { useWalletModal, WalletIcon } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { PlayerProfile } from "~/lib/auth/types";
import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername,
} from "~/lib/auth/username";

const INK = "#2b1a08";
const PAPER = "#fff6d6";
const PAPER_LIGHT = "#fffdf0";
const GOLD = "#f4c95d";
const GREEN = "#a8d98a";
const RED = "#8f2f1f";

const NAME_STORAGE_KEY = "stock-wars:onboarding-name";
// LEGACY DISABLED: keep reading the old key so existing players do not lose
// their saved display name during the rebrand.
const LEGACY_NAME_STORAGE_KEY = "copper-stall:onboarding-name";

type WalletState =
  | "detecting"
  | "unavailable"
  | "disconnected"
  | "connecting"
  | "connected";

type FlowStatus =
  | "idle"
  | "checking-session"
  | "signing"
  | "verifying";

type ApiJson = {
  error?: string;
  message?: string;
  nonce?: string;
  profile?: PlayerProfile | null;
};

type StartTradingProps = {
  fontFamily: string;
  initialOpen?: boolean;
};

const primaryButtonStyle: CSSProperties = {
  backgroundColor: GOLD,
  borderColor: INK,
  boxShadow: `4px 4px 0 ${INK}`,
  color: INK,
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const secondaryButtonStyle: CSSProperties = {
  backgroundColor: PAPER_LIGHT,
  borderColor: INK,
  boxShadow: `3px 3px 0 ${INK}`,
  color: INK,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const walletButtonStyle: CSSProperties = {
  backgroundColor: PAPER_LIGHT,
  borderColor: INK,
  boxShadow: `3px 3px 0 ${INK}`,
  color: INK,
  fontSize: 12,
  letterSpacing: "0.08em",
};

const inputStyle: CSSProperties = {
  backgroundColor: PAPER_LIGHT,
  border: `3px solid ${INK}`,
  color: INK,
  fontSize: 16,
  letterSpacing: "0.04em",
  outline: "none",
  padding: "12px 14px",
  width: "100%",
};

const sectionLabelStyle: CSSProperties = {
  color: INK,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.16em",
  marginBottom: 8,
  textTransform: "uppercase",
};

const bodyTextStyle: CSSProperties = {
  color: INK,
  fontSize: 11,
  letterSpacing: "0.04em",
  lineHeight: 1.6,
};

async function readJson(response: Response): Promise<ApiJson | null> {
  try {
    return (await response.json()) as ApiJson;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  // Wallet signatures are 64 bytes, so a simple indexed loop is both safe and
  // sufficient here. It also avoids Uint8Array spread, which the project's ES5
  // TypeScript target cannot downlevel.
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary);
}

function getWalletErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof WalletError) {
    const cause =
      error.error && typeof error.error === "object"
        ? (error.error as { code?: unknown; message?: unknown })
        : null;
    const causeMessage =
      typeof cause?.message === "string" ? cause.message : "";

    if (
      cause?.code === 4001 ||
      cause?.code === "4001" ||
      /user rejected|rejected the request|cancell?ed/i.test(causeMessage)
    ) {
      return "The request was rejected in your wallet.";
    }

    if (causeMessage) {
      return causeMessage;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export default function StartTrading({
  fontFamily,
  initialOpen = false,
}: StartTradingProps) {
  const router = useRouter();
  const {
    wallets,
    wallet,
    publicKey,
    connected,
    connecting,
    select,
    connect,
    disconnect,
    signMessage,
  } = useWallet();
  const { visible: walletModalVisible, setVisible: setWalletModalVisible } =
    useWalletModal();

  const [open, setOpen] = useState(Boolean(initialOpen));
  const [pendingWalletName, setPendingWalletName] =
    useState<WalletName | null>(null);
  const [detectionSettled, setDetectionSettled] = useState(false);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sessionCheckStartedRef = useRef(false);
  const startInFlightRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const sessionEndPromiseRef = useRef<Promise<void> | null>(null);
  const lastWalletAddressRef = useRef<string | null>(null);
  const connectAttemptRef = useRef<WalletName | null>(null);
  const walletAtModalOpenRef = useRef<WalletName | null | undefined>(undefined);

  const walletAddress = publicKey?.toBase58() ?? null;
  const walletState: WalletState =
    connecting || pendingWalletName
      ? "connecting"
      : connected && walletAddress
        ? "connected"
        : wallets.length > 0
          ? "disconnected"
          : detectionSettled
            ? "unavailable"
            : "detecting";

  const endServerSession = useCallback(async () => {
    if (sessionEndPromiseRef.current) {
      return sessionEndPromiseRef.current;
    }

    const request = (async () => {
      try {
        await fetch("/api/auth/session", {
          method: "DELETE",
          credentials: "same-origin",
        });
      } catch {
        // The browser cookie is cleared on the response. If the request cannot
        // reach the server, the token will expire on its own.
      }
    })().finally(() => {
      sessionEndPromiseRef.current = null;
    });

    sessionEndPromiseRef.current = request;

    return request;
  }, []);

  // Wallet Standard discovery is asynchronous. Give it a short window before
  // showing the "no wallet detected" state.
  useEffect(() => {
    const timer = window.setTimeout(() => setDetectionSettled(true), 600);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const savedName =
      window.sessionStorage.getItem(NAME_STORAGE_KEY) ??
      window.sessionStorage.getItem(LEGACY_NAME_STORAGE_KEY);

    if (savedName) {
      setName(savedName);
    }
  }, []);

  useEffect(() => {
    if (name) {
      window.sessionStorage.setItem(NAME_STORAGE_KEY, name);
      window.sessionStorage.removeItem(LEGACY_NAME_STORAGE_KEY);
    }
  }, [name]);

  // If a signed session already exists, offer a direct continue path. The
  // server cookie is the source of truth; this is only a UI hint.
  useEffect(() => {
    if (!open || sessionCheckStartedRef.current) {
      return;
    }

    sessionCheckStartedRef.current = true;
    setStatus("checking-session");

    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await readJson(response);

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          sessionCheckStartedRef.current = false;

          if (response.status === 503) {
            setError(
              data?.error ??
                "Supabase is not configured on the server. Add the onboarding environment variables."
            );
          }
          return;
        }

        if (data?.profile) {
          setProfile(data.profile);
          setName(data.profile.username);
          setNotice(`Welcome back, ${data.profile.username}.`);
        }
      } catch {
        sessionCheckStartedRef.current = false;
        setError("Could not check for an existing player session.");
      } finally {
        setStatus("idle");
      }
    };

    void checkSession();
  }, [open]);

  // Clear local profile state and the server session when the wallet
  // disconnects or switches accounts.
  useEffect(() => {
    const nextAddress = publicKey?.toBase58() ?? null;
    const previousAddress = lastWalletAddressRef.current;
    lastWalletAddressRef.current = nextAddress;

    if (previousAddress === null || previousAddress === nextAddress) {
      return;
    }

    setProfile(null);
    setError(null);
    setNotice(
      nextAddress
        ? "Wallet account changed. Sign in again to continue."
        : "Wallet disconnected."
    );
    void endServerSession();
  }, [publicKey, endServerSession]);

  // A session cookie belongs to the wallet that signed it. If a different
  // wallet is connected, drop the stale profile view and require a new sign-in.
  useEffect(() => {
    if (!profile || !walletAddress || profile.wallet_address === walletAddress) {
      return;
    }

    setProfile(null);
    setNotice("Wallet account changed. Sign in again to continue.");
    void endServerSession();
  }, [profile, walletAddress, endServerSession]);

  // Connect once the selected adapter is active. This keeps selection and
  // connection in the wallet-adapter lifecycle instead of calling injected
  // providers directly.
  useEffect(() => {
    if (
      !pendingWalletName ||
      !wallet ||
      wallet.adapter.name !== pendingWalletName
    ) {
      return;
    }

    if (connectAttemptRef.current === pendingWalletName) {
      return;
    }

    connectAttemptRef.current = pendingWalletName;

    const run = async () => {
      try {
        await connect();
        setNotice(
          "Wallet connected. Sign in to create or load your player profile."
        );
      } catch (connectError) {
        setError(
          getWalletErrorMessage(connectError, "Could not connect to the wallet.")
        );
      } finally {
        setPendingWalletName(null);
        connectAttemptRef.current = null;
      }
    };

    void run();
  }, [pendingWalletName, wallet, connect]);

  // Safety net for a selection that never resolves to an adapter.
  useEffect(() => {
    if (!pendingWalletName || wallet) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingWalletName((current) =>
        current === pendingWalletName ? null : current
      );
      setError("Could not select that wallet. Please try again.");
    }, 500);

    return () => window.clearTimeout(timer);
  }, [pendingWalletName, wallet]);

  // If a wallet was chosen from the standard wallet-adapter modal, connect it
  // after the modal closes.
  useEffect(() => {
    if (walletModalVisible) {
      return;
    }

    const walletAtOpen = walletAtModalOpenRef.current;

    if (walletAtOpen === undefined) {
      return;
    }

    walletAtModalOpenRef.current = undefined;

    if (
      wallet &&
      wallet.adapter.name !== walletAtOpen &&
      !connected &&
      !connecting
    ) {
      setPendingWalletName(wallet.adapter.name);
    }
  }, [walletModalVisible, wallet, connected, connecting]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      if (profile) {
        continueButtonRef.current?.focus();
      } else {
        nameInputRef.current?.focus();
      }
    }, 50);

    return () => window.clearTimeout(focusTimer);
  }, [open, profile]);

  const usernameError = validateUsername(name);
  const nameError = nameTouched ? usernameError : null;
  const isBusy = status !== "idle" || walletState === "connecting";
  const canStart =
    Boolean(profile) ||
    (walletState === "connected" &&
      Boolean(walletAddress) &&
      !usernameError);

  const requestWalletConnection = useCallback(
    (walletName: WalletName) => {
      setError(null);
      setNotice(null);
      setPendingWalletName(walletName);

      if (wallet?.adapter.name !== walletName) {
        select(walletName);
      }
    },
    [select, wallet]
  );

  const handleConnect = (candidate: Wallet) => {
    requestWalletConnection(candidate.adapter.name);
  };

  const handleOpenWalletModal = () => {
    walletAtModalOpenRef.current = wallet?.adapter.name ?? null;
    setWalletModalVisible(true);
  };

  const handleDisconnect = async () => {
    setProfile(null);
    setError(null);
    setNotice("Wallet disconnected.");

    try {
      await disconnect();
    } catch {
      // The local state is already cleared.
    }

    await endServerSession();
  };

  const handleUseDifferentWallet = async () => {
    setProfile(null);
    setError(null);
    setNotice(null);

    try {
      await disconnect();
    } catch {
      // The local state is already cleared.
    }

    await endServerSession();
  };

  const handleStart = async () => {
    if (isBusy || startInFlightRef.current) {
      return;
    }

    setNameTouched(true);
    setError(null);
    setNotice(null);

    const validationError = validateUsername(name);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (profile) {
      router.push("/game");
      return;
    }

    if (!connected || !walletAddress) {
      setError("Connect a Solana wallet before starting the game.");
      return;
    }

    if (!signMessage) {
      setError("This wallet does not support message signing.");
      return;
    }

    const username = normalizeUsername(name);
    startInFlightRef.current = true;

    try {
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, username }),
      });
      const challengeData = await readJson(challengeResponse);

      if (!challengeResponse.ok) {
        throw new Error(
          challengeData?.error ?? "Could not start wallet sign-in."
        );
      }

      if (!challengeData?.message || !challengeData.nonce) {
        throw new Error("The server returned an invalid sign-in challenge.");
      }

      setStatus("signing");

      const signature = await signMessage(
        new TextEncoder().encode(challengeData.message)
      );

      if (!signature) {
        throw new Error("The wallet did not return a message signature.");
      }

      setStatus("verifying");

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          nonce: challengeData.nonce,
          username,
          signature: bytesToBase64(signature),
        }),
      });
      const verifyData = await readJson(verifyResponse);

      if (!verifyResponse.ok) {
        throw new Error(
          verifyData?.error ?? "Could not verify your wallet signature."
        );
      }

      if (!verifyData?.profile) {
        throw new Error("The server did not return a player profile.");
      }

      setProfile(verifyData.profile);
      setName(verifyData.profile.username);
      router.push("/game");
    } catch (startError) {
      setError(getWalletErrorMessage(startError, "Could not start the game."));
    } finally {
      startInFlightRef.current = false;
      setStatus("idle");
    }
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isBusy) {
      setOpen(false);
    }
  };

  const busyLabel =
    status === "checking-session"
      ? "Checking your saved session…"
      : status === "signing"
        ? "Waiting for the wallet signature…"
        : status === "verifying"
          ? "Verifying the wallet signature…"
          : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-7 inline-flex min-h-[58px] items-center justify-center border-4 px-8 py-3 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2b1a08] focus-visible:ring-offset-4 focus-visible:ring-offset-[#fff6d6]"
        style={{
          ...primaryButtonStyle,
          boxShadow: `5px 5px 0 ${INK}`,
          fontFamily,
          fontSize: "clamp(0.8rem, 1.5vw, 1rem)",
          letterSpacing: "0.14em",
        }}
      >
        Start Trading
      </button>

      {open && (
        <div
          className="onboarding-panel fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-[rgba(28,18,8,0.78)] px-4 py-8 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          tabIndex={-1}
          onKeyDown={handleOverlayKeyDown}
        >
          <section
            className="relative w-full max-w-[560px] border-[6px] p-5 sm:p-7"
            style={{
              backgroundColor: PAPER,
              borderColor: INK,
              boxShadow: `8px 8px 0 ${INK}`,
              color: INK,
              fontFamily,
              letterSpacing: "0.03em",
            }}
          >
            <button
              type="button"
              aria-label="Close onboarding"
              onClick={() => setOpen(false)}
              disabled={isBusy}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border-2 text-lg leading-none transition-colors hover:bg-[#f4c95d] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: INK, color: INK }}
            >
              ×
            </button>

            <p
              style={{
                ...sectionLabelStyle,
                marginBottom: 6,
                opacity: 0.7,
              }}
            >
              Player onboarding
            </p>

            <h2
              id="onboarding-title"
              className="pr-10"
              style={{
                color: INK,
                fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                letterSpacing: "0.06em",
                lineHeight: 1.2,
                textTransform: "uppercase",
              }}
            >
              {profile ? "Welcome back" : "Enter the auction"}
            </h2>

            <p className="mt-2" style={bodyTextStyle}>
              {profile
                ? "Your wallet session is already verified. Continue into the existing game world."
                : "Choose a player name, connect your Solana wallet, and sign a short message to create or load your player profile."}
            </p>

            {error && (
              <div
                className="mt-4 border-[3px] px-3 py-2"
                role="alert"
                style={{
                  backgroundColor: "#fff0e8",
                  borderColor: RED,
                  color: RED,
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {notice && !error && (
              <div
                className="mt-4 border-[3px] px-3 py-2"
                role="status"
                style={{
                  backgroundColor: "#eef7e3",
                  borderColor: INK,
                  color: INK,
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  lineHeight: 1.5,
                }}
              >
                {notice}
              </div>
            )}

            {profile ? (
              <div className="mt-5">
                <div
                  className="border-[3px] p-3"
                  style={{
                    backgroundColor: PAPER_LIGHT,
                    borderColor: INK,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p style={sectionLabelStyle}>Player</p>
                      <p
                        style={{
                          color: INK,
                          fontSize: 18,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {profile.username}
                      </p>
                    </div>
                    <span
                      className="border-2 px-2 py-1"
                      style={{
                        backgroundColor: GREEN,
                        borderColor: INK,
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Verified
                    </span>
                  </div>

                  <p className="mt-3" style={sectionLabelStyle}>
                    Wallet
                  </p>
                  <p
                    style={{
                      color: INK,
                      fontFamily: "monospace",
                      fontSize: 11,
                      letterSpacing: "0.02em",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {profile.wallet_address}
                  </p>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    ref={continueButtonRef}
                    type="button"
                    onClick={() => void handleStart()}
                    disabled={isBusy}
                    className="inline-flex min-h-[52px] flex-1 items-center justify-center border-4 px-5 py-3 transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ ...primaryButtonStyle, fontFamily }}
                  >
                    Continue to game
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUseDifferentWallet()}
                    disabled={isBusy}
                    className="inline-flex min-h-[52px] items-center justify-center border-[3px] px-4 py-3 transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ ...secondaryButtonStyle, fontFamily }}
                  >
                    Use a different wallet
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <label
                  htmlFor="trader-name"
                  style={sectionLabelStyle}
                  className="block"
                >
                  Player name
                </label>
                <input
                  ref={nameInputRef}
                  id="trader-name"
                  name="trader-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => setNameTouched(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canStart && !isBusy) {
                      event.preventDefault();
                      void handleStart();
                    }
                  }}
                  maxLength={USERNAME_MAX_LENGTH}
                  autoComplete="nickname"
                  spellCheck={false}
                  placeholder="e.g. CopperFox"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby="trader-name-help"
                  className="focus-visible:ring-4 focus-visible:ring-[#f4c95d]"
                  style={{
                    ...inputStyle,
                    borderColor: nameError ? RED : INK,
                    fontFamily,
                  }}
                />
                <p
                  id="trader-name-help"
                  className="mt-2"
                  style={{
                    color: nameError ? RED : INK,
                    fontSize: 10,
                    letterSpacing: "0.04em",
                    lineHeight: 1.5,
                    opacity: nameError ? 1 : 0.72,
                  }}
                >
                  {nameError ??
                    `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters. Letters, numbers, spaces, _ or -.`}
                </p>

                <div className="mt-5">
                  <p style={sectionLabelStyle}>Solana wallet</p>

                  {walletState === "detecting" && (
                    <p style={bodyTextStyle}>Looking for a Solana wallet…</p>
                  )}

                  {walletState === "unavailable" && (
                    <div
                      className="border-[3px] p-3"
                      style={{
                        backgroundColor: PAPER_LIGHT,
                        borderColor: INK,
                      }}
                    >
                      <p style={bodyTextStyle}>
                        No Solana wallet detected. Install Phantom or Solflare,
                        then retry detection.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href="https://phantom.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[36px] items-center justify-center border-2 px-3 py-2"
                          style={{
                            ...secondaryButtonStyle,
                            boxShadow: `2px 2px 0 ${INK}`,
                            fontFamily,
                            textDecoration: "none",
                          }}
                        >
                          Get Phantom
                        </a>
                        <a
                          href="https://solflare.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[36px] items-center justify-center border-2 px-3 py-2"
                          style={{
                            ...secondaryButtonStyle,
                            boxShadow: `2px 2px 0 ${INK}`,
                            fontFamily,
                            textDecoration: "none",
                          }}
                        >
                          Get Solflare
                        </a>
                      </div>
                    </div>
                  )}

                  {(walletState === "disconnected" ||
                    walletState === "connecting") &&
                    wallets.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {wallets.map((candidate) => {
                          const isPending =
                            pendingWalletName === candidate.adapter.name;

                          return (
                            <button
                              key={candidate.adapter.name}
                              type="button"
                              onClick={() => handleConnect(candidate)}
                              disabled={walletState === "connecting"}
                              className="flex min-h-[46px] w-full items-center justify-between gap-3 border-[3px] px-3 py-2 text-left transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                              style={{
                                ...walletButtonStyle,
                                borderColor: INK,
                                fontFamily,
                              }}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <WalletIcon
                                  wallet={candidate}
                                  alt=""
                                  className="h-5 w-5 shrink-0"
                                  style={{ imageRendering: "pixelated" }}
                                />
                                <span className="truncate">
                                  {isPending
                                    ? `Opening ${candidate.adapter.name}…`
                                    : `Connect ${candidate.adapter.name}`}
                                </span>
                              </span>
                              <span
                                aria-hidden
                                style={{ fontSize: 14, lineHeight: 1 }}
                              >
                                →
                              </span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleOpenWalletModal}
                          disabled={walletState === "connecting"}
                          className="inline-flex min-h-[34px] items-center justify-center border-2 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            ...secondaryButtonStyle,
                            boxShadow: `2px 2px 0 ${INK}`,
                            fontFamily,
                          }}
                        >
                          More wallet options
                        </button>
                      </div>
                    )}

                  {walletState === "connected" && walletAddress && (
                    <div
                      className="border-[3px] p-3"
                      style={{
                        backgroundColor: "#eef7e3",
                        borderColor: INK,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p
                            style={{
                              color: INK,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                            }}
                          >
                            Connected
                          </p>
                          <p
                            title={walletAddress}
                            style={{
                              color: INK,
                              fontFamily: "monospace",
                              fontSize: 11,
                              letterSpacing: "0.02em",
                              marginTop: 2,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {walletAddress}
                          </p>
                        </div>
                        <span
                          className="border-2 px-2 py-1"
                          style={{
                            backgroundColor: GREEN,
                            borderColor: INK,
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Ready
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDisconnect()}
                        disabled={isBusy}
                        className="mt-3 inline-flex min-h-[34px] items-center justify-center border-2 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          ...secondaryButtonStyle,
                          boxShadow: `2px 2px 0 ${INK}`,
                          fontFamily,
                        }}
                      >
                        Disconnect wallet
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={!canStart || isBusy}
                  className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center border-4 px-5 py-3 transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ ...primaryButtonStyle, fontFamily }}
                >
                  {busyLabel ?? "Start Game"}
                </button>

                <p
                  className="mt-3 text-center"
                  style={{
                    color: INK,
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    lineHeight: 1.5,
                    opacity: 0.65,
                    textTransform: "uppercase",
                  }}
                >
                  Wallet connection is required. There is no guest mode.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
