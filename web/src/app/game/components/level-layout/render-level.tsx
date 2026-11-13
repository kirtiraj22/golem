import { LevelThemes, THEME_BACKGROUNDS } from "~/constants/helpers";
import LevelBackgroundTilesLayer from "./level-backround-tiles-layer";
import { Fragment, useEffect, useState } from "react";
import LevelState from "../../classes/level-state";
import LevelCompleteMessage from "../hud/level-complete-message";
import DeathMessage from "../hud/death-message";
import TopHud from "../hud/top-hud";
import RenderBattle from "./render-battle";
import Dialog from "../hud/dialog";
import Body from "../object-graphics/body";
import { TILES } from "~/constants/tiles";
import Image from "next/image";
import Journal from "../ui/journal";
import journalEntry from "../../classes/journal-entry";

const RenderLevel = () => {
  const [level, setLevel] = useState<any>(null);

  useEffect(() => {
    const levelState = new LevelState((newState) => {
      setLevel(newState);
    });

    const handleKeyDown = (event) => {};

    setLevel(levelState.getState());

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      levelState.destroy();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
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
        <div className="w-[var(--game-viewport-width)] h-[var(--game-viewport-height)] scale-[var(--pixel-size)]">
          <div
            style={{
              transform: `translate3d(${level?.cameraTransformX}, ${level?.cameraTransformY}, 0)`,
            }}
          >
            <LevelBackgroundTilesLayer level={level} />
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
          </div>
          {level.isCompleted && <LevelCompleteMessage level={level} />}
          {level.deathOutcome && <DeathMessage level={level} />}
        </div>

        <TopHud level={level} />

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
