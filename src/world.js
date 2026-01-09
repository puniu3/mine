import { coordToIndex, isBlockSolid, generateBiomeHeights, calculateTerrainHeight } from './utils.js';
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
    OCEAN: 'ocean',
    SWAMP: 'swamp'
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

    generate() {
        const biomeConfigs = this.getBiomeConfigs();
        const { heights, biomeByColumn } = generateBiomeHeights(this.width, biomeConfigs, 96, 192);
        const SEA_LEVEL = Math.floor(this.height / 2) + 2;

        this.createExtremeTerrain(heights);

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
        this.generateWaterfalls(heights, biomeByColumn, SEA_LEVEL);
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

        // Restore Ocean levels (avoiding borders to prevent water walls)
        this.restoreOceanLevels(biomeByColumn, SEA_LEVEL);

        this.generateClouds(heights);
    }

    /**
     * Simulates water physics to fix generation artifacts.
     * Rules applied in order:
     * 1. Gravity: Fall down into AIR.
     * 2. Diagonal Flow: Slide down-left or down-right into AIR (fixes vertical walls).
     * 3. Spreading: Flow sideways if supported by solid/water.
     * * [Updated] Now uses modulo arithmetic to wrap water flow around the world edges.
     */
    simulateWaterSettling() {
        const passes = 12; 
        
        for (let pass = 0; pass < passes; pass++) {
            let changes = 0;
            
            const scanLeftToRight = pass % 2 === 0;
            const startX = scanLeftToRight ? 0 : this.width - 1;
            const endX = scanLeftToRight ? this.width : -1;
            const stepX = scanLeftToRight ? 1 : -1;

            for (let y = 0; y < this.height - 1; y++) {
                // Iterate through X with wrapping awareness
                // Note: The loop condition `x !== endX` handles standard iteration.
                // We handle neighbor wrapping inside the loop.
                for (let x = startX; x !== endX; x += stepX) {
                    if (this.getBlock(x, y) === BLOCKS.WATER) {
                        
                        // Rule 1: Gravity (Straight Down)
                        if (this.getBlock(x, y + 1) === BLOCKS.AIR) {
                            this.setBlock(x, y + 1, BLOCKS.WATER);
                            this.setBlock(x, y, BLOCKS.AIR);
                            changes++;
                            continue; 
                        }

                        // Rule 2: Diagonal Flow (Slide Down)
                        // [Fix] Wrap coordinates for neighbors
                        const left = (x - 1 + this.width) % this.width;
                        const right = (x + 1) % this.width;
                        const down = y + 1;
                        
                        // Note: getBlock handles wrapping if -1 is passed, but explicit wrapping is clearer for logic
                        const canGoLeftDown = this.getBlock(left, y) === BLOCKS.AIR && this.getBlock(left, down) === BLOCKS.AIR;
                        const canGoRightDown = this.getBlock(right, y) === BLOCKS.AIR && this.getBlock(right, down) === BLOCKS.AIR;

                        if (canGoLeftDown || canGoRightDown) {
                            const goLeft = (canGoLeftDown && canGoRightDown) ? Math.random() < 0.5 : canGoLeftDown;
                            const targetX = goLeft ? left : right;
                            this.setBlock(targetX, down, BLOCKS.WATER);
                            this.setBlock(x, y, BLOCKS.AIR);
                            changes++;
                            continue;
                        }

                        // Rule 3: Spreading (Sideways)
                        const below = this.getBlock(x, y + 1);
                        if (below === BLOCKS.WATER || isBlockSolid(below, BLOCK_PROPS)) {
                            const canGoLeft = this.getBlock(left, y) === BLOCKS.AIR;
                            const canGoRight = this.getBlock(right, y) === BLOCKS.AIR;

                            if (canGoLeft || canGoRight) {
                                let goLeft;

                                if (canGoLeft && canGoRight) {
                                    // Look 2 blocks away for cohesion (wrapping applied)
                                    const left2 = (x - 2 + this.width) % this.width;
                                    const right2 = (x + 2) % this.width;

                                    const leftNeighbor = this.getBlock(left2, y);
                                    const rightNeighbor = this.getBlock(right2, y);

                                    const isLeftAttractive = leftNeighbor === BLOCKS.WATER || isBlockSolid(leftNeighbor, BLOCK_PROPS);
                                    const isRightAttractive = rightNeighbor === BLOCKS.WATER || isBlockSolid(rightNeighbor, BLOCK_PROPS);

                                    if (isLeftAttractive && !isRightAttractive) {
                                        goLeft = true;
                                    } else if (!isLeftAttractive && isRightAttractive) {
                                        goLeft = false;
                                    } else {
                                        goLeft = Math.random() < 0.5;
                                    }
                                } else {
                                    goLeft = canGoLeft;
                                }
                                
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

    /**
     * Fixes Ocean water levels.
     * [Updated] Now uses wrapped distance checks so shores wrap correctly.
     */
    restoreOceanLevels(biomeByColumn, seaLevel) {
        const BORDER_MARGIN = 5; 

        for (let x = 0; x < this.width; x++) {
            if (biomeByColumn[x] === BIOMES.OCEAN) {
                
                let isNearShore = false;
                for (let dx = -BORDER_MARGIN; dx <= BORDER_MARGIN; dx++) {
                    // Check wrapped neighbor column
                    const checkX = (x + dx + this.width) % this.width;
                    if (biomeByColumn[checkX] !== BIOMES.OCEAN) {
                        isNearShore = true;
                        break;
                    }
                }

                if (isNearShore) continue;

                const surfaceStart = seaLevel + 1;
                for (let y = surfaceStart; y < this.height; y++) {
                    const block = this.getBlock(x, y);
                    if (block === BLOCKS.AIR) {
                        this.setBlock(x, y, BLOCKS.WATER);
                    } else if (isBlockSolid(block, BLOCK_PROPS) || block === BLOCKS.WATER) {
                        break;
                    }
                }
            }
        }
    }

    createExtremeTerrain(heights) {
        const MIN_FEATURE_GAP = 80;
        let lastFeatureX = -MIN_FEATURE_GAP;

        for (let x = 20; x < this.width - 20; x++) {
            if (x - lastFeatureX < MIN_FEATURE_GAP) continue;

            const rand = Math.random();
            const currentHeight = heights[x];
            
            if (rand < 0.003) {
                const width = 25 + Math.floor(Math.random() * 20);
                this.generateCanyon(heights, x, width);
                lastFeatureX = x + width;
            }
            else if (rand < 0.0045) { 
                const width = 30 + Math.floor(Math.random() * 20);
                if (currentHeight > 50) {
                    this.generateVolcano(heights, x, width);
                    lastFeatureX = x + width;
                }
            }
            else if (rand > 0.995) {
                const width = 20 + Math.floor(Math.random() * 25);
                this.generatePlateau(heights, x, width);
                lastFeatureX = x + width;
            }
            else if (rand > 0.985) {
                const width = 40 + Math.floor(Math.random() * 30);
                this.generateRollingHills(heights, x, width);
                lastFeatureX = x + width;
            }
        }
    }

    // Helper: Access heights array with wrapping
    getHeight(heights, x) {
        return heights[(x % this.width + this.width) % this.width];
    }
    
    // Helper: Set heights array with wrapping
    setHeight(heights, x, val) {
        heights[(x % this.width + this.width) % this.width] = val;
    }

    // [Fix] Updated all feature generators to wrap around the world edges (removed bounds checks)
    generateCanyon(heights, centerX, width) {
        const depth = 25 + Math.floor(Math.random() * 20);
        const halfWidth = Math.floor(width / 2);
        
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
            const tx = centerX + dx;
            const wrappedTx = (tx % this.width + this.width) % this.width;

            const dist = Math.abs(dx) / halfWidth;
            
            const smoothShape = Math.pow(Math.cos(dist * Math.PI / 2), 0.5);
            const stepShape = Math.floor(smoothShape * 4) / 4; 
            const shapeFactor = (smoothShape * 0.3) + (stepShape * 0.7);
            const noise = (Math.sin(tx * 0.5) * 2); 

            let change = Math.floor(depth * shapeFactor) + noise;
            
            let current = heights[wrappedTx];
            heights[wrappedTx] = Math.min(this.height - 5, current + change);
        }
        this.smoothTerrain(heights, centerX - halfWidth, centerX + halfWidth);
    }

    generateVolcano(heights, centerX, width) {
        const heightRise = 30 + Math.floor(Math.random() * 15);
        const halfWidth = Math.floor(width / 2);
        const craterWidth = width * 0.25;

        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
            const tx = centerX + dx;
            const wrappedTx = (tx % this.width + this.width) % this.width;
            const dist = Math.abs(dx);
            
            let shapeFactor = Math.exp(-Math.pow(dist / (width * 0.35), 2));

            if (dist < craterWidth) {
                const craterDepth = Math.pow((craterWidth - dist) / craterWidth, 2);
                shapeFactor -= craterDepth * 1.5; 
            }

            let change = Math.floor(heightRise * shapeFactor);
            heights[wrappedTx] = Math.max(10, heights[wrappedTx] - change);
        }
    }

    generatePlateau(heights, centerX, width) {
        const heightRise = 15 + Math.floor(Math.random() * 15);
        const halfWidth = Math.floor(width / 2);

        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
            const tx = centerX + dx;
            const wrappedTx = (tx % this.width + this.width) % this.width;
            const dist = Math.abs(dx) / halfWidth;
            let factor = 0;

            if (dist < 0.6) {
                factor = 1.0 + (Math.random() * 0.1); 
            } else {
                const falloff = (1 - dist) / 0.4;
                factor = falloff * falloff;
            }

            heights[wrappedTx] = Math.max(10, heights[wrappedTx] - Math.floor(heightRise * factor));
        }
    }

    generateRollingHills(heights, centerX, width) {
        const halfWidth = Math.floor(width / 2);
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
            const tx = centerX + dx;
            const wrappedTx = (tx % this.width + this.width) % this.width;

            const rad = (dx / width) * Math.PI * 4;
            const change = Math.sin(rad) * 6;
            
            const dist = Math.abs(dx) / halfWidth;
            const blend = 1 - Math.pow(dist, 3); 

            heights[wrappedTx] -= Math.floor(change * blend);
        }
    }

    // [Fix] Wraps around the world when smoothing
    smoothTerrain(heights, startX, endX) {
        for (let x = startX; x <= endX; x++) {
            // Calculate wrapped indices
            const prevIdx = ((x - 1) % this.width + this.width) % this.width;
            const currIdx = ((x) % this.width + this.width) % this.width;
            const nextIdx = ((x + 1) % this.width + this.width) % this.width;

            const prev = heights[prevIdx];
            const curr = heights[currIdx];
            const next = heights[nextIdx];

            if (Math.abs(prev - curr) > 3 && Math.abs(next - curr) > 3) {
                heights[currIdx] = Math.floor((prev + curr + next) / 3);
            }
        }
    }

    // [Fix] Wraps around the world when painting cliffs
    paintCliffFaces(heights) {
        for (let x = 0; x < this.width; x++) {
            const prevIdx = (x - 1 + this.width) % this.width;
            const nextIdx = (x + 1) % this.width;

            const h = heights[x];
            const hLeft = heights[prevIdx];
            const hRight = heights[nextIdx];

            if (h > hLeft + 2) {
                for (let y = hLeft + 1; y <= h; y++) {
                   if (this.getBlock(prevIdx, y) === BLOCKS.DIRT) this.setBlock(prevIdx, y, BLOCKS.STONE);
                }
            }

            if (h > hRight + 2) {
                for (let y = hRight + 1; y <= h; y++) {
                    if (this.getBlock(nextIdx, y) === BLOCKS.DIRT) this.setBlock(nextIdx, y, BLOCKS.STONE);
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
            const startX = Math.floor(Math.random() * this.width);
            const groundHeight = heights[startX];
            
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
            [BIOMES.OCEAN]: { weight: 12, baseHeight: halfHeight + 25, terrain: { largeAmplitude: 15, smallAmplitude: 5, largeFrequency: 45, smallFrequency: 10 } },
            [BIOMES.SWAMP]: { weight: 5, baseHeight: halfHeight + 2, terrain: { largeAmplitude: 6, smallAmplitude: 2, largeFrequency: 40, smallFrequency: 8 } }
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
        if (biome === BIOMES.SWAMP) return (Math.random() < 0.3) ? BLOCKS.DIRT : BLOCKS.GRASS;
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
            // heights access implicitly safe via index if inside loop, but map coords need wrapping implicitly handled by painters if needed.
            // Here we use random coords within width, which is safe.
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

            if (biome === BIOMES.SNOWFIELD || biome === BIOMES.DESERT) continue;
            if (biome === BIOMES.MOUNTAIN && y < snowLine) continue;

            const prevH = heights[(x - 2 + this.width) % this.width];
            const nextH = heights[(x + 2) % this.width];

            if (y <= seaLevel && Math.abs(prevH - nextH) < 3) { 
                 Painters.drawPond(paint, x, y, 2 + Math.floor(Math.random() * 3));
            }
        }
    }

    generateWaterfalls(heights, biomeByColumn, seaLevel) {
        const paint = this.getAccessor();
        const maxWaterfalls = 2 + Math.floor(Math.random() * 2); // 2 to 3 waterfalls
        let created = 0;
        let attempts = 0;

        while (created < maxWaterfalls && attempts < this.width * 4) {
            attempts++;
            const x = Math.floor(Math.random() * this.width);
            const biome = biomeByColumn[x];

            // Filter for biomes where water/ponds make sense (e.g. not Desert, not Snowfield frozen?)
            // "Pond biomes" usually means Plains, Forest, Mountains, etc.
            if (biome === BIOMES.DESERT || biome === BIOMES.SNOWFIELD || biome === BIOMES.WASTELAND) {
                continue;
            }

            const y = heights[x];

            // Must be above sea level (mountains/plateaus)
            if (y >= seaLevel) continue;

            // Check for extreme height difference nearby (cliff)
            const range = 5;
            const threshold = 10;

            const leftH = heights[(x - range + this.width) % this.width];
            const rightH = heights[(x + range) % this.width];

            const dropLeft = leftH - y;
            const dropRight = rightH - y;

            if (dropLeft > threshold || dropRight > threshold) {
                // Found a cliff edge, create a waterfall

                // 1. Draw the source pond
                Painters.drawPond(paint, x, y, 3);

                // 2. Extend water downwards
                for (let dx = -4; dx <= 4; dx++) {
                    const wx = (x + dx + this.width) % this.width;

                    // Check if we have a water block at the source level
                    if (this.getBlock(wx, y) === BLOCKS.WATER) {
                        let cy = y + 1;
                        // Trace down through AIR
                        while (cy < this.height) {
                            const blockBelow = this.getBlock(wx, cy);
                            if (blockBelow === BLOCKS.AIR) {
                                this.setBlock(wx, cy, BLOCKS.WATER);
                            } else if (blockBelow !== BLOCKS.WATER) {
                                // Hit solid ground, stop
                                break;
                            }
                            cy++;
                        }
                    }
                }
                created++;
                // Skip nearby x to avoid clumping
                // Note: since x is random, we can't easily skip, but random distribution handles it well enough.
            }
        }
    }

    generateStructures(heights, biomeByColumn, seaLevel) {
        const paint = this.getAccessor();

        // Floating Islands
        const islandCount = Math.floor(this.width / 80);
        for (let i = 0; i < islandCount; i++) {
            const x = Math.floor(Math.random() * this.width);
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
        for (let x = 0; x < this.width; x += 1) {
            if (biomeByColumn[x] === BIOMES.OCEAN && Math.random() < 0.03) {
                Painters.drawOceanIsland(paint, x, seaLevel);
                x += 40; 
            }
        }

        // Desert Ruins and Oases
        for (let x = 0; x < this.width; x += 1) {
            if (biomeByColumn[x] === BIOMES.DESERT) {
                if (Math.random() < 0.002) {
                     Painters.drawOasis(paint, x, heights[x]);
                     x += 25; 
                }
                else if (Math.random() < 0.015) {
                    const nextH = heights[(x + 2) % this.width];
                    if (Math.abs(nextH - heights[x]) < 2) {
                        Painters.drawDesertRuin(paint, x, heights[x]);
                        x += 15;
                    }
                }
            }
        }

        // Mineshafts
        const mineshaftCount = Math.floor(this.width / 50);
        for (let i = 0; i < mineshaftCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const surface = heights[x];
            Painters.drawMineshaft(paint, x, surface + 15 + Math.floor(Math.random() * (this.height - surface - 20)));
        }
    }

    generateHiddenFeatures(heights, biomeByColumn) {
        const paint = this.getAccessor();
        for (let x = 0; x < this.width; x++) {
            const biome = biomeByColumn[x];
            const surfaceY = heights[x];

            // 1. Ancient Monolith
            if ((biome === BIOMES.PLAINS || biome === BIOMES.WASTELAND) && Math.random() < 0.003) {
                Painters.drawMonolith(paint, x, surfaceY);
                x += 10; continue;
            }

            // 2. Buried Bunker
            if ((biome === BIOMES.FOREST || biome === BIOMES.SAVANNA) && Math.random() < 0.004) {
                if (surfaceY < this.height - 20) {
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
        const ruinX = 100 + Math.floor(Math.random() * (this.width - 200));
        const ruinFloorY = this.height - 10 - Math.floor(Math.random() * 10); // Deep underground
        Painters.drawAncientRuins(paint, ruinX, ruinFloorY);
    }

    generateCaves(heights) {
        const paint = this.getAccessor();
        const caveWalkers = Math.max(3, Math.floor(this.width / 35));
        for (let i = 0; i < caveWalkers; i++) {
            const startX = Math.floor(Math.random() * this.width);
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

                // Wrapping X for cave walkers
                x = (x % this.width + this.width) % this.width;

                const surfaceAtX = heights[x];
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
            case BIOMES.SWAMP:
                if (r < 0.1) Painters.drawTreeSwamp(paint, x, y);
                else if (r < 0.2) Painters.drawPond(paint, x, y, 2);
                else if (r < 0.4 && Math.random() < 0.5) Painters.drawBush(paint, x, y);
                break;
        }
    }
}
