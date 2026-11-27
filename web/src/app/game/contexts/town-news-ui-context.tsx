"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type TownNewsUiContextValue = {
  isOpen: boolean;
  openHeadlines: () => void;
  closeHeadlines: () => void;
  toggleHeadlines: () => void;
};

const TownNewsUiContext = createContext<TownNewsUiContextValue | null>(null);

/**
 * Shared with the world input guard so the "N" shortcut behaves like the
 * existing WASD/E handling: text fields always keep their own keystrokes.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  if (!element) {
    return false;
  }

  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable ||
    Boolean(element.closest('[contenteditable="true"], [role="textbox"]'))
  );
}

export const TownNewsUiProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const openHeadlines = useCallback(() => setIsOpen(true), []);
  const closeHeadlines = useCallback(() => setIsOpen(false), []);
  const toggleHeadlines = useCallback(
    () => setIsOpen((open) => !open),
    []
  );

  // N opens the bulletin and, like a newspaper fold, closes it again.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTextEntryTarget(event.target) ||
        event.key.toLowerCase() !== "n"
      ) {
        return;
      }

      event.preventDefault();
      toggleHeadlines();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleHeadlines]);

  // Mantine's Modal also handles Escape; this keeps the shortcut reliable when
  // focus sits on a custom control inside the bulletin.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }

      event.preventDefault();
      closeHeadlines();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeHeadlines]);

  const value = useMemo(
    () => ({ isOpen, openHeadlines, closeHeadlines, toggleHeadlines }),
    [isOpen, openHeadlines, closeHeadlines, toggleHeadlines]
  );

  return (
    <TownNewsUiContext.Provider value={value}>
      {children}
    </TownNewsUiContext.Provider>
  );
};

export function useTownNewsUi(): TownNewsUiContextValue {
  const context = useContext(TownNewsUiContext);

  if (!context) {
    throw new Error(
      "useTownNewsUi must be used inside a TownNewsUiProvider."
    );
  }

  return context;
}
