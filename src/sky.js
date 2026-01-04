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

export function getSkyGradientColors(altitude) {
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
