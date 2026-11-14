import React, { memo } from "react";
import { CELL_SIZE } from "~/constants/helpers";
import type { AtlasSpriteConfig } from "../../classes/atlas-sprite-config";

type AtlasSpriteProps = {
  sprite: AtlasSpriteConfig;
  style?: React.CSSProperties;
};

/**
 * Crops a rectangle out of any spritesheet using CSS background positioning.
 *
 * The original `Sprite` component still owns the legacy atlas and remains
 * untouched. This component is for the new multi-sheet map art.
 */
const AtlasSprite = ({ sprite, style }: AtlasSpriteProps) => {
  const {
    src,
    x,
    y,
    width,
    height,
    destWidth = width,
    destHeight = height,
    offsetX = 0,
    offsetY = 0,
    anchor = "top-left",
  } = sprite;

  let left = offsetX;
  let top = offsetY;

  if (anchor === "bottom-center") {
    left += Math.floor((CELL_SIZE - destWidth) / 2);
    top += CELL_SIZE - destHeight;
  } else if (anchor === "bottom-left") {
    top += CELL_SIZE - destHeight;
  }

  const scaleX = destWidth / width;
  const scaleY = destHeight / height;
  const shouldScale = scaleX !== 1 || scaleY !== 1;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        backgroundImage: `url("${src}")`,
        backgroundPosition: `-${x}px -${y}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform: shouldScale ? `scale(${scaleX}, ${scaleY})` : undefined,
        transformOrigin: "top left",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};

export default memo(AtlasSprite);
