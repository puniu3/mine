
import { BLOCKS } from '../constants.js';

export function generateBottomErosion(world) {
    // Parameters for the erosion noise
    // We want a jagged, weathered look.
    // Base erosion height from bottom (how much is definitely gone)
    const BASE_EROSION = 2;

    // Noise components
    // Low frequency for large shapes
    const FREQ_LOW = 0.02;
    const AMP_LOW = 8;

    // Medium frequency for detail
    const FREQ_MED = 0.1;
    const AMP_MED = 4;

    // High frequency for "jaggedness"
    const FREQ_HIGH = 0.5;
    const AMP_HIGH = 2;

    for (let x = 0; x < world.width; x++) {
        // Calculate noise value
        // Using Math.sin/cos is deterministic for a given x
        const noise =
            (Math.sin(x * FREQ_LOW) * AMP_LOW) +
            (Math.cos(x * FREQ_MED) * AMP_MED) +
            (Math.sin(x * FREQ_HIGH) * AMP_HIGH) +
            (Math.random() * 2); // Little bit of pure random fuzz

        // Calculate the "floor" height (y-coordinate where air ends and stone begins)
        // Since y=255 is bottom, we want to clear from 255 up to some y.
        // Let's say erosion amount is positive:
        // y_start = 255 (bottom)
        // y_end = 255 - (base + noise)

        // We ensure a minimum erosion to avoid completely flat spots if noise cancels out
        const erosionAmount = Math.max(0, BASE_EROSION + noise);

        const startY = Math.floor(world.height - erosionAmount);

        // Ensure we don't go out of bounds or too high
        // Clamp to valid range.
        // We only erode the bottom part, let's say max 30 blocks up.
        const effectiveStartY = Math.max(world.height - 40, Math.min(world.height, startY));

        for (let y = world.height - 1; y >= effectiveStartY; y--) {
            world.setBlock(x, y, BLOCKS.AIR);
        }
    }
}
