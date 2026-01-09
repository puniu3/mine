/**
 * Biome definitions and configuration
 */

import { BLOCKS } from '../constants.js';

export const BIOMES = {
    PLAINS: 'plains',
    DESERT: 'desert',
    SNOWFIELD: 'snowfield',
    MOUNTAIN: 'mountain',
    FOREST: 'forest',
    WASTELAND: 'wasteland',
    DEEP_FOREST: 'deep_forest',
    SAVANNA: 'savanna',
    PLATEAU: 'plateau',
    OCEAN: 'ocean',
    SWAMP: 'swamp'
};

export function getBiomeConfigs(worldHeight) {
    const halfHeight = worldHeight / 2;
    return {
        [BIOMES.PLAINS]: { weight: 20, baseHeight: halfHeight, terrain: { largeAmplitude: 10, smallAmplitude: 3, largeFrequency: 32, smallFrequency: 9 } },
        [BIOMES.FOREST]: { weight: 20, baseHeight: halfHeight + 2, terrain: { largeAmplitude: 12, smallAmplitude: 2, largeFrequency: 30, smallFrequency: 10 } },
        [BIOMES.DESERT]: { weight: 15, baseHeight: halfHeight + 8, terrain: { largeAmplitude: 6, smallAmplitude: 2, largeFrequency: 36, smallFrequency: 12 } },
        [BIOMES.SNOWFIELD]: { weight: 15, baseHeight: halfHeight - 4, terrain: { largeAmplitude: 10, smallAmplitude: 4, largeFrequency: 28, smallFrequency: 10 } },
        [BIOMES.MOUNTAIN]: { weight: 10, baseHeight: halfHeight - 18, terrain: { largeAmplitude: 20, smallAmplitude: 6, largeFrequency: 35, smallFrequency: 9 } },
        [BIOMES.WASTELAND]: { weight: 5, baseHeight: halfHeight - 5, terrain: { largeAmplitude: 8, smallAmplitude: 5, largeFrequency: 40, smallFrequency: 5 } },
        [BIOMES.DEEP_FOREST]: { weight: 10, baseHeight: halfHeight + 5, terrain: { largeAmplitude: 15, smallAmplitude: 4, largeFrequency: 25, smallFrequency: 8 } },
        [BIOMES.SAVANNA]: { weight: 15, baseHeight: halfHeight, terrain: { largeAmplitude: 5, smallAmplitude: 1, largeFrequency: 50, smallFrequency: 15 } },
        [BIOMES.PLATEAU]: { weight: 10, baseHeight: halfHeight - 10, terrain: { largeAmplitude: 25, smallAmplitude: 2, largeFrequency: 60, smallFrequency: 5 } },
        [BIOMES.OCEAN]: { weight: 12, baseHeight: halfHeight + 25, terrain: { largeAmplitude: 15, smallAmplitude: 5, largeFrequency: 45, smallFrequency: 10 } },
        [BIOMES.SWAMP]: { weight: 5, baseHeight: halfHeight + 2, terrain: { largeAmplitude: 6, smallAmplitude: 2, largeFrequency: 40, smallFrequency: 8 } }
    };
}

export function getSurfaceBlock(biome, surfaceY, x, worldHeight) {
    const snowLine = worldHeight / 2 - 14;
    if (biome === BIOMES.DESERT) return BLOCKS.SAND;
    if (biome === BIOMES.SNOWFIELD) return BLOCKS.SNOW;
    if (biome === BIOMES.WASTELAND) return BLOCKS.STONE;
    if (biome === BIOMES.OCEAN) return BLOCKS.SAND;
    if (biome === BIOMES.MOUNTAIN) {
        if (surfaceY < snowLine) return BLOCKS.SNOW;
        if (surfaceY > worldHeight / 2 - 6) return BLOCKS.GRASS;
        return BLOCKS.STONE;
    }
    if (biome === BIOMES.SAVANNA) return (x % 7 < 3 || Math.random() < 0.2) ? BLOCKS.DIRT : BLOCKS.GRASS;
    if (biome === BIOMES.PLATEAU) return (surfaceY % 4 === 0) ? BLOCKS.SAND : BLOCKS.STONE;
    if (biome === BIOMES.SWAMP) return (Math.random() < 0.3) ? BLOCKS.DIRT : BLOCKS.GRASS;
    return BLOCKS.GRASS;
}

export function getSubSurfaceBlock(biome, y, surfaceY) {
    const shallow = y <= surfaceY + 4;
    if (biome === BIOMES.DESERT) return shallow ? BLOCKS.SAND : BLOCKS.STONE;
    if (biome === BIOMES.OCEAN) return BLOCKS.SAND;
    if (biome === BIOMES.MOUNTAIN || biome === BIOMES.WASTELAND || biome === BIOMES.PLATEAU) return BLOCKS.STONE;
    return BLOCKS.DIRT;
}
