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

    ensureAllBiomesPresent(biomeByColumn) {
        const allBiomes = Object.values(BIOMES);

        const present = new Set(biomeByColumn);
        const missing = allBiomes.filter(b => !present.has(b));
        if (missing.length === 0) return;

        const segmentWidth = Math.max(12, Math.floor(this.width / (allBiomes.length * 4)));

        for (let i = 0; i < missing.length; i++) {
            const biome = missing[i];

            const center = Math.floor(((i + 1) / (missing.length + 1)) * this.width);
            let startX = Math.max(2, center - Math.floor(segmentWidth / 2));
            let endX = Math.min(this.width - 3, startX + segmentWidth);

            startX = Math.max(0, Math.min(this.width - 1, startX));
            endX = Math.max(0, Math.min(this.width - 1, endX));

            for (let x = startX; x <= endX; x++) {
                biomeByColumn[x] = biome;
            }
        }
    }

    generate() {
        const biomeConfigs = this.getBiomeConfigs();
        const { heights, biomeByColumn } = generateBiomeHeights(this.width, biomeConfigs, 96, 192);

        this.ensureAllBiomesPresent(biomeByColumn);

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

                    const isVegetationGround =
                        surfaceBlock === BLOCKS.GRASS ||
                        (biome === BIOMES.SNOWFIELD && surfaceBlock === BLOCKS.SNOW) ||
                        (biome === BIOMES.DESERT && surfaceBlock === BLOCKS.SAND);

                    if (isVegetationGround && x > 5 && x < this.width - 5) {
                        this.generateVegetation(x, y - 1, biome);
                    }
                }
            }
        }

        this.generateGeology(heights);
        this.generateCaves(heights);
        this.generateStructures(heights, biomeByColumn);

        // Scatter Workbenches on the surface
        for (let x = 10; x < this.width - 10; x += 50 + Math.floor(Math.random() * 20)) {
            const h = heights[x];
            // Ensure space above is clear
            if (this.getBlock(x, h - 1) === BLOCKS.AIR) {
                this.setBlock(x, h - 1, BLOCKS.WORKBENCH);
            }
        }

        // Generate clouds in the sky
        this.generateClouds(heights);
    }

    generateClouds(heights) {
        const minHeightAboveGround = 20; // Clouds must be at least 20 blocks above ground
        const cloudCount = Math.floor(this.width / 25); // Roughly 1 cloud per 25 blocks (even denser)

        for (let i = 0; i < cloudCount; i++) {
            const startX = Math.floor(Math.random() * (this.width - 30));

            // Get the ground height at this position
            const groundHeight = heights[Math.min(startX, this.width - 1)];

            // Calculate valid cloud range: from top of world to 20 blocks above ground
            const maxCloudY = groundHeight - minHeightAboveGround; // Highest Y value (lowest in sky)
            const minCloudY = 5; // Don't spawn too close to top edge

            if (maxCloudY <= minCloudY) continue; // Skip if not enough space

            // Random Y position anywhere in the valid sky range
            const y = minCloudY + Math.floor(Math.random() * (maxCloudY - minCloudY));
            const shape = Math.floor(Math.random() * 5); // 5 different cloud shapes

            this.generateCloudShape(startX, y, shape);
        }
    }

    generateCloudShape(startX, startY, shapeType) {
        // Different cloud patterns
        switch (shapeType) {
            case 0: // Small puffy cloud
                this.generatePuffyCloud(startX, startY, 4, 2);
                break;
            case 1: // Long thin cloud
                this.generateLongCloud(startX, startY, 12, 1);
                break;
            case 2: // Large fluffy cloud
                this.generatePuffyCloud(startX, startY, 8, 3);
                break;
            case 3: // Layered cloud
                this.generateLayeredCloud(startX, startY);
                break;
            case 4: // Scattered cloud cluster
                this.generateClusterCloud(startX, startY);
                break;
        }
    }

    generatePuffyCloud(x, y, width, height) {
        // Generate a puffy, rounded cloud
        for (let dx = 0; dx < width; dx++) {
            for (let dy = 0; dy < height; dy++) {
                // Create rounded edges using distance from center
                const centerX = width / 2;
                const centerY = height / 2;
                const distX = Math.abs(dx - centerX) / centerX;
                const distY = Math.abs(dy - centerY) / centerY;

                // Add some randomness to edges
                const threshold = 0.7 + Math.random() * 0.3;
                if (distX + distY < threshold) {
                    this.setBlock(x + dx, y + dy, BLOCKS.CLOUD);
                }
            }
        }
        // Add extra puffs on top
        const puffCount = Math.floor(width / 3);
        for (let i = 0; i < puffCount; i++) {
            const puffX = x + 1 + Math.floor(Math.random() * (width - 2));
            if (Math.random() > 0.4) {
                this.setBlock(puffX, y - 1, BLOCKS.CLOUD);
            }
        }
    }

    generateLongCloud(x, y, length, thickness) {
        // Generate a long, stretched cloud
        for (let dx = 0; dx < length; dx++) {
            for (let dy = 0; dy < thickness; dy++) {
                // Taper the ends
                if ((dx < 2 || dx >= length - 2) && dy > 0) {
                    if (Math.random() > 0.5) continue;
                }
                this.setBlock(x + dx, y + dy, BLOCKS.CLOUD);
            }
            // Occasional bumps on top
            if (Math.random() > 0.7 && dx > 0 && dx < length - 1) {
                this.setBlock(x + dx, y - 1, BLOCKS.CLOUD);
            }
        }
    }

    generateLayeredCloud(x, y) {
        // Top layer (smaller)
        for (let dx = 2; dx < 8; dx++) {
            if (Math.random() > 0.3) {
                this.setBlock(x + dx, y, BLOCKS.CLOUD);
            }
        }
        // Middle layer (wider)
        for (let dx = 0; dx < 12; dx++) {
            this.setBlock(x + dx, y + 1, BLOCKS.CLOUD);
        }
        // Bottom layer (medium, with gaps)
        for (let dx = 1; dx < 10; dx++) {
            if (Math.random() > 0.2) {
                this.setBlock(x + dx, y + 2, BLOCKS.CLOUD);
            }
        }
    }

    generateClusterCloud(x, y) {
        // Generate small scattered cloud puffs
        const clusterCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < clusterCount; i++) {
            const offsetX = Math.floor(Math.random() * 15);
            const offsetY = Math.floor(Math.random() * 4);
            const size = 2 + Math.floor(Math.random() * 3);

            for (let dx = 0; dx < size; dx++) {
                for (let dy = 0; dy < Math.ceil(size / 2); dy++) {
                    if (Math.random() > 0.3) {
                        this.setBlock(x + offsetX + dx, y + offsetY + dy, BLOCKS.CLOUD);
                    }
                }
            }
        }
    }

    getBiomeConfigs() {
        const halfHeight = this.height / 2;

        return {
            [BIOMES.PLAINS]: {
                weight: 40, // 40%
                baseHeight: halfHeight,
                terrain: { largeAmplitude: 10, smallAmplitude: 3, largeFrequency: 32, smallFrequency: 9 }
            },
            [BIOMES.DESERT]: {
                weight: 20, // 20%
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

    generateGeology(heights) {
        // Create dirt pockets underground
        const dirtPocketCount = Math.floor(this.width * this.height / 1500);
        for (let i = 0; i < dirtPocketCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            const surface = heights[x];
            
            // Only generate below surface layer
            if (y > surface + 8) {
                const radius = 2 + Math.random() * 2.5;
                this.createBlob(x, y, BLOCKS.DIRT, radius);
            }
        }

        // Create sand/gravel pockets underground
        const sandPocketCount = Math.floor(this.width * this.height / 2500);
        for (let i = 0; i < sandPocketCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            const surface = heights[x];

            if (y > surface + 10) {
                const radius = 1.5 + Math.random() * 2;
                this.createBlob(x, y, BLOCKS.SAND, radius);
            }
        }
    }

    createBlob(cx, cy, blockType, radius) {
        const rSq = radius * radius;
        const ceilR = Math.ceil(radius);

        for (let dx = -ceilR; dx <= ceilR; dx++) {
            for (let dy = -ceilR; dy <= ceilR; dy++) {
                if (dx * dx + dy * dy <= rSq) {
                    const x = cx + dx;
                    const y = cy + dy;
                    
                    // Only replace stone, not ores or air
                    if (this.getBlock(x, y) === BLOCKS.STONE) {
                        this.setBlock(x, y, blockType);
                    }
                }
            }
        }
    }

    generateStructures(heights, biomeByColumn) {
        // 1. Floating Islands (Sky)
        const islandCount = Math.floor(this.width / 80);
        for (let i = 0; i < islandCount; i++) {
            const x = 20 + Math.floor(Math.random() * (this.width - 40));
            const surface = heights[x];
            // Must be high enough
            if (surface > 50) {
                const y = 15 + Math.floor(Math.random() * (surface - 40));
                this.generateFloatingIsland(x, y);
            }
        }

        // 2. Desert Ruins (Surface)
        for (let x = 0; x < this.width; x += 1) {
            if (biomeByColumn[x] === BIOMES.DESERT) {
                if (Math.random() < 0.015) { // Increased chance slightly due to variety
                    const y = heights[x];
                    // Check if area is relatively flat
                    if (Math.abs(heights[x + 2] - y) < 2) {
                        this.generateDesertRuin(x, y);
                        x += 15; // Avoid overlapping
                    }
                }
            }
        }

        // 3. Abandoned Mineshafts (Underground)
        const mineshaftCount = Math.floor(this.width / 50);
        for (let i = 0; i < mineshaftCount; i++) {
            const x = 10 + Math.floor(Math.random() * (this.width - 20));
            const surface = heights[x];
            const y = surface + 15 + Math.floor(Math.random() * (this.height - surface - 20));
            this.generateMineshaft(x, y);
        }
    }

    generateFloatingIsland(cx, cy) {
        const radius = 3 + Math.floor(Math.random() * 3);
        // Inverted cone shape
        for (let dy = 0; dy <= radius * 1.5; dy++) {
            const currentRadius = Math.max(0, radius - (dy * 0.7));
            for (let dx = -Math.ceil(currentRadius); dx <= Math.ceil(currentRadius); dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                // Top layer is grass, middle dirt, bottom stone
                if (dy === 0) {
                    this.setBlock(x, y, BLOCKS.GRASS);
                    // Chance for a tree
                    if (dx === 0 && Math.random() < 0.3) {
                        this.generateTreeOak(x, y - 1);
                    }
                } else if (dy < 2) {
                    this.setBlock(x, y, BLOCKS.DIRT);
                } else {
                    // Heavily rich with gold in the core
                    if (Math.random() < 0.4 || (dx === 0 && dy > 2)) {
                        this.setBlock(x, y, BLOCKS.GOLD);
                    } else {
                        this.setBlock(x, y, BLOCKS.STONE);
                    }
                }
            }
        }
    }

    generateDesertRuin(x, y) {
        const type = Math.floor(Math.random() * 4);
        
        if (type === 0) {
            // Pillar
            const height = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < height; i++) {
                this.setBlock(x, y - 1 - i, BLOCKS.STONE);
            }
            if (Math.random() < 0.5) this.setBlock(x, y - 1 - height, BLOCKS.STONE); // Cap
            // Weathered effect
            if (Math.random() < 0.4) this.setBlock(x + 1, y - 1, BLOCKS.STONE);
        } else if (type === 1) {
            // Mini Pyramid
            const size = 3 + Math.floor(Math.random() * 2);
            for (let dy = 0; dy < size; dy++) {
                const width = size - dy - 1;
                for (let dx = -width; dx <= width; dx++) {
                    // Worn down
                    if (Math.random() > 0.1) {
                        this.setBlock(x + dx, y - 1 - dy, BLOCKS.STONE);
                    }
                }
            }
        } else if (type === 2) {
            // Archway
            const height = 4;
            const width = 3;
            // Top beam
            for (let dx = -1; dx <= 1; dx++) {
                this.setBlock(x + dx, y - height, BLOCKS.STONE);
            }
            // Legs
            for (let i = 1; i < height; i++) {
                this.setBlock(x - 1, y - i, BLOCKS.STONE);
                this.setBlock(x + 1, y - i, BLOCKS.STONE);
            }
        } else if (type === 3) {
            // Buried Wall
            const length = 4 + Math.floor(Math.random() * 3);
            for (let dx = 0; dx < length; dx++) {
                const h = 1 + Math.floor(Math.random() * 2);
                for (let i = 0; i < h; i++) {
                    this.setBlock(x + dx, y - 1 - i, BLOCKS.STONE);
                }
            }
        }
    }

    generateMineshaft(startX, startY) {
        const length = 10 + Math.floor(Math.random() * 15);
        let x = startX;
        let y = startY;
        
        // Horizontal tunnel
        for (let i = 0; i < length; i++) {
            if (x >= this.width - 2) break;
            
            // Clear tunnel space (3 high)
            this.setBlock(x, y, BLOCKS.AIR);
            this.setBlock(x, y - 1, BLOCKS.AIR);
            this.setBlock(x, y - 2, BLOCKS.AIR);

            // Floor (planks/wood)
            this.setBlock(x, y + 1, BLOCKS.WOOD);

            // Supports every 4 blocks
            if (i % 4 === 0) {
                // Posts
                if (this.getBlock(x, y + 1) !== BLOCKS.AIR) this.setBlock(x, y, BLOCKS.WOOD);
                if (this.getBlock(x, y - 2) !== BLOCKS.AIR) this.setBlock(x, y - 1, BLOCKS.WOOD);
                
                // Top Beam
                this.setBlock(x, y - 2, BLOCKS.WOOD);
            }

            x++;
            // Small chance to change depth
            if (Math.random() < 0.1) y += (Math.random() < 0.5 ? -1 : 1);
            
            // Clamp Y
            if (y > this.height - 5) y = this.height - 5;
            if (y < 50) y = 50;
        }
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

    generateVegetation(x, y, biome) {
        const r = Math.random();

        switch (biome) {
            case BIOMES.PLAINS:
                if (r < 0.05) this.generateTreeOak(x, y);
                else if (r < 0.08) this.generateBush(x, y);
                break;
            case BIOMES.SNOWFIELD:
                if (r < 0.06) this.generateTreePine(x, y);
                break;
            case BIOMES.DESERT:
                if (r < 0.02) this.generateCactus(x, y);
                break;
            case BIOMES.MOUNTAIN:
                if (r < 0.015) this.generateTreeDead(x, y);
                else if (r < 0.025) this.generateBoulder(x, y);
                break;
        }
    }

    generateTreeOak(x, y) {
        const height = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < height; i++) this.setBlock(x, y - i, BLOCKS.WOOD);
        for (let lx = x - 2; lx <= x + 2; lx++) {
            for (let ly = y - height - 2; ly <= y - height; ly++) {
                if (Math.abs(lx - x) === 2 && Math.abs(ly - (y - height)) === 2) continue;
                if (this.getBlock(lx, ly) === BLOCKS.AIR) this.setBlock(lx, ly, BLOCKS.LEAVES);
            }
        }
    }

    generateTreePine(x, y) {
        const height = 5 + Math.floor(Math.random() * 4);
        
        // Trunk
        for (let i = 0; i < height; i++) {
            this.setBlock(x, y - i, BLOCKS.WOOD);
        }

        // Leaves (Conical shape)
        let radius = 1;
        // Start leaves from near the bottom of the canopy up to the top
        for (let dy = height; dy > 1; dy--) {
            const worldY = y - dy;
            
            // Periodically widen the cone as we go down
            if ((height - dy) % 2 === 0) radius = Math.min(3, radius + 1);
            if (dy === height) radius = 1; // Top tip

            for (let lx = x - radius; lx <= x + radius; lx++) {
                // Skip the trunk position itself except at the very top tip
                if (lx === x && dy !== height) continue;
                
                if (this.getBlock(lx, worldY) === BLOCKS.AIR) {
                    this.setBlock(lx, worldY, BLOCKS.LEAVES);
                }
            }
        }
        // Top tip leaf
        this.setBlock(x, y - height, BLOCKS.LEAVES);
    }

    generateCactus(x, y) {
        const height = 2 + Math.floor(Math.random() * 3);
        
        // Main stem
        for (let i = 0; i < height; i++) {
            this.setBlock(x, y - i, BLOCKS.LEAVES); // Using leaves as green cactus blocks
        }

        // Optional arms
        if (height >= 3 && Math.random() < 0.5) {
            // Pick a side
            const side = Math.random() < 0.5 ? -1 : 1;
            const armHeight = 1 + Math.floor(Math.random() * (height - 2));
            
            if (this.getBlock(x + side, y - armHeight) === BLOCKS.AIR) {
                this.setBlock(x + side, y - armHeight, BLOCKS.LEAVES);
                // Vertical part of arm
                if (this.getBlock(x + side, y - armHeight - 1) === BLOCKS.AIR) {
                    this.setBlock(x + side, y - armHeight - 1, BLOCKS.LEAVES);
                }
            }
        }
    }

    generateTreeDead(x, y) {
        const height = 3 + Math.floor(Math.random() * 3);
        
        // Crooked trunk
        let cx = x;
        for (let i = 0; i < height; i++) {
            this.setBlock(cx, y - i, BLOCKS.WOOD);
            
            // Chance to shift slightly
            if (i > 1 && Math.random() < 0.3) {
                cx += (Math.random() < 0.5 ? -1 : 1);
            }
        }

        // Branch
        if (Math.random() < 0.5) {
             const branchY = y - Math.floor(height / 2);
             const dir = Math.random() < 0.5 ? -1 : 1;
             if (this.getBlock(cx + dir, branchY) === BLOCKS.AIR) {
                 this.setBlock(cx + dir, branchY, BLOCKS.WOOD);
             }
        }
    }

    generateBush(x, y) {
        // Simple cluster on the ground
        this.setBlock(x, y, BLOCKS.LEAVES);
        if (Math.random() < 0.5 && this.getBlock(x + 1, y) === BLOCKS.AIR) {
            this.setBlock(x + 1, y, BLOCKS.LEAVES);
        }
        if (Math.random() < 0.3 && this.getBlock(x, y - 1) === BLOCKS.AIR) {
            this.setBlock(x, y - 1, BLOCKS.LEAVES);
        }
    }

    generateBoulder(x, y) {
        this.setBlock(x, y, BLOCKS.STONE);
        if (Math.random() < 0.7) this.setBlock(x + 1, y, BLOCKS.STONE);
        if (Math.random() < 0.5) this.setBlock(x, y - 1, BLOCKS.STONE);
    }
}
