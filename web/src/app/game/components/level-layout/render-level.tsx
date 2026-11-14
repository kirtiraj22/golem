import { LevelThemes, THEME_BACKGROUNDS } from "~/constants/helpers";
import LevelBackgroundTilesLayer from "./level-backround-tiles-layer";
import PreviewTerrainLayer from "./preview-terrain-layer";
import { Fragment, useEffect, useRef, useState } from "react";
import LevelState from "../../classes/level-state";
import level1 from "../../levels/level-1";
import { useMarketUi } from "../../contexts/market-ui-context";
import { useEconomy } from "../../contexts/economy-context";
import type { TradeLogEntry } from "../../simulation/types";
import LevelCompleteMessage from "../hud/level-complete-message";
import DeathMessage from "../hud/death-message";
import TopHud from "../hud/top-hud";
import WorldClock from "../hud/world-clock";
import MarketActivityFeed from "../hud/market-activity-feed";
import RenderBattle from "./render-battle";
import Dialog from "../hud/dialog";
import Body from "../object-graphics/body";
import { TILES } from "~/constants/tiles";
import Image from "next/image";
import Journal from "../ui/journal";
import journalEntry from "../../classes/journal-entry";

type RenderLevelProps = {
  levelConfig?: any;
  showLegacyHud?: boolean;
};

const RenderLevel = ({
  levelConfig = level1,
  showLegacyHud = false,
}: RenderLevelProps) => {
  const [level, setLevel] = useState<any>(null);
  const levelStateRef = useRef<LevelState | null>(null);
  const { isOpen: isMarketOpen, openMarket } = useMarketUi();
  const { snapshot, clock } = useEconomy();
  const snapshotRef = useRef(snapshot);
  const clockRef = useRef(clock);
  const lastTradeIdRef = useRef(0);

  snapshotRef.current = snapshot;
  clockRef.current = clock;

  useEffect(() => {
    const levelState = new LevelState(
      (newState) => {
        setLevel(newState);
      },
      levelConfig,
      (merchantId) => openMarket(merchantId)
    );

    levelStateRef.current = levelState;
    levelState.setGameClock(clockRef.current.minutes, snapshotRef.current.day);
    levelState.setMerchantStates(snapshotRef.current.merchants);

    setLevel(levelState.getState());

    return () => {
      levelState.destroy();
      levelStateRef.current = null;
    };
  }, [levelConfig, openMarket]);

  useEffect(() => {
    levelStateRef.current?.setGameClock(clock.minutes, snapshot.day);
  }, [clock.minutes, snapshot.day]);

  useEffect(() => {
    levelStateRef.current?.setMerchantStates(snapshot.merchants);
  }, [snapshot.merchants]);

  useEffect(() => {
    const levelState = levelStateRef.current;

    if (!levelState) {
      return;
    }

    const newTrades = snapshot.history.filter(
      (entry): entry is TradeLogEntry =>
        entry.type === "TRADE" && entry.id > lastTradeIdRef.current
    );

    if (newTrades.length === 0) {
      return;
    }

    lastTradeIdRef.current = newTrades[newTrades.length - 1].id;
    levelState.enqueueTrades(newTrades);
  }, [snapshot.history]);

  useEffect(() => {
    levelStateRef.current?.setInputEnabled(!isMarketOpen);
  }, [isMarketOpen]);
  // console.log("Level: ",level);

  if (!level) {
    return null;
  }

  return (
    <Fragment>
      <div
        className="flex items-center justify-center inset-0 absolute"
        style={{ background: THEME_BACKGROUNDS[level.theme as LevelThemes] }}
      >
        <div
          className="w-[var(--game-viewport-width)] h-[var(--game-viewport-height)] scale-[var(--pixel-size)]"
          style={{ overflow: level.terrain ? "hidden" : undefined }}
        >
          <div
            style={{
              transform: `translate3d(${level?.cameraTransformX}, ${level?.cameraTransformY}, 0)`,
            }}
          >
            {level.terrain ? (
              <PreviewTerrainLayer terrain={level.terrain} />
            ) : (
              <LevelBackgroundTilesLayer level={level} />
            )}
            {level?.placements
              ?.filter((placement: any) => !placement.hasBeenCollected)
              ?.map((placement: any) => {
                const [x, y] = placement.displayXY();

                return (
                  <div
                    key={placement?.id}
                    style={{
                      position: "absolute",
                      transform: `translate3d(${x + "px"}, ${y + "px"}, 0)`,
                      zIndex: placement.zIndex(),
                    }}
                  >
                    {placement?.renderComponent()}
                  </div>
                );
              })}
            {level?.tradeNotices?.map((notice: any) => (
              <div
                key={notice.id}
                className="market-trade-notice"
                style={{
                  left: notice.x,
                  top: notice.y,
                  zIndex: 9000,
                }}
              >
                {notice.text}
              </div>
            ))}
          </div>
          {showLegacyHud && level.isCompleted && (
            <LevelCompleteMessage level={level} />
          )}
          {showLegacyHud && level.deathOutcome && (
            <DeathMessage level={level} />
          )}
        </div>

        <WorldClock />
        <MarketActivityFeed />
        {/* The Peter/health/flour/inventory HUD belongs to the legacy game. */}
        {showLegacyHud && <TopHud level={level} />}

        {!!level?.custscenes?.length && (
          <Dialog
            isOpen={!!level?.custscenes?.length}
            onClose={level?.clearCutscene}
            content={level?.custscenes}
          />
        )}

        {level?.battle?.isOpen && (
          <RenderBattle
            level={level}
            isOpen={level.battle?.isOpen}
            onClose={level?.battle?.close}
            onBattleEnd={level?.battle?.onComplete}
          />
        )}
      </div>
    </Fragment>
  );
};

export default RenderLevel;
