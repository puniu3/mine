import { BLOCKS, TILE_SIZE, JACKPOT_COOLDOWN_TICKS, JACKPOT_PARTICLE_LIFE_BASE_TICKS, JACKPOT_PARTICLE_LIFE_VARIANCE_TICKS, TICK_TIME_SCALE } from './constants.js';

const jackpotParticles = [];
const jackpotCooldowns = new Map();

// Physics constants adapted for 720Hz fixed timestep
// Gravity must be scaled by timeScale^2 because it's acceleration (Time^-2)
const PARTICLE_GRAVITY = 0.15 * TICK_TIME_SCALE * TICK_TIME_SCALE;

// Friction scales exponentially with time
const PARTICLE_FRICTION = Math.pow(0.99, TICK_TIME_SCALE);

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

export function tick() {
    // Manage cooldowns (tick-based)
    jackpotCooldowns.forEach((ticks, key) => {
        const next = ticks - 1;
        if (next <= 0) {
            jackpotCooldowns.delete(key);
        } else {
            jackpotCooldowns.set(key, next);
        }
    });

    // Update particles (fixed timestep)
    for (let i = jackpotParticles.length - 1; i >= 0; i--) {
        const p = jackpotParticles[i];

        // Apply friction
        p.vx *= PARTICLE_FRICTION;

        // Apply gravity
        p.vy += PARTICLE_GRAVITY;

        // Apply velocity to position
        p.x += p.vx;
        p.y += p.vy;

        p.life--;
        if (p.life <= 0) {
            jackpotParticles.splice(i, 1);
        }
    }
}

export function drawJackpotParticles(ctx) {
    ctx.save();
    jackpotParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function emitJackpotParticles(tx, ty) {
    const originX = tx * TILE_SIZE + TILE_SIZE / 2;
    const originY = ty * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < 24; i++) {
        jackpotParticles.push({
            x: originX + (Math.random() - 0.5) * TILE_SIZE * 0.6,
            y: originY + (Math.random() - 0.5) * TILE_SIZE * 0.2,
            // Velocities scaled for 720Hz (using TICK_TIME_SCALE from constants)
            vx: (Math.random() - 0.5) * 3.2 * TICK_TIME_SCALE,
            vy: -(1.2 + Math.random() * 4.5) * TICK_TIME_SCALE,
            // Tick-based life counter
            life: JACKPOT_PARTICLE_LIFE_BASE_TICKS + Math.floor(Math.random() * JACKPOT_PARTICLE_LIFE_VARIANCE_TICKS),
            color: i % 2 === 0 ? '#ffd54f' : '#fbc02d'
        });
    }
}
