/**
 * Structure painters - buildings, ruins, and artificial constructs
 */

import { BLOCKS } from '../constants.js';
import { drawTreeJungle, drawTreeOak, drawBush } from './vegetation.js';

export function drawOasis(accessor, cx, cy) {
    const waterRadius = 3 + Math.floor(Math.random() * 2);
    const grassRadius = waterRadius + 2;

    // 1. Draw Grass Bed (replaces Sand to create lush area)
    for (let dx = -grassRadius; dx <= grassRadius; dx++) {
        const dist = Math.abs(dx);
        for (let dy = -1; dy <= 3; dy++) {
            const x = cx + dx;
            const y = cy + dy;

            // Create a "bowl" for the water
            if (dist <= waterRadius) {
                 if (dy > 0) accessor.set(x, y, BLOCKS.SAND); // Bed of the pool
            } else {
                // The rim
                if (dy === 0) accessor.set(x, y, BLOCKS.GRASS);
                else if (dy > 0) accessor.set(x, y, BLOCKS.DIRT);
            }
        }
    }

    // 2. Fill Water
    for (let dx = -waterRadius; dx <= waterRadius; dx++) {
        // Flatten the water surface logic a bit for aesthetic
        const depth = (Math.abs(dx) < waterRadius - 1) ? 1 : 0;
        for (let dy = 0; dy <= depth; dy++) {
            accessor.set(cx + dx, cy + dy, BLOCKS.WATER);
        }
        // Clear air above water
        accessor.set(cx + dx, cy - 1, BLOCKS.AIR);
        accessor.set(cx + dx, cy - 2, BLOCKS.AIR);
    }

    // 3. Add Vegetation (Palm Trees using Jungle Tree logic)
    const treeCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < treeCount; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const tx = cx + (side * (waterRadius + 1));
        // Ensure we plant on the grass rim
        if (accessor.get(tx, cy) === BLOCKS.GRASS) {
            drawTreeJungle(accessor, tx, cy - 1);
        }
    }

    // 4. Add a bush or two
    if (Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const bx = cx + (side * (grassRadius - 1));
         if (accessor.get(bx, cy) === BLOCKS.GRASS) {
            drawBush(accessor, bx, cy - 1);
        }
    }
}

export function drawMonolith(accessor, x, y) {
    const height = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.BEDROCK);
        accessor.set(x + 1, y - i, BLOCKS.BEDROCK);
    }
    // Top reward
    accessor.set(x, y - height, BLOCKS.GOLD);
    accessor.set(x + 1, y - height, BLOCKS.GOLD);

    // Base decoration
    accessor.set(x - 1, y, BLOCKS.STONE);
    accessor.set(x + 2, y, BLOCKS.STONE);
}

export function drawBuriedBunker(accessor, cx, cy) {
    const width = 6;
    const height = 5;
    const x = cx - Math.floor(width / 2);
    const y = cy;

    for (let dx = -1; dx <= width; dx++) {
        for (let dy = -1; dy <= height; dy++) {
            const bx = x + dx;
            const by = y + dy;

            if (dx === -1 || dx === width || dy === -1 || dy === height) {
                accessor.set(bx, by, BLOCKS.STONE);
            } else {
                accessor.set(bx, by, BLOCKS.AIR);
            }
        }
    }

    // Loot
    accessor.set(x + 1, y + height - 1, BLOCKS.JACKPOT);
    accessor.set(x + width - 2, y + height - 1, BLOCKS.TNT);
    accessor.set(x + Math.floor(width/2), y + height - 1, BLOCKS.WORKBENCH);
}

export function drawWorldTree(accessor, x, y) {
    const height = 15 + Math.floor(Math.random() * 10);

    // Trunk
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
        accessor.set(x + 1, y - i, BLOCKS.WOOD);
        // Roots
        if (i < 3) {
            accessor.set(x - 1, y - i + 1, BLOCKS.WOOD);
            accessor.set(x + 2, y - i + 1, BLOCKS.WOOD);
        }
    }

    // Crown
    const radius = 6;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius + 1; dx++) {
            if (dx * dx + dy * dy <= radius * radius + Math.random() * 5) {
                const by = y - height + dy;
                if (accessor.get(x + dx, by) === BLOCKS.AIR) {
                    accessor.set(x + dx, by, BLOCKS.LEAVES);
                }
            }
        }
    }

    // Hidden reward inside leaves
    accessor.set(x, y - height - 2, BLOCKS.GOLD);
}

export function drawFloatingIsland(accessor, cx, cy) {
    const radius = 3 + Math.floor(Math.random() * 3);
    for (let dy = 0; dy <= radius * 1.5; dy++) {
        const currentRadius = Math.max(0, radius - (dy * 0.7));
        for (let dx = -Math.ceil(currentRadius); dx <= Math.ceil(currentRadius); dx++) {
            const x = cx + dx;
            const y = cy + dy;

            if (dy === 0) {
                accessor.set(x, y, BLOCKS.GRASS);
                if (dx === 0 && Math.random() < 0.3) {
                    drawTreeOak(accessor, x, y - 1);
                }
            } else if (dy < 2) {
                accessor.set(x, y, BLOCKS.DIRT);
            } else {
                if (Math.random() < 0.4 || (dx === 0 && dy > 2)) {
                    accessor.set(x, y, BLOCKS.GOLD);
                } else {
                    accessor.set(x, y, BLOCKS.STONE);
                }
            }
        }
    }
}

export function drawOceanIsland(accessor, cx, seaLevel) {
    const width = 4 + Math.floor(Math.random() * 5); // Radius
    const height = 4 + Math.floor(Math.random() * 3); // Height above water

    for (let dx = -width; dx <= width; dx++) {
        const dist = Math.abs(dx) / width;
        const h = Math.floor(height * (1 - dist * dist));

        const topY = seaLevel - h;
        const bottomY = seaLevel + 4 + Math.floor(Math.random() * 3);

        for (let y = topY; y <= bottomY; y++) {
            if (y < seaLevel) {
                accessor.set(cx + dx, y, BLOCKS.SAND);
                if (y === topY && Math.random() > 0.2) {
                    accessor.set(cx + dx, y, BLOCKS.GRASS);
                }
            } else {
                accessor.set(cx + dx, y, BLOCKS.SAND);
            }
        }
    }

    if (Math.random() > 0.3) {
        drawTreeOak(accessor, cx, seaLevel - height - 1);
    }
}

export function drawDesertRuin(accessor, x, y) {
    const type = Math.floor(Math.random() * 4);

    if (type === 0) {
        const height = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < height; i++) {
            accessor.set(x, y - 1 - i, BLOCKS.STONE);
        }
        if (Math.random() < 0.5) accessor.set(x, y - 1 - height, BLOCKS.STONE);
        if (Math.random() < 0.4) accessor.set(x + 1, y - 1, BLOCKS.STONE);
    } else if (type === 1) {
        const size = 3 + Math.floor(Math.random() * 2);
        for (let dy = 0; dy < size; dy++) {
            const width = size - dy - 1;
            for (let dx = -width; dx <= width; dx++) {
                if (Math.random() > 0.1) {
                    accessor.set(x + dx, y - 1 - dy, BLOCKS.STONE);
                }
            }
        }
    } else if (type === 2) {
        const height = 4;
        const width = 3;
        for (let dx = -1; dx <= 1; dx++) {
            accessor.set(x + dx, y - height, BLOCKS.STONE);
        }
        for (let i = 1; i < height; i++) {
            accessor.set(x - 1, y - i, BLOCKS.STONE);
            accessor.set(x + 1, y - i, BLOCKS.STONE);
        }
    } else if (type === 3) {
        const length = 4 + Math.floor(Math.random() * 3);
        for (let dx = 0; dx < length; dx++) {
            const h = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < h; i++) {
                accessor.set(x + dx, y - 1 - i, BLOCKS.STONE);
            }
        }
    }
}

export function drawMineshaft(accessor, startX, startY) {
    const length = 10 + Math.floor(Math.random() * 15);
    let x = startX;
    let y = startY;

    for (let i = 0; i < length; i++) {
        if (x >= accessor.width - 2) break;

        accessor.set(x, y, BLOCKS.AIR);
        accessor.set(x, y - 1, BLOCKS.AIR);
        accessor.set(x, y - 2, BLOCKS.AIR);

        accessor.set(x, y + 1, BLOCKS.WOOD);

        if (i % 4 === 0) {
            if (accessor.get(x, y + 1) !== BLOCKS.AIR) accessor.set(x, y, BLOCKS.WOOD);
            if (accessor.get(x, y - 2) !== BLOCKS.AIR) accessor.set(x, y - 1, BLOCKS.WOOD);

            accessor.set(x, y - 2, BLOCKS.WOOD);
        }

        x++;
        if (Math.random() < 0.1) y += (Math.random() < 0.5 ? -1 : 1);

        if (y > accessor.height - 5) y = accessor.height - 5;
        if (y < 50) y = 50;
    }
}

export function drawLaputa(accessor, cx, cy) {
    const width = 25 + Math.floor(Math.random() * 10); // Radius
    const depth = 20 + Math.floor(Math.random() * 5); // Depth of the cone

    // 1. Draw the main inverted cone
    for (let dy = 0; dy <= depth; dy++) {
        // Radius decreases as we go down
        // shape factor power 0.7 makes it a bit rounded
        const currentRadius = width * (1 - Math.pow(dy / depth, 0.8));
        const radCeil = Math.ceil(currentRadius);

        for (let dx = -radCeil; dx <= radCeil; dx++) {
            // Basic ellipse check
            if ((dx * dx) / (currentRadius * currentRadius) <= 1) {
                const x = cx + dx;
                const y = cy + dy;

                if (dy === 0) {
                    // Top soil
                    accessor.set(x, y, BLOCKS.GRASS);
                } else if (dy < 3) {
                    // Sub soil
                    accessor.set(x, y, BLOCKS.DIRT);
                } else {
                    // Stone core
                    // Occasionally mix in ore or clay/sand for texture
                    const r = Math.random();
                    if (r > 0.98) accessor.set(x, y, BLOCKS.GOLD); // Ancient tech
                    else if (r > 0.95) accessor.set(x, y, BLOCKS.COAL); // Old fuel
                    else accessor.set(x, y, BLOCKS.STONE);
                }
            }
        }
    }

    // 2. Surface Features (Ruins)
    // We iterate over the top surface
    for (let dx = -width + 2; dx <= width - 2; dx++) {
        const x = cx + dx;
        const y = cy; // Surface level

        // Random ruin pillars
        if (Math.abs(dx) % 5 === 0 && Math.random() < 0.6) {
            const h = 4 + Math.floor(Math.random() * 5);
            for (let i = 1; i <= h; i++) {
                accessor.set(x, y - i, BLOCKS.STONE);
            }
            // Maybe a crossbeam
            if (Math.random() < 0.5) {
                accessor.set(x + 1, y - h, BLOCKS.STONE);
                accessor.set(x - 1, y - h, BLOCKS.STONE);
            }
        }

        // Random trees
        if (Math.random() < 0.05 && accessor.get(x, y) === BLOCKS.GRASS) {
            drawTreeOak(accessor, x, y - 1);
        }

        // Water pools
        if (Math.abs(dx) < 5 && Math.random() < 0.3) {
            accessor.set(x, y, BLOCKS.WATER);
            accessor.set(x, y + 1, BLOCKS.STONE); // basin
        }
    }

    // 3. The Central "Castle" / Structure
    const castleWidth = 8;
    const castleHeight = 8;
    for (let dx = -castleWidth; dx <= castleWidth; dx++) {
        for (let dy = 0; dy < castleHeight; dy++) {
            const x = cx + dx;
            const y = cy - 1 - dy;
            // Crumbling Walls
            if ((Math.abs(dx) === castleWidth || Math.abs(dx) === castleWidth - 2) && Math.random() > 0.2) {
                accessor.set(x, y, BLOCKS.STONE);
            }
        }
    }

    // Core Crystal
    const coreY = cy - castleHeight + 2;
    accessor.set(cx, coreY, BLOCKS.JACKPOT);
    accessor.set(cx, coreY - 1, BLOCKS.GOLD);
    accessor.set(cx, coreY + 1, BLOCKS.GOLD);
    accessor.set(cx - 1, coreY, BLOCKS.GOLD);
    accessor.set(cx + 1, coreY, BLOCKS.GOLD);
}

export function drawAncientRuins(accessor, cx, floorY) {
    // Randomize shape and size
    const caveRadiusX = 20 + Math.floor(Math.random() * 10); // 20 - 29
    const caveRadiusY = 16 + Math.floor(Math.random() * 5);  // 16 - 20

    // 1. Excavate the Great Void (Oval Cave)
    // We iterate over the bounding box
    for (let dy = -caveRadiusY; dy <= 2; dy++) { // Go a bit below 0 to ensure flat floor
        for (let dx = -caveRadiusX; dx <= caveRadiusX; dx++) {
            // Ellipse equation check for cave shape
            if ((dx * dx) / (caveRadiusX * caveRadiusX) + (dy * dy) / (caveRadiusY * caveRadiusY) <= 1.0) {
                const tx = cx + dx;
                const ty = floorY + dy - Math.floor(caveRadiusY * 0.6); // Shift cave up slightly so floorY is bottom
                if (ty > 0 && ty < accessor.height - 1) {
                    accessor.set(tx, ty, BLOCKS.AIR);
                }
            }
        }
    }

    // 2. The Artificial Sun (Floating Gold Sphere)
    const sunX = cx;
    const sunY = floorY - caveRadiusY - 2; // Floating near top of void
    const sunRad = 3;

    for (let dx = -sunRad; dx <= sunRad; dx++) {
        for (let dy = -sunRad; dy <= sunRad; dy++) {
            if (dx * dx + dy * dy <= sunRad * sunRad) {
                accessor.set(sunX + dx, sunY + dy, BLOCKS.GOLD);
            }
        }
    }
    // The Core of the Sun
    accessor.set(sunX, sunY, BLOCKS.JACKPOT);

    // 3. The Pyramid (Sandstone style)
    const pyrBase = 16 + Math.floor(Math.random() * 8); // 16 - 23
    const pyrHeight = Math.ceil(pyrBase / 2);

    for (let h = 0; h < pyrHeight; h++) {
        const width = pyrBase - (h * 2);
        const py = floorY - h;

        const startX = cx - Math.floor(width / 2);
        for (let w = 0; w < width; w++) {
            accessor.set(startX + w, py, BLOCKS.SAND);
        }
    }

    // Pyramid Capstone (Updated to SAND)
    accessor.set(cx, floorY - pyrHeight, BLOCKS.SAND);

    // Hidden Treasure inside Pyramid
    accessor.set(cx, floorY - 1, BLOCKS.JACKPOT);
    accessor.set(cx - 1, floorY - 1, BLOCKS.GOLD);
    accessor.set(cx + 1, floorY - 1, BLOCKS.GOLD);
}

export function drawShipwreck(accessor, cx, floorY) {
    const length = 16 + Math.floor(Math.random() * 8);
    const height = 6 + Math.floor(Math.random() * 3);
    const slope = (Math.random() - 0.5) * 0.8; // Tilt factor

    const bowX = cx - Math.floor(length / 2);
    const sternX = cx + Math.floor(length / 2);

    for (let x = bowX; x <= sternX; x++) {
        // Curve the keel up at the ends
        const dist = Math.abs(x - cx) / (length / 2);
        let yOffset = 0;
        if (dist > 0.5) {
            yOffset = Math.floor(Math.pow((dist - 0.5) * 4, 1.5));
        }

        // Apply tilt
        const tiltOffset = Math.floor((x - cx) * slope);

        const keelY = floorY - yOffset + tiltOffset;
        const deckY = keelY - height;

        // Draw vertical slice
        for (let y = deckY; y <= keelY; y++) {
            if (y === keelY) {
                // Bottom
                accessor.set(x, y, BLOCKS.WOOD);
            } else if (y === deckY) {
                // Deck (with holes)
                if (Math.random() > 0.2) accessor.set(x, y, BLOCKS.WOOD);
                else accessor.set(x, y, BLOCKS.WATER);
            } else if (x === bowX || x === sternX) {
                // Side walls
                accessor.set(x, y, BLOCKS.WOOD);
            } else {
                // Interior
                // Random pillars or cargo
                if (Math.random() < 0.05) accessor.set(x, y, BLOCKS.WOOD); // Crates?
                else accessor.set(x, y, BLOCKS.WATER);
            }
        }
    }

    // Masts (damaged & tilted)
    // Mast is roughly perpendicular to deck
    // Normal vector is (-slope, 1) or something similar in 2D
    // Simple approach: shift X as we go up based on slope

    const mastX1 = cx - Math.floor(length / 4);
    const mastX2 = cx + Math.floor(length / 4);

    [mastX1, mastX2].forEach(mx => {
        const h = 8 + Math.floor(Math.random() * 8);

        // Calculate base Y for mast
        const tiltOffset = Math.floor((mx - cx) * slope);
        const keelY = floorY + tiltOffset; // Approx base Y at this X
        const deckY = keelY - height;

        // Perpendicular slope approximation: dx/dy = -slope
        // So for every step up (dy=-1), dx += slope

        for (let i = 0; i < h; i++) {
             const y = deckY - i;
             const xOffset = Math.round(i * slope);
             const x = mx + xOffset;

             accessor.set(x, y, BLOCKS.WOOD);

             // Yardarm (also tilted, following slope)
             if (i === h - 2) {
                 // Yardarm is parallel to deck, so slope applies to it
                 for (let ydx = -2; ydx <= 2; ydx++) {
                     if (ydx === 0) continue; // Center handled

                     // Yardarm offset
                     // For x displacement 'ydx', y displacement is 'ydx * slope'
                     const armY = y + Math.floor(ydx * slope);
                     if (Math.random() > 0.2) {
                         accessor.set(x + ydx, armY, BLOCKS.WOOD);
                     }
                 }
             }
        }
    });

    // Treasure (Center)
    // Should align with the tilt at center (cx)
    // At cx, tiltOffset is 0.
    // However, if the ship is very tilted, we might want to place it safely.
    // Center is usually safe.

    // Calculate local deck Y at center
    const centerKeelY = floorY; // tiltOffset is 0
    // But we might have the keel curve offset if we were not at center...
    // at cx, dist is 0, so yOffset is 0.

    const centerDeckY = centerKeelY - height;

    // Place treasure inside
    const treasureY = centerKeelY - 2;
    accessor.set(cx, treasureY, BLOCKS.JACKPOT);
    accessor.set(cx - 1, treasureY, BLOCKS.GOLD); // Not tilted perfectly but close enough for loot pile
    accessor.set(cx + 1, treasureY, BLOCKS.GOLD);
}
