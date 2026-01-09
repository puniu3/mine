/**
 * Extreme terrain features - canyons, volcanoes, plateaus, hills
 */

import { BLOCKS } from '../constants.js';

export function createExtremeTerrain(heights, width, height) {
    const MIN_FEATURE_GAP = 80;
    let lastFeatureX = -MIN_FEATURE_GAP;

    for (let x = 20; x < width - 20; x++) {
        if (x - lastFeatureX < MIN_FEATURE_GAP) continue;

        const rand = Math.random();
        const currentHeight = heights[x];

        if (rand < 0.003) {
            const featureWidth = 25 + Math.floor(Math.random() * 20);
            generateCanyon(heights, x, featureWidth, width, height);
            lastFeatureX = x + featureWidth;
        }
        else if (rand < 0.0045) {
            const featureWidth = 30 + Math.floor(Math.random() * 20);
            if (currentHeight > 50) {
                generateVolcano(heights, x, featureWidth, width);
                lastFeatureX = x + featureWidth;
            }
        }
        else if (rand > 0.995) {
            const featureWidth = 20 + Math.floor(Math.random() * 25);
            generatePlateau(heights, x, featureWidth, width);
            lastFeatureX = x + featureWidth;
        }
        else if (rand > 0.985) {
            const featureWidth = 40 + Math.floor(Math.random() * 30);
            generateRollingHills(heights, x, featureWidth, width);
            lastFeatureX = x + featureWidth;
        }
    }
}

export function generateCanyon(heights, centerX, featureWidth, worldWidth, worldHeight) {
    const depth = 25 + Math.floor(Math.random() * 20);
    const halfWidth = Math.floor(featureWidth / 2);

    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const tx = centerX + dx;
        const wrappedTx = (tx % worldWidth + worldWidth) % worldWidth;

        const dist = Math.abs(dx) / halfWidth;

        const smoothShape = Math.pow(Math.cos(dist * Math.PI / 2), 0.5);
        const stepShape = Math.floor(smoothShape * 4) / 4;
        const shapeFactor = (smoothShape * 0.3) + (stepShape * 0.7);
        const noise = (Math.sin(tx * 0.5) * 2);

        let change = Math.floor(depth * shapeFactor) + noise;

        let current = heights[wrappedTx];
        heights[wrappedTx] = Math.min(worldHeight - 5, current + change);
    }
    smoothTerrain(heights, centerX - halfWidth, centerX + halfWidth, worldWidth);
}

export function generateVolcano(heights, centerX, featureWidth, worldWidth) {
    const heightRise = 30 + Math.floor(Math.random() * 15);
    const halfWidth = Math.floor(featureWidth / 2);
    const craterWidth = featureWidth * 0.25;

    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const tx = centerX + dx;
        const wrappedTx = (tx % worldWidth + worldWidth) % worldWidth;
        const dist = Math.abs(dx);

        let shapeFactor = Math.exp(-Math.pow(dist / (featureWidth * 0.35), 2));

        if (dist < craterWidth) {
            const craterDepth = Math.pow((craterWidth - dist) / craterWidth, 2);
            shapeFactor -= craterDepth * 1.5;
        }

        let change = Math.floor(heightRise * shapeFactor);
        heights[wrappedTx] = Math.max(10, heights[wrappedTx] - change);
    }
}

export function generatePlateau(heights, centerX, featureWidth, worldWidth) {
    const heightRise = 15 + Math.floor(Math.random() * 15);
    const halfWidth = Math.floor(featureWidth / 2);

    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const tx = centerX + dx;
        const wrappedTx = (tx % worldWidth + worldWidth) % worldWidth;
        const dist = Math.abs(dx) / halfWidth;
        let factor = 0;

        if (dist < 0.6) {
            factor = 1.0 + (Math.random() * 0.1);
        } else {
            const falloff = (1 - dist) / 0.4;
            factor = falloff * falloff;
        }

        heights[wrappedTx] = Math.max(10, heights[wrappedTx] - Math.floor(heightRise * factor));
    }
}

export function generateRollingHills(heights, centerX, featureWidth, worldWidth) {
    const halfWidth = Math.floor(featureWidth / 2);
    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const tx = centerX + dx;
        const wrappedTx = (tx % worldWidth + worldWidth) % worldWidth;

        const rad = (dx / featureWidth) * Math.PI * 4;
        const change = Math.sin(rad) * 6;

        const dist = Math.abs(dx) / halfWidth;
        const blend = 1 - Math.pow(dist, 3);

        heights[wrappedTx] -= Math.floor(change * blend);
    }
}

export function smoothTerrain(heights, startX, endX, worldWidth) {
    for (let x = startX; x <= endX; x++) {
        // Calculate wrapped indices
        const prevIdx = ((x - 1) % worldWidth + worldWidth) % worldWidth;
        const currIdx = ((x) % worldWidth + worldWidth) % worldWidth;
        const nextIdx = ((x + 1) % worldWidth + worldWidth) % worldWidth;

        const prev = heights[prevIdx];
        const curr = heights[currIdx];
        const next = heights[nextIdx];

        if (Math.abs(prev - curr) > 3 && Math.abs(next - curr) > 3) {
            heights[currIdx] = Math.floor((prev + curr + next) / 3);
        }
    }
}

export function paintCliffFaces(world, heights) {
    for (let x = 0; x < world.width; x++) {
        const prevIdx = (x - 1 + world.width) % world.width;
        const nextIdx = (x + 1) % world.width;

        const h = heights[x];
        const hLeft = heights[prevIdx];
        const hRight = heights[nextIdx];

        if (h > hLeft + 2) {
            for (let y = hLeft + 1; y <= h; y++) {
               if (world.getBlock(prevIdx, y) === BLOCKS.DIRT) world.setBlock(prevIdx, y, BLOCKS.STONE);
            }
        }

        if (h > hRight + 2) {
            for (let y = hRight + 1; y <= h; y++) {
                if (world.getBlock(nextIdx, y) === BLOCKS.DIRT) world.setBlock(nextIdx, y, BLOCKS.STONE);
            }
        }
    }
}
