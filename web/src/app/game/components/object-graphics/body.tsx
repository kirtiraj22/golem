import React from "react";
import Sprite from "./sprite";
import { TILES } from "~/constants/tiles";

const Body = ({
  frameCoordinate = TILES.HERO_RIGHT,
  yTranslate = 0,
  showShadow = false,
}) => {
  return (
    <div className="relative">
      <div>{showShadow && <Sprite frameCoordinate={TILES.SHADOW} />}</div>
      <div
        className="absolute left-[-8px] top-[-19px]"
        style={{
          transform: `translateY(${yTranslate}px)`,
        }}
      >
        <Sprite frameCoordinate={frameCoordinate} size={32} />
      </div>
    </div>
  );
};

export default Body;
