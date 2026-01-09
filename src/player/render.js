/**
 * Player Rendering Module
 *
 * Pure drawing functions with no game logic.
 * Handles visual representation of the player character.
 */

/**
 * Draws the player character on the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Player X position (float, pixels)
 * @param {number} y - Player Y position (float, pixels)
 * @param {number} vx - Horizontal velocity (for animation)
 * @param {boolean} facingRight - Direction player is facing
 * @param {number} animTimer - Animation timer value
 */
export function drawPlayer(ctx, x, y, vx, facingRight, animTimer) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));

    const swing = Math.sin(animTimer * 0.01) * 5;
    const isMoving = Math.abs(vx) > 0.1;

    // Head
    ctx.fillStyle = '#f8b090';
    ctx.fillRect(4, 0, 12, 12);

    // Body
    ctx.fillStyle = '#00bcd4';
    ctx.fillRect(4, 12, 12, 18);

    // Legs
    ctx.fillStyle = '#3f51b5';
    ctx.fillRect(4, 30, 5, 18 + (isMoving ? swing : 0));
    ctx.fillRect(11, 30, 5, 18 - (isMoving ? swing : 0));

    // Arm
    ctx.fillStyle = '#f8b090';
    if (facingRight) {
        ctx.fillRect(10, 12, 6, 18 + swing);
    } else {
        ctx.fillRect(4, 12, -6, 18 + swing);
    }

    ctx.restore();
}
