import {
  LevelThemes,
  PLACEMENT_TYPE_AUCTIONEER,
  PLACEMENT_TYPE_HERO,
  PLACEMENT_TYPE_MERCHANT,
  PLACEMENT_TYPE_PROP,
  PLACEMENT_TYPE_SHOPKEEPER,
  PLACEMENT_TYPE_SHOP_SIGN,
} from "~/constants/helpers";
import { TILES } from "~/constants/tiles";
import type {
  AtlasSpriteConfig,
  AtlasTerrainGrid,
} from "../classes/atlas-sprite-config";

/**
 * Rook's Riverside market town.
 *
 * This is the active single-level game surface. The map is deliberately built
 * from the existing map sheets: a walkable main street, a market square, five
 * recognisable storefronts, and a south lane for the salvage/electronics row.
 */

const TILES_WIDTH = 38;
const TILES_HEIGHT = 24;

const GRASS: AtlasSpriteConfig = {
  src: "/map/Tileset_Ground.png",
  x: 0,
  y: 128,
  width: 16,
  height: 16,
};

const GRASS_VARIANTS: AtlasSpriteConfig[] = [
  GRASS,
  { ...GRASS, x: 16 },
  { ...GRASS, x: 32 },
];

const PATH: AtlasSpriteConfig = {
  src: "/map/Tileset_Road.png",
  x: 0,
  y: 128,
  width: 16,
  height: 16,
};

const PATH_VARIANTS: AtlasSpriteConfig[] = [
  PATH,
  { ...PATH, x: 16 },
  { ...PATH, x: 32 },
];

const WATER: AtlasSpriteConfig = {
  src: "/map/Tileset_Water.png",
  x: 0,
  y: 128,
  width: 16,
  height: 16,
};

const pickTile = (tiles: AtlasSpriteConfig[], x: number, y: number) =>
  tiles[(x * 7 + y * 11) % tiles.length];

const createTerrain = (): AtlasTerrainGrid => {
  const terrain: AtlasTerrainGrid = Array.from(
    { length: TILES_HEIGHT + 2 },
    (_, y) =>
      Array.from({ length: TILES_WIDTH + 2 }, (_, x) =>
        pickTile(GRASS_VARIANTS, x, y)
      )
  );

  const fill = (
    startX: number,
    startY: number,
    width: number,
    height: number,
    tile: AtlasSpriteConfig | AtlasSpriteConfig[]
  ) => {
    for (let y = startY; y < startY + height; y += 1) {
      for (let x = startX; x < startX + width; x += 1) {
        if (terrain[y]?.[x] !== undefined) {
          terrain[y][x] = Array.isArray(tile)
            ? pickTile(tile, x, y)
            : tile;
        }
      }
    }
  };

  // Main street, market cross-road, central square, and the south shop lane.
  fill(1, 12, 38, 3, PATH_VARIANTS);
  fill(18, 1, 3, 24, PATH_VARIANTS);
  fill(13, 10, 13, 6, PATH_VARIANTS);
  fill(1, 21, 38, 2, PATH_VARIANTS);

  // Short door paths keep every shop front connected to the street grid.
  fill(7, 9, 1, 3, PATH_VARIANTS);
  fill(31, 9, 1, 3, PATH_VARIANTS);
  fill(19, 9, 1, 3, PATH_VARIANTS);
  fill(8, 20, 1, 2, PATH_VARIANTS);
  fill(30, 20, 1, 2, PATH_VARIANTS);

  // Pond tucked into the south-east corner.
  fill(33, 16, 4, 3, WATER);

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
  [key: string]: any;
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
 * One visual building anchored at its bottom-centre, plus an invisible
 * grid-based collision footprint at its base. The footprint stays separate
 * from the artwork so the existing collision engine is untouched.
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

const shopSign = (
  x: number,
  y: number,
  label: string,
  sublabel: string,
  tone: "auction" | "furniture" | "pawn" | "electronics" | "salvage" | "brand",
  mounted = true
): PlacementConfig => ({
  type: PLACEMENT_TYPE_SHOP_SIGN,
  x,
  y,
  label,
  sublabel,
  tone,
  mounted,
});

const trees = [
  prop(2, 3, sprite(TREE_SRC, 0, 1, 64, 63), true),
  prop(3, 6, sprite(TREE_SRC, 81, 1, 46, 63), true),
  prop(35, 3, sprite(TREE_SRC, 224, 1, 48, 93), true),
  prop(36, 6, sprite(TREE_SRC, 152, 3, 52, 92), true),
  prop(2, 18, sprite(TREE_SRC, 224, 1, 48, 93), true),
  prop(35, 19, sprite(TREE_SRC, 288, 64, 48, 16)),
  prop(4, 23, sprite(TREE_SRC, 81, 1, 46, 63), true),
  prop(36, 23, sprite(TREE_SRC, 152, 3, 52, 92), true),
  prop(12, 3, sprite(TREE_SRC, 288, 64, 48, 16)),
  prop(26, 3, sprite(TREE_SRC, 291, 2, 40, 29)),
  prop(13, 17, sprite(TREE_SRC, 353, 3, 28, 28)),
  prop(27, 17, sprite(TREE_SRC, 288, 64, 48, 16)),
];

const rocks = [
  prop(4, 2, sprite(ROCK_SRC, 3, 4, 27, 26), true),
  prop(34, 2, sprite(ROCK_SRC, 112, 1, 15, 29), true),
  prop(2, 21, sprite(ROCK_SRC, 49, 1, 14, 13), true),
  prop(35, 21, sprite(ROCK_SRC, 146, 16, 28, 13), true),
  prop(31, 15, sprite(ROCK_SRC, 3, 4, 27, 26), true),
  prop(32, 16, sprite(ROCK_SRC, 3, 4, 27, 26), true),
  prop(32, 18, sprite(ROCK_SRC, 49, 1, 14, 13), true),
];

const marketProps = [
  // Market booths frame the square without blocking the central aisle.
  prop(13, 11, sprite(PROP_SRC, 2, 53, 44, 42)),
  ...solidCells(12, 11, 3, 1),
  prop(25, 11, sprite(PROP_SRC, 2, 53, 44, 42)),
  ...solidCells(24, 11, 3, 1),
  prop(15, 15, sprite(PROP_SRC, 3, 119, 42, 39)),
  ...solidCells(14, 15, 3, 1),

  // Lamps and banners make the square read as a public market.
  prop(12, 12, sprite(PROP_SRC, 65, 49, 46, 62), true),
  prop(26, 12, sprite(PROP_SRC, 65, 49, 46, 62), true),
  prop(12, 15, sprite(PROP_SRC, 132, 52, 24, 59), true),
  prop(26, 15, sprite(PROP_SRC, 132, 52, 24, 59), true),
  prop(10, 10, sprite(PROP_SRC, 181, 57, 24, 22)),
  prop(28, 10, sprite(PROP_SRC, 227, 57, 24, 22)),

  // Shop-front clutter, kept outside the door paths.
  prop(5, 10, sprite(PROP_SRC, 208, 139, 16, 20), true),
  prop(9, 10, sprite(PROP_SRC, 161, 128, 30, 32), true),
  prop(33, 10, sprite(PROP_SRC, 113, 133, 30, 26), true),
  prop(34, 11, sprite(PROP_SRC, 69, 141, 22, 17), true),
  prop(6, 22, sprite(PROP_SRC, 161, 128, 30, 32), true),
  prop(10, 22, sprite(PROP_SRC, 208, 139, 16, 20), true),
  prop(32, 22, sprite(PROP_SRC, 113, 133, 30, 26), true),
  prop(29, 22, sprite(PROP_SRC, 69, 141, 22, 17), true),

  // Small square details.
  prop(20, 16, sprite(PROP_SRC, 112, 1, 32, 31)),
  ...solidCells(19, 16, 2, 1),
  prop(18, 17, sprite(PROP_SRC, 241, 147, 15, 11)),
];

const pondCollision = solidCells(33, 16, 4, 3);

const auctioneer = {
  type: PLACEMENT_TYPE_AUCTIONEER,
  x: 19,
  y: 10,
  name: "Rook",
};

const merchants = [
  {
    type: PLACEMENT_TYPE_MERCHANT,
    x: 7,
    y: 9,
    simulationId: "furniture-dealer",
    name: "Deke",
    role: "furniture-dealer" as const,
    frameCoordinate: TILES.HERO_EDITING_LEFT,
    shopLabel: "FURNITURE",
    routine: {
      work: { x: 7, y: 9 },
      market: { x: 7, y: 10 },
    },
  },
  {
    type: PLACEMENT_TYPE_MERCHANT,
    x: 31,
    y: 9,
    simulationId: "pawnbroker",
    name: "Vera",
    role: "pawnbroker" as const,
    frameCoordinate: TILES.HERO_CONVEYOR_LEFT,
    shopLabel: "PAWN & ELECTRONICS",
    routine: {
      work: { x: 31, y: 9 },
      market: { x: 31, y: 10 },
    },
  },
  {
    type: PLACEMENT_TYPE_MERCHANT,
    x: 8,
    y: 21,
    simulationId: "salvage-buyer",
    name: "Cora",
    role: "salvage-buyer" as const,
    frameCoordinate: TILES.HERO_FIRE_LEFT,
    shopLabel: "SALVAGE",
    routine: {
      work: { x: 8, y: 21 },
      market: { x: 8, y: 22 },
    },
  },
];

const shopkeepers = [
  {
    type: PLACEMENT_TYPE_SHOPKEEPER,
    x: 30,
    y: 21,
    name: "Milo",
    roleLabel: "ELECTRONICS · BROWSING",
    frameCoordinate: TILES.HERO_EDITING_RIGHT,
  },
];

const shopSigns = [
  // Mounted one row above the door so the sign and shopkeeper nameplate do
  // not fight for the same vertical space.
  shopSign(7, 6, "Furniture", "Deke's Restorations", "furniture"),
  shopSign(19, 7, "Auction House", "Rook's Riverside", "auction"),
  shopSign(31, 6, "Pawn & Electronics", "Vera's Trading Post", "pawn"),
  shopSign(8, 18, "Salvage", "Cora's Second-Hand", "salvage"),
  shopSign(30, 18, "Electronics", "Milo's Repairs", "electronics"),
  shopSign(19, 15, "Stock Wars", "Rook's Riverside Market", "brand", false),
];

const levelPreview = {
  theme: LevelThemes.Green,
  tilesWidth: TILES_WIDTH,
  tilesHeight: TILES_HEIGHT,
  terrain,
  placements: [
    {
      type: PLACEMENT_TYPE_HERO,
      x: 19,
      y: 13,
    },
    auctioneer,
    ...merchants,
    ...shopkeepers,
    ...shopSigns,

    // North row: furniture, auction office, pawn/electronics.
    ...building(7, 8, sprite(BUILDING_SRC, 29, 9, 88, 103), 5, 2),
    ...building(19, 9, sprite(BUILDING_SRC, 16, 128, 157, 112), 9, 2),
    ...building(31, 8, sprite(BUILDING_SRC, 17, 256, 180, 128), 9, 2),

    // South row: salvage and electronics.
    ...building(8, 20, sprite(BUILDING_SRC, 16, 400, 128, 128), 7, 2),
    ...building(30, 20, sprite(BUILDING_SRC, 29, 9, 88, 103), 5, 2),

    // Landmark well and the rest of the street dressing.
    prop(23, 16, sprite(BUILDING_SRC, 148, 36, 56, 75), false, 5),
    ...solidCells(22, 16, 3, 1),
    ...marketProps,
    ...trees,
    ...rocks,
    ...pondCollision,
  ],
};

export default levelPreview;
