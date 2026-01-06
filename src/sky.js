/**
 * Sky rendering module
 * Focus: Time & Altitude based atmospheric rendering
 */

import { clamp } from './utils.js';

// --- Color Palette Definitions ---
const SKY_PHASES = [
    { time: 0.00, top: '#4CA1AF', bottom: '#C4E0E5' }, // Noon
    { time: 0.35, top: '#4CA1AF', bottom: '#C4E0E5' }, // Afternoon
    { time: 0.40, top: '#ff758c', bottom: '#ff7eb3' }, // Golden Hour
    { time: 0.42, top: '#2C3E50', bottom: '#FD746C' }, // Sunset
    { time: 0.45, top: '#0f2027', bottom: '#203a43' }, // Twilight
    { time: 0.50, top: '#000000', bottom: '#1a1a2e' }, // Midnight
    { time: 0.55, top: '#0f2027', bottom: '#203a43' }, // Dawn
    { time: 0.58, top: '#2C3E50', bottom: '#FD746C' }, // Sunrise
    { time: 0.60, top: '#ff758c', bottom: '#ff7eb3' }, // Golden Morning
    { time: 0.65, top: '#4CA1AF', bottom: '#C4E0E5' }, // Morning
    { time: 1.00, top: '#4CA1AF', bottom: '#C4E0E5' }  // Noon
];

// Special environmental colors
const SPACE_COLOR = '#020205';       // Deep space black
const UNDERGROUND_COLOR = '#050505'; // Cave darkness

// Altitude thresholds (Normalized 0.0=Top, 1.0=Bottom)
// Assuming surface is roughly around 0.3 - 0.4 depending on terrain
const ALTITUDE_SPACE_START = 0.2; // Start fading to space above this
const ALTITUDE_SURFACE_LEVEL = 0.4; // Rough surface level
const ALTITUDE_UNDERGROUND_START = 0.5; // Start fading to darkness below this

// --- Star Generation ---
const NUM_STARS = 60;
const stars = [];
for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        size: Math.random() * 2 + 1,
        twinkleSpeed: Math.random() * 0.05 + 0.01
    });
}

/**
 * Linear interpolation between two hex colors
 */
function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates visibility factor based on altitude.
 * Returns 1.0 (visible) at surface/space, 0.0 (hidden) deep underground.
 */
function getAltitudeVisibility(altitude) {
    if (altitude > ALTITUDE_UNDERGROUND_START) {
        // Fade out as we go deeper (0.5 to 0.7)
        const depth = (altitude - ALTITUDE_UNDERGROUND_START) * 5; 
        return clamp(1.0 - depth, 0, 1);
    }
    return 1.0;
}

/**
 * Calculates current sky gradient based on Time AND Altitude.
 */
export function getSkyGradientColors(time, altitude) {
    // 1. Calculate Base Time Color
    time = time % 1.0;
    if (time < 0) time += 1.0;

    let p1 = SKY_PHASES[0];
    let p2 = SKY_PHASES[SKY_PHASES.length - 1];

    for (let i = 0; i < SKY_PHASES.length - 1; i++) {
        if (time >= SKY_PHASES[i].time && time < SKY_PHASES[i + 1].time) {
            p1 = SKY_PHASES[i];
            p2 = SKY_PHASES[i + 1];
            break;
        }
    }

    const range = p2.time - p1.time;
    const t = (time - p1.time) / range;
    
    let top = lerpColor(p1.top, p2.top, t);
    let bottom = lerpColor(p1.bottom, p2.bottom, t);

    // 2. Apply Altitude Modifiers
    
    // Case A: Space (Go Up)
    if (altitude < ALTITUDE_SPACE_START) {
        // Blend towards space color (0.2 -> 0.0)
        const spaceFactor = clamp((ALTITUDE_SPACE_START - altitude) * 4, 0, 1);
        top = lerpColor(top, SPACE_COLOR, spaceFactor);
        bottom = lerpColor(bottom, SPACE_COLOR, spaceFactor);
    }
    
    // Case B: Underground (Go Down)
    if (altitude > ALTITUDE_UNDERGROUND_START) {
        // Blend towards total darkness (0.5 -> 0.8)
        const caveFactor = clamp((altitude - ALTITUDE_UNDERGROUND_START) * 3, 0, 1);
        top = lerpColor(top, UNDERGROUND_COLOR, caveFactor);
        bottom = lerpColor(bottom, UNDERGROUND_COLOR, caveFactor);
    }

    return { top, bottom };
}

/**
 * Returns rendering data for the Sun.
 */
export function getSunRenderData(time, altitude, screenWidth, screenHeight) {
    // Standard Orbit
    const angle = (time * Math.PI * 2) - (Math.PI / 2);
    const orbitRadius = screenHeight * 0.9; 
    const centerX = screenWidth / 2;
    const centerY = screenHeight * 0.9; 
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;
    const SUN_RADIUS = 50;

    // Check base visibility
    let isVisible = y < screenHeight + SUN_RADIUS * 2;

    // Check altitude visibility (Hide sun if deep underground)
    const altVis = getAltitudeVisibility(altitude);
    if (altVis <= 0) isVisible = false;

    // Color Logic
    let color = '#FFFFA0';
    let shadowColor = '#FFFFFF';
    if (time > 0.35 && time < 0.65) {
        color = '#FF7E5F';
        shadowColor = '#FD746C';
    }

    return {
        type: 'sun',
        isVisible,
        x, y,
        radius: SUN_RADIUS,
        color,
        shadow: { color: shadowColor, blur: 40 },
        opacity: altVis // Add opacity for fade effect
    };
}

/**
 * Returns rendering data for the Moon.
 */
export function getMoonRenderData(time, altitude, screenWidth, screenHeight) {
    const angle = (time * Math.PI * 2) + (Math.PI / 2);
    const orbitRadius = screenHeight * 0.8; 
    const centerX = screenWidth / 2;
    const centerY = screenHeight * 0.9;
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;
    const MOON_RADIUS = 30;

    let isVisible = y < screenHeight + MOON_RADIUS * 2;
    
    const altVis = getAltitudeVisibility(altitude);
    if (altVis <= 0) isVisible = false;

    return {
        type: 'moon',
        isVisible,
        x, y,
        radius: MOON_RADIUS,
        color: '#F4F6F0',
        shadow: { color: '#ffffff', blur: 10 },
        opacity: altVis
    };
}

/**
 * Returns star data.
 */
export function getStarRenderData(time, altitude, screenWidth, screenHeight) {
    // Stars visible at night OR in space
    let opacity = 0;

    // 1. Time based opacity (Night time)
    if (time > 0.4 && time < 0.6) {
        if (time < 0.5) opacity = (time - 0.4) * 10;
        else opacity = (0.6 - time) * 10;
    }

    // 2. Altitude based opacity (Space)
    // If high up, stars appear even during day
    if (altitude < ALTITUDE_SPACE_START) {
        const spaceOpacity = clamp((ALTITUDE_SPACE_START - altitude) * 5, 0, 1);
        opacity = Math.max(opacity, spaceOpacity);
    }

    // 3. Underground check (Hide stars underground)
    const altVis = getAltitudeVisibility(altitude);
    opacity *= altVis;

    if (opacity <= 0.01) return [];

    return stars.map(star => ({
        x: star.x * screenWidth,
        y: star.y * screenHeight,
        size: star.size,
        opacity: opacity * (0.7 + Math.sin(Date.now() * star.twinkleSpeed) * 0.3)
    }));
}
