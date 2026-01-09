/**
 * Vegetation generation - biome-specific plant selection
 */

import { BIOMES } from './biomes.js';
import * as Painters from '../painters/index.js';

export function generateVegetation(accessor, x, y, biome) {
    const r = Math.random();

    switch (biome) {
        case BIOMES.PLAINS:
            if (r < 0.05) Painters.drawTreeOak(accessor, x, y);
            else if (r < 0.08) Painters.drawBush(accessor, x, y);
            break;
        case BIOMES.FOREST:
            if (r < 0.15) Painters.drawTreeOak(accessor, x, y);
            else if (r < 0.3) Painters.drawBush(accessor, x, y);
            break;
        case BIOMES.SNOWFIELD:
            if (r < 0.06) Painters.drawTreePine(accessor, x, y);
            break;
        case BIOMES.DESERT:
            if (r < 0.02) Painters.drawCactus(accessor, x, y);
            break;
        case BIOMES.MOUNTAIN:
            if (r < 0.015) Painters.drawTreeDead(accessor, x, y);
            else if (r < 0.025) Painters.drawBoulder(accessor, x, y);
            break;
        case BIOMES.WASTELAND:
            if (r < 0.04) Painters.drawTreeDead(accessor, x, y);
            else if (r < 0.1) Painters.drawBoulder(accessor, x, y);
            break;
        case BIOMES.DEEP_FOREST:
            if (r < 0.25) Painters.drawTreeJungle(accessor, x, y);
            else if (r < 0.6) Painters.drawBush(accessor, x, y);
            break;
        case BIOMES.SAVANNA:
            if (r < 0.04) Painters.drawTreeAcacia(accessor, x, y);
            else if (r < 0.1) Painters.drawBush(accessor, x, y);
            break;
        case BIOMES.PLATEAU:
            if (r < 0.02) Painters.drawTreeDead(accessor, x, y);
            break;
        case BIOMES.SWAMP:
            if (r < 0.1) Painters.drawTreeSwamp(accessor, x, y);
            else if (r < 0.2) Painters.drawPond(accessor, x, y, 2);
            else if (r < 0.4 && Math.random() < 0.5) Painters.drawBush(accessor, x, y);
            break;
    }
}
