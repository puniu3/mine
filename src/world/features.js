/**
 * Structure and feature generation - floating islands, ruins, mineshafts, etc.
 */

import { BLOCKS } from '../constants.js';
import { BIOMES } from './biomes.js';
import * as Painters from '../painters/index.js';

export function generateStructures(world, heights, biomeByColumn, seaLevel) {
    const paint = world.getAccessor();

    // Floating Islands
    const islandCount = Math.floor(world.width / 80);
    for (let i = 0; i < islandCount; i++) {
        const x = Math.floor(Math.random() * world.width);
        const surface = heights[x];
        const spawnBaseY = Math.min(surface, seaLevel);
        const maxY = spawnBaseY - 35;
        const minY = 15;

        if (maxY > minY) {
            const y = minY + Math.floor(Math.random() * (maxY - minY));
            Painters.drawFloatingIsland(paint, x, y);
        }
    }

    // Ocean Islands
    for (let x = 0; x < world.width; x += 1) {
        if (biomeByColumn[x] === BIOMES.OCEAN && Math.random() < 0.03) {
            Painters.drawOceanIsland(paint, x, seaLevel);
            x += 40;
        }
    }

    // Desert Ruins and Oases
    for (let x = 0; x < world.width; x += 1) {
        if (biomeByColumn[x] === BIOMES.DESERT) {
            if (Math.random() < 0.002) {
                 Painters.drawOasis(paint, x, heights[x]);
                 x += 25;
            }
            else if (Math.random() < 0.015) {
                const nextH = heights[(x + 2) % world.width];
                if (Math.abs(nextH - heights[x]) < 2) {
                    Painters.drawDesertRuin(paint, x, heights[x]);
                    x += 15;
                }
            }
        }
    }

    // Mineshafts
    const mineshaftCount = Math.floor(world.width / 50);
    for (let i = 0; i < mineshaftCount; i++) {
        const x = Math.floor(Math.random() * world.width);
        const surface = heights[x];
        Painters.drawMineshaft(paint, x, surface + 15 + Math.floor(Math.random() * (world.height - surface - 20)));
    }
}

export function generateHiddenFeatures(world, heights, biomeByColumn) {
    const paint = world.getAccessor();
    for (let x = 0; x < world.width; x++) {
        const biome = biomeByColumn[x];
        const surfaceY = heights[x];

        // 1. Ancient Monolith
        if ((biome === BIOMES.PLAINS || biome === BIOMES.WASTELAND) && Math.random() < 0.003) {
            Painters.drawMonolith(paint, x, surfaceY);
            x += 10; continue;
        }

        // 2. Buried Bunker
        if ((biome === BIOMES.FOREST || biome === BIOMES.SAVANNA) && Math.random() < 0.004) {
            if (surfaceY < world.height - 20) {
                Painters.drawBuriedBunker(paint, x, surfaceY + 8);
                x += 15; continue;
            }
        }

        // 3. World Tree
        if (biome === BIOMES.DEEP_FOREST && Math.random() < 0.005) {
            Painters.drawWorldTree(paint, x, surfaceY);
            x += 15; continue;
        }
    }

    // 4. Super Ancient Civilization (Pyramid in Deep Void) - Only ONE per world
    // Place it somewhere in the middle-ish 80% of the map to avoid edges
    const ruinX = 100 + Math.floor(Math.random() * (world.width - 200));
    const ruinFloorY = world.height - 10 - Math.floor(Math.random() * 10); // Deep underground
    Painters.drawAncientRuins(paint, ruinX, ruinFloorY);

    // 5. Laputa (Giant Floating Island Ruins) - Only ONE per world
    // High in the sky
    const laputaX = 150 + Math.floor(Math.random() * (world.width - 300));
    const laputaY = 30 + Math.floor(Math.random() * 10); // Y: 30-40 (High Sky)
    Painters.drawLaputa(paint, laputaX, laputaY);
}

export function generateOceanRifts(world, heights, biomeByColumn) {
    let riftCooldown = 0;

    for (let x = 0; x < world.width; x++) {
        if (riftCooldown > 0) {
            riftCooldown--;
            continue;
        }

        if (biomeByColumn[x] !== BIOMES.OCEAN) continue;

        // Chance to start a rift (approx 1 every 200 blocks in ocean)
        if (Math.random() < 0.005) {
            const riftWidth = 12 + Math.floor(Math.random() * 16); // 12-27 blocks wide
            const riftDepth = 20 + Math.floor(Math.random() * 20); // 20-39 blocks deep

            // Check if we have enough space (ocean)
            let isSafe = true;
            for (let k = -2; k < riftWidth + 2; k++) {
                 const tx = (x + k + world.width) % world.width;
                 if (biomeByColumn[tx] !== BIOMES.OCEAN) {
                     isSafe = false;
                     break;
                 }
            }
            if (!isSafe) continue;

            // Carve the rift
            for (let i = 0; i < riftWidth; i++) {
                const tx = (x + i) % world.width;
                // Parabolic shape
                const dist = (i - riftWidth / 2) / (riftWidth / 2); // -1 to 1
                const depthAtX = Math.floor(riftDepth * (1 - dist * dist));

                if (depthAtX <= 0) continue;

                // Find current floor. Since heights array might be outdated by other features,
                // we should find the first solid block from top down or use heights as a guide.
                // Using heights[tx] is safer as a reference for "original floor".
                const originalFloorY = heights[tx];
                const targetFloorY = Math.min(world.height - 2, originalFloorY + depthAtX);

                // Carve down to new floor
                for (let y = originalFloorY; y <= targetFloorY; y++) {
                     world.setBlock(tx, y, BLOCKS.WATER);
                }

                // Place Coal at the bottom
                // Only if we carved deep enough
                if (depthAtX > riftDepth * 0.6) {
                    if (Math.random() < 0.7) {
                         // Place coal
                         if (targetFloorY + 1 < world.height) {
                             world.setBlock(tx, targetFloorY + 1, BLOCKS.COAL);
                             // Chance for deeper coal
                             if (Math.random() < 0.5 && targetFloorY + 2 < world.height) {
                                 world.setBlock(tx, targetFloorY + 2, BLOCKS.COAL);
                             }
                         }
                    }
                }
            }
            riftCooldown = riftWidth + 50; // Don't overlap rifts
        }
    }
}

export function generateSurfacePonds(world, heights, biomeByColumn, seaLevel) {
    const paint = world.getAccessor();
    const pondCount = Math.floor(world.width / 60);
    const snowLine = world.height / 2 - 14;

    for (let i = 0; i < pondCount; i++) {
        const x = Math.floor(Math.random() * (world.width - 10)) + 5;
        const biome = biomeByColumn[x];
        const y = heights[x];

        if (biome === BIOMES.SNOWFIELD || biome === BIOMES.DESERT) continue;
        if (biome === BIOMES.MOUNTAIN && y < snowLine) continue;

        const prevH = heights[(x - 2 + world.width) % world.width];
        const nextH = heights[(x + 2) % world.width];

        if (y <= seaLevel && Math.abs(prevH - nextH) < 3) {
             Painters.drawPond(paint, x, y, 2 + Math.floor(Math.random() * 3));
        }
    }
}

export function generateWaterfalls(world, heights, biomeByColumn, seaLevel) {
    const paint = world.getAccessor();
    const maxWaterfalls = 2 + Math.floor(Math.random() * 2); // 2 to 3 waterfalls
    let created = 0;
    let attempts = 0;

    while (created < maxWaterfalls && attempts < world.width * 4) {
        attempts++;
        const x = Math.floor(Math.random() * world.width);
        const biome = biomeByColumn[x];

        // Filter for biomes where water/ponds make sense
        if (biome === BIOMES.DESERT || biome === BIOMES.SNOWFIELD || biome === BIOMES.WASTELAND) {
            continue;
        }

        const y = heights[x];

        // Must be above sea level (mountains/plateaus)
        if (y >= seaLevel) continue;

        // Check for extreme height difference nearby (cliff)
        const range = 5;
        const threshold = 10;

        const leftH = heights[(x - range + world.width) % world.width];
        const rightH = heights[(x + range) % world.width];

        const dropLeft = leftH - y;
        const dropRight = rightH - y;

        if (dropLeft > threshold || dropRight > threshold) {
            // Found a cliff edge, create a waterfall

            // 1. Draw the source pond
            Painters.drawPond(paint, x, y, 3);

            // 2. Extend water downwards
            for (let dx = -4; dx <= 4; dx++) {
                const wx = (x + dx + world.width) % world.width;

                // Check if we have a water block at the source level
                if (world.getBlock(wx, y) === BLOCKS.WATER) {
                    let cy = y + 1;
                    // Trace down through AIR
                    while (cy < world.height) {
                        const blockBelow = world.getBlock(wx, cy);
                        if (blockBelow === BLOCKS.AIR) {
                            world.setBlock(wx, cy, BLOCKS.WATER);
                        } else if (blockBelow !== BLOCKS.WATER) {
                            // Hit solid ground, stop
                            break;
                        }
                        cy++;
                    }
                }
            }
            created++;
        }
    }
}
