import { BLOCKS, TILE_SIZE, BLOCK_PROPS } from './constants.js';
import { rectsIntersect, isBlockSolid, isBlockBreakable } from './utils.js';

/**
 * Manages sapling growth logic and timers.
 */
export function createSaplingManager({ world, player }) {
    const saplingTimers = [];
    const SAPLING_GROWTH_TIME = 6000;

    /**
     * Adds a new sapling to be tracked.
     * @param {number} x - The x coordinate (tile)
     * @param {number} y - The y coordinate (tile)
     * @param {number} [remainingTime] - Optional remaining time for loading saves
     */
    function addSapling(x, y, remainingTime) {
        const time = remainingTime || (SAPLING_GROWTH_TIME + Math.random() * 1000);
        saplingTimers.push({ x, y, timer: time });
    }

    /**
     * Helper: Lifts the player up if a block grows into their collision box.
     */
    function liftPlayerAbove(blockRect) {
        const targetY = blockRect.y - player.height - 0.1;
        if (player.y > targetY) {
            player.y = targetY;
        }
        player.vy = 0;
        player.grounded = true;

        const startX = Math.floor(player.x / TILE_SIZE);
        const endX = Math.floor((player.x + player.width) / TILE_SIZE);
        const startY = Math.floor(player.y / TILE_SIZE);
        const endY = Math.floor((player.y + player.height) / TILE_SIZE);

        let adjustedTop = null;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const block = world.getBlock(x, y);
                if (!isBlockSolid(block, BLOCK_PROPS)) continue;

                if (isBlockBreakable(block, BLOCK_PROPS)) {
                    world.setBlock(x, y, BLOCKS.AIR);
                } else {
                    const candidateTop = y * TILE_SIZE;
                    adjustedTop = adjustedTop === null ? candidateTop : Math.min(adjustedTop, candidateTop);
                }
            }
        }

        if (adjustedTop !== null) {
            player.y = adjustedTop - player.height - 0.1;
        }
    }

    /**
     * Places a specific block for the tree and handles collision.
     */
    function placeGrowthBlock(x, y, type) {
        if (x < 0 || x >= world.width || y < 0 || y >= world.height) return;

        const existing = world.getBlock(x, y);
        if (BLOCK_PROPS[existing] && BLOCK_PROPS[existing].unbreakable) return;

        if (existing !== BLOCKS.AIR && existing !== BLOCKS.SAPLING) {
            world.setBlock(x, y, BLOCKS.AIR);
        }

        const blockRect = { x: x * TILE_SIZE, y: y * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
        
        if (rectsIntersect(player.getRect(), blockRect)) {
            liftPlayerAbove(blockRect);
        }

        world.setBlock(x, y, type);
    }

    /**
     * Finds all connected saplings starting from a specific coordinate using Flood Fill (BFS).
     */
    function getConnectedSaplings(startX, startY) {
        const group = [];
        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        const key = (x, y) => `${x},${y}`;

        visited.add(key(startX, startY));

        while (queue.length > 0) {
            const current = queue.shift();
            
            if (world.getBlock(current.x, current.y) === BLOCKS.SAPLING) {
                group.push(current);

                const neighbors = [
                    { x: current.x + 1, y: current.y },
                    { x: current.x - 1, y: current.y },
                    { x: current.x, y: current.y + 1 },
                    { x: current.x, y: current.y - 1 }
                ];

                for (const n of neighbors) {
                    const k = key(n.x, n.y);
                    if (n.x >= 0 && n.x < world.width && n.y >= 0 && n.y < world.height) {
                        if (!visited.has(k) && world.getBlock(n.x, n.y) === BLOCKS.SAPLING) {
                            visited.add(k);
                            queue.push(n);
                        }
                    }
                }
            }
        }
        return group;
    }

    /**
     * Generates a tree structure based on the shape of the sapling group.
     * Logic:
     * - Vertical stack -> Tall, thin, straight tree (Sequoia-like).
     * - Horizontal row -> Thick, stout trunk (Baobab-like).
     * - Irregular cluster -> Twisty, random width (Bonsai-like).
     */
    function growSaplingGroup(saplingGroup) {
        const count = saplingGroup.length;
        if (count === 0) return;

        // 1. Calculate bounding box to determine shape
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        saplingGroup.forEach(s => {
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.y > maxY) maxY = s.y;
        });

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const ratio = height / width; // > 1 is tall, < 1 is wide

        // Root position (bottom center of the group)
        const rootX = Math.floor((minX + maxX) / 2);
        const rootY = maxY;

        // 2. Clear existing saplings
        saplingGroup.forEach(s => {
            world.setBlock(s.x, s.y, BLOCKS.AIR);
        });

        // 3. Determine Growth Parameters based on shape
        let blocksPerSapling = 5; // Base efficiency
        let currentWidth = 1;
        let driftChance = 0.0;
        let widthVarianceChance = 0.0;
        let woodBonus = 1.0; // Multiplier for total wood

        if (ratio >= 2.0) {
            // PATTERN: TALL (Vertical Stack)
            // Goal: Very high, thin, straight.
            currentWidth = 1; 
            woodBonus = 1.5; // Give extra height for satisfaction
            driftChance = 0.02; // Very slight wobble
        } else if (ratio <= 0.5) {
            // PATTERN: THICK (Horizontal Row)
            // Goal: As wide as the saplings were, stout.
            currentWidth = width;
            woodBonus = 0.8; // Slightly less efficient to prevent massive walls
            driftChance = 0.05; 
        } else {
            // PATTERN: BONSAI (Cluster/Blob)
            // Goal: Twisty, organic look.
            currentWidth = Math.ceil(Math.sqrt(count));
            driftChance = 0.3; // High chance to drift left/right
            widthVarianceChance = 0.3; // Trunk thickness changes
        }

        const targetWoodCount = Math.floor(count * blocksPerSapling * woodBonus);
        
        const placements = [];
        let placedWood = 0;
        let currentY = rootY;
        let currentX = rootX; 

        // 4. Generate Trunk
        while (placedWood < targetWoodCount) {
            // Determine width for this row
            let rowWidth = currentWidth;
            
            // Apply width variance (mainly for Bonsai look)
            if (widthVarianceChance > 0 && Math.random() < widthVarianceChance) {
                rowWidth += (Math.random() < 0.5 ? -1 : 1);
            }
            if (rowWidth < 1) rowWidth = 1;

            // Determine drift (Horizontal movement)
            const isBase = (rootY - currentY) < 2; // Stable base
            
            if (!isBase) {
                if (Math.random() < driftChance) {
                    const driftDir = Math.random() < 0.5 ? -1 : 1;
                    currentX += driftDir;
                }
                
                // Bias correction: If drifting too far from center, pull back slightly
                // (Prevents trees from drifting off-screen)
                if (currentX < rootX - 3 && Math.random() < 0.2) currentX++;
                if (currentX > rootX + 3 && Math.random() < 0.2) currentX--;
            }

            // Calculate start X for this row to center it on currentX
            const startX = currentX - Math.floor((rowWidth - 1) / 2);

            for (let w = 0; w < rowWidth; w++) {
                placements.push({ x: startX + w, y: currentY, type: BLOCKS.WOOD });
                placedWood++;
            }
            
            currentY--;

            // Safety break (Max height limit)
            if (rootY - currentY > 100) break; 
        }

        // 5. Generate Leaves
        // Adjust leaf size based on tree size
        const topY = currentY + 1; 
        const topX = currentX;
        
        // Leaf radius scales slightly with trunk width
        let leafRadius = 2 + (currentWidth * 0.8);
        
        // Clamp leaf size to avoid massive lag on huge trees
        if (leafRadius > 6) leafRadius = 6;

        const rangeX = Math.ceil(leafRadius);
        const rangeY = Math.ceil(leafRadius * 0.8);

        for (let ly = topY - rangeY; ly <= topY + rangeY; ly++) {
            for (let lx = topX - rangeX; lx <= topX + rangeX; lx++) {
                const xDist = (lx - topX) / rangeX;
                const yDist = (ly - topY) / rangeY;
                const dist = Math.sqrt(xDist * xDist + yDist * yDist);
                
                // Randomize edges for organic look
                if (dist < 1.0 - (Math.random() * 0.25)) {
                    // Don't overwrite trunk
                    const isWood = placements.some(p => p.x === lx && p.y === ly && p.type === BLOCKS.WOOD);
                    if (!isWood) {
                        placements.push({ x: lx, y: ly, type: BLOCKS.LEAVES });
                    }
                }
            }
        }

        // 6. Apply placements
        placements.forEach(({ x: px, y: py, type }) => placeGrowthBlock(px, py, type));
    }

    /**
     * Updates timers.
     */
    function update(dt) {
        for (let i = saplingTimers.length - 1; i >= 0; i--) {
            const sapling = saplingTimers[i];
            
            if (world.getBlock(sapling.x, sapling.y) !== BLOCKS.SAPLING) {
                saplingTimers.splice(i, 1);
                continue;
            }

            sapling.timer -= dt;
            if (sapling.timer <= 0) {
                const group = getConnectedSaplings(sapling.x, sapling.y);
                growSaplingGroup(group);
                saplingTimers.splice(i, 1);
            }
        }
    }

    return {
        addSapling,
        update,
        getTimers: () => saplingTimers,
        restoreTimers: (savedTimers) => {
            saplingTimers.length = 0;
            if (savedTimers) saplingTimers.push(...savedTimers);
        }
    };
}
