import { BLOCKS, TILE_SIZE } from './constants.js';
import { calculateVisibleTileRange } from './utils.js';

const fireworkParticles = [];

export function update(dt, world, cameraX, cameraY, canvas) {
    // 1. Scan/Emit
    // In a large world, scanning all blocks every frame is bad.
    // Optimization: Only scan blocks near the player?
    // Or just scan randomly?
    // Let's use a timer.
    if (!world.fireworkTimer) world.fireworkTimer = 0;
    world.fireworkTimer += dt;
    if (world.fireworkTimer > 5000) { // 5 seconds
        world.fireworkTimer = 0;
        // Find visible fireworks or all fireworks?
        // Let's just scan the visible range + padding for now to keep performance ok.
        const range = calculateVisibleTileRange(cameraX, cameraY, canvas.width, canvas.height, TILE_SIZE);
        for (let y = range.startY - 10; y < range.endY + 10; y++) {
            for (let x = range.startX - 10; x < range.endX + 10; x++) {
                if (world.getBlock(x, y) === BLOCKS.FIREWORK) {
                    spawnFireworkParticles(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
                }
            }
        }
    }

    // 2. Update Particles
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
        const p = fireworkParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
        p.vy += 0.05; // Gravity
        if (p.life <= 0) {
            fireworkParticles.splice(i, 1);
        }
    }
}

export function draw(ctx) {
    fireworkParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
}

function spawnFireworkParticles(x, y) {
    // Launch sound
    // sounds.playPop();

    // Create explosion
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 2;
        fireworkParticles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 5, // Upward bias
            life: 1000 + Math.random() * 500,
            color: color
        });
    }
}
