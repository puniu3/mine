import { BLOCKS, TILE_SIZE } from './constants.js';
import { calculateVisibleTileRange } from './utils.js';

const fireworkParticles = [];

export function tick(world, cameraX, cameraY, canvas) {
    // 1. Scan/Emit
    if (!world.fireworkTimer) world.fireworkTimer = 0;
    
    // Increment timer by 1 tick
    world.fireworkTimer++;
    
    // Trigger every 5 seconds (5 * 720 = 3600 ticks)
    if (world.fireworkTimer > 3600) { 
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
            // Rocket movement (constant velocity)
            p.y += p.vy;
            // Check if reached target height (targetY is less than startY because up is negative)
            if (p.y <= p.targetY) {
                explode(p.x, p.y);
                fireworkParticles.splice(i, 1);
            }
        } else {
            // Particle movement
            p.x += p.vx;
            p.y += p.vy;
            
            // Decrement life by 1 tick
            p.life--;
            
            // Gravity scaled for 720Hz (approx 0.05 / 144)
            p.vy += 0.00035; 
            
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
        // Upward speed scaled for 720Hz (-4.0 / 12)
        vy: -0.33, 
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
        
        // Speed scaled for 720Hz: range approx 0.08 to 0.25 pixels per tick
        // Equivalent to previous 60Hz range of 1.0 to 3.0
        const speed = Math.random() * 0.17 + 0.08;
        
        fireworkParticles.push({
            type: 'particle',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            // Life converted to ticks: 1s~2s -> 720~1440 ticks
            life: 720 + Math.random() * 720,
            color: color || '#ff9800' // Default orange for TNT if not specified
        });
    }
}
