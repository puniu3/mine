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
├── styles/
│   └── style.css       # Responsive layout, pixel-art viewport, hotbar, touch controls
└── src/
    ├── main.js         # Game loop, initialization, day/night cycle, camera
    ├── constants.js    # Block IDs, physics values, block metadata (BLOCKS, BLOCK_PROPS)
    ├── utils.js        # Pure helpers: collision, coordinates, visibility, reach checks
    ├── renderer.js     # Rendering logic: sky, world, entities, and particles
    ├── world.js        # World class: terrain generation, block get/set, adjacency
    ├── player.js       # Player class: movement, physics, collision, rendering
    ├── input.js        # Keyboard, mouse, touch input bindings
    ├── inventory.js    # Hotbar UI, item counts, crafting consumption
    ├── actions.js      # Block placement and destruction logic
    ├── crafting.js     # Crafting modal UI and recipe validation
    ├── texture_gen.js  # Procedural block texture generation via canvas
    ├── audio.js        # Web Audio API sound effects (jump, mining, UI, coin, explosion)
    ├── fireworks.js    # Firework particle effects for celebrations
    ├── jackpot.js      # Jackpot block: coin burst particles on player overlap
    ├── sky.js          # Dynamic sky colors, sun/moon orbit, and star rendering
    ├── save.js         # Save/load system using localStorage with autosave functionality
    ├── tnt.js          # TNT explosion logic, timers, knockback, and block destruction
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
├── actions.js
├── world.js
├── player.js (imports: utils, audio, constants)
├── renderer.js (imports: utils, constants, sky, jackpot, fireworks)
├── jackpot.js (imports: constants)
├── fireworks.js
├── save.js
├── tnt.js (imports: constants, utils)
└── world_share.js (imports: constants, world)

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

### World (world.js)
- Procedural terrain generation with biomes
- Ore distribution at depth layers
- Block get/set with bounds checking

### Renderer (renderer.js)
- Handles all canvas drawing operations
- **Sky**: Draws gradients, stars, sun, and moon based on time/altitude
- **World**: Renders visible tiles with optimization (clipping)
- **Entities**: Draws player, particles (fireworks, jackpots)
- **UI**: Renders cursor highlight and overlays

### Actions (actions.js)
- Block breaking: reach check, breakability check, inventory add
- Block placing: reach check, adjacency check, collision check, inventory consume
- TNT/Sapling placement triggers timers in main.js

### Crafting (crafting.js)
- Modal UI opens near crafting table
- Recipe validation against inventory
- Consumes ingredients, adds result

### Jackpot (jackpot.js)
- Player overlap detection on JACKPOT blocks
- Emits gold coin burst particles (upward arc, gravity fall)
- Cooldown prevents rapid re-triggering (800ms)
- Plays coin sound effect

### Sky (sky.js)
- Time-based day/night cycle (normalized time 0.0-1.0)
- Non-linear color gradients: Day -> Golden Hour -> Sunset -> Night -> Sunrise
- Celestial bodies: Sun (changes color at horizon) and Moon (opposite phase)
- Star field generation with dynamic opacity (twinkling/fading)

### Audio (audio.js)
- SoundManager singleton: playJump, playMine, playPlace, playCoin, playExplosion, playBigJump
- Web Audio API oscillator-based synthesis

### Save/Load (save.js)
- Persists game state to localStorage with base64-encoded world map
- `loadGameState()`: Standalone function to load saved state (no dependencies)
- `createSaveManager()`: Factory function creating save manager with dependencies
  - `saveGameState()`: Saves world, player, inventory, and timers (TNT/saplings)
  - `applySavedState()`: Restores saved state to game objects
  - `startAutosave()`: Begins autosave interval (5s)
- Includes Uint8Array ↔ base64 conversion utilities for compact map storage

### TNT System (tnt.js)
- `createTNTManager()`: Factory function creating TNT manager
  - `update(dt)`: Decrements fuse timers, triggers explosions when timer expires
  - `onBlockPlaced(x, y)`: Starts 3s fuse timer when TNT placed
  - `getTimers()`: Returns timer array (for save/load)
  - `loadTimers()`: Restores timers from saved state
- `explodeTNT()`: Handles explosion logic
  - Destroys blocks in radius (circular pattern)
  - Applies knockback to player (inverse-square falloff)
  - Adds destroyed blocks to inventory
  - Creates explosion particles and sound

### World Share (world_share.js)
- `exportWorldToImage()`: Converts world map to PNG image (1 tile = 1 pixel)
  - Each block type mapped to unique color (RGB)
  - Returns PNG blob for download
- `importWorldFromImage()`: Loads world from PNG image file
  - Scales image to world dimensions using nearest-neighbor
  - Converts pixel colors to nearest block types (Euclidean distance)
- `downloadBlob()`: Triggers browser download for blob
- `findSpawnPosition()`: Locates suitable spawn point in imported world (center-top, searches for ground)
- Pre-computed RGB lookup table for performance

## Game Loop (main.js)

1. `update(dt)`:
   - Player physics, camera, input handling
   - Crafting and Jackpot checks
   - Fireworks updates
   - TNT timers and Sapling growth
2. `draw()`:
   - Delegates to `renderer.drawGame()`
   - Passes world state, camera, and input to renderer

## Input Handling (input.js)

| Input | Action |
|-------|--------|
| A / Left Arrow | Move left |
| D / Right Arrow | Move right |
| W / Up Arrow / Space | Jump |
| Mouse Left Click | Break/place block |
| 1-9 Keys | Select hotbar slot |
| Touch (mobile) | Virtual controls |

## Special Blocks

| Block | Behavior |
|-------|----------|
| TNT | Explodes after 3s, radius 8 tiles, adds drops to inventory |
| SAPLING | Grows into tree after 6s (4 wood trunk + leaves canopy) |
| JUMP_PAD | Boosts player jump by 1.8x |
| JACKPOT | Emits coin particles on touch, plays sound |
| CRAFTING_TABLE | Opens crafting modal when nearby |
| BEDROCK | Unbreakable |

## Coding Conventions

- All source comments in English
- AI-readable: explicit, declarative, minimal ambiguity
- ES modules, no bundler
- Pure functions preferred in utils.js
- Class-based for stateful entities (Player, World)

## Loading

No build step. Open `index.html` directly or via static server. ES module loading from `src/main.js`.