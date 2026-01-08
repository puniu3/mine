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
 * Apply super acceleration force (20 accelerators worth)
 * @param {Object} player - Player instance
 * @param {number} direction - 1 for right, -1 for left
 */
function applySuperAcceleratorForce(player, direction) {
    // 20 accelerators worth of force
    // Each accelerator adds sqrt(current^2 + AMOUNT^2), so 20x means:
    // final = sqrt(20 * AMOUNT^2) = AMOUNT * sqrt(20)
    const superForce = ACCELERATOR_ACCELERATION_AMOUNT * Math.sqrt(20);
    player.boardVx = direction * superForce;
    player.facingRight = (direction > 0);
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

                // Check for TNT behind the accelerator (opposite of pointing direction)
                const tntX = x - direction;
                const tntY = y;
                const blockBehind = world.getBlock(tntX, tntY);

                if (blockBehind === BLOCKS.TNT && onTNTAccelerator) {
                    // TNT + Accelerator super boost
                    applySuperAcceleratorForce(player, direction);
                    // Trigger callback to handle TNT explosion effects
                    onTNTAccelerator(tntX, tntY, direction);
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
