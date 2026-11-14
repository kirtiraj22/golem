"use client";
import React, { createContext, useEffect, useState } from "react";
import { SPRITESHEET_IMAGE_SRC } from "~/constants/helpers";
import RenderLevel from "./components/level-layout/render-level";
import MarketHud from "./components/hud/market-hud";
import { EconomyProvider } from "./contexts/economy-context";
import { MarketUiProvider } from "./contexts/market-ui-context";
import soundManager from "./classes/sounds";

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
};

const Game = ({ levelConfig, showLegacyHud = false }: GameProps = {}) => {
  return (
    <GameProvider>
      <EconomyProvider>
        <MarketUiProvider>
          <RenderLevel
            levelConfig={levelConfig}
            showLegacyHud={showLegacyHud}
          />
          <MarketHud />
        </MarketUiProvider>
      </EconomyProvider>
    </GameProvider>
  );
};

export default Game;
