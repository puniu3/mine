/**
 * TNT Module - Handles TNT block explosion logic and timers
 * Updated to handle clustered explosions where area scales with TNT count.
 */

import {
    TILE_SIZE, BLOCKS, BLOCK_PROPS,
    TNT_FUSE_TIME, TNT_EXPLOSION_RADIUS
} from './constants.js';
import { isBlockBreakable } from './utils.js';

// Local Fixed-point arithmetic helpers to match Player's logic
const FP_SHIFT = 12;
const FP_ONE = 1 << FP_SHIFT;
const toFP = (val) => Math.floor(val * FP_ONE);

/**
 * Finds all contiguous TNT blocks connected to the start coordinates.
 * Uses a Flood Fill algorithm (Depth-First Search).
 * @param {number} startX - X coordinate
 * @param {number} startY - Y coordinate
 * @param {Object} world - World object
 * @returns {Array} Array of connected TNT coordinates [{x, y}, ...]
 */
function getConnectedTNTs(startX, startY, world) {
    const connected = [];
    const visited = new Set();
    const stack = [{ x: startX, y: startY }];
    
    // Helper to generate a unique key for the Set
    const key = (x, y) => `${x},${y}`;

    visited.add(key(startX, startY));

    while (stack.length > 0) {
        const current = stack.pop();
        connected.push(current);

        // Check 4 directions (Up, Down, Left, Right)
        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];

        for (const n of neighbors) {
            // Check bounds
            if (n.x >= 0 && n.x < world.width && n.y >= 0 && n.y < world.height) {
                const k = key(n.x, n.y);
                if (!visited.has(k)) {
                    // If it is a TNT block, add to stack
                    if (world.getBlock(n.x, n.y) === BLOCKS.TNT) {
                        visited.add(k);
                        stack.push(n);
                    }
                }
            }
        }
    }
    return connected;
}

/**
 * Explodes a cluster of TNT blocks as a single large explosion
 * @param {Array} tntCluster - Array of TNT coordinates in the cluster
 * @param {Object} context - Context object containing dependencies
 */
function explodeCluster(tntCluster, context) {
    const { world, player, sounds, addToInventory, createExplosionParticles } = context;

    sounds.playExplosion();

    // 1. Calculate Center of Explosion using Fixed Point arithmetic
    // We sum up the grid coordinates first, then convert to FP world coordinates.
    let sumX = 0;
    let sumY = 0;
    
    // Remove the TNT blocks from the world immediately
    for (const tnt of tntCluster) {
        sumX += tnt.x;
        sumY += tnt.y;
        world.setBlock(tnt.x, tnt.y, BLOCKS.AIR); 
    }

    // Calculate centroid in grid units (float for averaging, but then snapped to FP)
    // To ensure determinism, we multiply by FP_ONE before division if possible,
    // or just assume standard float division is safe enough for grid averages before snapping.
    // Here we convert to World Pixel Coordinates in FP.
    // Center = (Sum / Count) * TILE_SIZE + HalfTile
    
    const count = tntCluster.length;
    // Calculate average grid position scaled to FP
    const avgGridX_FP = Math.floor((sumX * FP_ONE) / count);
    const avgGridY_FP = Math.floor((sumY * FP_ONE) / count);

    // Convert to World Center (in FP)
    // Coordinate = Grid * TILE_SIZE + TILE_SIZE/2
    const centerX_FP = avgGridX_FP * TILE_SIZE + toFP(TILE_SIZE / 2);
    const centerY_FP = avgGridY_FP * TILE_SIZE + toFP(TILE_SIZE / 2);
    
    // Float center for particles (visuals only)
    const pixelCenterX = centerX_FP / FP_ONE;
    const pixelCenterY = centerY_FP / FP_ONE;

    // 2. Calculate Explosion Scale
    // Radius scales with sqrt(count).
    // We calculate sizeMultiplier in FP.
    const sizeMultiplier_FP = Math.floor(Math.sqrt(count) * FP_ONE);
    
    // Base radius in blocks (FP)
    const baseRadius_FP = toFP(TNT_EXPLOSION_RADIUS);
    const radius_FP = Math.floor((baseRadius_FP * sizeMultiplier_FP) / FP_ONE);

    // Create particles (Visuals - non-deterministic elements allowed here)
    const particleCount = Math.min(10, Math.ceil(count * 1.5));
    const sizeMultiplier = sizeMultiplier_FP / FP_ONE;
    for(let i = 0; i < particleCount; i++) {
        const spread = TILE_SIZE * sizeMultiplier * 0.5;
        const offX = (Math.random() - 0.5) * spread;
        const offY = (Math.random() - 0.5) * spread;
        createExplosionParticles(pixelCenterX + offX, pixelCenterY + offY);
    }

    // 3. Apply Knockback (Delegated to Player for deterministic physics)
    player.applyExplosionImpulse(centerX_FP, centerY_FP, radius_FP, sizeMultiplier_FP);

    // 4. Destroy blocks in the expanded radius
    // Search area slightly larger than radius to catch edge blocks
    // Convert radius_FP back to blocks for the loop bounds
    const radiusInBlocks = Math.ceil(radius_FP / FP_ONE);
    
    // Center in Grid units
    const centerGridX = Math.floor(pixelCenterX / TILE_SIZE);
    const centerGridY = Math.floor(pixelCenterY / TILE_SIZE);

    const startX = Math.max(0, centerGridX - radiusInBlocks);
    const endX = Math.min(world.width - 1, centerGridX + radiusInBlocks);
    const startY = Math.max(0, centerGridY - radiusInBlocks);
    const endY = Math.min(world.height - 1, centerGridY + radiusInBlocks);

    // Squared radius in FP World Units for distance comparison
    const radiusSq_FP = Math.floor((radius_FP * TILE_SIZE) * (radius_FP * TILE_SIZE));

    for (let by = startY; by <= endY; by++) {
        for (let bx = startX; bx <= endX; bx++) {
            // Calculate block center in FP World Units
            const blockCenterX_FP = bx * TILE_SIZE * FP_ONE + toFP(TILE_SIZE / 2);
            const blockCenterY_FP = by * TILE_SIZE * FP_ONE + toFP(TILE_SIZE / 2);

            const dx = blockCenterX_FP - centerX_FP;
            const dy = blockCenterY_FP - centerY_FP;

            // Check if block is within explosion radius using squared distance (Integer math)
            // Note: Since we are in FP (x4096), squaring can result in large numbers.
            // 4096^2 = 16,777,216. TILE_SIZE=32.
            // Max typical distance ~10 blocks = 320 pixels.
            // 320 * 4096 = 1,310,720.
            // Square ~= 1.7e12. Safe within JS Number (9e15).
            if (dx * dx + dy * dy <= radiusSq_FP) {
                const block = world.getBlock(bx, by);
                
                if (block === BLOCKS.AIR) continue;

                if (isBlockBreakable(block, BLOCK_PROPS)) {
                    addToInventory(block);
                    world.setBlock(bx, by, BLOCKS.AIR);
                }
            }
        }
    }
}

/**
 * Creates a TNT manager for handling TNT timers and explosions
 * @param {Object} context - Context object containing dependencies
 * @returns {Object} TNT manager with update and onBlockPlaced methods
 */
export function createTNTManager(context) {
    const { world } = context;
    const timers = [];

    return {
        /**
         * Update TNT timers and trigger explosions
         * @param {number} dt - Delta time in milliseconds
         */
        update(dt) {
            for (let i = timers.length - 1; i >= 0; i--) {
                const tnt = timers[i];
                
                // If the block is gone (e.g. part of a cluster that already exploded), remove timer
                if (world.getBlock(tnt.x, tnt.y) !== BLOCKS.TNT) {
                    timers.splice(i, 1);
                    continue;
                }

                tnt.timer -= dt;
                
                if (tnt.timer <= 0) {
                    // 1. Find the entire cluster of connected TNTs
                    const cluster = getConnectedTNTs(tnt.x, tnt.y, world);
                    
                    // 2. Explode the whole cluster at once
                    explodeCluster(cluster, context);
                    
                    // Remove the timer for the origin TNT
                    timers.splice(i, 1);
                }
            }
        },

        /**
         * Called when a TNT block is placed
         * @param {number} x - Tile X coordinate
         * @param {number} y - Tile Y coordinate
         */
        onBlockPlaced(x, y) {
            timers.push({ x, y, timer: TNT_FUSE_TIME });
        },

        /**
         * Get the timers array (for save/load functionality)
         * @returns {Array} Array of TNT timers
         */
        getTimers() {
            return timers;
        },

        /**
         * Load timers from saved state
         * @param {Array} savedTimers - Array of saved timer objects
         */
        loadTimers(savedTimers) {
            timers.length = 0;
            timers.push(...savedTimers);
        }
    };
}
