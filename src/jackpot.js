import { BLOCKS, TILE_SIZE } from './constants.js';

const jackpotParticles = [];
const jackpotCooldowns = new Map();
const COOLDOWN = 800;
const PARTICLE_GRAVITY = 0.15;

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

export function updateJackpots(dt) {
    jackpotCooldowns.forEach((time, key) => {
        const next = time - dt;
        if (next <= 0) {
            jackpotCooldowns.delete(key);
        } else {
            jackpotCooldowns.set(key, next);
        }
    });

    for (let i = jackpotParticles.length - 1; i >= 0; i--) {
        const p = jackpotParticles[i];
        p.vx *= 0.99;
        p.vy += PARTICLE_GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
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
            vx: (Math.random() - 0.5) * 1.2,
            // Give each coin an upward burst first so it visibly arcs before falling
            vy: -(1.2 + Math.random() * 1.5),
            life: 900 + Math.random() * 400,
            color: i % 2 === 0 ? '#ffd54f' : '#fbc02d'
        });
    }
}
