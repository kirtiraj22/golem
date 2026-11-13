"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  createInitialWorld,
  fastForwardSevenDays,
  getSnapshot,
  playerBuy,
  playerSell,
  tick,
  triggerGrainRumour,
} from "../simulation/economy";
import type {
  GoodId,
  SimulationState,
  WorldSnapshot,
} from "../simulation/types";

type EconomyContextValue = {
  snapshot: WorldSnapshot;
  error: string | null;
  clearError: () => void;
  endDay: () => void;
  fastForwardWeek: () => void;
  buy: (goodId: GoodId, quantity: number, sellerId?: string) => void;
  sell: (goodId: GoodId, quantity: number, buyerId?: string) => void;
  startRumour: () => void;
};

const EconomyContext = createContext<EconomyContextValue | null>(null);

export const EconomyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // The mutable world stays in a ref. Only immutable snapshots enter React state.
  const worldRef = useRef<SimulationState | null>(null);

  if (worldRef.current === null) {
    worldRef.current = createInitialWorld();
  }

  const [snapshot, setSnapshot] = useState<WorldSnapshot>(() =>
    getSnapshot(worldRef.current as SimulationState)
  );
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const runAction = useCallback((action: () => WorldSnapshot) => {
    try {
      const nextSnapshot = action();
      setSnapshot(nextSnapshot);
      setError(null);
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Unknown simulation error.";

      setError(message);

      // Fast-forward can mutate several days before throwing. Refresh so the
      // UI reflects whatever progress was actually committed.
      if (worldRef.current) {
        setSnapshot(getSnapshot(worldRef.current));
      }
    }
  }, []);

  const endDay = useCallback(() => {
    runAction(() => tick(worldRef.current as SimulationState));
  }, [runAction]);

  const fastForwardWeek = useCallback(() => {
    runAction(() => fastForwardSevenDays(worldRef.current as SimulationState));
  }, [runAction]);

  const buy = useCallback(
    (goodId: GoodId, quantity: number, sellerId?: string) => {
      runAction(() =>
        playerBuy(
          worldRef.current as SimulationState,
          goodId,
          quantity,
          sellerId
        )
      );
    },
    [runAction]
  );

  const sell = useCallback(
    (goodId: GoodId, quantity: number, buyerId?: string) => {
      runAction(() =>
        playerSell(
          worldRef.current as SimulationState,
          goodId,
          quantity,
          buyerId
        )
      );
    },
    [runAction]
  );

  const startRumour = useCallback(() => {
    runAction(() => {
      triggerGrainRumour(worldRef.current as SimulationState);
      return getSnapshot(worldRef.current as SimulationState);
    });
  }, [runAction]);

  return (
    <EconomyContext.Provider
      value={{
        snapshot,
        error,
        clearError,
        endDay,
        fastForwardWeek,
        buy,
        sell,
        startRumour,
      }}
    >
      {children}
    </EconomyContext.Provider>
  );
};

export function useEconomy(): EconomyContextValue {
  const context = useContext(EconomyContext);

  if (!context) {
    throw new Error("useEconomy must be used inside an EconomyProvider.");
  }

  return context;
}
