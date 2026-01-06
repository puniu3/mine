import { BLOCKS, TILE_SIZE, BLOCK_PROPS } from './constants.js';
import { rectsIntersect, isBlockSolid, isBlockBreakable } from './utils.js';

/**
 * Manages sapling growth logic and timers.
 */
export function createSaplingManager({ world, player }) {
    const saplingTimers = [];
    const SAPLING_GROWTH_TIME = 6000;

    /**
     * Adds a new sapling to be tracked.
     * @param {number} x - The x coordinate (tile)
     * @param {number} y - The y coordinate (tile)
     * @param {number} [remainingTime] - Optional remaining time for loading saves
     */
    function addSapling(x, y, remainingTime = SAPLING_GROWTH_TIME) {
        saplingTimers.push({ x, y, timer: remainingTime });
    }

    /**
     * Helper: Lifts the player up if a block grows into their collision box.
     */
    function liftPlayerAbove(blockRect) {
        const targetY = blockRect.y - player.height - 0.1;
        if (player.y > targetY) {
            player.y = targetY;
        }
        player.vy = 0;
        player.grounded = true;

        // Calculate tile range covered by player
        const startX = Math.floor(player.x / TILE_SIZE);
        const endX = Math.floor((player.x + player.width) / TILE_SIZE);
        const startY = Math.floor(player.y / TILE_SIZE);
        const endY = Math.floor((player.y + player.height) / TILE_SIZE);

        let adjustedTop = null;

        // Prevent suffocation: Clear blocks occupied by the player after lifting
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const block = world.getBlock(x, y);
                if (!isBlockSolid(block, BLOCK_PROPS)) continue;

                if (isBlockBreakable(block, BLOCK_PROPS)) {
                    world.setBlock(x, y, BLOCKS.AIR);
                } else {
                    // If unbreakable, find the highest solid point
                    const candidateTop = y * TILE_SIZE;
                    adjustedTop = adjustedTop === null ? candidateTop : Math.min(adjustedTop, candidateTop);
                }
            }
        }

        // Final adjustment if trapped in unbreakable blocks
        if (adjustedTop !== null) {
            player.y = adjustedTop - player.height - 0.1;
        }
    }

    /**
     * Places a specific block for the tree and handles collision.
     */
    function placeGrowthBlock(x, y, type) {
        if (x < 0 || x >= world.width || y < 0 || y >= world.height) return;

        const existing = world.getBlock(x, y);
        // Don't replace unbreakable blocks
        if (BLOCK_PROPS[existing] && BLOCK_PROPS[existing].unbreakable) return;

        // Clear non-sapling blocks before placement (simple replacement)
        if (existing !== BLOCKS.AIR && existing !== BLOCKS.SAPLING) {
            world.setBlock(x, y, BLOCKS.AIR);
        }

        const blockRect = { x: x * TILE_SIZE, y: y * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
        
        // check collision with player
        if (rectsIntersect(player.getRect(), blockRect)) {
            liftPlayerAbove(blockRect);
        }

        world.setBlock(x, y, type);
    }

    /**
     * Generates the tree structure.
     */
    function growSapling(x, y) {
        const height = 4;
        const placements = [];
        
        // Trunk
        for (let i = 0; i < height; i++) {
            placements.push({ x, y: y - i, type: BLOCKS.WOOD });
        }

        // Leaves
        const topY = y - (height - 1);
        for (let lx = x - 2; lx <= x + 2; lx++) {
            for (let ly = topY - 2; ly <= topY; ly++) {
                // Skip corners to make it rounded
                if (Math.abs(lx - x) === 2 && Math.abs(ly - topY) === 2) continue;
                placements.push({ x: lx, y: ly, type: BLOCKS.LEAVES });
            }
        }

        placements.forEach(({ x: px, y: py, type }) => placeGrowthBlock(px, py, type));
    }

    /**
     * Updates timers. Should be called in the game loop.
     */
    function update(dt) {
        for (let i = saplingTimers.length - 1; i >= 0; i--) {
            const sapling = saplingTimers[i];
            
            // If the sapling was destroyed by the player, remove the timer
            if (world.getBlock(sapling.x, sapling.y) !== BLOCKS.SAPLING) {
                saplingTimers.splice(i, 1);
                continue;
            }

            sapling.timer -= dt;
            if (sapling.timer <= 0) {
                growSapling(sapling.x, sapling.y);
                saplingTimers.splice(i, 1);
            }
        }
    }

    return {
        addSapling,
        update,
        // Expose reference for SaveManager
        getTimers: () => saplingTimers,
        // Helper to restore timers from save
        restoreTimers: (savedTimers) => {
            saplingTimers.length = 0;
            if (savedTimers) saplingTimers.push(...savedTimers);
        }
    };
}
