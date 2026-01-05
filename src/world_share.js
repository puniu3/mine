/**
 * World Share Module
 * Export/Import world as image (1 tile = 1 pixel)
 */

import { BLOCKS, BLOCK_PROPS, WORLD_WIDTH, WORLD_HEIGHT } from './constants.js';
import { World } from './world.js';

// Color mapping for export (WOOD uses different color to avoid collision with DIRT)
const EXPORT_COLORS = {
    [BLOCKS.AIR]: '#87CEEB',           // Sky blue for AIR
    [BLOCKS.DIRT]: '#5d4037',
    [BLOCKS.GRASS]: '#388e3c',
    [BLOCKS.STONE]: '#757575',
    [BLOCKS.WOOD]: '#6d4c41',          // Different brown to avoid DIRT collision
    [BLOCKS.LEAVES]: '#2e7d32',
    [BLOCKS.BEDROCK]: '#000000',
    [BLOCKS.COAL]: '#212121',
    [BLOCKS.GOLD]: '#ffb300',
    [BLOCKS.WORKBENCH]: '#8d6e63',
    [BLOCKS.SAND]: '#d7c27a',
    [BLOCKS.SNOW]: '#e0f7fa',
    [BLOCKS.CLOUD]: '#ffffff',
    [BLOCKS.FIREWORK]: '#ef5350',
    [BLOCKS.JUMP_PAD]: '#ab47bc',
    [BLOCKS.TNT]: '#d32f2f',
    [BLOCKS.SAPLING]: '#6fa85b',
    [BLOCKS.JACKPOT]: '#ffd54f',
    [BLOCKS.ACCELERATOR_LEFT]: '#42a5f5',
    [BLOCKS.ACCELERATOR_RIGHT]: '#66bb6a'
};

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// Pre-compute RGB values for all blocks
const BLOCK_RGB_MAP = {};
for (const [blockId, color] of Object.entries(EXPORT_COLORS)) {
    BLOCK_RGB_MAP[blockId] = hexToRgb(color);
}

/**
 * Find nearest block ID by color distance (Euclidean)
 */
function findNearestBlock(r, g, b) {
    let minDist = Infinity;
    let nearestId = BLOCKS.AIR;

    for (const [blockId, rgb] of Object.entries(BLOCK_RGB_MAP)) {
        const dist = (r - rgb.r) ** 2 + (g - rgb.g) ** 2 + (b - rgb.b) ** 2;
        if (dist < minDist) {
            minDist = dist;
            nearestId = parseInt(blockId);
        }
    }

    return nearestId;
}

/**
 * Export world to PNG image (1 tile = 1 pixel)
 * @param {Uint8Array} worldMap - The world map data
 * @param {number} width - World width in tiles
 * @param {number} height - World height in tiles
 * @returns {Promise<Blob>} PNG blob
 */
export function exportWorldToImage(worldMap, width, height) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const blockId = worldMap[index];
                const rgb = BLOCK_RGB_MAP[blockId] || BLOCK_RGB_MAP[BLOCKS.AIR];

                const pixelIndex = index * 4;
                data[pixelIndex] = rgb.r;
                data[pixelIndex + 1] = rgb.g;
                data[pixelIndex + 2] = rgb.b;
                data[pixelIndex + 3] = 255; // Alpha
            }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(resolve, 'image/png');
    });
}

/**
 * Import world from image file
 * @param {File} file - Image file
 * @returns {Promise<Uint8Array>} World map data
 */
export function importWorldFromImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // Create canvas at target world size
                const canvas = document.createElement('canvas');
                canvas.width = WORLD_WIDTH;
                canvas.height = WORLD_HEIGHT;
                const ctx = canvas.getContext('2d');

                // Disable smoothing for nearest-neighbor scaling
                ctx.imageSmoothingEnabled = false;

                // Draw image scaled to world size
                ctx.drawImage(img, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

                // Get pixel data
                const imageData = ctx.getImageData(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
                const data = imageData.data;

                // Convert to world map
                const worldMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT);

                for (let i = 0; i < worldMap.length; i++) {
                    const pixelIndex = i * 4;
                    const r = data[pixelIndex];
                    const g = data[pixelIndex + 1];
                    const b = data[pixelIndex + 2];

                    worldMap[i] = findNearestBlock(r, g, b);
                }

                resolve(worldMap);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Download blob as file
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Find spawn position (center top, search for ground)
 */
export function findSpawnPosition(worldMap, width, height) {
    const centerX = Math.floor(width / 2);

    // Search downward from top to find ground
    for (let y = 0; y < height - 1; y++) {
        const index = y * width + centerX;
        const blockBelow = worldMap[(y + 1) * width + centerX];

        if (worldMap[index] === BLOCKS.AIR && blockBelow !== BLOCKS.AIR) {
            return { x: centerX, y };
        }
    }

    // Fallback: top center
    return { x: centerX, y: 10 };
}
