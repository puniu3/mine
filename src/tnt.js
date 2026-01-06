/**
 * TNT Module - Handles TNT block explosion logic and timers
 * Updated to handle clustered explosions where area scales with TNT count.
 */

import {
    TILE_SIZE, BLOCKS, BLOCK_PROPS,
    TNT_FUSE_TIME, TNT_EXPLOSION_RADIUS,
    TNT_KNOCKBACK_STRENGTH, TNT_KNOCKBACK_DISTANCE_OFFSET
} from './constants.js';
import { isBlockBreakable } from './utils.js';

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

    // 1. Calculate Center of Explosion
    // We use the average position of all blocks in the cluster
    let sumX = 0;
    let sumY = 0;
    
    // Remove the TNT blocks from the world immediately so they don't drop as items
    for (const tnt of tntCluster) {
        sumX += tnt.x;
        sumY += tnt.y;
        world.setBlock(tnt.x, tnt.y, BLOCKS.AIR); 
    }

    const centerX = sumX / tntCluster.length;
    const centerY = sumY / tntCluster.length;
    
    // Pixel coordinates for particles/knockback
    const pixelCenterX = centerX * TILE_SIZE + TILE_SIZE / 2;
    const pixelCenterY = centerY * TILE_SIZE + TILE_SIZE / 2;

    // 2. Calculate Explosion Scale
    // Area scales linearly with count -> Radius scales with sqrt(count)
    const clusterSize = tntCluster.length;
    const sizeMultiplier = Math.sqrt(clusterSize);
    const radius = TNT_EXPLOSION_RADIUS * sizeMultiplier;

    // Create particles
    // Scale particle count slightly with cluster size to look impressive
    const particleCount = Math.min(10, Math.ceil(clusterSize * 1.5));
    for(let i = 0; i < particleCount; i++) {
        // Random offset for particles based on the new radius size
        const spread = TILE_SIZE * sizeMultiplier * 0.5;
        const offX = (Math.random() - 0.5) * spread;
        const offY = (Math.random() - 0.5) * spread;
        createExplosionParticles(pixelCenterX + offX, pixelCenterY + offY);
    }

    // 3. Apply Knockback (Calculated from the center of the cluster)
    const playerCenterX = player.getCenterX();
    const playerCenterY = player.getCenterY();
    const distX = playerCenterX - pixelCenterX;
    const distY = playerCenterY - pixelCenterY;
    const distance = Math.sqrt(distX * distX + distY * distY);
    const knockbackRange = radius * TILE_SIZE;

    if (distance < knockbackRange && distance > 0) {
        const dirX = distX / distance;
        const dirY = distY / distance;
        const clampedDist = Math.max(distance, TILE_SIZE);
        
        // Calculate Strength
        // Energy scales linearly with count.
        // Energy ~ Strength^2.
        // Therefore, Strength should scale with sqrt(count).
        // Since sizeMultiplier is already sqrt(count), we use it directly.
        const totalStrength = TNT_KNOCKBACK_STRENGTH * sizeMultiplier; 

        const explosionEnergy = 
            (totalStrength ** 2 * knockbackRange) / (clampedDist + TILE_SIZE * TNT_KNOCKBACK_DISTANCE_OFFSET);
        
        const vDotN = player.vx * dirX + player.vy * dirY;
        
        // Kinetic Energy Formula: deltaV = -vDotN + sqrt(vDotN^2 + 2 * Energy)
        const deltaV = -vDotN + Math.sqrt(Math.max(0, vDotN * vDotN + 2 * explosionEnergy));

        player.vx += dirX * deltaV;
        player.vy += dirY * deltaV;
        player.grounded = false;
    }

    // 4. Destroy blocks in the expanded radius
    // Search area slightly larger than radius to catch edge blocks
    const searchRadius = Math.ceil(radius);
    const startX = Math.max(0, Math.floor(centerX - searchRadius));
    const endX = Math.min(world.width - 1, Math.ceil(centerX + searchRadius));
    const startY = Math.max(0, Math.floor(centerY - searchRadius));
    const endY = Math.min(world.height - 1, Math.ceil(centerY + searchRadius));

    for (let by = startY; by <= endY; by++) {
        for (let bx = startX; bx <= endX; bx++) {
            // Calculate distance to the precise floating-point center
            const dx = bx - centerX;
            const dy = by - centerY;

            // Check if block is within explosion radius
            if (dx * dx + dy * dy <= radius * radius) {
                const block = world.getBlock(bx, by);
                
                // Skip AIR
                if (block === BLOCKS.AIR) continue;

                // Handle blocks
                if (isBlockBreakable(block, BLOCK_PROPS)) {
                    // If we find a TNT block here, it means it was NOT connected to the cluster
                    // (because connected ones were already removed).
                    // So we treat it as a breakable item (add to inventory).
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
