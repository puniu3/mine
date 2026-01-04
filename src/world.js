import { coordToIndex, isBlockSolid, generateBiomeHeights } from './utils.js';
import { TILE_SIZE, BLOCKS, BLOCK_PROPS } from './constants.js';

const BIOMES = {
    PLAINS: 'plains',
    DESERT: 'desert',
    SNOWFIELD: 'snowfield',
    MOUNTAIN: 'mountain'
};

export class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.map = new Uint8Array(width * height);
        this.map.fill(BLOCKS.AIR);
        this.generate();
    }

    getIndex(x, y) {
        return coordToIndex(x, y, this.width, this.height);
    }

    getBlock(x, y) {
        const idx = this.getIndex(x, y);
        if (idx === -1) return BLOCKS.BEDROCK;
        return this.map[idx];
    }

    setBlock(x, y, type) {
        const idx = this.getIndex(x, y);
        if (idx !== -1) this.map[idx] = type;
    }

    checkAreaFree(px, py, w, h) {
        const startX = Math.floor(px / TILE_SIZE);
        const endX = Math.floor((px + w) / TILE_SIZE);
        const startY = Math.floor(py / TILE_SIZE);
        const endY = Math.floor((py + h) / TILE_SIZE);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (isBlockSolid(this.getBlock(x, y), BLOCK_PROPS)) {
                    return false;
                }
            }
        }
        return true;
    }

    generate() {
        const biomeConfigs = this.getBiomeConfigs();
        const { heights, biomeByColumn } = generateBiomeHeights(this.width, biomeConfigs, 96, 192);

        for (let x = 0; x < this.width; x++) {
            const h = heights[x];
            const biome = biomeByColumn[x];
            const surfaceBlock = this.getSurfaceBlock(biome, h);

            for (let y = 0; y < this.height; y++) {
                if (y > h) {
                    if (y > h + 5) {
                        const r = Math.random();
                        if (r > 0.985 && y > h + 15) this.setBlock(x, y, BLOCKS.GOLD);
                        else if (r > 0.96) this.setBlock(x, y, BLOCKS.COAL);
                        else if (Math.random() > 0.95) this.setBlock(x, y, BLOCKS.DIRT);
                        else this.setBlock(x, y, BLOCKS.STONE);
                    } else {
                        this.setBlock(x, y, this.getSubSurfaceBlock(biome, y, h));
                    }
                } else if (y === h) {
                    this.setBlock(x, y, surfaceBlock);
                    
                    const isTreeGround = surfaceBlock === BLOCKS.GRASS || (biome === BIOMES.SNOWFIELD && surfaceBlock === BLOCKS.SNOW);
                    
                    if (isTreeGround && x > 5 && x < this.width - 5 && Math.random() < 0.05) {
                        this.generateTree(x, y - 1);
                    }
                }
            }
        }

        this.generateCaves(heights);

        // Scatter Workbenches on the surface
        for (let x = 10; x < this.width - 10; x += 50 + Math.floor(Math.random() * 20)) {
            const h = heights[x];
            // Ensure space above is clear
            if (this.getBlock(x, h - 1) === BLOCKS.AIR) {
                this.setBlock(x, h - 1, BLOCKS.WORKBENCH);
            }
        }
    }

    getBiomeConfigs() {
        const halfHeight = this.height / 2;
        
        return {
            [BIOMES.PLAINS]: {
                weight: 50, // 50%
                baseHeight: halfHeight,
                terrain: { largeAmplitude: 10, smallAmplitude: 3, largeFrequency: 32, smallFrequency: 9 }
            },
            [BIOMES.DESERT]: {
                weight: 10, // 10%
                baseHeight: halfHeight + 8,
                terrain: { largeAmplitude: 6, smallAmplitude: 2, largeFrequency: 36, smallFrequency: 12 }
            },
            [BIOMES.SNOWFIELD]: {
                weight: 20, // 20%
                baseHeight: halfHeight - 4,
                terrain: { largeAmplitude: 10, smallAmplitude: 4, largeFrequency: 28, smallFrequency: 10 }
            },
            [BIOMES.MOUNTAIN]: {
                weight: 20, // 20%
                baseHeight: halfHeight - 18,
                terrain: { largeAmplitude: 20, smallAmplitude: 6, largeFrequency: 35, smallFrequency: 9 }
            }
        };
    }

    getSurfaceBlock(biome, surfaceY) {
        const snowLine = this.height / 2 - 14;
        if (biome === BIOMES.DESERT) return BLOCKS.SAND;
        if (biome === BIOMES.SNOWFIELD) return BLOCKS.SNOW;
        if (biome === BIOMES.MOUNTAIN) {
            if (surfaceY < snowLine) return BLOCKS.SNOW;
            if (surfaceY > this.height / 2 - 6) return BLOCKS.GRASS;
            return BLOCKS.STONE;
        }
        return BLOCKS.GRASS;
    }

    getSubSurfaceBlock(biome, y, surfaceY) {
        const shallow = y <= surfaceY + 4;
        if (biome === BIOMES.DESERT) return shallow ? BLOCKS.SAND : BLOCKS.STONE;
        if (biome === BIOMES.MOUNTAIN) return BLOCKS.STONE;
        return BLOCKS.DIRT;
    }

    generateCaves(heights) {
        const caveWalkers = Math.max(3, Math.floor(this.width / 35));
        for (let i = 0; i < caveWalkers; i++) {
            const startX = 5 + Math.floor(Math.random() * (this.width - 10));
            const surface = heights[startX];
            const minY = surface + 8;
            const maxY = this.height - 6;
            if (minY >= maxY) continue;

            let x = startX;
            let y = minY + Math.floor(Math.random() * (maxY - minY));
            const steps = 30 + Math.floor(Math.random() * 40);

            for (let step = 0; step < steps; step++) {
                this.carveCavePocket(x, y);

                x += Math.floor(Math.random() * 3) - 1;
                y += Math.floor(Math.random() * 3) - 1;

                if (x < 3 || x >= this.width - 3) x = Math.max(3, Math.min(this.width - 4, x));
                const surfaceAtX = heights[Math.max(0, Math.min(this.width - 1, x))];
                const bottomLimit = this.height - 5;
                const topLimit = surfaceAtX + 6;
                y = Math.max(topLimit, Math.min(bottomLimit, y));
            }
        }
    }

    carveCavePocket(cx, cy) {
        const radius = 2 + Math.floor(Math.random() * 3);
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                if (x * x + y * y <= radius * radius) {
                    const worldX = cx + x;
                    const worldY = cy + y;
                    if (worldY < this.height - 1) {
                        this.setBlock(worldX, worldY, BLOCKS.AIR);
                    }
                }
            }
        }
    }

    generateTree(x, y) {
        const height = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < height; i++) this.setBlock(x, y - i, BLOCKS.WOOD);
        for (let lx = x - 2; lx <= x + 2; lx++) {
            for (let ly = y - height - 2; ly <= y - height; ly++) {
                if (Math.abs(lx - x) === 2 && Math.abs(ly - (y - height)) === 2) continue;
                if (this.getBlock(lx, ly) === BLOCKS.AIR) this.setBlock(lx, ly, BLOCKS.LEAVES);
            }
        }
    }
}
