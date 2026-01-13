
/**
 * Background Rendering Module
 * Handles the generation and drawing of parallax mountain backgrounds.
 */

// Cached background layers (canvases)
let mountainLayers = [];
const BG_PATTERN_WIDTH = 2048; // Fixed width for the repeating pattern

// Configuration for layers
const LAYERS_CONFIG = [
    {
        color: '#BDD4E7', // Furthest (Lightest, most atmospheric scattering)
        amplitude: 60,
        yOffset: 250,      // Lower in the sky (further away)
        parallax: 0.1,    // Moves very slowly
        detailAmp: 20
    },
    {
        color: '#9BB8D0', // Mid-distance
        amplitude: 80,
        yOffset: 300,
        parallax: 0.2,
        detailAmp: 30
    },
    {
        color: '#7A9CB8', // Closest (Darker)
        amplitude: 120,
        yOffset: 380,
        parallax: 0.4,
        detailAmp: 40
    }
];

/**
 * Initializes the background layers using a fixed repeating width.
 */
function initBackground() {
     if (mountainLayers.length > 0) return;

     mountainLayers = LAYERS_CONFIG.map(config => {
        const canvas = document.createElement('canvas');
        canvas.width = BG_PATTERN_WIDTH;
        canvas.height = 1200; // Large height to cover vertical scrolling
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = config.color;
        ctx.beginPath();

        // Start bottom-left
        ctx.moveTo(0, canvas.height);

        const step = 5; // Higher detail step
        for (let x = 0; x <= BG_PATTERN_WIDTH; x += step) {
            const nx = x / BG_PATTERN_WIDTH; // 0.0 to 1.0

            // Generate deterministic "random" terrain that loops perfectly
            // Wave 1: Large features (3 peaks)
            let y = Math.sin(nx * Math.PI * 2 * 3) * config.amplitude;
            // Wave 2: Medium details (7 peaks)
            y += Math.sin(nx * Math.PI * 2 * 7 + 1) * config.detailAmp;
            // Wave 3: Noise (17 peaks)
            y += Math.sin(nx * Math.PI * 2 * 17 + 2) * (config.detailAmp * 0.4);

            // Vertical position
            const baseHeight = 500 + config.yOffset;

            ctx.lineTo(x, baseHeight - y);
        }

        // Finish loop
        ctx.lineTo(BG_PATTERN_WIDTH, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fill();

        return { canvas, parallax: config.parallax };
     });
}

/**
 * Draws the background layers with parallax scrolling.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} params - { cameraX, cameraY, logicalWidth, logicalHeight, worldWidth, skyColors }
 */
export function drawBackground(ctx, params) {
    const { cameraX, cameraY, logicalWidth, logicalHeight } = params;

    // Ensure initialized
    if (mountainLayers.length === 0) {
        initBackground();
    }

    mountainLayers.forEach(layer => {
        // Calculate Parallax Offset
        // Parallax X: The background moves slower than the camera.
        const factor = layer.parallax;

        // Calculate the starting X position in the background image
        // We use modulus to handle the infinite looping over the pattern width.
        let bgX = (cameraX * factor) % BG_PATTERN_WIDTH;
        if (bgX < 0) bgX += BG_PATTERN_WIDTH;

        // Vertical Parallax
        const verticalParallax = 0.15;
        const drawY = -(cameraY * verticalParallax) + 100; // +100 to push them down

        const w = layer.canvas.width; // Should be BG_PATTERN_WIDTH

        // Draw Left part (from bgX to end of canvas or screen edge)
        // If the screen is wider than the pattern, we might need to draw more than 2 tiles.
        // But typically logicalWidth < 2048. If not, we'd need a loop.
        // Let's implement a robust loop.

        let destX = 0;
        let sourceX = bgX;

        while (destX < logicalWidth) {
            const widthToDraw = Math.min(logicalWidth - destX, w - sourceX);

            ctx.drawImage(
                layer.canvas,
                sourceX, 0, widthToDraw, layer.canvas.height,
                destX, drawY, widthToDraw, layer.canvas.height
            );

            destX += widthToDraw;
            sourceX = 0; // Next draw starts from 0 (wrap around)
        }
    });
}
