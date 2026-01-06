/**
 * Sky rendering module
 * Focus: Aesthetics, Short Nights, and Smooth Transitions
 */

import { clamp } from './utils.js';

// --- Color Palette Definitions ---
// Sky phases defined by normalized time (0.0 = Noon, 0.5 = Midnight, 1.0 = Noon)
// "Short Night" Logic: Compress night phases closely around 0.5
const SKY_PHASES = [
    { time: 0.00, top: '#4CA1AF', bottom: '#C4E0E5' }, // Noon: Clear Blue / Cyan
    { time: 0.35, top: '#4CA1AF', bottom: '#C4E0E5' }, // Afternoon: Still Bright
    { time: 0.40, top: '#ff758c', bottom: '#ff7eb3' }, // Golden Hour: Pink/Salmon
    { time: 0.42, top: '#2C3E50', bottom: '#FD746C' }, // Sunset: Navy to Orange
    { time: 0.45, top: '#0f2027', bottom: '#203a43' }, // Twilight: Deep Dark Blue
    { time: 0.50, top: '#000000', bottom: '#1a1a2e' }, // Midnight: Pitch Black / Deep Navy
    { time: 0.55, top: '#0f2027', bottom: '#203a43' }, // Dawn: Deep Dark Blue
    { time: 0.58, top: '#2C3E50', bottom: '#FD746C' }, // Sunrise: Navy to Orange
    { time: 0.60, top: '#ff758c', bottom: '#ff7eb3' }, // Golden Morning: Pink/Salmon
    { time: 0.65, top: '#4CA1AF', bottom: '#C4E0E5' }, // Morning: Clear Blue
    { time: 1.00, top: '#4CA1AF', bottom: '#C4E0E5' }  // Noon: Loop back
];

// --- Star Generation ---
// Generate static stars once
const NUM_STARS = 60;
const stars = [];
for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
        x: Math.random(), // Normalized 0-1 width
        y: Math.random() * 0.6, // Top 60% of screen only
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
 * Calculates current sky gradient based on time keyframes.
 */
export function getSkyGradientColors(time) {
    // Handle wrap-around just in case
    time = time % 1.0;
    if (time < 0) time += 1.0;

    // Find the two phases we are between
    let p1 = SKY_PHASES[0];
    let p2 = SKY_PHASES[SKY_PHASES.length - 1];

    for (let i = 0; i < SKY_PHASES.length - 1; i++) {
        if (time >= SKY_PHASES[i].time && time < SKY_PHASES[i + 1].time) {
            p1 = SKY_PHASES[i];
            p2 = SKY_PHASES[i + 1];
            break;
        }
    }

    // Map time to 0..1 within this phase
    const range = p2.time - p1.time;
    const t = (time - p1.time) / range;

    return {
        top: lerpColor(p1.top, p2.top, t),
        bottom: lerpColor(p1.bottom, p2.bottom, t)
    };
}

/**
 * Returns rendering data for the Sun.
 * Adjusted to redden during sunset/sunrise.
 */
export function getSunRenderData(time, screenWidth, screenHeight) {
    // 0.0=Noon (Top), 0.5=Midnight (Bottom)
    // Shift phase so 0.0 is -90deg (Top)
    const angle = (time * Math.PI * 2) - (Math.PI / 2);
    
    // Orbit settings
    const orbitRadius = screenHeight * 0.9; 
    const centerX = screenWidth / 2;
    const centerY = screenHeight * 0.9; 

    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;

    // Visibility check
    const SUN_RADIUS = 50;
    const isVisible = y < screenHeight + SUN_RADIUS * 2;

    // Color Dynamic: Yellow at noon, Red/Orange at horizon
    // Horizon is roughly when time is around 0.4 or 0.6
    let color = '#FFFFA0'; // Noon Yellow
    let shadowColor = '#FFFFFF';
    
    // Calculate "Redness" based on closeness to horizon (0.35-0.65 range)
    if (time > 0.35 && time < 0.65) {
        color = '#FF7E5F'; // Sunset Orange
        shadowColor = '#FD746C';
    }

    return {
        type: 'sun',
        isVisible,
        x,
        y,
        radius: SUN_RADIUS,
        color,
        shadow: { color: shadowColor, blur: 40 }
    };
}

/**
 * Returns rendering data for the Moon.
 * Appears opposite to the sun.
 */
export function getMoonRenderData(time, screenWidth, screenHeight) {
    // Opposite phase to sun
    const angle = (time * Math.PI * 2) + (Math.PI / 2);
    
    const orbitRadius = screenHeight * 0.8; 
    const centerX = screenWidth / 2;
    const centerY = screenHeight * 0.9;

    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;
    
    const MOON_RADIUS = 30;
    const isVisible = y < screenHeight + MOON_RADIUS * 2;

    return {
        type: 'moon',
        isVisible,
        x,
        y,
        radius: MOON_RADIUS,
        color: '#F4F6F0', // Pale White
        shadow: { color: '#ffffff', blur: 10 }
    };
}

/**
 * Returns star data with opacity based on darkness.
 */
export function getStarRenderData(time, screenWidth, screenHeight) {
    // Stars are visible around midnight (0.45 to 0.55)
    // Opacity peaks at 0.5
    let opacity = 0;
    if (time > 0.4 && time < 0.6) {
        // Linear fade in/out
        if (time < 0.5) opacity = (time - 0.4) * 10; // 0.4->0.0, 0.5->1.0
        else opacity = (0.6 - time) * 10;            // 0.5->1.0, 0.6->0.0
    }

    if (opacity <= 0) return [];

    return stars.map(star => ({
        x: star.x * screenWidth,
        y: star.y * screenHeight,
        size: star.size,
        opacity: opacity * (0.7 + Math.sin(Date.now() * star.twinkleSpeed) * 0.3)
    }));
}
