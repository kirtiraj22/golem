"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type MarketUiContextValue = {
  isOpen: boolean;
  selectedMerchantId: string;
  openMarket: (merchantId?: string) => void;
  closeMarket: () => void;
  selectMerchant: (merchantId: string) => void;
};

const MarketUiContext = createContext<MarketUiContextValue | null>(null);

export const MarketUiProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState("pawnbroker");

  const openMarket = useCallback((merchantId?: string) => {
    if (merchantId) {
      setSelectedMerchantId(merchantId);
    }
    setIsOpen(true);
  }, []);

  const closeMarket = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectMerchant = useCallback((merchantId: string) => {
    setSelectedMerchantId(merchantId);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      selectedMerchantId,
      openMarket,
      closeMarket,
      selectMerchant,
    }),
    [isOpen, selectedMerchantId, openMarket, closeMarket, selectMerchant]
  );

  return (
    <MarketUiContext.Provider value={value}>
      {children}
    </MarketUiContext.Provider>
  );
};

export function useMarketUi(): MarketUiContextValue {
  const context = useContext(MarketUiContext);

  if (!context) {
    throw new Error("useMarketUi must be used inside a MarketUiProvider.");
  }

  return context;
}
