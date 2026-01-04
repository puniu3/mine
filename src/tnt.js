/**
 * TNT Module - Handles TNT block explosion logic and timers
 */

import {
    TILE_SIZE, BLOCKS, BLOCK_PROPS,
    TNT_FUSE_TIME, TNT_EXPLOSION_RADIUS,
    TNT_KNOCKBACK_STRENGTH, TNT_KNOCKBACK_DISTANCE_OFFSET
} from './constants.js';
import { isBlockBreakable } from './utils.js';

/**
 * Explodes a TNT block at the given tile coordinates
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {Object} context - Context object containing dependencies
 */
function explodeTNT(x, y, context) {
    const { world, player, sounds, addToInventory, createExplosionParticles } = context;

    sounds.playExplosion();

    // Explosion Radius
    const radius = TNT_EXPLOSION_RADIUS;
    const startX = Math.max(0, x - radius);
    const endX = Math.min(world.width - 1, x + radius);
    const startY = Math.max(0, y - radius);
    const endY = Math.min(world.height - 1, y + radius);

    // Create particles at center
    createExplosionParticles(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);

    // Apply knockback to player
    const explosionX = x * TILE_SIZE + TILE_SIZE / 2;
    const explosionY = y * TILE_SIZE + TILE_SIZE / 2;
    const playerCenterX = player.getCenterX();
    const playerCenterY = player.getCenterY();

    // Calculate distance in world coordinates
    const distanceX = playerCenterX - explosionX;
    const distanceY = playerCenterY - explosionY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Apply knockback if player is within range (using radius in pixels)
    const knockbackRange = radius * TILE_SIZE;
    if (distance < knockbackRange && distance > 0) {
        // Normalize direction vector
        const dirX = distanceX / distance;
        const dirY = distanceY / distance;

        // Calculate knockback strength:
        const clampedDistance = Math.max(distance, TILE_SIZE);
        const knockbackStrength =
            (TNT_KNOCKBACK_STRENGTH * knockbackRange) / (clampedDistance + TILE_SIZE * TNT_KNOCKBACK_DISTANCE_OFFSET);

        // Apply velocity to player
        player.vx = dirX * knockbackStrength;
        player.vy = dirY * knockbackStrength;
        player.grounded = false;
    }

    // Destroy blocks in explosion radius
    for (let by = startY; by <= endY; by++) {
        for (let bx = startX; bx <= endX; bx++) {
            // Distance check for circle shape
            const dx = bx - x;
            const dy = by - y;
            if (dx * dx + dy * dy <= radius * radius) {
                const block = world.getBlock(bx, by);
                if (block !== BLOCKS.AIR && isBlockBreakable(block, BLOCK_PROPS)) {
                    if (block !== BLOCKS.TNT) {
                        addToInventory(block);
                    }
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
                // Remove timers for TNT blocks that no longer exist
                if (world.getBlock(tnt.x, tnt.y) !== BLOCKS.TNT) {
                    timers.splice(i, 1);
                    continue;
                }
                tnt.timer -= dt;
                if (tnt.timer <= 0) {
                    explodeTNT(tnt.x, tnt.y, context);
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
