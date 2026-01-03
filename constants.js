/**
 * 2D Minecraft Clone - Constants
 */

export const TILE_SIZE = 32;
export const WORLD_WIDTH = 512;
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
    GOLD: 8
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
    [BLOCKS.GOLD]: { name: 'Gold Ore', solid: true, color: '#ffb300', type: 'stone', drop: BLOCKS.GOLD }
};

export const HOTBAR_ITEMS = [BLOCKS.DIRT, BLOCKS.GRASS, BLOCKS.STONE, BLOCKS.WOOD, BLOCKS.LEAVES, BLOCKS.GOLD];
