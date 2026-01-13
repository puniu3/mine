/**
 * Block Break Particle System
 * Emits small colored particles when blocks are destroyed.
 * Samples colors directly from block textures.
 * Uses TypedArray SoA (Structure of Arrays) for cache-friendly access.
 */

import { TILE_SIZE } from './constants.js';

// ============================================================
// High-Performance Particle System using TypedArrays (SoA)
// ============================================================

const MAX_PARTICLES = 500;

// Structure of Arrays (SoA) for cache-friendly access
// Using RGB instead of HSL for direct texture color sampling
const particles = {
    x: new Float32Array(MAX_PARTICLES),
    y: new Float32Array(MAX_PARTICLES),
    vx: new Float32Array(MAX_PARTICLES),
    vy: new Float32Array(MAX_PARTICLES),
    life: new Uint16Array(MAX_PARTICLES),
    r: new Uint8Array(MAX_PARTICLES),
    g: new Uint8Array(MAX_PARTICLES),
    b: new Uint8Array(MAX_PARTICLES),
    count: 0
};

const GRAVITY = 0.008;
const FRICTION = 0.995;
const PARTICLE_LIFE = 360; // ~0.5 seconds at 720Hz
const PARTICLES_PER_BREAK = 8;

// Camera bounds for culling
let cullMinX = 0, cullMaxX = 0, cullMinY = 0, cullMaxY = 0;
const CULL_MARGIN = 50;

// Texture reference (set via init)
let blockTextures = null;

// Cache for texture ImageData
const textureDataCache = new Map();

/**
 * Initialize the particle system with block textures
 * @param {Object.<number, HTMLCanvasElement>} textures - Block textures
 */
export function initBlockParticles(textures) {
    blockTextures = textures;
}

/**
 * Get ImageData for a block texture (cached)
 * @param {number} blockId
 * @returns {ImageData|null}
 */
function getTextureData(blockId) {
    if (textureDataCache.has(blockId)) {
        return textureDataCache.get(blockId);
    }

    if (!blockTextures || !blockTextures[blockId]) {
        return null;
    }

    const canvas = blockTextures[blockId];
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    textureDataCache.set(blockId, imageData);
    return imageData;
}

/**
 * Sample a random color from the block texture
 * @param {number} blockId
 * @returns {{r: number, g: number, b: number}}
 */
function sampleTextureColor(blockId) {
    const imageData = getTextureData(blockId);

    if (!imageData) {
        // Fallback to gray if no texture
        return { r: 128, g: 128, b: 128 };
    }

    // Sample from random position
    const x = Math.floor(Math.random() * TILE_SIZE);
    const y = Math.floor(Math.random() * TILE_SIZE);
    const idx = (y * TILE_SIZE + x) * 4;

    return {
        r: imageData.data[idx],
        g: imageData.data[idx + 1],
        b: imageData.data[idx + 2]
    };
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
        particles.r[index] = particles.r[last];
        particles.g[index] = particles.g[last];
        particles.b[index] = particles.b[last];
    }
    particles.count--;
}

/**
 * Add a new particle to the system
 */
function addParticle(x, y, vx, vy, life, r, g, b) {
    if (particles.count >= MAX_PARTICLES) return;
    const i = particles.count;
    particles.x[i] = x;
    particles.y[i] = y;
    particles.vx[i] = vx;
    particles.vy[i] = vy;
    particles.life[i] = life;
    particles.r[i] = r;
    particles.g[i] = g;
    particles.b[i] = b;
    particles.count++;
}

/**
 * Emit particles when a block is destroyed
 * @param {number} tileX - Block tile X coordinate
 * @param {number} tileY - Block tile Y coordinate
 * @param {number} blockId - Block type ID
 */
export function emitBlockBreakParticles(tileX, tileY, blockId) {
    // Center of the block in world coordinates
    const centerX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = tileY * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < PARTICLES_PER_BREAK; i++) {
        // Sample color from texture
        const color = sampleTextureColor(blockId);

        // Random angle for all directions
        const angle = Math.random() * Math.PI * 2;
        // High speed for visible scattering
        const speed = 0.4 + Math.random() * 0.4;

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // Random position offset within the block
        const offsetX = (Math.random() - 0.5) * TILE_SIZE * 0.5;
        const offsetY = (Math.random() - 0.5) * TILE_SIZE * 0.5;

        // Life with some variance
        const life = PARTICLE_LIFE + Math.floor(Math.random() * 120) - 60;

        addParticle(
            centerX + offsetX,
            centerY + offsetY,
            vx,
            vy,
            life,
            color.r,
            color.g,
            color.b
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
export function draw(g, cameraX, cameraY, viewWidth, viewHeight) {
    if (particles.count === 0) return;

    // Update culling bounds
    cullMinX = cameraX - CULL_MARGIN;
    cullMaxX = cameraX + viewWidth + CULL_MARGIN;
    cullMinY = cameraY - CULL_MARGIN;
    cullMaxY = cameraY + viewHeight + CULL_MARGIN;

    // Group particles by color for batch rendering
    const colorGroups = new Map();

    for (let i = 0; i < particles.count; i++) {
        const x = particles.x[i];
        const y = particles.y[i];

        // Frustum culling
        if (x < cullMinX || x > cullMaxX || y < cullMinY || y > cullMaxY) {
            continue;
        }

        // Create color key for grouping
        const colorKey = (particles.r[i] << 16) | (particles.g[i] << 8) | particles.b[i];
        if (!colorGroups.has(colorKey)) {
            colorGroups.set(colorKey, []);
        }
        colorGroups.get(colorKey).push(i);
    }

    // Batch render by color
    for (const [colorKey, indices] of colorGroups) {
        const color = colorKey; // Integer color

        for (const i of indices) {
            // Calculate alpha based on remaining life
            const lifeRatio = particles.life[i] / PARTICLE_LIFE;
            const alpha = lifeRatio * 0.9 + 0.1;

            // Draw small square particle
            g.rect(
                Math.floor(particles.x[i]) - 2,
                Math.floor(particles.y[i]) - 2,
                4,
                4
            );
            g.fill({ color: color, alpha: alpha });
        }
    }
}
