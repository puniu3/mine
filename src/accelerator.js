import { BLOCKS, TILE_SIZE, ACCELERATOR_COOLDOWN, ACCELERATOR_ACCELERATION_AMOUNT } from './constants.js';

const acceleratorCooldowns = new Map();

export function handleAcceleratorOverlap(player, world) {
    const startX = Math.floor(player.x / TILE_SIZE);
    const endX = Math.floor((player.x + player.width) / TILE_SIZE);
    const startY = Math.floor(player.y / TILE_SIZE);
    const endY = Math.floor((player.y + player.height) / TILE_SIZE);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const block = world.getBlock(x, y);
            const key = `${x},${y}`;

            if (block === BLOCKS.ACCELERATOR_LEFT && !acceleratorCooldowns.has(key)) {
                player.boardVx = -Math.sqrt(player.boardVx * player.boardVx + ACCELERATOR_ACCELERATION_AMOUNT * ACCELERATOR_ACCELERATION_AMOUNT);
                player.facingRight = false;
                acceleratorCooldowns.set(key, ACCELERATOR_COOLDOWN);
                return;
            } else if (block === BLOCKS.ACCELERATOR_RIGHT && !acceleratorCooldowns.has(key)) {
                player.boardVx = Math.sqrt(player.boardVx * player.boardVx + ACCELERATOR_ACCELERATION_AMOUNT * ACCELERATOR_ACCELERATION_AMOUNT);
                player.facingRight = true;
                acceleratorCooldowns.set(key, ACCELERATOR_COOLDOWN);
                return;
            }
        }
    }
}

export function updateAccelerators(dt) {
    acceleratorCooldowns.forEach((time, key) => {
        const next = time - dt;
        if (next <= 0) {
            acceleratorCooldowns.delete(key);
        } else {
            acceleratorCooldowns.set(key, next);
        }
    });
}