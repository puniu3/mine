/**
 * Camera Module
 * Handles camera position, smoothing, and world wrapping logic.
 */
import { smoothCamera } from './utils.js';
import { TILE_SIZE, CAMERA_SMOOTHING } from './constants.js';

export function createCamera() {
    let x = 0;
    let y = 0;

    return {
        // Getters for current position
        get x() { return x; },
        get y() { return y; },

        /**
         * Instantly sets the camera position without smoothing.
         * Useful for initialization or teleporting.
         */
        setPosition(newX, newY) {
            x = newX;
            y = newY;
        },

        /**
         * Updates the camera position based on the player's position.
         * Handles world wrapping and smoothing.
         * * @param {Object} player - The player object with getCenterX/Y methods
         * @param {Object} world - The world object with width property
         * @param {number} logicalWidth - Current logical width of the screen
         * @param {number} logicalHeight - Current logical height of the screen
         */
        update(player, world, logicalWidth, logicalHeight) {
            const targetCamX = player.getCenterX() - logicalWidth / 2;
            const targetCamY = player.getCenterY() - logicalHeight / 2;

            // Horizontal Wrapping Logic
            const worldWidthPixels = world.width * TILE_SIZE;
            const cameraDiffX = targetCamX - x;

            // Adjust current x to minimize distance to target across world boundaries
            if (Math.abs(cameraDiffX) > worldWidthPixels / 2) {
                if (cameraDiffX > 0) x += worldWidthPixels;
                else x -= worldWidthPixels;
            }

            // Vertical Wrapping Logic
            const worldHeightPixels = world.height * TILE_SIZE;
            const cameraDiffY = targetCamY - y;

            // Adjust current y to minimize distance to target across world boundaries
            if (Math.abs(cameraDiffY) > worldHeightPixels / 2) {
                if (cameraDiffY > 0) y += worldHeightPixels;
                else y -= worldHeightPixels;
            }

            // Apply smoothing to both axes
            x = smoothCamera(x, targetCamX, CAMERA_SMOOTHING);
            y = smoothCamera(y, targetCamY, CAMERA_SMOOTHING);
        }
    };
}
