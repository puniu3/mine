/**
 * 2D Minecraft Clone - Constants
 */

export const TILE_SIZE = 32;
export const WORLD_WIDTH = 512 * 8;
export const WORLD_HEIGHT = 256;
export const GRAVITY = 0.5;
export const JUMP_FORCE = 10;
export const REACH = 5 * TILE_SIZE;
export const CAMERA_SMOOTHING = 0.1;

// Block Types
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
    SANDSTONE: 12,
    PLANK: 13,
    STONE_BRICK: 14,
    FIREWORK: 15,
    JUMP_PAD: 16,
    TNT: 17
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
    [BLOCKS.SANDSTONE]: { name: 'Sandstone', solid: true, color: '#c2aa63', type: 'sand', drop: BLOCKS.SANDSTONE },
    [BLOCKS.PLANK]: { name: 'Plank', solid: true, color: '#a9825a', type: 'wood', drop: BLOCKS.PLANK },
    [BLOCKS.STONE_BRICK]: { name: 'Stone Brick', solid: true, color: '#9e9e9e', type: 'stone', drop: BLOCKS.STONE_BRICK },
    [BLOCKS.FIREWORK]: { name: 'Firework', solid: true, color: '#ef5350', type: 'wood', drop: BLOCKS.FIREWORK },
    [BLOCKS.JUMP_PAD]: { name: 'Jump Pad', solid: true, color: '#ab47bc', type: 'stone', drop: BLOCKS.JUMP_PAD },
    [BLOCKS.TNT]: { name: 'TNT', solid: true, color: '#d32f2f', type: 'wood', drop: BLOCKS.TNT }
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
    BLOCKS.SANDSTONE,
    BLOCKS.PLANK,
    BLOCKS.STONE_BRICK,
    BLOCKS.FIREWORK,
    BLOCKS.JUMP_PAD,
    BLOCKS.TNT
];
