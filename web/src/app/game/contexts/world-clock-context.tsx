"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuction } from "./auction-context";

export type GameClock = {
  dayProgress: number;
  minutes: number;
  timeLabel: string;
  msUntilDayEnd: number;
};

type WorldClockContextValue = {
  clock: GameClock;
};

const WorldClockContext = createContext<WorldClockContextValue | null>(null);

// Cosmetic clock for NPC routines and HUD labels. When a day completes, the
// client only asks the server to advance; all simulation mutations still run
// inside the authoritative day action.
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

export const WorldClockProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [dayProgress, setDayProgress] = useState(0);
  const progressRef = useRef(0);
  const { advanceDay, data } = useAuction();
  const advanceDayRef = useRef(advanceDay);
  const canAdvanceRef = useRef(Boolean(data));
  const serverDayRef = useRef<number | undefined>(data?.state.day);

  advanceDayRef.current = advanceDay;
  canAdvanceRef.current = Boolean(data);

  // Manual advances and other tabs can move the server day at any moment. Keep
  // the cosmetic clock aligned so it does not immediately request another day.
  useEffect(() => {
    const serverDay = data?.state.day;

    if (serverDay === undefined) {
      return;
    }

    if (
      serverDayRef.current !== undefined &&
      serverDayRef.current !== serverDay
    ) {
      progressRef.current = 0;
      setDayProgress(0);
    }

    serverDayRef.current = serverDay;
  }, [data?.state.day]);

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

      const nextProgress = progressRef.current + elapsedMs / DAY_LENGTH_MS;

      if (nextProgress >= 1) {
        progressRef.current = 0;
        setDayProgress(0);

        if (canAdvanceRef.current) {
          void advanceDayRef.current();
        }

        return;
      }

      progressRef.current = nextProgress;
      setDayProgress(nextProgress);
    }, CLOCK_UPDATE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const clock = useMemo(() => createClock(dayProgress), [dayProgress]);

  return (
    <WorldClockContext.Provider value={{ clock }}>
      {children}
    </WorldClockContext.Provider>
  );
};

export function useWorldClock(): WorldClockContextValue {
  const context = useContext(WorldClockContext);

  if (!context) {
    throw new Error("useWorldClock must be used inside a WorldClockProvider.");
  }

  return context;
}
