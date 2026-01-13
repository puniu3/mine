/**
 * Player Rendering Module
 *
 * Pure drawing functions with no game logic.
 * Handles visual representation of the player character.
 */

/**
 * Draws the player character using Pixi Graphics.
 * @param {PIXI.Graphics} g - Pixi Graphics object
 * @param {number} x - Player X position (float, pixels)
 * @param {number} y - Player Y position (float, pixels)
 * @param {number} vx - Horizontal velocity (for animation)
 * @param {boolean} facingRight - Direction player is facing
 * @param {number} animTimer - Animation timer value
 */
export function drawPlayer(g, x, y, vx, facingRight, animTimer) {
    const ox = Math.floor(x);
    const oy = Math.floor(y);

    const swing = Math.sin(animTimer * 0.01) * 5;
    const isMoving = Math.abs(vx) > 0.1;

    // Head
    g.rect(ox + 4, oy + 0, 12, 12);
    g.fill(0xf8b090);

    // Body
    g.rect(ox + 4, oy + 12, 12, 18);
    g.fill(0x00bcd4);

    // Legs
    g.rect(ox + 4, oy + 30, 5, 18 + (isMoving ? swing : 0));
    g.rect(ox + 11, oy + 30, 5, 18 - (isMoving ? swing : 0));
    g.fill(0x3f51b5);

    // Arm
    if (facingRight) {
        g.rect(ox + 10, oy + 12, 6, 18 + swing);
    } else {
        // Negative width simulation: 4 - 6 = -2
        g.rect(ox - 2, oy + 12, 6, 18 + swing);
    }
    g.fill(0xf8b090);
}
