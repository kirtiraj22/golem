/**
 * Preview-era sprite description.
 *
 * This is intentionally independent of the original `TILES`/`CELL_SIZE`
 * atlas contract. It lets a placement or terrain cell point at any spritesheet
 * and crop an arbitrary source rectangle from it.
 */
export type AtlasSpriteConfig = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  destWidth?: number;
  destHeight?: number;
  offsetX?: number;
  offsetY?: number;
  anchor?: "top-left" | "bottom-left" | "bottom-center";
};

export type AtlasTerrainGrid = Array<
  Array<AtlasSpriteConfig | null>
>;
