/**
 * Vegetation painters - trees, plants, and natural growth
 */

import { BLOCKS } from '../constants.js';

export function drawTreeOak(accessor, x, y) {
    const height = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < height; i++) accessor.set(x, y - i, BLOCKS.WOOD);
    for (let lx = x - 2; lx <= x + 2; lx++) {
        for (let ly = y - height - 2; ly <= y - height; ly++) {
            if (Math.abs(lx - x) === 2 && Math.abs(ly - (y - height)) === 2) continue;
            if (accessor.get(lx, ly) === BLOCKS.AIR) accessor.set(lx, ly, BLOCKS.LEAVES);
        }
    }
}

export function drawTreePine(accessor, x, y) {
    const height = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
    }

    let radius = 1;
    for (let dy = height; dy > 1; dy--) {
        const worldY = y - dy;

        if ((height - dy) % 2 === 0) radius = Math.min(3, radius + 1);
        if (dy === height) radius = 1;

        for (let lx = x - radius; lx <= x + radius; lx++) {
            if (lx === x && dy !== height) continue;

            if (accessor.get(lx, worldY) === BLOCKS.AIR) {
                accessor.set(lx, worldY, BLOCKS.LEAVES);
            }
        }
    }
    accessor.set(x, y - height, BLOCKS.LEAVES);
}

export function drawCactus(accessor, x, y) {
    const height = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.LEAVES);
    }

    if (height >= 3 && Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const armHeight = 1 + Math.floor(Math.random() * (height - 2));

        if (accessor.get(x + side, y - armHeight) === BLOCKS.AIR) {
            accessor.set(x + side, y - armHeight, BLOCKS.LEAVES);
            if (accessor.get(x + side, y - armHeight - 1) === BLOCKS.AIR) {
                accessor.set(x + side, y - armHeight - 1, BLOCKS.LEAVES);
            }
        }
    }
}

export function drawTreeDead(accessor, x, y) {
    const height = 3 + Math.floor(Math.random() * 3);

    let cx = x;
    for (let i = 0; i < height; i++) {
        accessor.set(cx, y - i, BLOCKS.WOOD);

        if (i > 1 && Math.random() < 0.3) {
            cx += (Math.random() < 0.5 ? -1 : 1);
        }
    }

    if (Math.random() < 0.5) {
            const branchY = y - Math.floor(height / 2);
            const dir = Math.random() < 0.5 ? -1 : 1;
            if (accessor.get(cx + dir, branchY) === BLOCKS.AIR) {
                accessor.set(cx + dir, branchY, BLOCKS.WOOD);
            }
    }
}

export function drawTreeJungle(accessor, x, y) {
    const height = 8 + Math.floor(Math.random() * 5);

    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
        if (Math.random() < 0.3) {
                const side = Math.random() < 0.5 ? -1 : 1;
                if (accessor.get(x + side, y - i) === BLOCKS.AIR) {
                    accessor.set(x + side, y - i, BLOCKS.LEAVES);
                }
        }
    }

    const radius = 3;
    for (let dy = 0; dy < 3; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) + dy < 4) {
                accessor.set(x + dx, y - height + 1 - dy, BLOCKS.LEAVES);
            }
        }
    }
}

export function drawTreeAcacia(accessor, x, y) {
    const height = 4 + Math.floor(Math.random() * 2);
    let cx = x;

    for (let i = 0; i < Math.floor(height / 2); i++) {
        accessor.set(cx, y - i, BLOCKS.WOOD);
    }

    const direction = Math.random() < 0.5 ? 1 : -1;
    for (let i = Math.floor(height / 2); i < height; i++) {
        cx += direction;
        accessor.set(cx, y - i, BLOCKS.WOOD);
    }

    for (let dx = -2; dx <= 2; dx++) {
        accessor.set(cx + dx, y - height, BLOCKS.LEAVES);
    }
    for (let dx = -1; dx <= 1; dx++) {
        accessor.set(cx + dx, y - height - 1, BLOCKS.LEAVES);
    }
}

export function drawTreeSwamp(accessor, x, y) {
    const height = 6 + Math.floor(Math.random() * 4);

    // Trunk
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
    }

    // Drooping leaves (Willow style)
    const radius = 3;
    for (let dy = 0; dy <= 2; dy++) { // Canopy height
        for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) + dy < 5) {
                const leafY = y - height + 1 - dy;
                if (accessor.get(x + dx, leafY) === BLOCKS.AIR) {
                    accessor.set(x + dx, leafY, BLOCKS.LEAVES);
                }

                // Vines/Drooping leaves
                if (Math.abs(dx) >= 2 && Math.random() < 0.6) {
                    const vineLength = 1 + Math.floor(Math.random() * 3);
                    for (let v = 1; v <= vineLength; v++) {
                         if (accessor.get(x + dx, leafY + v) === BLOCKS.AIR) {
                            accessor.set(x + dx, leafY + v, BLOCKS.LEAVES);
                        }
                    }
                }
            }
        }
    }
}

export function drawBush(accessor, x, y) {
    accessor.set(x, y, BLOCKS.LEAVES);
    if (Math.random() < 0.5 && accessor.get(x + 1, y) === BLOCKS.AIR) {
        accessor.set(x + 1, y, BLOCKS.LEAVES);
    }
    if (Math.random() < 0.3 && accessor.get(x, y - 1) === BLOCKS.AIR) {
        accessor.set(x, y - 1, BLOCKS.LEAVES);
    }
}

export function drawBoulder(accessor, x, y) {
    accessor.set(x, y, BLOCKS.STONE);
    if (Math.random() < 0.7) accessor.set(x + 1, y, BLOCKS.STONE);
    if (Math.random() < 0.5) accessor.set(x, y - 1, BLOCKS.STONE);
}
