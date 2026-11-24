import { LevelThemes, THEME_BACKGROUNDS } from "~/constants/helpers";
import LevelBackgroundTilesLayer from "./level-backround-tiles-layer";
import PreviewTerrainLayer from "./preview-terrain-layer";
import { Fragment, useEffect, useRef, useState } from "react";
import LevelState from "../../classes/level-state";
import level1 from "../../levels/level-1";
import { useMarketUi } from "../../contexts/market-ui-context";
import { useAuction } from "../../contexts/auction-context";
import { useWorldClock } from "../../contexts/world-clock-context";
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
  const { isOpen: isAuctionOpen, openAuction, data, economy } = useAuction();
  const { clock } = useWorldClock();
  const day = data?.state.day ?? 1;
  const merchants = economy?.merchants ?? [];
  const dayRef = useRef(day);
  const merchantsRef = useRef(merchants);
  const clockRef = useRef(clock);
  const lastTradeIdRef = useRef(0);
  const tradesInitializedRef = useRef(false);

  dayRef.current = day;
  merchantsRef.current = merchants;
  clockRef.current = clock;

  useEffect(() => {
    const levelState = new LevelState(
      (newState) => {
        setLevel(newState);
      },
      levelConfig,
      (merchantId) => openMarket(merchantId),
      () => openAuction()
    );

    levelStateRef.current = levelState;
    levelState.setGameClock(clockRef.current.minutes, dayRef.current);
    levelState.setMerchantStates(merchantsRef.current);

    setLevel(levelState.getState());

    return () => {
      levelState.destroy();
      levelStateRef.current = null;
    };
  }, [levelConfig, openMarket, openAuction]);

  useEffect(() => {
    levelStateRef.current?.setGameClock(clock.minutes, day);
  }, [clock.minutes, day]);

  useEffect(() => {
    levelStateRef.current?.setMerchantStates(merchants);
  }, [merchants]);

  useEffect(() => {
    const levelState = levelStateRef.current;

    if (!levelState || !economy) {
      return;
    }

    const trades = economy.history.filter(
      (entry): entry is TradeLogEntry => entry.type === "TRADE"
    );
    const latestTradeId =
      trades.length > 0 ? trades[trades.length - 1].id : 0;

    // Do not replay the whole ledger the first time it loads, but do animate
    // every trade produced by the next server day.
    if (!tradesInitializedRef.current) {
      tradesInitializedRef.current = true;
      lastTradeIdRef.current = latestTradeId;
      return;
    }

    const newTrades = trades.filter(
      (entry) => entry.id > lastTradeIdRef.current
    );

    if (newTrades.length === 0) {
      return;
    }

    lastTradeIdRef.current = latestTradeId;
    levelState.enqueueTrades(newTrades);
  }, [economy]);

  useEffect(() => {
    levelStateRef.current?.setInputEnabled(!isMarketOpen && !isAuctionOpen);
  }, [isMarketOpen, isAuctionOpen]);
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
