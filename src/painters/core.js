/**
 * Core painting utilities - basic shape drawing functions
 */

import { BLOCKS } from '../constants.js';

export function drawBlob(accessor, cx, cy, blockType, radius) {
    const rSq = radius * radius;
    const ceilR = Math.ceil(radius);

    for (let dx = -ceilR; dx <= ceilR; dx++) {
        for (let dy = -ceilR; dy <= ceilR; dy++) {
            if (dx * dx + dy * dy <= rSq) {
                const x = cx + dx;
                const y = cy + dy;
                // Only replace stone or dirt (simple context check allowed for painting)
                const current = accessor.get(x, y);
                if (current === BLOCKS.STONE || current === BLOCKS.DIRT) {
                    accessor.set(x, y, blockType);
                }
            }
        }
    }
}

export function drawPond(accessor, cx, cy, radius) {
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = 0; dy <= radius / 2; dy++) {
            if (dx * dx + dy * dy * 4 <= radius * radius) { // flattened circle
                accessor.set(cx + dx, cy + dy, BLOCKS.WATER);
            }
        }
    }
}

export function drawCavePocket(accessor, cx, cy) {
    const radius = 2 + Math.floor(Math.random() * 3);
    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            if (x * x + y * y <= radius * radius) {
                const worldX = cx + x;
                const worldY = cy + y;
                if (worldY < accessor.height - 1) {
                    accessor.set(worldX, worldY, BLOCKS.AIR);
                }
            }
        }
    }
}
