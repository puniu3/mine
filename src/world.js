import { coordToIndex, isBlockSolid, generateTerrainHeights } from './utils.js';
import { TILE_SIZE, BLOCKS, BLOCK_PROPS } from './constants.js';

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
        const heights = generateTerrainHeights(this.width, this.height / 2);

        for (let x = 0; x < this.width; x++) {
            const h = heights[x];
            for (let y = 0; y < this.height; y++) {
                if (y === this.height - 1) {
                    this.setBlock(x, y, BLOCKS.BEDROCK);
                } else if (y > h) {
                    if (y > h + 5) {
                        const r = Math.random();
                        if (r > 0.985 && y > h + 15) this.setBlock(x, y, BLOCKS.GOLD);
                        else if (r > 0.96) this.setBlock(x, y, BLOCKS.COAL);
                        else if (Math.random() > 0.95) this.setBlock(x, y, BLOCKS.DIRT);
                        else this.setBlock(x, y, BLOCKS.STONE);
                    } else {
                        this.setBlock(x, y, BLOCKS.DIRT);
                    }
                } else if (y === h) {
                    this.setBlock(x, y, BLOCKS.GRASS);
                    if (x > 5 && x < this.width - 5 && Math.random() < 0.05) {
                        this.generateTree(x, y - 1);
                    }
                }
            }
        }

        // Scatter Workbenches on the surface
        for (let x = 10; x < this.width - 10; x += 50 + Math.floor(Math.random() * 20)) {
            const h = heights[x];
            // Ensure space above is clear
            if (this.getBlock(x, h - 1) === BLOCKS.AIR) {
                this.setBlock(x, h - 1, BLOCKS.WORKBENCH);
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
