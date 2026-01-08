import { BLOCKS, TILE_SIZE, JACKPOT_COOLDOWN_TICKS, JACKPOT_PARTICLE_LIFE_BASE_TICKS, JACKPOT_PARTICLE_LIFE_VARIANCE_TICKS, TICK_TIME_SCALE } from './constants.js';

// ============================================================
// High-Performance Jackpot Particle System using TypedArrays (SoA)
// ============================================================

const MAX_PARTICLES = 4000;

// Structure of Arrays (SoA) for cache-friendly access
const particles = {
    x: new Float32Array(MAX_PARTICLES),
    y: new Float32Array(MAX_PARTICLES),
    vx: new Float32Array(MAX_PARTICLES),
    vy: new Float32Array(MAX_PARTICLES),
    life: new Uint16Array(MAX_PARTICLES),
    colorIdx: new Uint8Array(MAX_PARTICLES),  // 0 = '#ffd54f', 1 = '#fbc02d'
    count: 0
};

// Jackpot colors (gold shades)
const COLORS = ['#ffd54f', '#fbc02d'];

// Physics constants adapted for 720Hz fixed timestep
const PARTICLE_GRAVITY = 0.15 * TICK_TIME_SCALE * TICK_TIME_SCALE;
const PARTICLE_FRICTION = Math.pow(0.99, TICK_TIME_SCALE);

// Cooldown management
const jackpotCooldowns = new Map();

// Camera bounds for culling
let cullMinX = 0, cullMaxX = 0, cullMinY = 0, cullMaxY = 0;
const CULL_MARGIN = 50;

/**
 * Swap-and-pop removal: O(1) instead of O(n) splice
 */
function removeParticle(index) {
    const last = particles.count - 1;
    if (index !== last) {
        particles.x[index] = particles.x[last];
        particles.y[index] = particles.y[last];
        particles.vx[index] = particles.vx[last];
        particles.vy[index] = particles.vy[last];
        particles.life[index] = particles.life[last];
        particles.colorIdx[index] = particles.colorIdx[last];
    }
    particles.count--;
}

/**
 * Add a new particle to the system
 */
function addParticle(x, y, vx, vy, life, colorIdx) {
    if (particles.count >= MAX_PARTICLES) return;
    const i = particles.count;
    particles.x[i] = x;
    particles.y[i] = y;
    particles.vx[i] = vx;
    particles.vy[i] = vy;
    particles.life[i] = life;
    particles.colorIdx[i] = colorIdx;
    particles.count++;
}

export function handleJackpotOverlap(player, world, sounds) {
    const startX = Math.floor(player.x / TILE_SIZE);
    const endX = Math.floor((player.x + player.width) / TILE_SIZE);
    const startY = Math.floor(player.y / TILE_SIZE);
    const endY = Math.floor((player.y + player.height) / TILE_SIZE);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (world.getBlock(x, y) === BLOCKS.JACKPOT) {
                const key = `${x},${y}`;
                if (!jackpotCooldowns.has(key)) {
                    emitJackpotParticles(x, y);
                    jackpotCooldowns.set(key, JACKPOT_COOLDOWN_TICKS);
                    sounds.playCoin();
                }
            }
        }
    }
}

/**
 * Triggers a massive explosion of jackpot particles.
 * Used when a Jackpot block is destroyed by TNT.
 */
export function triggerJackpotExplosion(tx, ty) {
    const originX = tx * TILE_SIZE + TILE_SIZE / 2;
    const originY = ty * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < 100; i++) {
        const life = JACKPOT_PARTICLE_LIFE_BASE_TICKS + Math.floor(Math.random() * JACKPOT_PARTICLE_LIFE_VARIANCE_TICKS);

        addParticle(
            originX + (Math.random() - 0.5) * TILE_SIZE,
            originY + (Math.random() - 0.5) * TILE_SIZE,
            (Math.random() - 0.5) * 25.0 * TICK_TIME_SCALE,
            -(4.0 + Math.random() * 14.0) * TICK_TIME_SCALE,
            life,
            i % 2  // Alternate colors
        );
    }
}

/**
 * Emit particles when player touches jackpot
 */
function emitJackpotParticles(tx, ty) {
    const originX = tx * TILE_SIZE + TILE_SIZE / 2;
    const originY = ty * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < 24; i++) {
        const life = JACKPOT_PARTICLE_LIFE_BASE_TICKS + Math.floor(Math.random() * JACKPOT_PARTICLE_LIFE_VARIANCE_TICKS);

        addParticle(
            originX + (Math.random() - 0.5) * TILE_SIZE * 0.6,
            originY + (Math.random() - 0.5) * TILE_SIZE * 0.2,
            (Math.random() - 0.5) * 3.2 * TICK_TIME_SCALE,
            -(1.2 + Math.random() * 4.5) * TICK_TIME_SCALE,
            life,
            i % 2  // Alternate colors
        );
    }
}

/**
 * Update all particles (called at 720Hz)
 */
export function tick() {
    // Manage cooldowns
    jackpotCooldowns.forEach((ticks, key) => {
        const next = ticks - 1;
        if (next <= 0) {
            jackpotCooldowns.delete(key);
        } else {
            jackpotCooldowns.set(key, next);
        }
    });

    // Update particles with forward iteration for swap-and-pop
    let i = 0;
    while (i < particles.count) {
        // Apply friction
        particles.vx[i] *= PARTICLE_FRICTION;

        // Apply gravity
        particles.vy[i] += PARTICLE_GRAVITY;

        // Apply velocity to position
        particles.x[i] += particles.vx[i];
        particles.y[i] += particles.vy[i];

        particles.life[i]--;
        if (particles.life[i] <= 0) {
            removeParticle(i);
            // Don't increment, check swapped particle
            continue;
        }
        i++;
    }
}

/**
 * Draw all particles with culling and batch rendering
 * Uses fillRect instead of arc for better performance
 */
export function drawJackpotParticles(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    if (particles.count === 0) return;

    // Update culling bounds
    cullMinX = cameraX - CULL_MARGIN;
    cullMaxX = cameraX + viewWidth + CULL_MARGIN;
    cullMinY = cameraY - CULL_MARGIN;
    cullMaxY = cameraY + viewHeight + CULL_MARGIN;

    // Group by color for batch rendering (only 2 colors)
    const color0Indices = [];
    const color1Indices = [];

    for (let i = 0; i < particles.count; i++) {
        const x = particles.x[i];
        const y = particles.y[i];

        // Frustum culling
        if (x < cullMinX || x > cullMaxX || y < cullMinY || y > cullMaxY) {
            continue;
        }

        if (particles.colorIdx[i] === 0) {
            color0Indices.push(i);
        } else {
            color1Indices.push(i);
        }
    }

    // Batch render color 0 (gold light)
    if (color0Indices.length > 0) {
        ctx.fillStyle = COLORS[0];
        for (const i of color0Indices) {
            // 6x6 square (similar visual size to radius 3 circle)
            ctx.fillRect(particles.x[i] - 3, particles.y[i] - 3, 6, 6);
        }
    }

    // Batch render color 1 (gold dark)
    if (color1Indices.length > 0) {
        ctx.fillStyle = COLORS[1];
        for (const i of color1Indices) {
            ctx.fillRect(particles.x[i] - 3, particles.y[i] - 3, 6, 6);
        }
    }
}

// Legacy draw function for backward compatibility (without camera info)
export function drawJackpotParticlesLegacy(ctx) {
    if (particles.count === 0) return;

    const color0Indices = [];
    const color1Indices = [];

    for (let i = 0; i < particles.count; i++) {
        if (particles.colorIdx[i] === 0) {
            color0Indices.push(i);
        } else {
            color1Indices.push(i);
        }
    }

    if (color0Indices.length > 0) {
        ctx.fillStyle = COLORS[0];
        for (const i of color0Indices) {
            ctx.fillRect(particles.x[i] - 3, particles.y[i] - 3, 6, 6);
        }
    }

    if (color1Indices.length > 0) {
        ctx.fillStyle = COLORS[1];
        for (const i of color1Indices) {
            ctx.fillRect(particles.x[i] - 3, particles.y[i] - 3, 6, 6);
        }
    }
}
