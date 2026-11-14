Project Context --- Market Town Economy Game
Last updated: 13 November 2026
Repository: ~/projects/golem
Web app: ~/projects/golem/web
Environment: Windows 11 + WSL Ubuntu
Hackathon: NEAR Track 09 --- Games With Real Economies
Deadline noted by project owner: 14 November 2026, 23:59 UTC (15
November, 05:29 IST)
This file is the durable handoff for any AI coding assistant. Read it
before proposing or changing code. Treat the repository as the source
of truth for current implementation; this document records intent,
known architecture, decisions, and verified progress.

1. Project goal
Convert the existing single-level top-down pixel-art maze game into a
small market-town economic simulation game.

The player is an entrepreneur operating a trading stall. Three
autonomous NPC merchants operate in the town, trading with one another,
producing and consuming goods, and reacting to supply/demand shocks.

The economy must continue operating without player input. This is a
central demonstration point: leave the simulation running and visibly
show NPC trades, changing prices, and changing inventories without the
player doing anything.

The game should feel like a small playable market town, not a dashboard
with a game attached. The world is how the player encounters merchants;
the market UI is how the player trades.
2. Agreed MVP
Keep the scope aggressively small.
World
- One small top-down market town / market square.
- One player-owned trading stall.
- Three merchant NPCs:
  - Aster --- Farmer
  - Bram --- Lumberjack
  - Cora --- Blacksmith
- Walkable paths, buildings/stalls, and a few environmental props.
- Explicit interaction with NPCs (planned: approach and press E).
- One player character.
Economy
Three goods: - Grain - Wood - Tools

Merchant roles: - Farmer produces Grain and buys/consumes Tools. -
Lumberjack produces Wood and buys/consumes Grain. - Blacksmith consumes
Wood to produce Tools and buys/consumes Grain.

The simulation includes: - NPC balances and inventories. - Autonomous
NPC trading. - Production and consumption. - Dynamic prices based on
stock/demand/trading. - One fictional rumour/event that temporarily
increases Grain demand. - A fast-forward control to simulate seven days
in 60 seconds. - Visible dashboard: prices, stock, merchant balances,
and recent transaction history.

The player should be able to buy undervalued goods, sell into demand,
and fulfil merchant needs/orders.
Deliberately out of scope for the immediate MVP
Do not add these unless the project owner explicitly changes scope: -
Individual on-chain accounts for NPCs. - Putting every NPC trade
on-chain. - NEP-245 contract implementation. - NEAR Intents
settlement. - Social login/email onboarding. - Multiplayer. - Full
bankruptcy/business-investment systems. - Large progression/unlock
systems.

Architecture principle: run the economic simulation off-chain. Integrate
NEAR meaningfully for relevant ownership/settlement later; do not bolt
blockchain on as a superficial gimmick.
3. Important working preferences and safety rails
- The project owner is a beginner in Rust/TypeScript and prefers
  exact, small, actionable steps.
- Be direct and concise. Avoid generic AI filler, long speculative
  plans, and unnecessary tables.
- Prefer inspecting the actual code before changing architecture.
- When changing dialogue, dialog boxes, narrative, tutorial, or
  journal content, preserve reusable old code by commenting it out
  rather than deleting it. Clearly label legacy code.
- Do not delete legacy dialogue/tutorial/journal/battle code without
  explicit approval.
- Do not run destructive Git commands (git restore,
  git reset --hard, git clean).
- Do not stage or commit unless explicitly asked.
- Do not install packages or upgrade dependencies without a concrete
  need and approval.
- Do not claim a change is complete until commands/output confirm it.
- Keep existing reusable game engine code where possible.
- Work in small milestones; verify after each milestone.
- Do not rewrite the working economy simulation or MarketHud while
  converting the world.
4. Repository and app facts
- Main repository: ~/projects/golem
- Next.js app: ~/projects/golem/web
- App uses Next.js 16.4.6 and React 19.2.9 (last verified).
- Dev server previously ran at http://localhost:3001.
- The game route is /game.
- Main game entry: web/src/app/game/main.tsx.
- The user copied an existing game into this repo; some old Moodify
  app files were removed/changed. There are many uncommitted changes.
- The user has not committed since copying/refactoring the game. Do
  not assume a clean Git tree.
- Avoid destructive Git operations. Inspect git status before any
  broad changes.
5. What has already been implemented
5.1 Single-level game refactor
The copied maze game was simplified to one level. User confirmed the
game works with one level.

Reported changes: - Simplified level progression. - Removed
checkpoint-based Continue Game menu option. - Level completion/death now
restarts the same level rather than progressing. - Old unused
levels/intro/map files were removed after references were cleared. -
Level 1 scene and existing mechanics were retained.

Do not assume exact current file state without inspecting the repo.
5.2 Economic simulation core
Created: - web/src/app/game/simulation/types.ts -
web/src/app/game/simulation/goods.ts -
web/src/app/game/simulation/economy.ts -
web/scripts/verify-simulation.ts

Modified: - web/package.json --- added sim:verify script.

Exports reported:
createInitialWorld
tick
fastForwardSevenDays
triggerGrainRumour
playerBuy
playerSell
getSnapshot
Example usage:
const world = createInitialWorld();
triggerGrainRumour(world, { durationDays: 2, demandMultiplier: 1.8 });
const snapshot = fastForwardSevenDays(world);
playerBuy(world, "GRAIN", 2, "farmer");
playerSell(world, "TOOLS", 2, "farmer");
console.log(getSnapshot(world));
Last reported verification: - npm run sim:verify passed. - Initial
prices: Grain 9, Wood 8, Tools 26. - Initial balances: player 250,
farmer 90, lumberjack 90, blacksmith 130. - Grain scarcity price 13,
normal 9, abundant 6. - Grain rumour: price 9 -> 17, 1.8× demand, two
days. - Four NPC trades/day; seven simulated days = 28 trades. - Money
and inventory reconcile; deterministic simulation. - Player buy/sell
validation passed. - Seven-day snapshot reported day 7, player balance
284, player stock Grain 8, Wood 4, Tools 1, with no validation errors.

Known limitation: - npm run check:types failed due to pre-existing
implicit-any/JSX typing errors in legacy game code. The isolated
simulation strict TypeScript checks passed. - The verification script
uses ts-node, reported as a transitive dev dependency of
@commitlint/cli; this is fragile. Do not add dependencies unless
needed.
5.3 Market UI integration
Created: - web/src/app/game/contexts/economy-context.tsx -
web/src/app/game/components/hud/market-hud.tsx

Modified: - web/src/app/game/main.tsx

Reported component structure: - GameProvider - EconomyProvider -
RenderLevel - MarketHud

The economy provider owns the simulation state and exposes
actions/snapshot. The MarketHud is mounted outside the 60 FPS game
render tree.

MarketHud behavior: - Closed by default with a fixed bottom-right
"Market Day" button. - Displays day, player balance, stall, goods
prices, market stock, player inventory, demand, merchant
balances/inventories/targets. - Buy/sell selectors for good, merchant,
and quantity. - Buy and Sell actions. - Advance Day. - Fast-forward
seven days. - Start Grain Rumour. - Latest ten transactions with
NPC/Player tags, prices, quantities, and day/timestamp.

Last reported verification: - npm run sim:verify passed. -
npm run build passed. - Prettier passed. - No new TypeScript errors in
new/modified simulation/UI files; old errors remain elsewhere. - No new
packages installed.

A merchant selection/sell issue was investigated. The user later
confirmed "it is working now ig." Current UI shows merchant cards and
the correct selected merchant. Transaction history includes player sales
to Cora the Blacksmith, so player selling works.

MarketHud code currently owns local UI state including: - isOpen -
goodId - merchantId - quantity

The merchant selector is controlled and merchant selection is working.
maxBuy/`maxSell` UI helper calculations mirror simulation rules; this
could drift if rules change, but it is not urgent.
5.4 Current Market UI sample state
A user screenshot/text report showed: - Day 2 - Stall: The Copper
Stall - Player purse: 202 coins - Grain price 9, market stock 28, player
stock 2 - Wood price 8, market stock 20, player stock 8 - Tools price
26, market stock 14, player stock 5 - Merchants: Aster (88), Bram (112),
Cora (158) - Trade desk and recent transactions visible - Player can
sell Grain to Cora when Cora has demand.
6. Current world/game architecture (from a read-only audit)
This section records the user's OpenCode audit. Verify exact current
code before editing.
6.1 Level data and background tiles
Level file: - web/src/app/game/levels/level-1.ts

Current level data is hard-coded:
{
  theme: LevelThemes.Blue,
  tilesWidth: 12,
  tilesHeight: 6,
  placements: [...]
}
There is no ground/path grid currently. Only dimensions and placement
configs.

Level startup: - web/src/app/game/classes/level-state.ts -
LevelState.start() imports level 1 directly. - Copies theme,
tilesWidth, tilesHeight. - Instantiates placement configs using
placementFactory.createPlacement(config, this). - Finds hero via
PLACEMENT_TYPE_HERO, stores it in heroRef. - Creates Camera,
LevelAnimatedFrames, starts GameLoop.

Background: -
web/src/app/game/components/level-layout/level-backround-tiles-layer.tsx -
web/src/app/game/components/level-layout/map-cell.tsx

Background tile selection is procedural and based only on edge/interior
position: - widthWithWalls = tilesWidth + 1 -
heightWithWalls = tilesHeight + 1 - getBackgroundTiles(x, y) chooses
LEFT, RIGHT, TOP, BOTTOM, or FLOOR. - All interior cells currently use
the same FLOOR tile. - There is no per-cell grass/path/stone support
yet.

Sprite atlas: - web/src/constants/tiles.ts -
web/src/constants/helpers.ts -
web/src/app/game/components/object-graphics/sprite.tsx

Current atlas: - web/public/ciabattas-revenge-sprites.png - 368×304
px, 23×19 cells at 16×16. - CELL_SIZE = 16. -
SPRITESHEET_IMAGE_SRC = "/ciabattas-revenge-sprites.png". - TILES
stores cell coordinates. - Sprite converts frame coordinates into
source pixels using CELL_SIZE; default crop 16×16. - Body uses 32×32
character frames. - THEME_TILES_MAP has five themes with
FLOOR/TOP/LEFT/RIGHT/BOTTOM/WALL. - Existing atlas has floors/walls, UI
icons, characters/enemies, water/fire/ice/teleport effects,
keys/locks. - It does not have suitable market buildings, stalls, trees,
fences, roofs, crates/barrels, or market paths. - Existing asset is not
sufficient for the intended market town without replacement or
extension.
6.2 Placement and collision
Base placement: - web/src/app/game/classes/placement.ts - Stores
id/type/x/y, movement interpolation, facing, skin, collection state. -
Methods include getCollisionAtNextPosition, displayXY,
displayMovingXY, zIndex, renderComponent, isSolidForBody,
isFacingEachOther, etc. - Base isSolidForBody() returns false. -
Base isFacingEachOther() returns false.

Factory: - web/src/app/game/classes/placement-factory.ts - Maps
placement type constants to placement classes. - Creates instances and
assigns a random numeric id.

Placement types/classes currently include hero, goal, wall, flour,
enemies, lock/key, water/fire/ice, switches, teleport, thief, infected
hero, etc.

Live placements: - LevelState.placements array. -
addPlacement(config) and deletePlacement(placement) mutate it.

Collision: - web/src/app/game/classes/collision.ts - Cell-based
collision, not pixel/AABB. - scanPlacementsAtPosition() filters
placements sharing x/y, excluding self. -
BodyPlacement.isSolidAtNextPosition() checks ice corners, next tile,
out-of-bounds, and solid placements. - WallPlacement.isSolidForBody()
returns true. - Level bounds in LevelState.isPositionOutOfBounds(x, y)
block: - x === 0 - y === 0 - x >= tilesWidth + 1 -
y >= tilesHeight + 1 - Playable interior effectively x=1..tilesWidth,
y=1..tilesHeight.

Combat: - Collision.withActivateBattleScreen() looks for placement
whose isFacingEachOther() is true. - InfectedHeroPlacement is the
current battle-trigger source. - A merchant should inherit base
isFacingEachOther() === false and must not implement battle methods. -
Do not reuse ThiefPlacement, InfectedHeroPlacement, or
WallPlacement as merchants/buildings.

Missing abstractions: - Generic static prop placement. - Reusable
interactable merchant NPC placement. - WallPlacement is not generic
enough for market props because it renders a theme wall.
6.3 Player movement and interaction
Files: - web/src/app/game/classes/direction-controls.ts -
web/src/app/game/classes/level-state.ts -
web/src/app/game/classes/game-objects/hero-placement.tsx -
web/src/app/game/components/level-layout/render-level.tsx -
web/src/app/game/classes/key-press-listener.ts

Movement: - Arrow keys and WASD. - LevelState.tick() calls
heroRef.controllerMoveRequested(direction) while direction held. -
Grid-step movement with pixel interpolation. - Tile = 16 px. -
movingPixelsRemaining = 16. - Travel speed = 1.5 px/frame, roughly
10--11 frames per tile at 60 FPS. - movingPixelDirection tracks last
successful move direction. - spriteFacingDirection only tracks
left/right for sprite art. - For a blocked movement,
movingPixelDirection is not updated because movement returns before
assignment. - To support turn-in-place interaction, a dedicated
facingDirection may be needed.

The audit identified an empty handleKeyDown in render-level.tsx,
with a document listener and cleanup. This may be a convenient place to
handle KeyE, but verify code before relying on it.

Interaction should be explicit (press E), not triggered by
collision/walking into NPC. Ignore key repeat and keyboard input while
typing in market controls. Pause or guard movement while market modal is
open; current direction controls may continue listening while modal is
open.
6.4 Camera and rendering
Camera: - web/src/app/game/classes/camera.ts - Starts at hero display
position. - transformOffset = -5.5 * CELL_SIZE (−88 px). - Smoothly
lerps toward hero. - Adds two-tile lookahead in movement direction. - No
camera clamping to map bounds, so outside-map area may be visible at
edges.

Renderer: -
web/src/app/game/components/level-layout/render-level.tsx -
Camera-transformed div wraps background tiles and placements. -
Background rendered first. - Placements are absolutely positioned using
placement.displayXY(). - Each placement uses placement.zIndex(). -
Body placement z-index is y-based; hero uses y-based layer plus
offset. - Static props should use y-based z-index if they visually
overlap characters.

Viewport: - --game-viewport-width and --game-viewport-height both
180px in web/src/app/globals.css. - CELL_SIZE=16, so visible world
is around 11.25 tiles across.

Larger map: - Camera-follow and absolute positioning can support a
larger map without major renderer changes. - Camera currently has no
edge clamp. - Background renders every cell; current 12×6 level creates
roughly 112 background cells; 30×20 would create roughly 704. -
LevelState emits snapshots at 60 FPS, so background and wrappers may be
reconciled repeatedly. - Test performance before making map excessively
large. Memoization/static background rendering can be considered only if
needed.
6.5 Market UI integration
Files: - web/src/app/game/main.tsx -
web/src/app/game/contexts/economy-context.tsx -
web/src/app/game/components/hud/market-hud.tsx

Current app tree reported: - GameProvider - EconomyProvider -
RenderLevel - MarketHud

MarketHud owns isOpen, merchantId, goodId, and quantity.
Merchant IDs in simulation: - farmer - lumberjack - blacksmith

Recommended bridge from world to MarketHud: - Create
web/src/app/game/contexts/market-ui-context.tsx. - UI-only context
should expose: - isMarketOpen - openMarket(merchantId?) -
closeMarket() - selectedMerchantId -
setSelectedMerchantId(merchantId) - Wrap RenderLevel and MarketHud
with this provider inside EconomyProvider. - Move only open/selected
merchant state into context. Keep selected good, quantity, trade
validation and trade actions inside MarketHud. - NPC interaction calls
openMarket("farmer"), openMarket("lumberjack"), or
openMarket("blacksmith"). - Keep economy simulation/state outside
LevelState. LevelState should only receive/call a callback with merchant
ID string.
7. Current camera.ts and placement code notes
The user shared these snippets in chat: - camera.ts: smooth camera
with 2-tile lookahead; transformOffset=-5.5*CELL_SIZE; no clamping. It
imports time from "console" although that import appears unused and
should only be removed if verified by lint/build and relevant to a
requested edit. - placement-factory.ts: maps current placement
constants to classes and instantiates a placement class for config. -
placement.ts: base class with movement/interpolation, collision,
rendering and interaction-related default methods. - level-1.ts: 12×6
Blue-theme maze, hero/key/lock/wall/flour/goal placements; contains many
commented-out legacy placement examples. Preserve these unless
explicitly asked to clean them. - render-level.tsx: creates LevelState
in a useEffect, subscribes to state, attaches document keydown listener
with an empty handler, renders background and placements inside camera
transform, and renders legacy overlays/dialogue/battle/journal-related
imports. Do not casually remove legacy code.
8. Recommended implementation sequence (not yet done)
Do not implement all steps in one giant change. Work in small verified
milestones.
Step 0 --- Before edits
- Inspect current git status --short.
- Inspect actual current files; this document is a handoff, not a
  guarantee of current code.
- Ask the owner for the selected new spritesheet before integrating
  replacement art.
- Do not modify the economy core or MarketHud during world conversion.
Step 1 --- Build the market-town map data and ground grid
- Create web/src/app/game/levels/market-town.ts.
- Keep level-1.ts intact.
- Start with a modest interior map, e.g. 24×16; avoid jumping straight
  to huge maps.
- Add semantic ground/path grid data (grass, dirt/path, stone, etc.).
- Extend LevelState and background tile layer to render per-cell
  ground when available.
- Keep fallback procedural background rendering so old level-1 still
  works.
- Initially use placeholder tile coordinates/current assets only if
  suitable; do not pretend the existing atlas has market scenery.
- Verify movement, collision, camera and build.
Step 2 --- Select/prepare art
- Owner intends to find a spritesheet online.
- Prefer CC0/open-license assets suitable for hackathon distribution.
- Current renderer assumes 16×16 tile cells, no margins/spacing, frame
  coordinates in tile units, and 32×32 character frames for Body.
- A drop-in replacement for old atlas dimensions would be 368×304
  (23×19 cells), but this is unlikely to match a random new atlas.
- A new atlas can be larger (e.g. 512×512 or 640×640) if dimensions
  are multiples of 16 and all referenced frame coordinates are
  updated.
- Do not use a 32×32-tile atlas as a drop-in replacement. Changing
  base tile size requires renderer/camera/movement/body changes.
- Keep old atlas and old TILES mappings available for legacy game
  systems if possible; safer to add a separate market atlas/adapter
  rather than break battle/dialogue/pickups.
Step 3 --- Add static props and merchant NPC placements
Likely new files: -
web/src/app/game/classes/game-objects/prop-placement.tsx -
web/src/app/game/classes/game-objects/merchant-npc-placement.tsx

Add placement type constants and register classes in
placement-factory.ts.

Prop placement: - Configurable sprite frame, solidity, optional
size/offset/z-index. - Static props should support solid collision where
appropriate. - Use y-based z-index for objects that overlap characters.

Merchant placement: - Config includes merchantId and sprite frame. -
NPC is solid. - Exposes an interaction descriptor / merchant ID. - Does
not implement battle/facing-each-other combat methods. - Do not use
random placement ID to identify merchant; use stable merchantId.
Step 4 --- Explicit interaction
- Use E as an explicit interaction key.
- Calculate tile in front of player from a dedicated facing direction.
- Current moving direction may not represent the direction faced after
  a blocked move; add a separate facing direction or safely update
  facing before solid collision.
- Interaction must not auto-trigger on collision.
- Ignore repeated keydown events.
- Ignore key events when an input/textarea has focus.
- Prevent player movement while MarketHud is open.
- NPC interaction opens MarketHud with the correct merchant selected.
Step 5 --- Shared market UI context
Create: - web/src/app/game/contexts/market-ui-context.tsx

Expose UI-only state: - isMarketOpen - openMarket(merchantId?) -
closeMarket - selectedMerchantId - setSelectedMerchantId

Move only isOpen and merchantId from MarketHud to this context. Keep
goodId, quantity, trade logic, and all current trade behavior in
MarketHud.

Wrap RenderLevel and MarketHud in MarketUiProvider inside
EconomyProvider.
Step 6 --- Camera and performance only if needed
- Add camera clamping only after testing the new map.
- Optimize background rendering only if actual performance is poor.
- Do not prematurely rewrite renderer or GameLoop.
Step 7 --- Market-specific HUD and legacy content
- Existing TopHud shows health/flour/inventory from old maze game.
- Do not delete it or legacy dialogue/tutorial/journal/battle code.
- Hide/disable legacy HUD on market level using a flag or separate
  rendering path, while preserving the old implementation.
Step 8 --- Verification
After each milestone: - npm run sim:verify - npm run build -
Prettier/lint as available. - Manual play test: walk around, verify
walls/props block correctly, verify NPC approach and E interaction,
verify selected merchant, verify trading unchanged, verify movement
pauses while market open. - Test the autonomous simulation without
player input and demonstrate NPC trades/prices/inventories changing. -
Do not claim verification unless commands actually ran and passed.
9. Immediate next action
The read-only architecture audit is complete. The next action is not
to implement every item above.

First: 1. Check the actual current repository state and git status. 2.
Decide whether the owner has chosen a spritesheet. If not, ask them to
find/select one before art integration. 3. Implement only the first
small milestone: create a modest market-town level data structure and
ground/path rendering with legacy fallback, keeping level-1.ts and
existing gameplay systems intact. 4. Do not add NPC interactions until
the new map renders and player movement/collision work correctly.

A safe initial OpenCode prompt should explicitly say: - Read this
PROJECT_CONTEXT.md first. - Inspect actual files before editing. -
Implement only the ground/path grid and new market-town level
data/rendering fallback. - Keep old level-1 file intact. - Do not add
NPC interaction, new economy behavior, NEAR contracts, or replace
spritesheet in this task. - Do not delete legacy
dialogue/tutorial/journal/battle code. - Do not install packages. -
Report exact changed files and run verification.
10. Important unknowns / verify in repository
- Whether the current market-town conversion has started after this
  handoff.
- Whether the user has selected/downloaded a new spritesheet.
- Exact current git status and whether any files changed since the
  last reported build.
- Whether old / menu/tutorial flow still needs to be bypassed for
  the hackathon demo.
- Whether the current modal blocks game movement; audit said it may
  not.
- Whether render-level.tsx still has the empty key handler exactly
  as reported.
- Whether all previously reported build/test commands still pass in
  current repo state.
Instructions to the next AI assistant
Read this file, then inspect the actual repository. Do not ask the user
to repeat information already here. Be pragmatic: preserve the working
economy and trading UI, convert the world in small increments, and
prioritize a convincing autonomous market simulation demo over
unnecessary architecture work.