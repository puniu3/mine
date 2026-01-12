/**
 * Camera Module
 * Handles camera position, smoothing, and world wrapping logic.
 */
import { smoothCamera } from './utils.js';
import {
    TILE_SIZE,
    CAMERA_SMOOTHING,
    CAMERA_ZOOM_SPEED_THRESHOLD,
    CAMERA_ZOOM_FACTOR,
    CAMERA_MIN_ZOOM
} from './constants.js';

export function createCamera() {
    let x = 0;
    let y = 0;
    let zoom = 1;

    return {
        // Getters for current position
        get x() { return x; },
        get y() { return y; },
        get zoom() { return zoom; },

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
            // 1. Calculate target zoom based on player speed
            const speed = Math.hypot(player.vx, player.vy);
            let targetZoom = 1.0;
            if (speed > CAMERA_ZOOM_SPEED_THRESHOLD) {
                // Zoom out as speed increases above threshold
                // Max speed is usually around 40-50, so (50-15) * 0.015 ~= 0.5 reduction -> 0.5 zoom
                targetZoom = Math.max(
                    CAMERA_MIN_ZOOM,
                    1.0 - (speed - CAMERA_ZOOM_SPEED_THRESHOLD) * CAMERA_ZOOM_FACTOR
                );
            }

            // Smoothly interpolate zoom
            zoom = zoom + (targetZoom - zoom) * 0.05;

            // 2. Calculate target position
            // The visible width/height in world units depends on zoom
            const viewWidth = logicalWidth / zoom;
            const viewHeight = logicalHeight / zoom;

            const targetCamX = player.getCenterX() - viewWidth / 2;
            const targetCamY = player.getCenterY() - viewHeight / 2;

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
