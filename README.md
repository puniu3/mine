# Block Craft 2D XL - Project Structure

Source code structure for a 2D Minecraft clone game.

## Directory Structure

```
mine/
├── index.html    # Main HTML file (entry point)
├── style.css     # Stylesheet
├── utils.js      # Pure function utilities
├── audio.js      # Audio module
├── main.js       # Main game logic
└── README.md     # This file
```

## File Descriptions

### index.html
- **Role**: Application entry point
- **Contents**:
  - HTML structure (Canvas, UI elements, start screen)
  - External CSS/JS file loading
  - Mobile touch control DOM elements

### style.css
- **Role**: All visual style definitions
- **Contents**:
  - Game canvas styles (pixelated rendering)
  - Start screen overlay
  - Hotbar (item slot) UI
  - Mobile touch controls (D-Pad, jump button)
  - Debug info & message log display

### utils.js
- **Role**: Pure function utilities (no side effects, easily testable)
- **JSDoc Type Definitions**:
  - `Rectangle`: Rectangle type `{x, y, w, h}`
  - `Point`: Coordinate type `{x, y}`
  - `TileCoord`: Tile coordinate type `{tx, ty}`
- **Function List**:

| Category | Function | Description |
|----------|----------|-------------|
| Math | `clamp(value, min, max)` | Clamp value within range |
| Math | `lerp(a, b, t)` | Linear interpolation |
| Math | `distance(x1, y1, x2, y2)` | Distance between 2 points |
| Coord | `worldToTile(worldX, worldY, tileSize)` | World → Tile coordinates |
| Coord | `tileToWorld(tileX, tileY, tileSize)` | Tile → World coordinates |
| Coord | `coordToIndex(x, y, width, height)` | 2D → 1D array index |
| Coord | `screenToWorld(screenX, screenY, cameraX, cameraY)` | Screen → World coordinates |
| Collision | `rectsIntersect(rect1, rect2)` | Rectangle intersection test |
| Collision | `pointInRect(px, py, rect)` | Point in rectangle test |
| Collision | `isWithinReach(px, py, centerX, centerY, reach)` | Reach range test |
| Block | `isBlockSolid(blockType, blockProps)` | Solid block check |
| Block | `isBlockTransparent(blockType, blockProps)` | Transparent block check |
| Block | `isBlockBreakable(blockType, blockProps)` | Breakable check |
| Block | `getBlockDrop(blockType, blockProps)` | Get drop item |
| Block | `getBlockMaterialType(blockType, blockProps)` | Get material type |
| Terrain | `calculateTerrainHeight(x, baseHeight)` | Calculate terrain height |
| Terrain | `generateTerrainHeights(width, baseHeight)` | Generate height array |
| Camera | `smoothCamera(currentCam, targetCam, smoothing)` | Smooth follow |
| Camera | `clampCamera(cameraPos, minPos, worldSize, viewportSize)` | Clamp camera position |
| Render | `calculateVisibleTileRange(...)` | Calculate visible tile range |
| Neighbor | `hasAdjacentBlock(tx, ty, getBlockFn, airBlockId)` | Adjacent block check |

### audio.js
- **Role**: Sound engine (using Web Audio API)
- **Contents**:
  - `SoundManager` class
    - `init()`: Initialize AudioContext
    - `playJump()`: Jump sound effect (square wave)
    - `playDig(type)`: Dig sound effect (noise + filter)
    - `playPop()`: UI selection sound effect
  - Global instance `sounds`

### main.js
- **Role**: Core game logic
- **Dependencies**: `utils.js`, `audio.js`
- **Contents**:
  - **Constants & Config**: Tile size, world size, physics constants
  - **Block Definitions**: `BLOCKS` (types), `BLOCK_PROPS` (properties)
  - **Inventory System**: Item management, UI updates
  - **Texture Generation**: Procedural textures (Canvas 2D)
  - **Game Classes**:
    - `World`: World generation, block management
    - `Player`: Player movement, collision detection, rendering
  - **Main Loop**: `init()`, `update()`, `draw()`, `loop()`
  - **Input Handling**: Keyboard, mouse, touch events

## Dependencies

```
index.html
    ├── style.css (styles)
    ├── utils.js (loaded first - pure function definitions)
    ├── audio.js (sounds instance definition)
    └── main.js (depends on utils.js, audio.js)
```

## Architecture Design

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│                   (Entry Point)                      │
└─────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  style.css  │  │  utils.js   │  │  audio.js   │
│  (Styles)   │  │(Pure Funcs) │  │  (Sound)    │
└─────────────┘  └──────┬──────┘  └──────┬──────┘
                        │                │
                        ▼                ▼
               ┌─────────────────────────────┐
               │          main.js            │
               │       (Game Logic)          │
               │  ┌─────────┐ ┌─────────┐   │
               │  │  World  │ │ Player  │   │
               │  └─────────┘ └─────────┘   │
               └─────────────────────────────┘
```

## Tech Stack

- **HTML5 Canvas**: Game rendering
- **Web Audio API**: Sound generation
- **Vanilla JavaScript**: No framework
- **CSS3**: UI & responsive design
- **JSDoc**: Type definition documentation

## Game Features

1. **World Generation**: Procedural terrain generation (sine wave based)
2. **Block Operations**: Break & place (with reach limit)
3. **Inventory**: Item management via hotbar
4. **Auto-Climb**: Automatic elevation when placing block at feet
5. **Mobile Support**: Touch controls
