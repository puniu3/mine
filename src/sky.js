/**
 * Sky rendering module
 */

import { clamp } from './utils.js';

const SKY_BANDS = {
    surface: { top: '#87CEEB', bottom: '#E0F7FA' },
    underground: { top: '#1b1b25', bottom: '#0a0c14' },
    stratosphere: { top: '#0d1b42', bottom: '#6fb3ff' }
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(lerp(r1, r2, t));
    const g = Math.round(lerp(g1, g2, t));
    const b = Math.round(lerp(b1, b2, t));

    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getRawSkyGradientColors(altitude) {
    // altitude: 0 = top of world (high sky), 1 = bottom (deep underground)
    const surfaceLower = 0.45;
    const surfaceUpper = 0.55;

    if (altitude < surfaceLower) {
        const t = clamp(altitude / surfaceLower, 0, 1);
        return {
            top: lerpColor(SKY_BANDS.stratosphere.top, SKY_BANDS.surface.top, t),
            bottom: lerpColor(SKY_BANDS.stratosphere.bottom, SKY_BANDS.surface.bottom, t)
        };
    }

    if (altitude > surfaceUpper) {
        const t = clamp((altitude - surfaceUpper) / (1 - surfaceUpper), 0, 1);
        return {
            top: lerpColor(SKY_BANDS.surface.top, SKY_BANDS.underground.top, t),
            bottom: lerpColor(SKY_BANDS.surface.bottom, SKY_BANDS.underground.bottom, t)
        };
    }

    return SKY_BANDS.surface;
}

export function getSkyGradientColors(altitude) {
    // Smooth blending at the edges of the world (looping)
    const LOOP_SMOOTH_MARGIN = 0.15; 
    
    const baseColor = getRawSkyGradientColors(altitude);

    // Blend bottom color at top edge
    if (altitude < LOOP_SMOOTH_MARGIN) {
        const otherColor = getRawSkyGradientColors(1.0);
        const t = altitude / LOOP_SMOOTH_MARGIN;
        const blendFactor = 0.5 * (1 - t);
        
        return {
            top: lerpColor(baseColor.top, otherColor.top, blendFactor),
            bottom: lerpColor(baseColor.bottom, otherColor.bottom, blendFactor)
        };
    }

    // Blend top color at bottom edge
    if (altitude > 1.0 - LOOP_SMOOTH_MARGIN) {
        const otherColor = getRawSkyGradientColors(0.0);
        const t = (1.0 - altitude) / LOOP_SMOOTH_MARGIN;
        const blendFactor = 0.5 * (1 - t);

        return {
            top: lerpColor(baseColor.top, otherColor.top, blendFactor),
            bottom: lerpColor(baseColor.bottom, otherColor.bottom, blendFactor)
        };
    }

    return baseColor;
}

/**
 * Calculates the sun's Y position on screen based on player altitude.
 * Assumes a looped world where top (0.0) connects to bottom (1.0).
 * * @param {number} altitude - Normalized altitude (0.0 to 1.0).
 * @param {number} viewHeight - The logical height of the viewport.
 * @returns {number} The Y coordinate for the sun center.
 */
export function getSunViewPosition(altitude, viewHeight) {
    // Adjusted Sun Position:
    // Placed at 0.25 (Mid-Sky) instead of 0.0.
    // Since the world wraps (0.0 connects to 1.0), placing it at 0.25 keeps it
    // visible from the Surface (0.5) but maximizes distance from Deep Underground (0.75-1.0).
    const SUN_ALTITUDE = 0.25;

    // Adjusted Scale:
    // Reduced from 4.0 to 1.6. 
    // This wider FOV allows the sun to be seen from the surface (distance 0.25),
    // but ensures it goes off-screen when the player moves underground (distance > 0.35).
    const PARALLAX_SCALE = 1.6;

    // Ensure altitude is within 0-1
    let normAlt = ((altitude % 1) + 1) % 1;

    let diff = SUN_ALTITUDE - normAlt;

    // Shortest path on the torus (wrap around 0.5)
    if (diff > 0.5) diff -= 1.0;
    if (diff < -0.5) diff += 1.0;

    const offset = diff * viewHeight * PARALLAX_SCALE;
    return (viewHeight / 2) + offset;
}

/**
 * Calculates all rendering data for the sun.
 * Returns a data object to keep the display logic pure.
 */
export function getSunRenderData(altitude, screenWidth, screenHeight) {
    // Calculate vertical position
    const sunY = getSunViewPosition(altitude, screenHeight);
    
    const SUN_RADIUS = 60;
    const isVisible = sunY > -SUN_RADIUS * 2 && sunY < screenHeight + SUN_RADIUS * 2;

    return {
        isVisible,
        x: screenWidth * 0.8,
        y: sunY,
        radius: SUN_RADIUS,
        color: '#FFFFA0',
        shadow: {
            color: '#FFFFFF',
            blur: 40
        }
    };
}