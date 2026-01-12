import { BLOCKS, TILE_SIZE } from './constants.js';
import { calculateVisibleTileRange } from './utils.js';

// ============================================================
// High-Performance Particle System using TypedArrays (SoA)
// ============================================================

const MAX_PARTICLES = 8000;

// Structure of Arrays (SoA) for cache-friendly access
// Rockets and Particles share the same arrays
const particles = {
    x: new Float32Array(MAX_PARTICLES),
    y: new Float32Array(MAX_PARTICLES),
    vx: new Float32Array(MAX_PARTICLES),
    vy: new Float32Array(MAX_PARTICLES),
    life: new Float32Array(MAX_PARTICLES),      // life > 0 for particles, negative for rockets (stores targetY)
    hue: new Uint16Array(MAX_PARTICLES),        // HSL hue (0-360), 361 = white (rocket)
    count: 0
};

const ROCKET_HUE = 361;  // Special marker for rockets (white)
const BUBBLE_HUE = 362;  // Special marker for bubbles
const GRAVITY = 0.00035;
const ROCKET_SPEED = -0.33;
const BUBBLE_SPEED = -0.15;

// Camera bounds for culling (updated each draw call)
let cullMinX = 0, cullMaxX = 0, cullMinY = 0, cullMaxY = 0;
const CULL_MARGIN = 50;  // pixels outside viewport to keep updating

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
        particles.hue[index] = particles.hue[last];
    }
    particles.count--;
}

/**
 * Add a new particle to the system
 */
function addParticle(x, y, vx, vy, life, hue) {
    if (particles.count >= MAX_PARTICLES) return;
    const i = particles.count;
    particles.x[i] = x;
    particles.y[i] = y;
    particles.vx[i] = vx;
    particles.vy[i] = vy;
    particles.life[i] = life;
    particles.hue[i] = hue;
    particles.count++;
}

/**
 * Launch a rocket from a position
 */
function launchFirework(x, y) {
    // For rockets: life stores negative targetY, hue = ROCKET_HUE
    const targetY = y - (10 * TILE_SIZE);
    addParticle(x, y, 0, ROCKET_SPEED, -targetY, ROCKET_HUE);
}

/**
 * Create explosion particles at a position
 */
function explode(x, y) {
    const hue = Math.floor(Math.random() * 360);
    createExplosionParticles(x, y, hue);
}

/**
 * Create a single bubble particle
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} distanceToSurface - Distance in pixels to the water surface
 */
export function createBubble(x, y, distanceToSurface = TILE_SIZE * 2) {
    // Slight horizontal jitter, mostly upward movement
    const vx = (Math.random() - 0.5) * 0.05;
    const vy = BUBBLE_SPEED * (0.8 + Math.random() * 0.4);

    // Calculate life based on distance to surface
    // Allow bubble to rise slightly above water surface (add small margin)
    const avgSpeed = Math.abs(vy);
    const marginTicks = 20 + Math.random() * 40; // Small overshoot above surface
    const life = Math.max(50, (distanceToSurface / avgSpeed) + marginTicks);

    addParticle(x, y, vx, vy, life, BUBBLE_HUE);
}

/**
 * Create splash particles for water entry
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 */
export function createSplashParticles(x, y) {
    // Light Blue / Cyan hue ~ 195
    const hue = 195;

    for (let i = 0; i < 20; i++) {
        // Upward cone (-PI/2 is straight up)
        // Spread slightly (PI/2 = 90 degrees total spread)
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const speed = Math.random() * 0.15 + 0.05;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const life = 300 + Math.random() * 200;

        addParticle(x, y, vx, vy, life, hue);
    }
}

/**
 * Create explosion particles with specified hue
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number|string} hueOrColor - Hue value (0-360) or CSS color string
 */
export function createExplosionParticles(x, y, hueOrColor) {
    let hue;
    if (typeof hueOrColor === 'string') {
        // Parse hsl() string to extract hue
        const match = hueOrColor.match(/hsl\((\d+)/);
        hue = match ? parseInt(match[1], 10) : Math.floor(Math.random() * 360);
    } else if (typeof hueOrColor === 'number') {
        hue = hueOrColor;
    } else {
        // Default orange (for TNT) - approximately 30-40 on hue scale
        hue = 35;
    }

    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.17 + 0.08;
        const life = 720 + Math.random() * 720;

        addParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            life,
            hue
        );
    }
}

/**
 * Update all particles (called at 720Hz)
 */
export function tick(world, cameraX, cameraY, canvas) {
    // 1. Scan/Emit fireworks from FIREWORK blocks
    if (!world.fireworkTimer) world.fireworkTimer = 0;
    world.fireworkTimer++;

    if (world.fireworkTimer > 3600) {
        world.fireworkTimer = 0;
        const range = calculateVisibleTileRange(cameraX, cameraY, canvas.width, canvas.height, TILE_SIZE);
        for (let y = range.startY - 10; y < range.endY + 10; y++) {
            for (let x = range.startX - 10; x < range.endX + 10; x++) {
                if (world.getBlock(x, y) === BLOCKS.FIREWORK) {
                    launchFirework(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
                }
            }
        }
    }

    // 2. Update particles with backward iteration for safe removal
    let i = 0;
    while (i < particles.count) {
        const life = particles.life[i];
        const hue = particles.hue[i];

        if (hue === ROCKET_HUE) {
            // Rocket: life stores negative targetY
            particles.y[i] += particles.vy[i];
            const targetY = -life;

            if (particles.y[i] <= targetY) {
                const px = particles.x[i];
                const py = particles.y[i];
                removeParticle(i);
                explode(px, py);
                // Don't increment i, check the swapped particle
                continue;
            }
        } else {
            // Regular particle
            particles.x[i] += particles.vx[i];
            particles.y[i] += particles.vy[i];

            // Apply gravity only if NOT a bubble (bubbles float up)
            if (hue !== BUBBLE_HUE) {
                particles.vy[i] += GRAVITY;
            }

            particles.life[i]--;

            if (particles.life[i] <= 0) {
                removeParticle(i);
                continue;
            }
        }
        i++;
    }
}

/**
 * Draw all particles with culling and batch rendering
 */
export function draw(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    if (particles.count === 0) return;

    // Update culling bounds
    cullMinX = cameraX - CULL_MARGIN;
    cullMaxX = cameraX + viewWidth + CULL_MARGIN;
    cullMinY = cameraY - CULL_MARGIN;
    cullMaxY = cameraY + viewHeight + CULL_MARGIN;

    // Group particles by hue for batch rendering
    // Use a Map for grouping: hue -> array of indices
    const hueGroups = new Map();

    for (let i = 0; i < particles.count; i++) {
        const x = particles.x[i];
        const y = particles.y[i];

        // Frustum culling
        if (x < cullMinX || x > cullMaxX || y < cullMinY || y > cullMaxY) {
            continue;
        }

        const hue = particles.hue[i];
        if (!hueGroups.has(hue)) {
            hueGroups.set(hue, []);
        }
        hueGroups.get(hue).push(i);
    }

    // Batch render by color
    for (const [hue, indices] of hueGroups) {
        if (hue === ROCKET_HUE) {
            // Rockets: white, elongated
            ctx.fillStyle = '#ffffff';
            for (const i of indices) {
                ctx.fillRect(particles.x[i] - 2, particles.y[i] - 2, 4, 8);
            }
        } else if (hue === BUBBLE_HUE) {
            // Bubbles: cyan/white, small, square
            ctx.fillStyle = 'rgba(200, 240, 255, 0.6)';
            for (const i of indices) {
                ctx.fillRect(particles.x[i], particles.y[i], 3, 3);
            }
        } else {
            // Particles: colored squares
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            for (const i of indices) {
                ctx.fillRect(particles.x[i], particles.y[i], 4, 4);
            }
        }
    }
}

// Legacy draw function for backward compatibility (without camera info)
export function drawLegacy(ctx) {
    if (particles.count === 0) return;

    // No culling, render all
    const hueGroups = new Map();

    for (let i = 0; i < particles.count; i++) {
        const hue = particles.hue[i];
        if (!hueGroups.has(hue)) {
            hueGroups.set(hue, []);
        }
        hueGroups.get(hue).push(i);
    }

    for (const [hue, indices] of hueGroups) {
        if (hue === ROCKET_HUE) {
            ctx.fillStyle = '#ffffff';
            for (const i of indices) {
                ctx.fillRect(particles.x[i] - 2, particles.y[i] - 2, 4, 8);
            }
        } else if (hue === BUBBLE_HUE) {
            ctx.fillStyle = 'rgba(200, 240, 255, 0.6)';
            for (const i of indices) {
                ctx.fillRect(particles.x[i], particles.y[i], 3, 3);
            }
        } else {
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            for (const i of indices) {
                ctx.fillRect(particles.x[i], particles.y[i], 4, 4);
            }
        }
    }
}
