/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { LevelThemes, THEME_BATTLE_SCREENS } from "~/constants/helpers";
import { TILES } from "~/constants/tiles";
import Body from "../object-graphics/body";
import Dialog, { DialogType } from "../hud/dialog";
import HealthBar from "../hud/healthbar";
import { useBattleSequence, wait } from "~/hooks/use-battle-sequence";

export const useAIOpponent = (turn) => {
  const [aiChoice, setAIChoice] = useState("");

  useEffect(() => {
    if (turn === 1) {
      const options = ["attack", "magic"];
      setAIChoice(options[Math.floor(Math.random() * options.length)]);
    }
  }, [turn]);

  return aiChoice;
};

const RenderBattle = ({ level = null, onClose, isOpen, onBattleEnd }: any) => {
  const [sequence, setSequence] = useState({});
  const [dialogs, setDialogs] = useState<DialogType>();
  const [battle, setBattle] = useState<any>(level?.battle?.instance);

  const player = useMemo(() => battle?.combatans?.player, [battle?.combatans]);

  const opponent = useMemo(
    () => battle?.combatans?.opponent,
    [battle?.combatans]
  );

  const { turn, inSequence, playerHealth, opponentHealth, announcerMessage } =
    useBattleSequence(sequence, {
      player: player?.stats,
      opponent: opponent?.stats,
    });

  const aiChoice = useAIOpponent(turn);

  useEffect(() => {
    if (aiChoice && turn === 1 && !inSequence) {
      setSequence({ turn, mode: aiChoice });
    }
  }, [turn, aiChoice, inSequence]);

  useEffect(() => {
    if (!!battle?.distortions) {
      setDialogs([
        ...battle?.distortions?.backstories,
        ...battle?.distortions?.quizzes?.map((quiz) => ({
          ...quiz,
          onSelectCorrectAnswer() {
            setSequence({
              mode: "attack",
              turn: 0,
              message: quiz?.response?.correct?.text,
              damage: 100 / battle?.distortions?.quizzes?.length,
            });
          },
          onSelectWrongAnswer() {
            setSequence({
              mode: "attack",
              turn: 1,
              message: quiz?.response?.wrong?.text,
              damage: 100 / battle?.distortions?.quizzes?.length,
            });
          },
        })),
      ]);
    }
  }, [battle?.distortions]);

  useEffect(() => {
    if (playerHealth === 0 || opponentHealth === 0) {
      (async () => {
        await wait(500);
        onBattleEnd({
          player: { ...player?.stats, health: playerHealth },
          opponent: { ...opponent?.stats, health: opponentHealth },
        });
      })();
    }
  }, [playerHealth, opponentHealth, onBattleEnd, opponent, player]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/80"
      style={{
        backgroundImage: `url(${
          THEME_BATTLE_SCREENS[level.theme as LevelThemes]
        })`,
        backgroundSize: "cover",
        imageRendering: "pixelated",
      }}
    >
      <div className="w-[var(--game-viewport-width)] h-[var(--game-viewport-height)] scale-[var(--pixel-size)] relative flex flex-col justify-center items-center gap-2">
        <div className="self-stretch flex justify-between">
          <HealthBar name={player?.name} hp={playerHealth} />
          <HealthBar name={opponent?.stats?.name} hp={opponentHealth} />
        </div>
        <div className="w-full flex justify-between block px-2">
          <Body
            frameCoordinate={TILES?.HERO_RIGHT}
            yTranslate={0}
            showShadow={true}
          />

          <Body
            frameCoordinate={TILES.HERO_INFECTED_LEFT}
            yTranslate={0}
            showShadow={true}
          />
        </div>
      </div>

      <Dialog
        isOpen
        onClose={() => {
          console.log("close ae lah");
        }}
        onComplete={() => {
          setDialogs(dialogs?.slice(1));
        }}
        leftSection={
          !!announcerMessage ? (
            <img
              src="https://img.itch.zone/aW1nLzExNzY3NzEyLnBuZw==/original/zOww4a.png"
              alt="Ciabatta"
              width={300}
              height={500}
              className="-mt-12"
            />
          ) : undefined
        }
        content={
          !inSequence && turn === 0
            ? dialogs
            : ([
                {
                  type: "message",
                  text: announcerMessage,
                },
              ] as DialogType)
        }
      />

      {/* {!!sequence?.length && (
        <Dialog
          isOpen={!!sequence?.length}
          onClose={() => {}}
          content={sequence}
          // onNext={(dialogState) => {
          //   console.log("next", dialogState);
          // }}
        />
      )} */}

      {/* <Dialog
        isOpen={true}
        onClose={level?.clearCutscene}
        leftSection={
          <img
            src="https://img.itch.zone/aW1nLzExNzY3NzEyLnBuZw==/original/zOww4a.png"
            alt="Ciabatta"
            width={300}
            height={500}
            className="-mt-24"
          />
        }
        content={[
          {
            type: "message",
            text: "Kamu berhasil mengalahkan virus Cognivures dari tubuh dia",
          },
        ]}
      /> */}
    </div>
  );
};

export default RenderBattle;
