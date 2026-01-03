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
    FIREWORK: 10,
    JUMP_PAD: 11,
    TNT: 12
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
    [BLOCKS.WORKBENCH]: { name: 'Workbench', solid: false, unbreakable: true, transparent: true, color: '#8d6e63', type: 'wood' }, // Non-solid to allow overlap for UI? Prompt says "overlapping". If solid, can't overlap easily unless it's a sensor. Let's make it non-solid or use a separate sensor check. Prompt: "Player overlaps". If solid, player stands on it or hits head. I'll make it PASSABLE (solid: false) so player can walk "in" it to trigger UI, OR make it solid and check touching. "Overlapping" usually implies non-solid. I'll make it solid: false for now, acts like a background object or furniture. Wait, if it's solid: false, can I place it? Yes.
    // Actually, "Worktable tile... indestructible... scattered on surface". If it's on surface and not solid, player falls through it?
    // In Terraria/Minecraft, workbenches are solid. "Overlapping" might mean "Standing in front of" or "Touching".
    // "Overlapping while player is overlapping" -> "重なっている間". In a 2D side scroller, usually this means standing in the same grid cell.
    // If I make it solid, I can't be *in* the same cell.
    // Maybe the user means "Standing *on* or near"?
    // "重なっている" (Kasanatteiru) literally means overlapping.
    // I will make it `solid: false` (pass-through) so the player can walk past it and "overlap" it.

    [BLOCKS.FIREWORK]: { name: 'Firework', solid: true, color: '#ef5350', type: 'wood', drop: BLOCKS.FIREWORK },
    [BLOCKS.JUMP_PAD]: { name: 'Jump Pad', solid: true, color: '#ab47bc', type: 'stone', drop: BLOCKS.JUMP_PAD },
    [BLOCKS.TNT]: { name: 'TNT', solid: true, color: '#d32f2f', type: 'wood', drop: BLOCKS.TNT }
};

export const HOTBAR_ITEMS = [BLOCKS.DIRT, BLOCKS.GRASS, BLOCKS.STONE, BLOCKS.WOOD, BLOCKS.LEAVES, BLOCKS.COAL, BLOCKS.GOLD, BLOCKS.FIREWORK, BLOCKS.JUMP_PAD, BLOCKS.TNT];
