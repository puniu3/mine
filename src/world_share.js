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
    [BLOCKS.ACCELERATOR_RIGHT]: '#66bb6a',
    [BLOCKS.WATER]: '#2196f3'
};

// Strict tolerance for specific blocks (Redmean distance threshold)
// Lower value = stricter matching required
const STRICT_TOLERANCE = 30; 

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
 * Calculate color distance using "Redmean" formula.
 * This approximates human vision better than simple Euclidean distance.
 * (Humans are more sensitive to Green, less to Blue)
 */
function getRedmeanDistance(r1, g1, b1, r2, g2, b2) {
    const rMean = (r1 + r2) / 2;
    const r = r1 - r2;
    const g = g1 - g2;
    const b = b1 - b2;
    
    // Formula: sqrt( (2 + rMean/256)*r^2 + 4*g^2 + (2 + (255-rMean)/256)*b^2 )
    // We omit sqrt for performance in comparisons, but include it here for threshold consistency
    const weightR = 2 + (rMean / 256);
    const weightG = 4.0;
    const weightB = 2 + ((255 - rMean) / 256);

    return Math.sqrt(weightR * r * r + weightG * g * g + weightB * b * b);
}

/**
 * Find nearest block ID by color distance (Perceptual)
 */
function findNearestBlock(r, g, b) {
    let minDist = Infinity;
    let nearestId = BLOCKS.DIRT; // Default fallback if everything fails

    for (const [blockIdStr, rgb] of Object.entries(BLOCK_RGB_MAP)) {
        const blockId = parseInt(blockIdStr);
        const dist = getRedmeanDistance(r, g, b, rgb.r, rgb.g, rgb.b);

        // --- STRICTNESS CHECK ---
        // If the candidate is AIR or WORKBENCH, require extremely close match.
        // If the color is not very close, we skip this block as a candidate.
        if ((blockId === BLOCKS.AIR || blockId === BLOCKS.WORKBENCH) && dist > STRICT_TOLERANCE) {
            continue;
        }
        // ------------------------

        if (dist < minDist) {
            minDist = dist;
            nearestId = blockId;
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
                data[pixelIndex + 3] = 255; // Alpha (Always opaque for export)
            }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(resolve, 'image/png');
    });
}

/**
 * Import world from image file
 * Overlays image onto a newly generated world with Floyd-Steinberg Dithering.
 * Transparent pixels in the image preserve the underlying world.
 * @param {File} file - Image file
 * @returns {Promise<Uint8Array>} World map data
 */
export function importWorldFromImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // 1. Generate a base world first (Terrain, Trees, etc.)
                // The World constructor calls generate() automatically.
                const baseWorld = new World(WORLD_WIDTH, WORLD_HEIGHT);
                const worldMap = baseWorld.map;

                // 2. Prepare canvas for image processing
                const canvas = document.createElement('canvas');
                canvas.width = WORLD_WIDTH;
                canvas.height = WORLD_HEIGHT;
                const ctx = canvas.getContext('2d');

                // Clear canvas (transparent)
                ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

                // Disable smoothing for pixel manipulation control
                ctx.imageSmoothingEnabled = false;

                // --- Aspect Ratio Logic ---
                const worldRatio = WORLD_WIDTH / WORLD_HEIGHT;
                const imgRatio = img.width / img.height;

                let drawWidth, drawHeight, offsetX, offsetY;

                if (imgRatio > worldRatio) {
                    // Landscape: Fit Height, Cut Left/Right
                    drawHeight = WORLD_HEIGHT;
                    drawWidth = img.width * (WORLD_HEIGHT / img.height);
                    offsetX = (WORLD_WIDTH - drawWidth) / 2; 
                    offsetY = 0;
                } else {
                    // Portrait/Square: Fit inside (Contain)
                    const scale = Math.min(WORLD_WIDTH / img.width, WORLD_HEIGHT / img.height);
                    drawWidth = img.width * scale;
                    drawHeight = img.height * scale;
                    offsetX = (WORLD_WIDTH - drawWidth) / 2;
                    offsetY = (WORLD_HEIGHT - drawHeight) / 2;
                }

                // Draw image (centered)
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                
                // Get pixel data from canvas
                const imageData = ctx.getImageData(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
                const data = imageData.data;

                // --- Floyd-Steinberg Dithering Setup ---
                // We use a Float32Array to hold pixel data so we can store 
                // negative errors or values > 255 during the diffusion process.
                const floatData = new Float32Array(data.length);
                for (let i = 0; i < data.length; i++) {
                    floatData[i] = data[i];
                }

                // Calculate bounds for the drawn image to optimize checks
                const startX = Math.floor(offsetX);
                const endX = Math.floor(offsetX + drawWidth);
                const startY = Math.floor(offsetY);
                const endY = Math.floor(offsetY + drawHeight);

                // 3. Process Dithering and Map Generation
                for (let y = 0; y < WORLD_HEIGHT; y++) {
                    for (let x = 0; x < WORLD_WIDTH; x++) {
                        
                        const index = y * WORLD_WIDTH + x;
                        const pixelIndex = index * 4;

                        // Check transparency directly from the float buffer
                        // Alpha channel is at +3
                        const alpha = floatData[pixelIndex + 3];

                        // Only process if the pixel is inside the image bounds and opaque enough
                        const isInsideImage = (x >= startX && x < endX && y >= startY && y < endY);
                        
                        if (isInsideImage && alpha >= 128) {
                            
                            // Get current color (potentially modified by previous error diffusion)
                            const oldR = floatData[pixelIndex];
                            const oldG = floatData[pixelIndex + 1];
                            const oldB = floatData[pixelIndex + 2];

                            // Find nearest block palette color
                            const blockId = findNearestBlock(oldR, oldG, oldB);
                            worldMap[index] = blockId;

                            // Get the ACTUAL color of the chosen block
                            // (We default to DIRT if something goes wrong, though findNearestBlock handles it)
                            const paletteRgb = BLOCK_RGB_MAP[blockId] || BLOCK_RGB_MAP[BLOCKS.DIRT];

                            // Calculate Quantization Error
                            const errR = oldR - paletteRgb.r;
                            const errG = oldG - paletteRgb.g;
                            const errB = oldB - paletteRgb.b;

                            // --- Floyd-Steinberg Error Diffusion ---
                            // Distribute error to neighboring pixels:
                            //         X   7
                            //     3   5   1
                            // (/16)

                            const distributeError = (dx, dy, factor) => {
                                const nx = x + dx;
                                const ny = y + dy;

                                // Boundary check
                                if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
                                    const nIndex = (ny * WORLD_WIDTH + nx) * 4;
                                    
                                    // Add fraction of error to neighbor
                                    floatData[nIndex]     += errR * factor / 16;
                                    floatData[nIndex + 1] += errG * factor / 16;
                                    floatData[nIndex + 2] += errB * factor / 16;
                                }
                            };

                            distributeError(1, 0, 7);   // Right
                            distributeError(-1, 1, 3);  // Bottom Left
                            distributeError(0, 1, 5);   // Bottom
                            distributeError(1, 1, 1);   // Bottom Right
                        }
                    }
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

        // Ensure we spawn in AIR, but land on something solid
        if (worldMap[index] === BLOCKS.AIR && blockBelow !== BLOCKS.AIR) {
            return { x: centerX, y };
        }
    }

    // Fallback: top center
    return { x: centerX, y: 10 };
}
