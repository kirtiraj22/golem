import LevelCompletedSvg from "../object-graphics/level-completed-svg";

function LevelCompleteMessage({ level }: { level: any }) {
  const onRestartLevel = () => {
    level?.restart();
  };

  return (
    <div className="outer-container absolute inset-0 z-[var(--ui-popup-z-index)] flex items-center justify-center">
      <div className="popup-container relative">
        <button onClick={onRestartLevel}>
          <LevelCompletedSvg />
        </button>
      </div>
    </div>
  );
}

export default LevelCompleteMessage;
