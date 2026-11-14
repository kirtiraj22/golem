"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export type GameClock = {
  dayProgress: number;
  minutes: number;
  timeLabel: string;
  msUntilDayEnd: number;
};

type EconomyContextValue = {
  snapshot: WorldSnapshot;
  clock: GameClock;
  error: string | null;
  clearError: () => void;
  endDay: () => void;
  fastForwardWeek: () => void;
  buy: (goodId: GoodId, quantity: number, sellerId?: string) => void;
  sell: (goodId: GoodId, quantity: number, buyerId?: string) => void;
  startRumour: () => void;
};

const EconomyContext = createContext<EconomyContextValue | null>(null);

// A full market day runs from 06:00 to 22:00. Sixty seconds keeps the world
// visibly alive without turning every routine into a blur.
const DAY_LENGTH_MS = 60_000;
const CLOCK_UPDATE_INTERVAL_MS = 500;
const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 22 * 60;

function createClock(dayProgress: number): GameClock {
  const progress = Math.min(Math.max(dayProgress, 0), 0.9999);
  const totalMinutes =
    DAY_START_MINUTES + progress * (DAY_END_MINUTES - DAY_START_MINUTES);
  const minutes = Math.floor(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const minuteOfHour = Math.floor(minutes % 60);

  return {
    dayProgress: progress,
    minutes,
    timeLabel: `${String(hours).padStart(2, "0")}:${String(
      minuteOfHour
    ).padStart(2, "0")}`,
    msUntilDayEnd: Math.max(0, Math.round((1 - progress) * DAY_LENGTH_MS)),
  };
}

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
  const [clock, setClock] = useState<GameClock>(() => createClock(0));
  const dayProgressRef = useRef(0);
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

  const resetClock = useCallback(() => {
    dayProgressRef.current = 0;
    setClock(createClock(0));
  }, []);

  const advanceSimulationDay = useCallback(() => {
    runAction(() => tick(worldRef.current as SimulationState));
    resetClock();
  }, [resetClock, runAction]);

  const endDay = advanceSimulationDay;

  useEffect(() => {
    let previousUpdate = performance.now();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        previousUpdate = performance.now();
        return;
      }

      const now = performance.now();
      const elapsedMs = now - previousUpdate;
      previousUpdate = now;

      const nextProgress = dayProgressRef.current + elapsedMs / DAY_LENGTH_MS;

      if (nextProgress >= 1) {
        advanceSimulationDay();
        return;
      }

      dayProgressRef.current = nextProgress;
      setClock(createClock(nextProgress));
    }, CLOCK_UPDATE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [advanceSimulationDay]);

  const fastForwardWeek = useCallback(() => {
    runAction(() => fastForwardSevenDays(worldRef.current as SimulationState));
    resetClock();
  }, [resetClock, runAction]);

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
        clock,
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
