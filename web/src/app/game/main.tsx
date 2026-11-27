"use client";
import React, { createContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SPRITESHEET_IMAGE_SRC } from "~/constants/helpers";
import RenderLevel from "./components/level-layout/render-level";
import MarketHud from "./components/hud/market-hud";
import AuctionHud from "./components/hud/auction-hud";
import { AuctionProvider, type AuctionProfile } from "./contexts/auction-context";
import { MarketUiProvider } from "./contexts/market-ui-context";
import { TownNewsUiProvider } from "./contexts/town-news-ui-context";
import { WorldClockProvider } from "./contexts/world-clock-context";
import TownHeadlines from "./components/hud/town-headlines";
import soundManager from "./classes/sounds";

const SolanaProvider = dynamic(
  () => import("~/app/onboarding/solana-provider"),
  { ssr: false }
);

interface SpriteSheetImage {
  image: HTMLImageElement | null;
}

soundManager.init();

type GameProviderProps = { children: React.ReactNode };

export const GameContext = createContext<SpriteSheetImage>({
  image: null,
});

const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [spriteSheetImage, setSpriteSheetImage] =
    useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new Image();
    image.src = SPRITESHEET_IMAGE_SRC;
    image.onload = () => setSpriteSheetImage(image);

    // Cleanup function to avoid memory leaks
    return () => {
      image.onload = null;
    };
  }, []);

  if (!spriteSheetImage) {
    return null;
  }

  return (
    <GameContext.Provider value={{ image: spriteSheetImage }}>
      {children}
    </GameContext.Provider>
  );
};

type GameProps = {
  levelConfig?: any;
  showLegacyHud?: boolean;
  playerProfile: AuctionProfile;
};

const Game = ({
  levelConfig,
  showLegacyHud = false,
  playerProfile,
}: GameProps) => {
  return (
    <GameProvider>
      <SolanaProvider autoConnect>
        <AuctionProvider profile={playerProfile}>
          <WorldClockProvider>
            <MarketUiProvider>
              <TownNewsUiProvider>
                <RenderLevel
                  levelConfig={levelConfig}
                  showLegacyHud={showLegacyHud}
                />
                <MarketHud />
                {!showLegacyHud && <AuctionHud />}
                <TownHeadlines />
              </TownNewsUiProvider>
            </MarketUiProvider>
          </WorldClockProvider>
        </AuctionProvider>
      </SolanaProvider>
    </GameProvider>
  );
};

export default Game;
