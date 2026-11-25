"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GameStateResponse } from "../auction/types";
import { getEconomySnapshot } from "../simulation/game-economy";
import type { GoodId, WorldSnapshot } from "../simulation/types";

export type AuctionProfile = {
  walletAddress: string;
  username: string;
};

type ActionFeedback = {
  tone: "working" | "success" | "error";
  message: string;
} | null;

type AuctionContextValue = {
  profile: AuctionProfile;
  data: GameStateResponse | null;
  economy: WorldSnapshot | null;
  loading: boolean;
  error: string | null;
  feedback: ActionFeedback;
  busy: boolean;
  isOpen: boolean;
  selectedLotId: string | null;
  openAuction: (lotId?: string) => void;
  closeAuction: () => void;
  selectLot: (lotId: string | null) => void;
  refresh: (quiet?: boolean) => Promise<void>;
  dismissError: () => void;
  placeBid: (lotId: string, amount: number) => Promise<boolean>;
  revealLot: (lotId: string) => Promise<boolean>;
  sellItem: (itemId: string, buyerId?: string) => Promise<boolean>;
  advanceDay: () => Promise<boolean>;
  fastForwardWeek: () => Promise<boolean>;
  startRumour: (goodId: GoodId) => Promise<boolean>;
  buyGood: (
    goodId: GoodId,
    quantity: number,
    sellerId?: string
  ) => Promise<boolean>;
  sellGood: (
    goodId: GoodId,
    quantity: number,
    buyerId?: string
  ) => Promise<boolean>;
};

const AuctionContext = createContext<AuctionContextValue | null>(null);

const POLL_INTERVAL_MS = 4_500;

async function requestState(
  method: "GET" | "POST",
  body?: Record<string, unknown>
): Promise<GameStateResponse> {
  const response = await fetch("/api/game/state", {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as
    | GameStateResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : "The auction house ledger did not answer."
    );
  }

  if (!payload || !("state" in payload)) {
    throw new Error("The auction house sent an unreadable ledger.");
  }

  return payload;
}

export const AuctionProvider = ({
  profile,
  children,
}: {
  profile: AuctionProfile;
  children: React.ReactNode;
}) => {
  const [data, setData] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);
  const [busy, setBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const inFlight = useRef(false);
  const actionInFlight = useRef(false);
  const mounted = useRef(true);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyPayload = useCallback((payload: GameStateResponse) => {
    if (!mounted.current) return;
    setData(payload);
    setError(null);
  }, []);

  const economy = useMemo(
    () => (data ? getEconomySnapshot(data.state) : null),
    [data]
  );

  const refresh = useCallback(
    async (quiet = false) => {
      if (inFlight.current) {
        return;
      }

      inFlight.current = true;

      try {
        const payload = await requestState("GET");
        applyPayload(payload);
      } catch (caught) {
        if (!quiet && mounted.current) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not reach the auction ledger."
          );
        }
      } finally {
        inFlight.current = false;
        if (mounted.current) {
          setLoading(false);
        }
      }
    },
    [applyPayload]
  );

  useEffect(() => {
    mounted.current = true;
    void refresh();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh(true);
      }
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, [refresh]);

  const runAction = useCallback(
    async (
      body: Record<string, unknown>,
      pendingMessage: string,
      successMessage: string
    ): Promise<boolean> => {
      if (actionInFlight.current) {
        return false;
      }

      actionInFlight.current = true;
      setBusy(true);
      setError(null);
      setFeedback({ tone: "working", message: pendingMessage });

      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }

      try {
        const payload = await requestState("POST", body);
        applyPayload(payload);
        setFeedback({ tone: "success", message: successMessage });
        feedbackTimer.current = setTimeout(() => {
          if (mounted.current) setFeedback(null);
        }, 3_200);
        return true;
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "The auction house rejected that action.";
        setFeedback({ tone: "error", message });
        return false;
      } finally {
        actionInFlight.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [applyPayload]
  );

  const openAuction = useCallback(
    (lotId?: string) => {
      setIsOpen(true);
      if (lotId) {
        setSelectedLotId(lotId);
      }
      void refresh(true);
    },
    [refresh]
  );

  const closeAuction = useCallback(() => {
    setIsOpen(false);
  }, []);

  const placeBid = useCallback(
    (lotId: string, amount: number) =>
      runAction(
        { action: "bid", lotId, amount },
        `Sending a ${amount}c bid…`,
        "Bid recorded. Watch the rival's counter-bid."
      ),
    [runAction]
  );

  const revealLot = useCallback(
    async (lotId: string) => {
      const ok = await runAction(
        { action: "reveal", lotId },
        "Opening the vault…",
        "Vault open. The contents are in your haul."
      );

      if (ok) {
        setTimeout(() => {
          if (mounted.current) {
            void refresh(true);
          }
        }, 3_200);
      }

      return ok;
    },
    [refresh, runAction]
  );

  const sellItem = useCallback(
    (itemId: string, buyerId?: string) =>
      runAction(
        { action: "sell", itemId, buyerId },
        "Finding a dealer…",
        "Deal done. Coins added to your balance."
      ),
    [runAction]
  );

  const advanceDay = useCallback(
    () =>
      runAction(
        { action: "advance-day", expectedDay: data?.state.day },
        "Closing the market…",
        "A new day opens. Market prices have shifted."
      ),
    [data?.state.day, runAction]
  );

  const fastForwardWeek = useCallback(
    () =>
      runAction(
        { action: "fast-forward-week", expectedDay: data?.state.day },
        "Skipping ahead a week…",
        "Seven days pass. The market has moved."
      ),
    [data?.state.day, runAction]
  );

  const startRumour = useCallback(
    (goodId: GoodId) =>
      runAction(
        { action: "start-rumour", goodId },
        "Spreading a storage-lot rumour…",
        "Dealer demand is rising."
      ),
    [runAction]
  );

  const buyGood = useCallback(
    (goodId: GoodId, quantity: number, sellerId?: string) =>
      runAction(
        { action: "buy-good", goodId, quantity, sellerId },
        `Buying ${quantity} ${goodId.toLowerCase()}…`,
        "Goods added to your stall."
      ),
    [runAction]
  );

  const sellGood = useCallback(
    (goodId: GoodId, quantity: number, buyerId?: string) =>
      runAction(
        { action: "sell-good", goodId, quantity, buyerId },
        `Selling ${quantity} ${goodId.toLowerCase()}…`,
        "Goods sold at the market price."
      ),
    [runAction]
  );

  const value = useMemo<AuctionContextValue>(
    () => ({
      profile,
      data,
      economy,
      loading,
      error,
      feedback,
      busy,
      isOpen,
      selectedLotId,
      openAuction,
      closeAuction,
      selectLot: setSelectedLotId,
      refresh,
      dismissError: () => setError(null),
      placeBid,
      revealLot,
      sellItem,
      advanceDay,
      fastForwardWeek,
      startRumour,
      buyGood,
      sellGood,
    }),
    [
      profile,
      data,
      economy,
      loading,
      error,
      feedback,
      busy,
      isOpen,
      selectedLotId,
      openAuction,
      closeAuction,
      refresh,
      placeBid,
      revealLot,
      sellItem,
      advanceDay,
      fastForwardWeek,
      startRumour,
      buyGood,
      sellGood,
    ]
  );

  return (
    <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
  );
};

export function useAuction(): AuctionContextValue {
  const context = useContext(AuctionContext);

  if (!context) {
    throw new Error("useAuction must be used inside an AuctionProvider.");
  }

  return context;
}
