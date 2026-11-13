import { TILES } from "~/constants/tiles";
import Sprite from "./sprite";
import { CELL_SIZE } from "~/constants/helpers";

export default function ElevatedSprite({
  frameCoordinate = "",
  size = CELL_SIZE,
  pxAboveGround = 3,
}) {
  return (
    <div className="relative">
      <Sprite frameCoordinate={TILES.SHADOW} />
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translateY(${-pxAboveGround}px)`,
        }}
      >
        <Sprite frameCoordinate={frameCoordinate} size={size} />
      </div>
    </div>
  );
}
