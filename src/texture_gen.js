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
    
    return textures;
}
