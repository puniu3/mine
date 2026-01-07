import { BLOCKS, TILE_SIZE, PHYSICS_DT } from './constants.js';

const jackpotParticles = [];
const jackpotCooldowns = new Map();
const COOLDOWN = 800;

// Physics constants adapted for 720Hz fixed timestep
// Gravity must be scaled by (1/12)^2 because it's acceleration (Time^-2)
// Original: 0.15 per frame (60Hz) -> 0.15 / 144 per tick (720Hz)
const PARTICLE_GRAVITY = 0.15 / 144; 

// Friction scales exponentially with time
// Original: 0.99 per frame (60Hz) -> 0.99^(1/12) per tick (720Hz)
const PARTICLE_FRICTION = Math.pow(0.99, 1/12);

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
                    jackpotCooldowns.set(key, COOLDOWN);
                    sounds.playCoin();
                }
            }
        }
    }
}

export function tick() {
    // Manage cooldowns
    jackpotCooldowns.forEach((time, key) => {
        const next = time - PHYSICS_DT;
        if (next <= 0) {
            jackpotCooldowns.delete(key);
        } else {
            jackpotCooldowns.set(key, next);
        }
    });

    // Update particles without time scaling (fixed timestep)
    for (let i = jackpotParticles.length - 1; i >= 0; i--) {
        const p = jackpotParticles[i];
        
        // Apply friction
        p.vx *= PARTICLE_FRICTION;
        
        // Apply gravity
        p.vy += PARTICLE_GRAVITY;
        
        // Apply velocity to position
        p.x += p.vx;
        p.y += p.vy;
        
        p.life -= PHYSICS_DT;
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
    
    // Scale ratio to convert 60Hz-based velocity values to 720Hz
    // Velocity scales linearly with time (Distance / Time) -> 1/12
    const SCALE_RATIO = 1 / 12;

    for (let i = 0; i < 24; i++) {
        jackpotParticles.push({
            x: originX + (Math.random() - 0.5) * TILE_SIZE * 0.6,
            y: originY + (Math.random() - 0.5) * TILE_SIZE * 0.2,
            // Apply scale ratio to velocities
            vx: (Math.random() - 0.5) * 3.2 * SCALE_RATIO,
            vy: -(1.2 + Math.random() * 4.5) * SCALE_RATIO,
            life: 900 + Math.random() * 400,
            color: i % 2 === 0 ? '#ffd54f' : '#fbc02d'
        });
    }
}
