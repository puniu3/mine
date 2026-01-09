/**
 * 2D Minecraft Clone - Texture Generator
 */

import { BLOCKS, TILE_SIZE } from './constants.js';

/**
 * Generates procedural textures for the game blocks.
 *
 * This function creates an HTMLCanvasElement for each block type defined in `BLOCKS`.
 * It uses the HTML5 Canvas API to draw patterns and add noise for a textured look.
 *
 * @returns {Object.<number, HTMLCanvasElement>} A dictionary mapping block IDs to their corresponding texture canvases.
 */
export function generateTextures() {
    const textures = {};

    /**
     * Helper function to create a texture canvas.
     * @param {number} blockType - The ID of the block type.
     * @param {function(CanvasRenderingContext2D, number): void} drawFn - A callback function to draw the texture. Receives the context and tile size.
     */
    const createTexture = (blockType, drawFn) => {
        const c = document.createElement('canvas');
        c.width = TILE_SIZE;
        c.height = TILE_SIZE;
        const ctx = c.getContext('2d');
        drawFn(ctx, TILE_SIZE);
        textures[blockType] = c;
    };

    /**
     * Adds noise to the canvas context to simulate texture.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {number} [amount=0.1] - The intensity of the noise (0.0 to 1.0).
     */
    const addNoise = (ctx, amount = 0.1) => {
        const id = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            const noise = (Math.random() - 0.5) * amount * 255;
            d[i] += noise;
            d[i + 1] += noise;
            d[i + 2] += noise;
        }
        ctx.putImageData(id, 0, 0);
    };

    createTexture(BLOCKS.DIRT, (ctx, s) => {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, s, s);
        addNoise(ctx, 0.15);
    });

    createTexture(BLOCKS.GRASS, (ctx, s) => {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, s, s);
        addNoise(ctx, 0.15);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(0, 0, s, s / 3);
        addNoise(ctx, 0.1);
        for (let i = 0; i < s; i += 4) {
            if (Math.random() > 0.5) ctx.fillRect(i, s / 3, 4, 4);
        }
    });

    createTexture(BLOCKS.STONE, (ctx, s) => {
        ctx.fillStyle = '#757575';
        ctx.fillRect(0, 0, s, s);
        addNoise(ctx, 0.2);
    });

    createTexture(BLOCKS.SAND, (ctx, s) => {
        ctx.fillStyle = '#d7c27a';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#c2aa63';
        for (let i = 0; i < 12; i++) {
            ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
        }
        addNoise(ctx, 0.12);
    });

    createTexture(BLOCKS.SNOW, (ctx, s) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, s);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#d7e4f2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#b0c4de';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
        }
        addNoise(ctx, 0.06);
    });

    createTexture(BLOCKS.WOOD, (ctx, s) => {
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#4e342e';
        for (let i = 4; i < s; i += 8) ctx.fillRect(i, 0, 2, s);
        addNoise(ctx, 0.1);
    });

    createTexture(BLOCKS.LEAVES, (ctx, s) => {
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(0, 0, s, s);
        addNoise(ctx, 0.2);
        ctx.fillStyle = '#1b5e20';
        for (let i = 0; i < 10; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 4, 4);
    });

    createTexture(BLOCKS.SAPLING, (ctx, s) => {
        // Clear the area first to ensure transparency
        ctx.clearRect(0, 0, s, s);

        // 1. Draw the Stem (Curved line from bottom)
        ctx.strokeStyle = '#43a047'; // Darker green for the stem
        ctx.lineWidth = s * 0.1;       // Thickness relative to tile size
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s * 0.5, s * 0.95); // Start at bottom center
        // Curve slightly towards the center
        ctx.quadraticCurveTo(s * 0.5, s * 0.7, s * 0.5, s * 0.5);
        ctx.stroke();

        // 2. Draw Leaves (Lighter green)
        ctx.fillStyle = '#76ff03'; // Bright neon-like green for visibility
        
        // Left Leaf (Rotated oval)
        ctx.beginPath();
        // x, y, radiusX, radiusY, rotation, startAngle, endAngle
        ctx.ellipse(s * 0.35, s * 0.45, s * 0.16, s * 0.08, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Right Leaf (Rotated oval, slightly higher)
        ctx.beginPath();
        ctx.ellipse(s * 0.65, s * 0.35, s * 0.18, s * 0.09, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 3. Add light texture noise
        addNoise(ctx, 0.05);
    });

    createTexture(BLOCKS.WATER, (ctx, s) => {
        // Clear background
        ctx.clearRect(0, 0, s, s);

        // Semi-transparent blue base
        ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
        ctx.fillRect(0, 0, s, s);

        // Water ripple/wave effect
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        // Draw some wavy lines
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const y = s * (0.3 + i * 0.25);
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(s * 0.3, y - 4, s * 0.7, y + 4, s, y);
        }
        ctx.stroke();

        addNoise(ctx, 0.05);
    });

    createTexture(BLOCKS.BEDROCK, (ctx, s) => {
        ctx.fillStyle = '#212121';
        ctx.fillRect(0, 0, s, s);
        addNoise(ctx, 0.4);
    });

    /**
     * Creates a texture generator function for ores.
     * @param {string} baseColor - The base color of the stone.
     * @param {string} speckColor - The color of the ore specks.
     * @returns {function(CanvasRenderingContext2D, number): void} The drawing function.
     */
    const createOre = (baseColor, speckColor) => (ctx, s) => {
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, s, s);
        addNoise(ctx, 0.2);
        ctx.fillStyle = speckColor;
        for (let i = 0; i < 6; i++) ctx.fillRect(Math.random() * (s - 6), Math.random() * (s - 6), 6, 6);
    };

    createTexture(BLOCKS.COAL, createOre('#757575', '#000'));
    createTexture(BLOCKS.GOLD, createOre('#757575', '#FFD700'));

    createTexture(BLOCKS.JACKPOT, (ctx, s) => {
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(0, 0, s, s);

        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(2, 2, s - 4, s - 4);

        ctx.fillStyle = '#f9a825';
        for (let i = 0; i < 6; i++) {
            const w = 6 + Math.random() * 4;
            const h = 6 + Math.random() * 4;
            ctx.fillRect(4 + Math.random() * (s - 8 - w), 4 + Math.random() * (s - 8 - h), w, h);
        }

        ctx.strokeStyle = '#fff9c4';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, s - 6, s - 6);
        addNoise(ctx, 0.06);
    });

    createTexture(BLOCKS.WORKBENCH, (ctx, s) => {
        // Wood base
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, 0, s, s);
        // Table top
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, s, s / 3);
        // Legs (visual)
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(4, s/3, 4, s - s/3);
        ctx.fillRect(s - 8, s/3, 4, s - s/3);

        // Tools/Detail on top
        ctx.fillStyle = '#bcaaa4'; // Hammer/Tool
        ctx.fillRect(8, 4, 16, 4);

        addNoise(ctx, 0.1);
    });

    createTexture(BLOCKS.FIREWORK, (ctx, s) => {
        // Box
        ctx.fillStyle = '#ef5350'; // Red
        ctx.fillRect(4, 8, s - 8, s - 8);
        // Stripes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, 12, s - 8, 4);
        ctx.fillRect(4, 20, s - 8, 4);
        // Fuse
        ctx.fillStyle = '#795548';
        ctx.fillRect(s/2 - 1, 0, 2, 8);

        addNoise(ctx, 0.1);
    });

    createTexture(BLOCKS.JUMP_PAD, (ctx, s) => {
        const margin = 4;
        const coilWidth = s - (margin * 2);

        // Base (Dark support at the bottom)
        ctx.fillStyle = '#212121';
        ctx.fillRect(margin, s - 4, coilWidth, 4);

        // Spring Coil (Simulating the accordion/spiral metal look)
        // Background for the coil (shadow)
        ctx.fillStyle = '#616161';
        ctx.fillRect(margin + 2, 10, coilWidth - 4, s - 14);

        // The coils themselves (lighter bands)
        ctx.fillStyle = '#bdbdbd';
        for (let y = 10; y < s - 6; y += 4) {
            ctx.fillRect(margin + 2, y, coilWidth - 4, 2);
        }

        // Top Cap (The red part you step on)
        ctx.fillStyle = '#d32f2f'; // Red
        ctx.fillRect(margin - 1, 4, coilWidth + 2, 6);

        // Highlight on the top cap for 3D effect
        ctx.fillStyle = '#ef9a9a'; // Light red/pink highlight
        ctx.fillRect(margin + 2, 5, coilWidth - 4, 2);

        addNoise(ctx, 0.1);
    });

    createTexture(BLOCKS.TNT, (ctx, s) => {
        // Red base
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(0, 0, s, s);

        // White band
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, s / 3, s, s / 3);

        // "TNT" Text (approximate with rectangles if text is blurry, or use text)
        // Canvas text at 32x32 is often blurry, but let's try
        ctx.fillStyle = '#000000';
        // T
        ctx.fillRect(4, s/3 + 2, 6, 2);
        ctx.fillRect(6, s/3 + 2, 2, 6);
        // N
        ctx.fillRect(12, s/3 + 2, 2, 6);
        ctx.fillRect(16, s/3 + 2, 2, 6);
        ctx.fillRect(12, s/3 + 2, 4, 2); // Top bar? No N is diagonal.
        // Let's just do vertical bars for N
        ctx.fillRect(13, s/3 + 3, 2, 2); // Diagonal-ish bit

        // T
        ctx.fillRect(20, s/3 + 2, 6, 2);
        ctx.fillRect(22, s/3 + 2, 2, 6);

        // Top fuse
        ctx.fillStyle = '#757575'; // Gray top
        ctx.fillRect(0, 0, s, 4);
        ctx.fillRect(0, s-4, s, 4); // Gray bottom

        addNoise(ctx, 0.1);
    });

    createTexture(BLOCKS.CLOUD, (ctx, s) => {
        // Light semi-transparent base for a thin cloud look when solo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(0, 0, s, s);

        // Add soft puffy shapes that connect when blocks are adjacent
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

        // Top edge puffs (connect horizontally)
        ctx.beginPath();
        ctx.arc(s * 0.25, s * 0.3, s * 0.22, 0, Math.PI * 2);
        ctx.arc(s * 0.5, s * 0.2, s * 0.25, 0, Math.PI * 2);
        ctx.arc(s * 0.75, s * 0.3, s * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Middle area fill
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, s * 0.25, s, s * 0.5);

        // Bottom edge puffs
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(s * 0.2, s * 0.7, s * 0.2, 0, Math.PI * 2);
        ctx.arc(s * 0.5, s * 0.75, s * 0.22, 0, Math.PI * 2);
        ctx.arc(s * 0.8, s * 0.7, s * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Light shadow/depth at bottom
        ctx.fillStyle = 'rgba(200, 220, 240, 0.3)';
        ctx.fillRect(0, s * 0.7, s, s * 0.3);

        addNoise(ctx, 0.04);
    });

    createTexture(BLOCKS.ACCELERATOR_LEFT, (ctx, s) => {
        // Clear background
        ctx.clearRect(0, 0, s, s);

        // Blue background with semi-transparency
        ctx.fillStyle = 'rgba(66, 165, 245, 0.7)';
        ctx.fillRect(0, 0, s, s);

        // Border for visibility
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, s - 2, s - 2);

        // Draw left-pointing arrow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Arrow pointing left
        ctx.moveTo(s * 0.25, s * 0.5);  // Left point
        ctx.lineTo(s * 0.65, s * 0.2);  // Top right
        ctx.lineTo(s * 0.65, s * 0.4);  // Top inner
        ctx.lineTo(s * 0.75, s * 0.4);  // Arrow shaft top
        ctx.lineTo(s * 0.75, s * 0.6);  // Arrow shaft bottom
        ctx.lineTo(s * 0.65, s * 0.6);  // Bottom inner
        ctx.lineTo(s * 0.65, s * 0.8);  // Bottom right
        ctx.closePath();
        ctx.fill();

        addNoise(ctx, 0.05);
    });

    createTexture(BLOCKS.ACCELERATOR_RIGHT, (ctx, s) => {
        // Clear background
        ctx.clearRect(0, 0, s, s);

        // Green background with semi-transparency
        ctx.fillStyle = 'rgba(102, 187, 106, 0.7)';
        ctx.fillRect(0, 0, s, s);

        // Border for visibility
        ctx.strokeStyle = '#388e3c';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, s - 2, s - 2);

        // Draw right-pointing arrow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Arrow pointing right
        ctx.moveTo(s * 0.75, s * 0.5);  // Right point
        ctx.lineTo(s * 0.35, s * 0.2);  // Top left
        ctx.lineTo(s * 0.35, s * 0.4);  // Top inner
        ctx.lineTo(s * 0.25, s * 0.4);  // Arrow shaft top
        ctx.lineTo(s * 0.25, s * 0.6);  // Arrow shaft bottom
        ctx.lineTo(s * 0.35, s * 0.6);  // Bottom inner
        ctx.lineTo(s * 0.35, s * 0.8);  // Bottom left
        ctx.closePath();
        ctx.fill();

        addNoise(ctx, 0.05);
    });

    return textures;
}
