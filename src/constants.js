/**
 * 2D Minecraft Clone - Constants
 */

// Physics Settings (720Hz Fixed Timestep)
export const PHYSICS_TPS = 720;
export const PHYSICS_DT = 1000 / PHYSICS_TPS; // approx 1.389ms per tick

// Time scaling: ratio of one 720Hz tick to one 60Hz frame
// This is the ONLY place where the legacy 60Hz reference exists
export const TICK_TIME_SCALE = 60 / PHYSICS_TPS; // 1/12 ≈ 0.0833

// Environment Settings
export const DAY_DURATION_MS = 360000;

export const TILE_SIZE = 32;
export const WORLD_WIDTH = 512 * 8;
export const WORLD_HEIGHT = 256;
export const REACH = 5 * TILE_SIZE;
export const CAMERA_SMOOTHING = 0.1;

// --- Player Physics Constants (720Hz native, per-tick values) ---
// Gravity acceleration per tick (velocity units)
export const GRAVITY_PER_TICK = 0.5 * TICK_TIME_SCALE; // ~0.0417 per tick
// Low Gravity Factor (for Cloud + Jump Pad)
export const GRAVITY_LOW_FACTOR = 0.25; // 25% gravity

// Terminal velocity cap (velocity units)
export const TERMINAL_VELOCITY = 20.0;
// Jump impulse (initial velocity, applied once)
export const JUMP_FORCE = 10;
export const SWIM_FORCE = 2;
export const BIG_JUMP_FORCE = 18;
// Velocity threshold for breaking blocks from below
export const UPWARD_COLLISION_VELOCITY_THRESHOLD = -20;
// Maximum block ID for natural blocks (0-12)
export const MAX_NATURAL_BLOCK_ID = 12;
// Natural block IDs set (includes WATER which has higher ID but is still natural)
export const NATURAL_BLOCK_IDS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20]); // AIR-CLOUD + WATER

// --- TNT Constants ---
export const TNT_FUSE_TICKS = 2160; // 3 seconds at 720Hz (3000ms * 720 / 1000)
export const TNT_EXPLOSION_RADIUS = 8; // tiles
export const TNT_KNOCKBACK_STRENGTH = 15.0;
export const TNT_KNOCKBACK_DISTANCE_OFFSET = 2; // multiplied by TILE_SIZE

// --- Accelerator Constants ---
export const ACCELERATOR_COOLDOWN_TICKS = 360; // 0.5 seconds at 720Hz (500ms * 720 / 1000)
export const ACCELERATOR_ACCELERATION_AMOUNT = 15; // Fixed acceleration amount

// --- Sapling Constants ---
export const SAPLING_GROWTH_BASE_TICKS = 4320; // 6 seconds at 720Hz (6000ms * 720 / 1000)
export const SAPLING_GROWTH_VARIANCE_TICKS = 720; // 1 second variance at 720Hz

// --- Jackpot Constants ---
export const JACKPOT_COOLDOWN_TICKS = 576; // 0.8 seconds at 720Hz (800ms * 720 / 1000)
export const JACKPOT_PARTICLE_LIFE_BASE_TICKS = 648; // ~0.9 seconds at 720Hz
export const JACKPOT_PARTICLE_LIFE_VARIANCE_TICKS = 288; // ~0.4 seconds variance

// Block Types
// Note: Craftable blocks (FIREWORK, JUMP_PAD, TNT, SAPLING, JACKPOT) are at the end
export const BLOCKS = {
    AIR: 0,
    DIRT: 1,
    GRASS: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    BEDROCK: 6,
    COAL: 7,
    GOLD: 8,
    WORKBENCH: 9,
    SAND: 10,
    SNOW: 11,
    CLOUD: 12,
    // Craftable blocks below
    FIREWORK: 13,
    JUMP_PAD: 14,
    TNT: 15,
    SAPLING: 16,
    JACKPOT: 17,
    ACCELERATOR_LEFT: 18,
    ACCELERATOR_RIGHT: 19,
    WATER: 20
};

export const BLOCK_PROPS = {
    [BLOCKS.AIR]: { name: 'Air', solid: false, transparent: true },
    [BLOCKS.DIRT]: { name: 'Dirt', solid: true, color: '#5d4037', type: 'soil' },
    [BLOCKS.GRASS]: { name: 'Grass', solid: true, color: '#388e3c', type: 'soil', drop: BLOCKS.DIRT },
    [BLOCKS.STONE]: { name: 'Stone', solid: true, color: '#757575', type: 'stone' },
    [BLOCKS.WOOD]: { name: 'Wood', solid: true, color: '#5d4037', type: 'wood' },
    [BLOCKS.LEAVES]: { name: 'Leaves', solid: true, transparent: false, color: '#2e7d32', type: 'plant', drop: BLOCKS.LEAVES },
    [BLOCKS.BEDROCK]: { name: 'Bedrock', solid: true, unbreakable: true, color: '#000000', type: 'stone' },
    [BLOCKS.COAL]: { name: 'Coal Ore', solid: true, color: '#212121', type: 'stone', drop: BLOCKS.COAL },
    [BLOCKS.GOLD]: { name: 'Gold Ore', solid: true, color: '#ffb300', type: 'stone', drop: BLOCKS.GOLD },
    [BLOCKS.WORKBENCH]: { name: 'Workbench', solid: false, unbreakable: true, transparent: true, color: '#8d6e63', type: 'wood' }, // Pass-through so the player can overlap the tile to trigger UI hooks without blocking movement.

    [BLOCKS.SAND]: { name: 'Sand', solid: true, color: '#d7c27a', type: 'sand', drop: BLOCKS.SAND },
    [BLOCKS.SNOW]: { name: 'Snow', solid: true, color: '#e0f7fa', type: 'snow', drop: BLOCKS.SNOW },
    [BLOCKS.CLOUD]: { name: 'Cloud', solid: true, color: '#ffffff', type: 'cloud', drop: BLOCKS.CLOUD },
    [BLOCKS.FIREWORK]: { name: 'Firework', solid: true, color: '#ef5350', type: 'wood', drop: BLOCKS.FIREWORK },
    [BLOCKS.JUMP_PAD]: { name: 'Jump Pad', solid: true, color: '#ab47bc', type: 'stone', drop: BLOCKS.JUMP_PAD },
    [BLOCKS.TNT]: { name: 'TNT', solid: true, color: '#d32f2f', type: 'wood', drop: BLOCKS.TNT },
    [BLOCKS.SAPLING]: { name: 'Sapling', solid: false, transparent: true, color: '#6fa85b', type: 'plant', drop: BLOCKS.SAPLING },
    [BLOCKS.JACKPOT]: { name: 'Jackpot', solid: false, transparent: true, color: '#ffd54f', type: 'stone', drop: BLOCKS.JACKPOT },
    [BLOCKS.ACCELERATOR_LEFT]: { name: 'Accelerator Left', solid: false, transparent: true, color: '#42a5f5', type: 'stone', drop: BLOCKS.ACCELERATOR_LEFT },
    [BLOCKS.ACCELERATOR_RIGHT]: { name: 'Accelerator Right', solid: false, transparent: true, color: '#66bb6a', type: 'stone', drop: BLOCKS.ACCELERATOR_RIGHT },
    [BLOCKS.WATER]: { name: 'Water', solid: false, transparent: true, color: '#2196f3', type: 'water', drop: BLOCKS.WATER }
};

export const HOTBAR_ITEMS = [
    BLOCKS.DIRT,
    BLOCKS.STONE,
    BLOCKS.WOOD,
    BLOCKS.LEAVES,
    BLOCKS.COAL,
    BLOCKS.GOLD,
    BLOCKS.SAND,
    BLOCKS.SNOW,
    BLOCKS.CLOUD,
    BLOCKS.WATER,
    // Craftable blocks below
    BLOCKS.FIREWORK,
    BLOCKS.JUMP_PAD,
    BLOCKS.TNT,
    BLOCKS.SAPLING,
    BLOCKS.JACKPOT,
    BLOCKS.ACCELERATOR_LEFT,
    BLOCKS.ACCELERATOR_RIGHT
];