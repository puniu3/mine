import { BLOCKS, TILE_SIZE } from './constants.js';
import { calculateVisibleTileRange } from './utils.js';

const fireworkParticles = [];

export function update(dt, world, cameraX, cameraY, canvas) {
    // Time Scale: normalize physics to 60 FPS target
    const timeScale = dt / (1000 / 60);

    // 1. Scan/Emit
    if (!world.fireworkTimer) world.fireworkTimer = 0;
    world.fireworkTimer += dt;
    if (world.fireworkTimer > 5000) { // 5 seconds
        world.fireworkTimer = 0;
        const range = calculateVisibleTileRange(cameraX, cameraY, canvas.width, canvas.height, TILE_SIZE);
        for (let y = range.startY - 10; y < range.endY + 10; y++) {
            for (let x = range.startX - 10; x < range.endX + 10; x++) {
                if (world.getBlock(x, y) === BLOCKS.FIREWORK) {
                    launchFirework(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
                }
            }
        }
    }

    // 2. Update Particles
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
        const p = fireworkParticles[i];

        if (p.type === 'rocket') {
            // Apply time scaling to rocket movement
            p.y += p.vy * timeScale;
            // Check if reached target height (targetY is less than startY because up is negative)
            if (p.y <= p.targetY) {
                explode(p.x, p.y);
                fireworkParticles.splice(i, 1);
            }
        } else {
            // Normal particle with time scaling
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.life -= dt;
            p.vy += 0.05 * timeScale; // Apply gravity with time scaling
            if (p.life <= 0) {
                fireworkParticles.splice(i, 1);
            }
        }
    }
}

export function draw(ctx) {
    fireworkParticles.forEach(p => {
        if (p.type === 'rocket') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p.x - 2, p.y - 2, 4, 8); // Elongated rocket shape
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        }
    });
}

function launchFirework(x, y) {
    // Launch a rocket
    fireworkParticles.push({
        type: 'rocket',
        x: x,
        y: y,
        vy: -4, // Upward speed
        targetY: y - (10 * TILE_SIZE), // 10 meters up
        color: '#ffffff'
    });
}

function explode(x, y) {
    // Create explosion
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    createExplosionParticles(x, y, color);
}

export function createExplosionParticles(x, y, color) {
    // Large amount of particles
    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 4 + 2) * 0.5;
        fireworkParticles.push({
            type: 'particle',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1000 + Math.random() * 1000,
            color: color || '#ff9800' // Default orange for TNT if not specified
        });
    }
}
