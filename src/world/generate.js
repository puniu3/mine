/**
 * Main world generation orchestration
 */

import { BLOCKS } from '../constants.js';
import { generateBiomeHeights } from '../utils.js';
import { BIOMES, getBiomeConfigs, getSurfaceBlock, getSubSurfaceBlock } from './biomes.js';
import { createExtremeTerrain, paintCliffFaces } from './terrain.js';
import { simulateWaterSettling, restoreOceanLevels } from './water.js';
import { generateVegetation } from './vegetation.js';
import { generateStructures, generateHiddenFeatures, generateSurfacePonds, generateWaterfalls } from './features.js';
import { generateCaves, generateGeology } from './caves.js';
import { generateClouds } from './clouds.js';
import { generateBottomErosion } from './erosion.js';

export function generate(world) {
    const biomeConfigs = getBiomeConfigs(world.height);
    const { heights, biomeByColumn } = generateBiomeHeights(world.width, biomeConfigs, 96, 192);
    const SEA_LEVEL = Math.floor(world.height / 2) + 2;

    createExtremeTerrain(heights, world.width, world.height);

    // Main block placement loop
    for (let x = 0; x < world.width; x++) {
        const h = heights[x];
        const biome = biomeByColumn[x];
        let surfaceBlock = getSurfaceBlock(biome, h, x, world.height);

        for (let y = 0; y < world.height; y++) {
            if (y > h) {
                // Underground generation
                if (y > h + 5) {
                    const r = Math.random();
                    if (r > 0.995 && y > h + 15) world.setBlock(x, y, BLOCKS.GOLD);
                    else if (r > 0.96) world.setBlock(x, y, BLOCKS.COAL);
                    else if (Math.random() > 0.95) world.setBlock(x, y, BLOCKS.DIRT);
                    else world.setBlock(x, y, BLOCKS.STONE);
                } else {
                    // Sub-surface
                    world.setBlock(x, y, getSubSurfaceBlock(biome, y, h));
                }
            } else if (y === h) {
                // Surface
                if (y > SEA_LEVEL) {
                    world.setBlock(x, y, BLOCKS.SAND);
                } else {
                    world.setBlock(x, y, surfaceBlock);
                    // Vegetation
                    const isVegetationGround =
                        surfaceBlock === BLOCKS.GRASS ||
                        (biome === BIOMES.SNOWFIELD && surfaceBlock === BLOCKS.SNOW) ||
                        (biome === BIOMES.DESERT && surfaceBlock === BLOCKS.SAND) ||
                        (biome === BIOMES.WASTELAND && surfaceBlock === BLOCKS.STONE) ||
                        (biome === BIOMES.SAVANNA && (surfaceBlock === BLOCKS.GRASS || surfaceBlock === BLOCKS.DIRT)) ||
                        (biome === BIOMES.PLATEAU && surfaceBlock === BLOCKS.STONE);

                    if (isVegetationGround && x > 5 && x < world.width - 5) {
                        generateVegetation(world.getAccessor(), x, y - 1, biome);
                    }
                }
            } else {
                // Sky / Water
                if (y > SEA_LEVEL && biome === BIOMES.OCEAN) {
                    world.setBlock(x, y, BLOCKS.WATER);
                }
            }
        }
    }

    // Post-processing
    paintCliffFaces(world, heights);
    generateGeology(world, heights);
    generateCaves(world, heights);
    generateSurfacePonds(world, heights, biomeByColumn, SEA_LEVEL);
    generateWaterfalls(world, heights, biomeByColumn, SEA_LEVEL);
    generateStructures(world, heights, biomeByColumn, SEA_LEVEL);
    generateHiddenFeatures(world, heights, biomeByColumn);
    generateBottomErosion(world);

    // Workbench placement
    for (let x = 10; x < world.width - 10; x += 50 + Math.floor(Math.random() * 20)) {
        const h = heights[x];
        if (h <= SEA_LEVEL && world.getBlock(x, h - 1) === BLOCKS.AIR) {
            world.setBlock(x, h - 1, BLOCKS.WORKBENCH);
        }
    }

    // Water Physics Simulation (Fixes walls and floating water)
    simulateWaterSettling(world);

    // Restore Ocean levels (avoiding borders to prevent water walls)
    restoreOceanLevels(world, biomeByColumn, SEA_LEVEL);

    generateClouds(world, heights);
}
