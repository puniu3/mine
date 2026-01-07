import { BLOCKS, ACCELERATOR_COOLDOWN_TICKS } from './constants.js';

const acceleratorCooldowns = new Map();

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
