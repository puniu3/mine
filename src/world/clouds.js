/**
 * Cloud generation
 */

import * as Painters from '../painters/index.js';

export function generateClouds(world, heights) {
    const minHeightAboveGround = 20;
    const cloudCount = Math.floor(world.width / 25);
    const accessor = world.getAccessor();

    const SEA_LEVEL = Math.floor(world.height / 2) + 2;

    for (let i = 0; i < cloudCount; i++) {
        const startX = Math.floor(Math.random() * world.width);
        const groundHeight = heights[startX];

        const effectiveSurfaceY = Math.min(groundHeight, SEA_LEVEL);

        const maxCloudY = effectiveSurfaceY - minHeightAboveGround;
        const minCloudY = 5;

        if (maxCloudY <= minCloudY) continue;

        const y = minCloudY + Math.floor(Math.random() * (maxCloudY - minCloudY));
        const shape = Math.floor(Math.random() * 5);

        Painters.drawCloudByShapeId(accessor, startX, y, shape);
    }
}
