/**
 * TNT Module - Handles TNT block explosion logic and timers
 * Updated to handle clustered explosions where area scales with TNT count.
 */

import {
    TILE_SIZE, BLOCKS, BLOCK_PROPS,
    TNT_FUSE_TICKS, TNT_EXPLOSION_RADIUS
} from './constants.js';
import { isBlockBreakable } from './utils.js';
import { triggerJackpotExplosion } from './jackpot.js';

// Local Fixed-point arithmetic helpers to match Player's logic
const FP_SHIFT = 12;
const FP_ONE = 1 << FP_SHIFT;
const toFP = (val) => Math.floor(val * FP_ONE);

/**
 * Helper to wrap coordinates around world dimensions
 * @param {number} val - Coordinate value
 * @param {number} max - World dimension (width or height)
 * @returns {number} Wrapped coordinate [0, max)
 */
const wrap = (val, max) => ((val % max) + max) % max;

/**
 * Finds all contiguous TNT blocks connected to the start coordinates.
 * Uses a Flood Fill algorithm (Depth-First Search) with world wrapping.
 * @param {number} startX - X coordinate
 * @param {number} startY - Y coordinate
 * @param {Object} world - World object
 * @returns {Array} Array of connected TNT coordinates (continuous, not wrapped) [{x, y}, ...]
 */
function getConnectedTNTs(startX, startY, world) {
    const connected = [];
    const visited = new Set();
    // Stack stores continuous coordinates (can be negative or > width due to wrapping)
    const stack = [{ x: startX, y: startY }];
    
    // Helper to generate a unique key for the Set using wrapped coordinates
    // This ensures we don't process the same physical block twice
    const key = (x, y) => `${wrap(x, world.width)},${wrap(y, world.height)}`;

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
            const wrappedX = wrap(n.x, world.width);
            const wrappedY = wrap(n.y, world.height);
            const k = key(n.x, n.y);

            if (!visited.has(k)) {
                // If it is a TNT block, add to stack
                if (world.getBlock(wrappedX, wrappedY) === BLOCKS.TNT) {
                    visited.add(k);
                    stack.push(n);
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
    // Note: tnt.x/y are continuous, so we must wrap them to access the world
    for (const tnt of tntCluster) {
        sumX += tnt.x;
        sumY += tnt.y;
        world.setBlock(wrap(tnt.x, world.width), wrap(tnt.y, world.height), BLOCKS.AIR); 
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
    // We pass the continuous center coordinates. The player physics might need adaptation 
    // to handle wrapping logic relative to this center, but passing the raw center is best here.
    player.applyExplosionImpulse(centerX_FP, centerY_FP, radius_FP, sizeMultiplier_FP);

    // 4. Destroy blocks in the expanded radius
    // Search area slightly larger than radius to catch edge blocks
    // Convert radius_FP back to blocks for the loop bounds
    const radiusInBlocks = Math.ceil(radius_FP / FP_ONE);
    
    // Center in Grid units (using the continuous pixel coordinates)
    const centerGridX = Math.floor(pixelCenterX / TILE_SIZE);
    const centerGridY = Math.floor(pixelCenterY / TILE_SIZE);

    // We do NOT clamp these bounds to 0..width/height because we want to handle wrapping.
    // We iterate over the logical square area around the continuous center.
    const startX = centerGridX - radiusInBlocks;
    const endX = centerGridX + radiusInBlocks;
    const startY = centerGridY - radiusInBlocks;
    const endY = centerGridY + radiusInBlocks;

    // Squared radius in FP World Units for distance comparison
    const radiusSq_FP = Math.floor((radius_FP * TILE_SIZE) * (radius_FP * TILE_SIZE));

    for (let by = startY; by <= endY; by++) {
        for (let bx = startX; bx <= endX; bx++) {
            // Calculate block center in FP World Units (continuous)
            const blockCenterX_FP = bx * TILE_SIZE * FP_ONE + toFP(TILE_SIZE / 2);
            const blockCenterY_FP = by * TILE_SIZE * FP_ONE + toFP(TILE_SIZE / 2);

            const dx = blockCenterX_FP - centerX_FP;
            const dy = blockCenterY_FP - centerY_FP;

            // Check if block is within explosion radius using squared distance (Integer math)
            if (dx * dx + dy * dy <= radiusSq_FP) {
                // Determine the actual physical block coordinates by wrapping
                const wrappedX = wrap(bx, world.width);
                const wrappedY = wrap(by, world.height);

                const block = world.getBlock(wrappedX, wrappedY);
                
                if (block === BLOCKS.AIR) continue;

                // Special handling for FIREWORK: Explode with particles instead of collecting
                if (block === BLOCKS.FIREWORK) {
                    // Convert FP block center to pixels
                    const px = blockCenterX_FP / FP_ONE;
                    const py = blockCenterY_FP / FP_ONE;
                    
                    // Trigger massive particle explosion (Drastically reinforced)
                    // Call 10 times to spawn ~1000 particles total
                    // Scatter origin slightly to create a larger "burst" area feeling
                    for (let i = 0; i < 10; i++) {
                        const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                        
                        // Spread the emission point within a 1.5 tile range to simulate a massive volumetric blast
                        const spreadOffset = TILE_SIZE * 0.75;
                        const offX = (Math.random() - 0.5) * 2 * spreadOffset;
                        const offY = (Math.random() - 0.5) * 2 * spreadOffset;
                        
                        createExplosionParticles(px + offX, py + offY, color);
                    }
                    
                    // Remove block without adding to inventory
                    world.setBlock(wrappedX, wrappedY, BLOCKS.AIR);
                    continue;
                }

                // Special handling for JACKPOT: Collect AND Explode with coins
                if (block === BLOCKS.JACKPOT) {
                    // 1. Trigger massive coin explosion
                    triggerJackpotExplosion(wrappedX, wrappedY);
                    
                    // 2. Add to inventory
                    addToInventory(block);

                    // 3. Remove block
                    world.setBlock(wrappedX, wrappedY, BLOCKS.AIR);
                    continue;
                }

                if (isBlockBreakable(block, BLOCK_PROPS)) {
                    addToInventory(block);
                    world.setBlock(wrappedX, wrappedY, BLOCKS.AIR);
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
         * Tick TNT timers and trigger explosions
         * Fixed timestep (720Hz) - one tick per physics step
         */
        tick() {
            for (let i = timers.length - 1; i >= 0; i--) {
                const tnt = timers[i];

                // If the block is gone (e.g. part of a cluster that already exploded), remove timer
                if (world.getBlock(tnt.x, tnt.y) !== BLOCKS.TNT) {
                    timers.splice(i, 1);
                    continue;
                }

                tnt.timer--;

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
            timers.push({ x, y, timer: TNT_FUSE_TICKS });
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
