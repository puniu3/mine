import { BLOCKS, ACCELERATOR_COOLDOWN_TICKS, ACCELERATOR_ACCELERATION_AMOUNT } from './constants.js';

const acceleratorCooldowns = new Map();

// Callback for TNT + Accelerator super boost effect
let onTNTAccelerator = null;

/**
 * Initialize accelerator module with callbacks
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onTNTAccelerator - Called when TNT + Accelerator interaction occurs (tntX, tntY, direction)
 */
export function initAccelerator(callbacks) {
    if (callbacks.onTNTAccelerator) {
        onTNTAccelerator = callbacks.onTNTAccelerator;
    }
}

/**
 * Apply super acceleration force (TNT count * 20 accelerators worth)
 * @param {Object} player - Player instance
 * @param {number} direction - 1 for right, -1 for left
 * @param {number} tntCount - Number of connected TNTs
 */
function applySuperAcceleratorForce(player, direction, tntCount) {
    // TNT count * 20 accelerators worth of force, clamped to 128
    const stackCount = Math.min(tntCount * 20, 128);
    const superForce = ACCELERATOR_ACCELERATION_AMOUNT * Math.sqrt(stackCount);
    player.boardVx = direction * superForce;
    player.facingRight = (direction > 0);
}

/**
 * Count connected TNTs behind the accelerator
 * @param {Object} world - World instance
 * @param {number} startX - Starting X coordinate (first TNT position)
 * @param {number} y - Y coordinate
 * @param {number} direction - Accelerator direction (1 for right, -1 for left)
 * @returns {number[]} Array of X coordinates for connected TNTs
 */
function countConnectedTNTsBehindAccelerator(world, startX, y, direction) {
    const tntPositions = [];
    let currentX = startX;
    // TNTs are behind the accelerator, so we move opposite to accelerator direction
    while (world.getBlock(currentX, y) === BLOCKS.TNT) {
        tntPositions.push(currentX);
        currentX -= direction;
    }
    return tntPositions;
}

export function handleAcceleratorOverlap(player, world) {
    // Retrieve grid coordinates directly derived from the player's internal integer state.
    // This eliminates floating-point division errors during overlap checks.
    const { startX, endX, startY, endY } = player.getGridRect();

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const block = world.getBlock(x, y);
            const key = `${x},${y}`;

            if ((block === BLOCKS.ACCELERATOR_LEFT || block === BLOCKS.ACCELERATOR_RIGHT) && !acceleratorCooldowns.has(key)) {

                const direction = (block === BLOCKS.ACCELERATOR_RIGHT) ? 1 : -1;

                // Check for connected TNTs behind the accelerator (opposite of pointing direction)
                const tntStartX = x - direction;
                const tntY = y;
                const tntPositions = countConnectedTNTsBehindAccelerator(world, tntStartX, tntY, direction);

                if (tntPositions.length > 0 && onTNTAccelerator) {
                    // TNT + Accelerator super boost (scales with TNT count)
                    applySuperAcceleratorForce(player, direction, tntPositions.length);
                    // Trigger callback to handle all TNT explosion effects
                    onTNTAccelerator(tntPositions, tntY);
                    acceleratorCooldowns.set(key, ACCELERATOR_COOLDOWN_TICKS);
                    return;
                }

                // Normal accelerator behavior
                // Command the player to apply force.
                // The physics calculation happens deterministically inside the Player class.
                player.applyAcceleratorForce(direction);

                acceleratorCooldowns.set(key, ACCELERATOR_COOLDOWN_TICKS);

                // Return immediately after triggering one accelerator to prevent stacking in the same frame
                return;
            }
        }
    }
}

export function tick() {
    acceleratorCooldowns.forEach((ticks, key) => {
        const next = ticks - 1;
        if (next <= 0) {
            acceleratorCooldowns.delete(key);
        } else {
            acceleratorCooldowns.set(key, next);
        }
    });
}
