import { BLOCKS, TILE_SIZE } from './constants.js';

const acceleratorCooldowns = new Map();
const COOLDOWN = 500; // 0.5 seconds as requested
const ACCELERATION_AMOUNT = 15; // Fixed acceleration amount

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
                player.boardVx = -Math.sqrt(player.boardVx * player.boardVx + ACCELERATION_AMOUNT * ACCELERATION_AMOUNT);
                player.facingRight = false;
                acceleratorCooldowns.set(key, COOLDOWN);
                return;
            } else if (block === BLOCKS.ACCELERATOR_RIGHT && !acceleratorCooldowns.has(key)) {
                player.boardVx = Math.sqrt(player.boardVx * player.boardVx + ACCELERATION_AMOUNT * ACCELERATION_AMOUNT);
                player.facingRight = true;
                acceleratorCooldowns.set(key, COOLDOWN);
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