/**
 * Player Rendering Module (PixiJS)
 *
 * Pure drawing functions with no game logic.
 * Handles visual representation of the player character.
 */

/**
 * Updates the player graphics.
 * @param {PIXI.Graphics} graphics - The graphics object to draw into
 * @param {number} vx - Horizontal velocity (for animation)
 * @param {boolean} facingRight - Direction player is facing
 * @param {number} animTimer - Animation timer value
 */
export function updatePlayerGraphics(graphics, vx, facingRight, animTimer) {
    graphics.clear();

    const swing = Math.sin(animTimer * 0.01) * 5;
    const isMoving = Math.abs(vx) > 0.1;

    // Head
    graphics.rect(4, 0, 12, 12).fill(0xf8b090);

    // Body
    graphics.rect(4, 12, 12, 18).fill(0x00bcd4);

    // Legs
    // Note: Height calculation might need flooring to avoid subpixel gaps/blur if strictly pixel art,
    // but Pixi handles it fine.
    graphics.rect(4, 30, 5, 18 + (isMoving ? swing : 0)).fill(0x3f51b5);
    graphics.rect(11, 30, 5, 18 - (isMoving ? swing : 0)).fill(0x3f51b5);

    // Arm
    if (facingRight) {
        graphics.rect(10, 12, 6, 18 + swing).fill(0xf8b090);
    } else {
        // Handle negative width from original canvas logic
        // Original: x=4, w=-6 (Draws from 4 leftwards to -2)
        // Pixi rect: x, y, w, h (w should be positive usually, though negative works in some contexts,
        // standardizing is safer).
        // Rect from -2 to 4 is width 6 at x=-2.
        graphics.rect(-2, 12, 6, 18 + swing).fill(0xf8b090);
    }
}
