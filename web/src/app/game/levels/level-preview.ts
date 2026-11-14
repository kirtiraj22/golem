import {
  LevelThemes,
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_MERCHANT,
  PLACEMENT_TYPE_PROP,
} from "~/constants/helpers";
import { TILES } from "~/constants/tiles";
import type {
  AtlasSpriteConfig,
  AtlasTerrainGrid,
} from "../classes/atlas-sprite-config";

/**
 * Temporary market-town preview level.
 *
 * The map art is deliberately described with explicit source rectangles
 * rather than cell strings, because the new sheets mix 16x16 terrain tiles
 * with larger native-pixel props and buildings.
 */

const TILES_WIDTH = 30;
const TILES_HEIGHT = 20;

const GRASS: AtlasSpriteConfig = {
  src: "/map/Tileset_Ground.png",
  x: 0,
  y: 128,
  width: 16,
  height: 16,
};

const PATH: AtlasSpriteConfig = {
  src: "/map/Tileset_Road.png",
  x: 0,
  y: 128,
  width: 16,
  height: 16,
};

const WATER: AtlasSpriteConfig = {
  src: "/map/Tileset_Water.png",
  x: 0,
  y: 128,
  width: 16,
  height: 16,
};

const createTerrain = (): AtlasTerrainGrid => {
  const terrain: AtlasTerrainGrid = Array.from(
    { length: TILES_HEIGHT + 2 },
    () => Array.from({ length: TILES_WIDTH + 2 }, () => GRASS)
  );

  const fill = (
    startX: number,
    startY: number,
    width: number,
    height: number,
    tile: AtlasSpriteConfig
  ) => {
    for (let y = startY; y < startY + height; y += 1) {
      for (let x = startX; x < startX + width; x += 1) {
        if (terrain[y]?.[x] !== undefined) {
          terrain[y][x] = tile;
        }
      }
    }
  };

  // Main east-west road, north-south road, and the market square.
  fill(1, 10, 30, 3, PATH);
  fill(14, 1, 3, 20, PATH);
  fill(10, 9, 9, 5, PATH);

  // A small pond in the south-east corner.
  fill(23, 15, 4, 4, WATER);

  return terrain;
};

const terrain = createTerrain();

type PlacementConfig = {
  type: string;
  x: number;
  y: number;
  sprite?: AtlasSpriteConfig;
  solid?: boolean;
  zOffset?: number;
};

const prop = (
  x: number,
  y: number,
  sprite?: AtlasSpriteConfig,
  solid = false,
  zOffset = 4
): PlacementConfig => ({
  type: PLACEMENT_TYPE_PROP,
  x,
  y,
  sprite,
  solid,
  zOffset,
});

const sprite = (
  src: string,
  x: number,
  y: number,
  width: number,
  height: number
): AtlasSpriteConfig => ({
  src,
  x,
  y,
  width,
  height,
  anchor: "bottom-center",
});

const BUILDING_SRC = "/map/Buildings.png";
const PROP_SRC = "/map/Props.png";
const ROCK_SRC = "/map/Rocks.png";
const TREE_SRC = "/map/Trees_Bushes.png";

const solidCells = (
  startX: number,
  startY: number,
  width: number,
  height: number
) => {
  const cells: PlacementConfig[] = [];

  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      cells.push(prop(x, y, undefined, true, 0));
    }
  }

  return cells;
};

/**
 * A building is one visual placement anchored at its bottom-centre, plus a
 * row of invisible solid cells at its base. This keeps collision grid-based
 * and avoids changing the shared collision engine.
 */
const building = (
  x: number,
  y: number,
  asset: AtlasSpriteConfig,
  footprintWidth: number,
  footprintHeight = 2
) => {
  const left = x - Math.floor(footprintWidth / 2);

  return [
    prop(x, y, asset, false, 5),
    ...solidCells(
      left,
      y - footprintHeight + 1,
      footprintWidth,
      footprintHeight
    ),
  ];
};

const trees = [
  prop(2, 4, sprite(TREE_SRC, 0, 1, 64, 63), true),
  prop(2, 13, sprite(TREE_SRC, 224, 1, 48, 93), true),
  prop(2, 17, sprite(TREE_SRC, 81, 1, 46, 63), true),
  prop(29, 13, sprite(TREE_SRC, 152, 3, 52, 92), true),
  prop(22, 14, sprite(TREE_SRC, 288, 64, 48, 16)),
  prop(22, 16, sprite(TREE_SRC, 353, 3, 28, 28)),
  prop(22, 18, sprite(TREE_SRC, 291, 2, 40, 29)),
  prop(4, 14, sprite(TREE_SRC, 17, 84, 15, 10)),
];

const rocks = [
  prop(4, 13, sprite(ROCK_SRC, 3, 4, 27, 26), true),
  prop(3, 15, sprite(ROCK_SRC, 49, 1, 14, 13), true),
  prop(6, 14, sprite(ROCK_SRC, 146, 16, 28, 13), true),
  prop(22, 17, sprite(ROCK_SRC, 146, 16, 28, 13), true),
  prop(27, 19, sprite(ROCK_SRC, 112, 1, 15, 29), true),
  prop(28, 18, sprite(ROCK_SRC, 3, 4, 27, 26), true),
];

const marketProps = [
  prop(10, 12, sprite(PROP_SRC, 112, 1, 32, 31)),
  ...solidCells(9, 12, 2, 1),
  prop(18, 12, sprite(PROP_SRC, 161, 9, 30, 22)),
  ...solidCells(17, 12, 2, 1),
  prop(15, 15, sprite(PROP_SRC, 2, 53, 44, 42)),
  ...solidCells(14, 15, 3, 1),
  prop(9, 11, sprite(PROP_SRC, 65, 49, 46, 62), true),
  prop(20, 10, sprite(PROP_SRC, 132, 52, 24, 59), true),
  prop(18, 15, sprite(PROP_SRC, 181, 57, 24, 22), true),
  prop(20, 14, sprite(PROP_SRC, 161, 128, 30, 32)),
  ...solidCells(20, 14, 2, 1),
  prop(22, 10, sprite(PROP_SRC, 113, 133, 30, 26)),
  ...solidCells(22, 10, 2, 1),
  prop(9, 13, sprite(PROP_SRC, 0, 10, 16, 21), true),
  prop(10, 13, sprite(PROP_SRC, 36, 2, 24, 29), true),
  prop(19, 13, sprite(PROP_SRC, 80, 18, 16, 14), true),
  prop(11, 13, sprite(PROP_SRC, 69, 141, 22, 17)),
  prop(20, 15, sprite(PROP_SRC, 241, 147, 15, 11)),
];

const pondCollision = solidCells(23, 15, 4, 4);

const merchants = [
  {
    type: PLACEMENT_TYPE_MERCHANT,
    x: 12,
    y: 11,
    simulationId: "farmer",
    name: "Aster",
    role: "farmer" as const,
    frameCoordinate: TILES.HERO_CONVEYOR_LEFT,
    routine: {
      work: { x: 12, y: 14 },
      market: { x: 12, y: 11 },
    },
  },
  {
    type: PLACEMENT_TYPE_MERCHANT,
    x: 5,
    y: 11,
    simulationId: "lumberjack",
    name: "Bram",
    role: "lumberjack" as const,
    frameCoordinate: TILES.HERO_EDITING_LEFT,
    routine: {
      work: { x: 3, y: 9 },
      market: { x: 5, y: 11 },
    },
  },
  {
    type: PLACEMENT_TYPE_MERCHANT,
    x: 22,
    y: 8,
    simulationId: "blacksmith",
    name: "Cora",
    role: "blacksmith" as const,
    frameCoordinate: TILES.HERO_FIRE_LEFT,
    routine: {
      work: { x: 22, y: 9 },
      market: { x: 19, y: 9 },
    },
  },
];

const levelPreview = {
  theme: LevelThemes.Green,
  tilesWidth: TILES_WIDTH,
  tilesHeight: TILES_HEIGHT,
  terrain,
  placements: [
    {
      type: PLACEMENT_TYPE_HERO,
      x: 15,
      y: 12,
    },
    ...merchants,
    ...building(7, 7, sprite(BUILDING_SRC, 29, 9, 88, 103), 5, 2),
    ...building(24, 7, sprite(BUILDING_SRC, 16, 128, 157, 112), 9, 2),
    ...building(12, 8, sprite(BUILDING_SRC, 148, 36, 56, 75), 2, 1),
    ...marketProps,
    ...trees,
    ...rocks,
    ...pondCollision,
  ],
};

export default levelPreview;
