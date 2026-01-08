/**
 * Block Break Particle System
 * Emits small colored particles when blocks are destroyed.
 * Uses TypedArray SoA (Structure of Arrays) for cache-friendly access.
 */

import { TILE_SIZE, BLOCK_PROPS } from './constants.js';

// ============================================================
// High-Performance Particle System using TypedArrays (SoA)
// ============================================================

const MAX_PARTICLES = 500;

// Structure of Arrays (SoA) for cache-friendly access
const particles = {
    x: new Float32Array(MAX_PARTICLES),
    y: new Float32Array(MAX_PARTICLES),
    vx: new Float32Array(MAX_PARTICLES),
    vy: new Float32Array(MAX_PARTICLES),
    life: new Uint16Array(MAX_PARTICLES),
    hue: new Uint16Array(MAX_PARTICLES),
    count: 0
};

const GRAVITY = 0.03;
const FRICTION = 0.98;
const PARTICLE_LIFE = 360; // ~0.5 seconds at 720Hz
const PARTICLES_PER_BREAK = 8;

// Camera bounds for culling
let cullMinX = 0, cullMaxX = 0, cullMinY = 0, cullMaxY = 0;
const CULL_MARGIN = 50;

/**
 * Convert hex color to HSL hue (0-360)
 * @param {string} hex - Hex color string (e.g., '#5d4037')
 * @returns {number} Hue value 0-360
 */
function hexToHue(hex) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0) return 0;

    let hue;
    if (max === r) {
        hue = ((g - b) / delta) % 6;
    } else if (max === g) {
        hue = (b - r) / delta + 2;
    } else {
        hue = (r - g) / delta + 4;
    }

    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;

    return hue;
}

/**
 * Convert hex color to saturation and lightness
 * @param {string} hex - Hex color string
 * @returns {{saturation: number, lightness: number}}
 */
function hexToSL(hex) {
    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    let saturation = 0;
    if (max !== min) {
        const delta = max - min;
        saturation = lightness > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);
    }

    return {
        saturation: Math.round(saturation * 100),
        lightness: Math.round(lightness * 100)
    };
}

// Cache for block colors (hue, saturation, lightness)
const blockColorCache = new Map();

/**
 * Get cached HSL values for a block type
 * @param {number} blockId
 * @returns {{hue: number, saturation: number, lightness: number}}
 */
function getBlockHSL(blockId) {
    if (blockColorCache.has(blockId)) {
        return blockColorCache.get(blockId);
    }

    const props = BLOCK_PROPS[blockId];
    const color = props?.color || '#808080';

    const hsl = {
        hue: hexToHue(color),
        ...hexToSL(color)
    };

    blockColorCache.set(blockId, hsl);
    return hsl;
}

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
 * Emit particles when a block is destroyed
 * @param {number} tileX - Block tile X coordinate
 * @param {number} tileY - Block tile Y coordinate
 * @param {number} blockId - Block type ID
 */
export function emitBlockBreakParticles(tileX, tileY, blockId) {
    const hsl = getBlockHSL(blockId);

    // Center of the block in world coordinates
    const centerX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = tileY * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < PARTICLES_PER_BREAK; i++) {
        // Random angle for each particle
        const angle = Math.random() * Math.PI * 2;
        // Speed with some variance
        const speed = 0.08 + Math.random() * 0.12;

        // Velocity components - particles fly outward
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 0.05; // Slight upward bias

        // Random position offset within the block
        const offsetX = (Math.random() - 0.5) * TILE_SIZE * 0.6;
        const offsetY = (Math.random() - 0.5) * TILE_SIZE * 0.6;

        // Life with some variance
        const life = PARTICLE_LIFE + Math.floor(Math.random() * 120) - 60;

        addParticle(
            centerX + offsetX,
            centerY + offsetY,
            vx,
            vy,
            life,
            hsl.hue
        );
    }
}

/**
 * Update all particles (called at 720Hz)
 */
export function tick() {
    let i = 0;
    while (i < particles.count) {
        // Update position
        particles.x[i] += particles.vx[i];
        particles.y[i] += particles.vy[i];

        // Apply gravity
        particles.vy[i] += GRAVITY;

        // Apply friction
        particles.vx[i] *= FRICTION;
        particles.vy[i] *= FRICTION;

        // Decrease life
        particles.life[i]--;

        if (particles.life[i] <= 0) {
            removeParticle(i);
            continue;
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
        // Use the hue from the block with fixed saturation/lightness for visibility
        ctx.fillStyle = `hsl(${hue}, 60%, 45%)`;
        for (const i of indices) {
            // Calculate alpha based on remaining life
            const lifeRatio = particles.life[i] / PARTICLE_LIFE;
            ctx.globalAlpha = lifeRatio * 0.9 + 0.1;

            // Draw small square particle
            ctx.fillRect(
                Math.floor(particles.x[i]) - 2,
                Math.floor(particles.y[i]) - 2,
                4,
                4
            );
        }
    }

    ctx.globalAlpha = 1.0;
}
