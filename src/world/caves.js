/**
 * Cave and geology generation
 */

import { BLOCKS } from '../constants.js';
import * as Painters from '../painters/index.js';

export function generateCaves(world, heights) {
    const paint = world.getAccessor();
    const caveWalkers = Math.max(3, Math.floor(world.width / 35));
    for (let i = 0; i < caveWalkers; i++) {
        const startX = Math.floor(Math.random() * world.width);
        const surface = heights[startX];
        const minY = surface + 8;
        const maxY = world.height - 6;
        if (minY >= maxY) continue;

        let x = startX;
        let y = minY + Math.floor(Math.random() * (maxY - minY));
        const steps = 30 + Math.floor(Math.random() * 40);

        for (let step = 0; step < steps; step++) {
            Painters.drawCavePocket(paint, x, y);

            x += Math.floor(Math.random() * 3) - 1;
            y += Math.floor(Math.random() * 3) - 1;

            // Wrapping X for cave walkers
            x = (x % world.width + world.width) % world.width;

            const surfaceAtX = heights[x];
            y = Math.max(surfaceAtX + 6, Math.min(world.height - 5, y));
        }
    }
}

export function generateGeology(world, heights) {
    const paint = world.getAccessor();

    const dirtPocketCount = Math.floor(world.width * world.height / 1500);
    for (let i = 0; i < dirtPocketCount; i++) {
        const x = Math.floor(Math.random() * world.width);
        const y = Math.floor(Math.random() * world.height);
        if (y > heights[x] + 8) Painters.drawBlob(paint, x, y, BLOCKS.DIRT, 2 + Math.random() * 2.5);
    }

    const sandPocketCount = Math.floor(world.width * world.height / 2500);
    for (let i = 0; i < sandPocketCount; i++) {
        const x = Math.floor(Math.random() * world.width);
        const y = Math.floor(Math.random() * world.height);
        if (y > heights[x] + 10) Painters.drawBlob(paint, x, y, BLOCKS.SAND, 1.5 + Math.random() * 2);
    }

    const waterPocketCount = Math.floor(world.width * world.height / 2000);
    for (let i = 0; i < waterPocketCount; i++) {
        const x = Math.floor(Math.random() * world.width);
        const y = Math.floor(Math.random() * world.height);
        if (y > heights[x] + 15 && y < world.height - 10) Painters.drawBlob(paint, x, y, BLOCKS.WATER, 2 + Math.random() * 2.5);
    }

    const coalVeinCount = Math.floor(world.width * world.height / 450);
    for (let i = 0; i < coalVeinCount; i++) {
        const x = Math.floor(Math.random() * world.width);
        const y = Math.floor(Math.random() * world.height);
        if (y > heights[x] + 6) Painters.drawBlob(paint, x, y, BLOCKS.COAL, 1.5 + Math.random() * 1.5);
    }

    const goldVeinCount = Math.floor(world.width * world.height / 800);
    for (let i = 0; i < goldVeinCount; i++) {
        const x = Math.floor(Math.random() * world.width);
        const y = Math.floor(Math.random() * world.height);
        if (y > heights[x] + 15) Painters.drawBlob(paint, x, y, BLOCKS.GOLD, 1.2 + Math.random() * 1.3);
    }
}
