/**
 * Cloud painters - sky decoration
 */

import { BLOCKS } from '../constants.js';

export function drawCloudPuffy(accessor, x, y, width, height) {
    for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
            const centerX = width / 2;
            const centerY = height / 2;
            const distX = Math.abs(dx - centerX) / centerX;
            const distY = Math.abs(dy - centerY) / centerY;

            const threshold = 0.7 + Math.random() * 0.3;
            if (distX + distY < threshold) {
                accessor.set(x + dx, y + dy, BLOCKS.CLOUD);
            }
        }
    }
    const puffCount = Math.floor(width / 3);
    for (let i = 0; i < puffCount; i++) {
        const puffX = x + 1 + Math.floor(Math.random() * (width - 2));
        if (Math.random() > 0.4) {
            accessor.set(puffX, y - 1, BLOCKS.CLOUD);
        }
    }
}

export function drawCloudLong(accessor, x, y, length, thickness) {
    for (let dx = 0; dx < length; dx++) {
        for (let dy = 0; dy < thickness; dy++) {
            if ((dx < 2 || dx >= length - 2) && dy > 0) {
                if (Math.random() > 0.5) continue;
            }
            accessor.set(x + dx, y + dy, BLOCKS.CLOUD);
        }
        if (Math.random() > 0.7 && dx > 0 && dx < length - 1) {
            accessor.set(x + dx, y - 1, BLOCKS.CLOUD);
        }
    }
}

export function drawCloudLayered(accessor, x, y) {
    for (let dx = 2; dx < 8; dx++) {
        if (Math.random() > 0.3) {
            accessor.set(x + dx, y, BLOCKS.CLOUD);
        }
    }
    for (let dx = 0; dx < 12; dx++) {
        accessor.set(x + dx, y + 1, BLOCKS.CLOUD);
    }
    for (let dx = 1; dx < 10; dx++) {
        if (Math.random() > 0.2) {
            accessor.set(x + dx, y + 2, BLOCKS.CLOUD);
        }
    }
}

export function drawCloudCluster(accessor, x, y) {
    const clusterCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clusterCount; i++) {
        const offsetX = Math.floor(Math.random() * 15);
        const offsetY = Math.floor(Math.random() * 4);
        const size = 2 + Math.floor(Math.random() * 3);

        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < Math.ceil(size / 2); dy++) {
                if (Math.random() > 0.3) {
                    accessor.set(x + offsetX + dx, y + offsetY + dy, BLOCKS.CLOUD);
                }
            }
        }
    }
}

export function drawCloudByShapeId(accessor, x, y, shapeType) {
    switch (shapeType) {
        case 0:
            drawCloudPuffy(accessor, x, y, 4, 2);
            break;
        case 1:
            drawCloudLong(accessor, x, y, 12, 1);
            break;
        case 2:
            drawCloudPuffy(accessor, x, y, 8, 3);
            break;
        case 3:
            drawCloudLayered(accessor, x, y);
            break;
        case 4:
            drawCloudCluster(accessor, x, y);
            break;
    }
}
