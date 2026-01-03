# Block Craft 2D XL

A 2D Minecraft-inspired sandbox that runs directly in the browser. Open `index.html` in a modern browser (or host it via any static server) to play.

## Directory layout
```
mine/
├── index.html          # Entry point wiring the canvas and UI
├── styles/
│   └── style.css       # Global layout and responsive styles
├── src/
│   ├── actions.js      # Pointer-driven block placement and destruction
│   ├── audio.js        # Web Audio API helpers for jump, mining, and UI sounds
│   ├── constants.js    # Block IDs, physics constants, and block metadata
│   ├── crafting.js     # Crafting modal UI and recipe validation
│   ├── fireworks.js    # Firework particle effects for celebration moments
│   ├── input.js        # Keyboard, mouse, and touch bindings
│   ├── inventory.js    # Hotbar UI state and inventory bookkeeping
│   ├── main.js         # Game loop, player controller, and initialization hub
│   ├── texture_gen.js  # Procedural block textures rendered on canvas
│   ├── utils.js        # Math helpers, collision checks, and visibility math
│   └── world.js        # World generation and block storage
└── README.md
```

## Module responsibilities
- **index.html**: Declares the canvas and UI scaffolding and loads `src/main.js` as an ES module.
- **styles/style.css**: Defines the pixel-art viewport, hotbar layout, and touch controls.
- **src/main.js**: Composes all modules, runs `update` / `draw` loops, and coordinates player movement.
- **src/constants.js**: Centralizes block identifiers, physics values, and per-block properties.
- **src/utils.js**: Provides pure helpers for coordinate transforms, collision testing, and visible tile ranges.
- **src/world.js**: Implements the `World` class for terrain creation, block queries, and adjacency checks.
- **src/inventory.js**: Tracks item counts, hotbar selection, and crafting consumption logic.
- **src/input.js**: Maps keyboard, pointer, and touch input to in-game actions.
- **src/actions.js**: Encapsulates placement and destruction rules using reach and neighbor checks.
- **src/crafting.js**: Manages the crafting modal lifecycle and recipe validation.
- **src/texture_gen.js**: Generates procedural textures per block type on a canvas.
- **src/fireworks.js**: Updates and renders celebratory firework particles.
- **src/audio.js**: Produces jump, mining, and UI effects and exposes a shared `SoundManager`.

## Loading order and build
The game is shipped as ES modules with no bundling step. `index.html` imports `src/main.js`, which pulls in utilities, constants, world/player logic, UI, input, audio, and effects. Loading via `file://` works in most browsers; a simple static server is recommended for consistent module caching behavior.

## Commenting guidelines
All source comments must be written in English and optimized for AI readability (short, explicit reasoning and minimal ambiguity). Favor declarative statements over narrative notes so automated tools can interpret intent.

## Playing locally
Open `index.html` from a local static server or directly in the browser. Press the start button to generate the world, then explore with the hotbar, crafting UI, fireworks, and auto-climb movement.
