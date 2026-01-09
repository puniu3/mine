import { coordToIndex, isBlockSolid, generateBiomeHeights } from './utils.js';
import { TILE_SIZE, BLOCKS, BLOCK_PROPS } from './constants.js';
import * as Painters from './painters.js';

const BIOMES = {
    PLAINS: 'plains',
    DESERT: 'desert',
    SNOWFIELD: 'snowfield',
    MOUNTAIN: 'mountain',
    FOREST: 'forest',
    WASTELAND: 'wasteland',
    DEEP_FOREST: 'deep_forest',
    SAVANNA: 'savanna',
    PLATEAU: 'plateau',
    OCEAN: 'ocean'
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

    getAccessor() {
        return {
            get: (x, y) => this.getBlock(x, y),
            set: (x, y, type) => this.setBlock(x, y, type),
            width: this.width,
            height: this.height
        };
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
        const SEA_LEVEL = Math.floor(this.height / 2) + 2;

        this.createExtremeTerrain(heights);
        this.ensureAllBiomesPresent(biomeByColumn);

        // Main block placement loop
        for (let x = 0; x < this.width; x++) {
            const h = heights[x];
            const biome = biomeByColumn[x];
            let surfaceBlock = this.getSurfaceBlock(biome, h, x);

            for (let y = 0; y < this.height; y++) {
                if (y > h) {
                    // Underground generation
                    if (y > h + 5) {
                        const r = Math.random();
                        if (r > 0.985 && y > h + 15) this.setBlock(x, y, BLOCKS.GOLD);
                        else if (r > 0.96) this.setBlock(x, y, BLOCKS.COAL);
                        else if (Math.random() > 0.95) this.setBlock(x, y, BLOCKS.DIRT);
                        else this.setBlock(x, y, BLOCKS.STONE);
                    } else {
                        // Sub-surface
                        this.setBlock(x, y, this.getSubSurfaceBlock(biome, y, h));
                    }
                } else if (y === h) {
                    // Surface
                    if (y > SEA_LEVEL) {
                        this.setBlock(x, y, BLOCKS.SAND);
                    } else {
                        this.setBlock(x, y, surfaceBlock);
                        // Vegetation
                        const isVegetationGround =
                            surfaceBlock === BLOCKS.GRASS ||
                            (biome === BIOMES.SNOWFIELD && surfaceBlock === BLOCKS.SNOW) ||
                            (biome === BIOMES.DESERT && surfaceBlock === BLOCKS.SAND) ||
                            (biome === BIOMES.WASTELAND && surfaceBlock === BLOCKS.STONE) ||
                            (biome === BIOMES.SAVANNA && (surfaceBlock === BLOCKS.GRASS || surfaceBlock === BLOCKS.DIRT)) ||
                            (biome === BIOMES.PLATEAU && surfaceBlock === BLOCKS.STONE);

                        if (isVegetationGround && x > 5 && x < this.width - 5) {
                            this.generateVegetation(x, y - 1, biome);
                        }
                    }
                } else {
                    // Sky / Water
                    if (y > SEA_LEVEL && biome === BIOMES.OCEAN) {
                        this.setBlock(x, y, BLOCKS.WATER);
                    }
                }
            }
        }

        // Post-processing
        this.paintCliffFaces(heights);
        this.generateGeology(heights);
        this.generateCaves(heights);
        this.generateSurfacePonds(heights, biomeByColumn, SEA_LEVEL);
        this.generateStructures(heights, biomeByColumn, SEA_LEVEL);
        this.generateHiddenFeatures(heights, biomeByColumn);

        // Workbench placement
        for (let x = 10; x < this.width - 10; x += 50 + Math.floor(Math.random() * 20)) {
            const h = heights[x];
            if (h <= SEA_LEVEL && this.getBlock(x, h - 1) === BLOCKS.AIR) {
                this.setBlock(x, h - 1, BLOCKS.WORKBENCH);
            }
        }

        // Water Physics Simulation (Fixes walls and floating water)
        this.simulateWaterSettling();

        this.generateClouds(heights);
    }

    /**
     * Simulates water physics to fix generation artifacts.
     * Rules applied in order:
     * 1. Gravity: Fall down into AIR.
     * 2. Diagonal Flow: Slide down-left or down-right into AIR (fixes vertical walls).
     * 3. Spreading: Flow sideways if supported by solid/water.
     */
    simulateWaterSettling() {
        const passes = 12; // Sufficient passes to settle deep bodies of water
        
        for (let pass = 0; pass < passes; pass++) {
            let changes = 0;
            
            // Scan top-down to propagate gravity efficiently
            // Alternating scan direction (left-right / right-left) avoids flow bias
            const scanLeftToRight = pass % 2 === 0;
            const startX = scanLeftToRight ? 1 : this.width - 2;
            const endX = scanLeftToRight ? this.width - 1 : 0;
            const stepX = scanLeftToRight ? 1 : -1;

            for (let y = 0; y < this.height - 1; y++) {
                for (let x = startX; x !== endX; x += stepX) {
                    if (this.getBlock(x, y) === BLOCKS.WATER) {
                        
                        // Rule 1: Gravity (Straight Down)
                        if (this.getBlock(x, y + 1) === BLOCKS.AIR) {
                            this.setBlock(x, y + 1, BLOCKS.WATER);
                            this.setBlock(x, y, BLOCKS.AIR);
                            changes++;
                            continue; // Block moved, process next
                        }

                        // Rule 2: Diagonal Flow (Slide Down)
                        // Allows water to cascade over edges, breaking vertical walls
                        const left = x - 1;
                        const right = x + 1;
                        const down = y + 1;
                        
                        const canGoLeftDown = left >= 0 && this.getBlock(left, y) === BLOCKS.AIR && this.getBlock(left, down) === BLOCKS.AIR;
                        const canGoRightDown = right < this.width && this.getBlock(right, y) === BLOCKS.AIR && this.getBlock(right, down) === BLOCKS.AIR;

                        if (canGoLeftDown || canGoRightDown) {
                            // If both are open, pick randomly to avoid patterns
                            const goLeft = (canGoLeftDown && canGoRightDown) ? Math.random() < 0.5 : canGoLeftDown;
                            
                            const targetX = goLeft ? left : right;
                            this.setBlock(targetX, down, BLOCKS.WATER);
                            this.setBlock(x, y, BLOCKS.AIR);
                            changes++;
                            continue;
                        }

                        // Rule 3: Spreading (Sideways)
                        // Only spread if supported below (don't fly), but fill gaps
                        const below = this.getBlock(x, y + 1);
                        if (below === BLOCKS.WATER || isBlockSolid(below, BLOCK_PROPS)) {
                            const canGoLeft = left >= 0 && this.getBlock(left, y) === BLOCKS.AIR;
                            const canGoRight = right < this.width && this.getBlock(right, y) === BLOCKS.AIR;

                            if (canGoLeft || canGoRight) {
                                const goLeft = (canGoLeft && canGoRight) ? Math.random() < 0.5 : canGoLeft;
                                
                                const targetX = goLeft ? left : right;
                                this.setBlock(targetX, y, BLOCKS.WATER);
                                this.setBlock(x, y, BLOCKS.AIR);
                                changes++;
                            }
                        }
                    }
                }
            }
            if (changes === 0) break;
        }
    }

    createExtremeTerrain(heights) {
        const minGap = 100;
        let lastFeatureX = -minGap;

        for (let x = 20; x < this.width - 20; x++) {
            if (x - lastFeatureX < minGap) continue;
            const rand = Math.random();

            if (rand < 0.003) { // Rift
                const width = 12 + Math.floor(Math.random() * 16);
                const depth = 25 + Math.floor(Math.random() * 35);
                if (heights[x] + depth >= this.height - 10) continue;

                for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
                    const tx = x + dx;
                    if (tx >= 0 && tx < this.width) {
                        const dist = Math.abs(dx) / (width / 2);
                        const shapeFactor = Math.pow(Math.cos(dist * Math.PI / 2), 0.5); 
                        heights[tx] += Math.floor(depth * shapeFactor);
                        heights[tx] = Math.min(this.height - 5, heights[tx]);
                    }
                }
                lastFeatureX = x + width;
            }
            else if (rand > 0.997) { // Plateau
                const width = 20 + Math.floor(Math.random() * 30);
                const heightRise = 20 + Math.floor(Math.random() * 25);
                if (heights[x] - heightRise <= 20) continue;

                for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
                    const tx = x + dx;
                    if (tx >= 0 && tx < this.width) {
                        const dist = Math.abs(dx) / (width / 2);
                        if (dist < 0.8) heights[tx] -= heightRise;
                        else heights[tx] -= Math.floor(heightRise * (1 - dist) * 5);
                        heights[tx] = Math.max(10, heights[tx]);
                    }
                }
                lastFeatureX = x + width;
            }
        }
    }

    paintCliffFaces(heights) {
        for (let x = 1; x < this.width - 1; x++) {
            const h = heights[x];
            const hLeft = heights[x - 1];
            const hRight = heights[x + 1];

            if (h > hLeft + 2) {
                for (let y = hLeft + 1; y <= h; y++) {
                   if (this.getBlock(x - 1, y) === BLOCKS.DIRT) this.setBlock(x - 1, y, BLOCKS.STONE);
                }
            }

            if (h > hRight + 2) {
                for (let y = hRight + 1; y <= h; y++) {
                    if (this.getBlock(x + 1, y) === BLOCKS.DIRT) this.setBlock(x + 1, y, BLOCKS.STONE);
                }
            }
        }
    }

    generateClouds(heights) {
        const minHeightAboveGround = 20;
        const cloudCount = Math.floor(this.width / 25);
        const accessor = this.getAccessor();
        
        const SEA_LEVEL = Math.floor(this.height / 2) + 2;

        for (let i = 0; i < cloudCount; i++) {
            const startX = Math.floor(Math.random() * (this.width - 30));
            const groundHeight = heights[Math.min(startX, this.width - 1)];
            
            const effectiveSurfaceY = Math.min(groundHeight, SEA_LEVEL);
            
            const maxCloudY = effectiveSurfaceY - minHeightAboveGround;
            const minCloudY = 5;

            if (maxCloudY <= minCloudY) continue;

            const y = minCloudY + Math.floor(Math.random() * (maxCloudY - minCloudY));
            const shape = Math.floor(Math.random() * 5);

            Painters.drawCloudByShapeId(accessor, startX, y, shape);
        }
    }

    getBiomeConfigs() {
        const halfHeight = this.height / 2;
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
            [BIOMES.OCEAN]: { weight: 12, baseHeight: halfHeight + 25, terrain: { largeAmplitude: 15, smallAmplitude: 5, largeFrequency: 45, smallFrequency: 10 } }
        };
    }

    getSurfaceBlock(biome, surfaceY, x) {
        const snowLine = this.height / 2 - 14;
        if (biome === BIOMES.DESERT) return BLOCKS.SAND;
        if (biome === BIOMES.SNOWFIELD) return BLOCKS.SNOW;
        if (biome === BIOMES.WASTELAND) return BLOCKS.STONE;
        if (biome === BIOMES.OCEAN) return BLOCKS.SAND;
        if (biome === BIOMES.MOUNTAIN) {
            if (surfaceY < snowLine) return BLOCKS.SNOW;
            if (surfaceY > this.height / 2 - 6) return BLOCKS.GRASS;
            return BLOCKS.STONE;
        }
        if (biome === BIOMES.SAVANNA) return (x % 7 < 3 || Math.random() < 0.2) ? BLOCKS.DIRT : BLOCKS.GRASS;
        if (biome === BIOMES.PLATEAU) return (surfaceY % 4 === 0) ? BLOCKS.SAND : BLOCKS.STONE;
        return BLOCKS.GRASS;
    }

    getSubSurfaceBlock(biome, y, surfaceY) {
        const shallow = y <= surfaceY + 4;
        if (biome === BIOMES.DESERT) return shallow ? BLOCKS.SAND : BLOCKS.STONE;
        if (biome === BIOMES.OCEAN) return BLOCKS.SAND;
        if (biome === BIOMES.MOUNTAIN || biome === BIOMES.WASTELAND || biome === BIOMES.PLATEAU) return BLOCKS.STONE;
        return BLOCKS.DIRT;
    }

    generateGeology(heights) {
        const paint = this.getAccessor();

        const dirtPocketCount = Math.floor(this.width * this.height / 1500);
        for (let i = 0; i < dirtPocketCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (y > heights[x] + 8) Painters.drawBlob(paint, x, y, BLOCKS.DIRT, 2 + Math.random() * 2.5);
        }

        const sandPocketCount = Math.floor(this.width * this.height / 2500);
        for (let i = 0; i < sandPocketCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (y > heights[x] + 10) Painters.drawBlob(paint, x, y, BLOCKS.SAND, 1.5 + Math.random() * 2);
        }

        const waterPocketCount = Math.floor(this.width * this.height / 2000);
        for (let i = 0; i < waterPocketCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (y > heights[x] + 15 && y < this.height - 10) Painters.drawBlob(paint, x, y, BLOCKS.WATER, 2 + Math.random() * 2.5);
        }
    }

    generateSurfacePonds(heights, biomeByColumn, seaLevel) {
        const paint = this.getAccessor();
        const pondCount = Math.floor(this.width / 60);
        const snowLine = this.height / 2 - 14;

        for (let i = 0; i < pondCount; i++) {
            const x = Math.floor(Math.random() * (this.width - 10)) + 5;
            const biome = biomeByColumn[x];
            const y = heights[x];

            // 1. Skip Snowfield completely
            if (biome === BIOMES.SNOWFIELD) continue;

            // 2. Skip Mountains if above snowline (y < snowLine because 0 is top)
            if (biome === BIOMES.MOUNTAIN && y < snowLine) continue;

            if (y <= seaLevel && Math.abs(heights[x - 2] - heights[x + 2]) < 3) { 
                 Painters.drawPond(paint, x, y, 2 + Math.floor(Math.random() * 3));
            }
        }
    }

    generateStructures(heights, biomeByColumn, seaLevel) {
        const paint = this.getAccessor();

        // Floating Islands
        const islandCount = Math.floor(this.width / 80);
        for (let i = 0; i < islandCount; i++) {
            const x = 20 + Math.floor(Math.random() * (this.width - 40));
            const surface = heights[x];
            
            // Fix: Use Math.min(surface, seaLevel) to prevent spawning inside deep rifts.
            // If the surface is a deep hole (surface > seaLevel), we treat it as if the surface is at seaLevel.
            // If the surface is a mountain (surface < seaLevel), we use the mountain height.
            const spawnBaseY = Math.min(surface, seaLevel);

            // Ensure the island is at least 35 blocks above the calculated base
            const maxY = spawnBaseY - 35;
            const minY = 15; // Keep away from the ceiling

            if (maxY > minY) {
                const y = minY + Math.floor(Math.random() * (maxY - minY));
                Painters.drawFloatingIsland(paint, x, y);
            }
        }

        // Ocean Islands
        for (let x = 0; x < this.width; x += 1) {
            if (biomeByColumn[x] === BIOMES.OCEAN && Math.random() < 0.03) {
                Painters.drawOceanIsland(paint, x, seaLevel);
                x += 40; 
            }
        }

        // Desert Ruins
        for (let x = 0; x < this.width; x += 1) {
            if (biomeByColumn[x] === BIOMES.DESERT && Math.random() < 0.015) {
                if (Math.abs(heights[x + 2] - heights[x]) < 2) {
                    Painters.drawDesertRuin(paint, x, heights[x]);
                    x += 15;
                }
            }
        }

        // Mineshafts
        const mineshaftCount = Math.floor(this.width / 50);
        for (let i = 0; i < mineshaftCount; i++) {
            const x = 10 + Math.floor(Math.random() * (this.width - 20));
            const surface = heights[x];
            Painters.drawMineshaft(paint, x, surface + 15 + Math.floor(Math.random() * (this.height - surface - 20)));
        }
    }

    generateHiddenFeatures(heights, biomeByColumn) {
        const paint = this.getAccessor();
        for (let x = 10; x < this.width - 10; x++) {
            const biome = biomeByColumn[x];
            const surfaceY = heights[x];

            // 1. Ancient Monolith (Rare in Plains/Wasteland)
            if ((biome === BIOMES.PLAINS || biome === BIOMES.WASTELAND) && Math.random() < 0.003) {
                Painters.drawMonolith(paint, x, surfaceY);
                x += 10; continue;
            }

            // 2. Buried Bunker (Rare in Forest/Savanna)
            if ((biome === BIOMES.FOREST || biome === BIOMES.SAVANNA) && Math.random() < 0.004) {
                if (surfaceY < this.height - 20) {
                    Painters.drawBuriedBunker(paint, x, surfaceY + 8);
                    x += 15; continue;
                }
            }

            // 3. World Tree (Very Rare in Deep Forest)
            if (biome === BIOMES.DEEP_FOREST && Math.random() < 0.005) {
                Painters.drawWorldTree(paint, x, surfaceY);
                x += 15; continue;
            }
        }
    }

    generateCaves(heights) {
        const paint = this.getAccessor();
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
                Painters.drawCavePocket(paint, x, y);

                x += Math.floor(Math.random() * 3) - 1;
                y += Math.floor(Math.random() * 3) - 1;

                if (x < 3 || x >= this.width - 3) x = Math.max(3, Math.min(this.width - 4, x));
                const surfaceAtX = heights[Math.max(0, Math.min(this.width - 1, x))];
                y = Math.max(surfaceAtX + 6, Math.min(this.height - 5, y));
            }
        }
    }

    generateVegetation(x, y, biome) {
        const r = Math.random();
        const paint = this.getAccessor();

        switch (biome) {
            case BIOMES.PLAINS:
                if (r < 0.05) Painters.drawTreeOak(paint, x, y);
                else if (r < 0.08) Painters.drawBush(paint, x, y);
                break;
            case BIOMES.FOREST:
                if (r < 0.15) Painters.drawTreeOak(paint, x, y);
                else if (r < 0.3) Painters.drawBush(paint, x, y);
                break;
            case BIOMES.SNOWFIELD:
                if (r < 0.06) Painters.drawTreePine(paint, x, y);
                break;
            case BIOMES.DESERT:
                if (r < 0.02) Painters.drawCactus(paint, x, y);
                break;
            case BIOMES.MOUNTAIN:
                if (r < 0.015) Painters.drawTreeDead(paint, x, y);
                else if (r < 0.025) Painters.drawBoulder(paint, x, y);
                break;
            case BIOMES.WASTELAND:
                if (r < 0.04) Painters.drawTreeDead(paint, x, y);
                else if (r < 0.1) Painters.drawBoulder(paint, x, y);
                break;
            case BIOMES.DEEP_FOREST:
                if (r < 0.25) Painters.drawTreeJungle(paint, x, y);
                else if (r < 0.6) Painters.drawBush(paint, x, y);
                break;
            case BIOMES.SAVANNA:
                if (r < 0.04) Painters.drawTreeAcacia(paint, x, y);
                else if (r < 0.1) Painters.drawBush(paint, x, y); 
                break;
            case BIOMES.PLATEAU:
                if (r < 0.02) Painters.drawTreeDead(paint, x, y);
                break;
        }
    }
}
