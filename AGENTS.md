# AGENTS.md - Block Craft 2D XL

AI-readable project specification for Block Craft 2D XL, a browser-based 2D Minecraft-inspired sandbox game.

## Project Overview

- **Type**: Browser game (ES modules, no build step)
- **Entry Point**: `index.html`
- **Target Audience**: Children ~6 years old
- **UI Language**: Japanese (simple phrasing)
- **Code Language**: English (all comments, identifiers, documentation)

## Directory Structure

mine/
├── index.html          # Entry HTML with canvas and UI scaffolding
├── AGENTS.md           # This file (AI-readable project spec)
├── fonts/
│   ├── fredoka-one-latin-400-normal.woff2  # Local font for logo (primary)
│   └── fredoka-one-latin-400-normal.woff   # Local font for logo (fallback)
├── styles/
│   └── style.css       # Responsive layout, pixel-art viewport, hotbar, touch controls
└── src/
    ├── main.js         # Game entry point, loop, initialization orchestrator
    ├── constants.js    # Block IDs, physics values, block metadata (BLOCKS, BLOCK_PROPS)
    ├── utils.js        # Pure helpers: collision, coordinates, visibility, reach checks
    ├── renderer.js     # Rendering logic: sky, world, entities, and particles
    ├── world/          # World generation system (modular)
    │   ├── index.js    # World class: core state (getBlock, setBlock, checkAreaFree)
    │   ├── biomes.js   # BIOMES constants, configs, surface/subsurface block logic
    │   ├── generate.js # Main generation orchestration loop
    │   ├── terrain.js  # Extreme terrain (canyon, volcano, plateau, rolling hills)
    │   ├── water.js    # Water simulation (settling, ocean restoration)
    │   ├── vegetation.js # Biome-specific plant selection logic
    │   ├── features.js # Structures, hidden features, ponds, waterfalls
    │   ├── caves.js    # Cave walker and geology generation
    │   └── clouds.js   # Cloud placement
    ├── painters/       # Dumb drawing functions (coordinate-based block placement)
    │   ├── index.js    # Re-exports all painters
    │   ├── core.js     # drawBlob, drawPond, drawCavePocket
    │   ├── vegetation.js # Trees (oak, pine, jungle, acacia, swamp, dead), bush, cactus, boulder
    │   ├── structures.js # Oasis, monolith, bunker, world tree, islands, ruins, mineshaft
    │   └── clouds.js   # Cloud shapes (puffy, long, layered, cluster)
    ├── player.js       # Player class: movement, physics, collision, rendering
    ├── camera.js       # Camera state, smoothing, and world wrapping logic
    ├── input.js        # Keyboard, mouse, touch input bindings
    ├── inventory.js    # Hotbar UI, item counts, crafting consumption
    ├── actions.js      # Block placement and destruction logic
    ├── crafting.js     # Crafting modal UI and recipe validation
    ├── texture_gen.js  # Procedural block texture generation via canvas
    ├── audio.js        # Web Audio API sound effects (jump, mining, UI, coin, explosion)
    ├── fireworks.js    # Firework particle effects for celebrations; also handles bubble generation
    ├── jackpot.js      # Jackpot block: coin burst particles on player overlap
    ├── block_particles.js # Block destruction particle effects (texture color sampling)
    ├── sky.js          # Dynamic sky colors, sun/moon orbit, and star rendering
    ├── save.js         # Save/load system using localStorage with autosave functionality
    ├── tnt.js          # TNT explosion logic, timers, knockback, and block destruction
    ├── sapling_manager.js # Sapling growth timers and tree generation logic
    ├── ui_manager.js   # DOM event handling (Start screen, World Share modals)
    └── world_share.js  # World export/import as PNG images (1 tile = 1 pixel)

## Module Dependency Graph

main.js
├── constants.js
├── utils.js
├── audio.js
├── texture_gen.js
├── input.js
├── inventory.js
├── crafting.js
├── actions.js (imports: block_particles)
├── world/index.js
│   ├── world/generate.js
│   │   ├── world/biomes.js
│   │   ├── world/terrain.js
│   │   ├── world/water.js
│   │   ├── world/vegetation.js (imports: painters/)
│   │   ├── world/features.js (imports: painters/)
│   │   ├── world/caves.js (imports: painters/)
│   │   └── world/clouds.js (imports: painters/)
│   └── painters/index.js
│       ├── painters/core.js
│       ├── painters/vegetation.js
│       ├── painters/structures.js (imports: painters/vegetation)
│       └── painters/clouds.js
├── player.js (imports: block_particles)
├── camera.js (imports: utils, constants)
├── renderer.js (imports: block_particles)
├── jackpot.js
├── fireworks.js
├── block_particles.js (imports: constants)
├── save.js
├── tnt.js
├── sapling_manager.js (imports: constants, utils)
└── ui_manager.js (imports: save, world_share)

## Key Constants (constants.js)

| Constant | Description |
|----------|-------------|
| TILE_SIZE | Pixel size of one block (32) |
| WORLD_WIDTH | World width in tiles |
| WORLD_HEIGHT | World height in tiles |
| BLOCKS | Enum of block type IDs |
| BLOCK_PROPS | Per-block metadata (solid, transparent, breakable, tool, material) |
| GRAVITY | Vertical acceleration |
| JUMP_FORCE | Initial jump velocity |
| TERMINAL_VELOCITY | Maximum fall speed |
| REACH | Block interaction distance in pixels |

## Block Types (BLOCKS enum)

AIR, DIRT, GRASS, STONE, WOOD, LEAVES, SAND, WATER, BEDROCK, COAL_ORE, IRON_ORE, GOLD_ORE, DIAMOND_ORE, COBBLESTONE, PLANKS, BRICK, GLASS, TNT, SAPLING, CRAFTING_TABLE, JUMP_PAD, JACKPOT

## Core Systems

### Player (player.js)
- Physics: gravity, velocity, grounded state
- Collision: tile-based AABB resolution
- Movement: left/right with friction, jump
- Special: jump pad detection (1.8x jump force)
- Vertical wrap: player wraps around world vertically

### World (world/)
- **Role**: Logic Orchestrator & State Container.
- Modular structure for AI-efficient editing (touch only relevant files).

| File | Lines | Responsibility |
|------|-------|----------------|
| `index.js` | ~55 | World class core (getBlock, setBlock, checkAreaFree) |
| `biomes.js` | ~57 | BIOMES enum, getBiomeConfigs, getSurfaceBlock, getSubSurfaceBlock |
| `generate.js` | ~85 | Main generation loop orchestration |
| `terrain.js` | ~160 | Extreme terrain (canyon, volcano, plateau, hills, cliff painting) |
| `water.js` | ~116 | Water settling simulation, ocean level restoration |
| `vegetation.js` | ~47 | Biome-specific plant selection (delegates to painters) |
| `features.js` | ~134 | Structures, hidden features, ponds, waterfalls |
| `caves.js` | ~56 | Cave walker algorithm, geology (dirt/sand/water pockets) |
| `clouds.js` | ~30 | Cloud placement logic |

**Editing guide**:
- New biome: `biomes.js` + `vegetation.js`
- New tree type: `painters/vegetation.js` + `world/vegetation.js`
- Water behavior: `water.js` only
- New structure: `painters/structures.js` + `world/features.js`

### Painters (painters/)
- **Role**: Pure Implementation / Dumb Drawers.
- Contains functions to draw specific shapes given coordinates.
- **Logic-free**: Does not decide *if* a tree should spawn, only *how* to draw it.
- Uses an accessor interface (`get`/`set`) to modify the world.

| File | Lines | Contents |
|------|-------|----------|
| `index.js` | ~8 | Re-exports all painters |
| `core.js` | ~49 | drawBlob, drawPond, drawCavePocket |
| `vegetation.js` | ~175 | drawTreeOak/Pine/Jungle/Acacia/Swamp/Dead, drawCactus, drawBush, drawBoulder |
| `structures.js` | ~260 | drawOasis, drawMonolith, drawBuriedBunker, drawWorldTree, drawFloatingIsland, drawOceanIsland, drawDesertRuin, drawMineshaft, drawAncientRuins |
| `clouds.js` | ~95 | drawCloudPuffy/Long/Layered/Cluster, drawCloudByShapeId |

### Camera (camera.js)
- Manages viewport position (x, y)
- Handles smooth camera movement (lerp)
- Implements intelligent horizontal wrapping logic (follows player across world edges)

### Renderer (renderer.js)
- Handles all canvas drawing operations
- **Sky**: Draws gradients, stars, sun, and moon based on time/altitude
- **World**: Renders visible tiles with optimization (clipping)
- **Entities**: Draws player, particles (fireworks, jackpots, block destruction)
- **UI**: Renders cursor highlight and overlays

### Actions (actions.js)
- Block breaking: reach check, breakability check, inventory add, particle emission
- Block placing: reach check, adjacency check, collision check, inventory consume
- TNT/Sapling placement triggers delegation to respective managers via callbacks

### Block Particles (block_particles.js)
- Emits colored particles when blocks are destroyed (click/tap or jump-break)
- Samples actual RGB colors from block textures (not static BLOCK_PROPS colors)
- TypedArray SoA (Structure of Arrays) for high-performance rendering
- Particles scatter in all directions with physics (gravity, friction)
- `initBlockParticles(textures)`: Initialize with texture references
- `emitBlockBreakParticles(tileX, tileY, blockId)`: Spawn particles at block position

### UI Manager (ui_manager.js)
- Decouples DOM manipulation from game logic
- **Start Screen**: Handles "Start" and "Continue" buttons
- **World Share UI**: Manages Export/Import modals and file inputs
- **Callbacks**: Triggers `onStartGame`, `onLoadGame`, `onImportWorld` in `main.js`

### Sapling Manager (sapling_manager.js)
- Manages growth timers for all active saplings
- `growSapling()`: Generates tree structure (trunk + leaves)
- `liftPlayerAbove()`: Prevents player from getting stuck inside growing trees
- State persistence: provides timer data to Save Manager

### TNT System (tnt.js)
- Manages fuse timers and explosion physics
- `explodeTNT()`: Destroys blocks, applies player knockback, spawns particles
- State persistence: provides timer data to Save Manager

### Save/Load (save.js)
- Persists game state to localStorage
- Aggregates state from: World, Player, Inventory, TNT Manager, Sapling Manager
- `startAutosave()`: Periodic saving (5s)

### World Share (world_share.js)
- `exportWorldToImage()`: Converts world map to PNG (1 tile = 1 pixel)
- `importWorldFromImage()`: Converts PNG back to world map data
- Used by `ui_manager.js`

### Game Loop (main.js)
- **Orchestrator**: Initializes all subsystems (World, Player, Camera, Managers, Block Particles)
- **Update Loop**:
  - Updates Physics, Input
  - Delegates specific updates to `camera`, `tntManager`, `saplingManager`, `jackpot`, `fireworks`, `block_particles`
- **Draw Loop**: Calls `renderer.drawGame()`

## Input Handling (input.js)

| Input | Action |
|-------|--------|
| A / Left Arrow | Move left |
| D / Right Arrow | Move right |
| W / Up Arrow / Space | Jump |
| Mouse Left Click | Break/place block |
| 1-9 Keys | Select hotbar slot |
| Touch (mobile) | Virtual controls |

## Coding Conventions

- All source comments in English
- AI-readable: explicit, declarative, minimal ambiguity
- ES modules, no bundler
- Pure functions preferred in utils.js
- Class-based for stateful entities (Player, World, Camera)
