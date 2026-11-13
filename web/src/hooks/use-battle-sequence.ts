import { useState, useEffect } from "react";

export const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

export const useBattleSequence = (sequence, { player, opponent }) => {
  const [turn, setTurn] = useState(0);
  const [inSequence, setInSequence] = useState(false);

  const [playerHealth, setPlayerHealth] = useState(player.health);
  const [opponentHealth, setOpponentHealth] = useState(opponent.health);

  const [announcerMessage, setAnnouncerMessage] = useState("");

  useEffect(() => {
    const { mode, turn, message, damage: ATTACK_DAMAGE } = sequence;

    if (mode) {
      switch (mode) {
        case "attack": {
          (async () => {
            setInSequence(true);
            setAnnouncerMessage(message);

            await wait(1000);

            /**
             * Setting up the state
             */
            turn === 0
              ? setOpponentHealth((h) =>
                  h - ATTACK_DAMAGE > 0 ? h - ATTACK_DAMAGE : 0
                )
              : setPlayerHealth((h) =>
                  h - ATTACK_DAMAGE > 0 ? h - ATTACK_DAMAGE : 0
                ); // We don't want a negative HP.

            await wait(1000);

            // setTurn(turn === 0 ? 1 : 0);
            setInSequence(false);
          })();

          break;
        }

        default:
          break;
      }
    }
  }, [opponent, player, sequence]);

  return {
    turn,
    inSequence,
    playerHealth,
    opponentHealth,
    announcerMessage,
  };
};
