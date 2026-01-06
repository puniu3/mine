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
     * Generates a tree structure scaling wood count to sapling count.
     * Modified to be straighter (less bonsai-like).
     */
    function growSaplingGroup(saplingGroup) {
        const count = saplingGroup.length;
        if (count === 0) return;

        // 1. Calculate bounding box
        let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
        saplingGroup.forEach(s => {
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.y > maxY) maxY = s.y;
        });

        const rootX = Math.floor((minX + maxX) / 2);
        const rootY = maxY;

        // 2. Resource configuration
        const blocksPerSapling = 4;
        const targetWoodCount = count * blocksPerSapling;

        // Base width calculation
        const baseWidth = Math.ceil(Math.sqrt(count));
        
        // 3. Clear existing saplings
        saplingGroup.forEach(s => {
            world.setBlock(s.x, s.y, BLOCKS.AIR);
        });

        const placements = [];
        let placedWood = 0;
        let currentY = rootY;
        let currentX = rootX; 

        // 4. Generate Trunk
        while (placedWood < targetWoodCount) {
            // Determine width for this row.
            // Reduced randomness here too: mostly consistent width.
            let rowWidth = baseWidth;
            if (baseWidth > 1 && Math.random() < 0.2) { // Only 20% chance to vary thickness
                rowWidth += (Math.random() < 0.5 ? -1 : 1);
            }
            if (rowWidth < 1) rowWidth = 1;

            // Determine drift (Horizontal movement)
            // Drastically reduced drift chance to prevent "Bonsai" look.
            // Keep the first 3 blocks straight for stability.
            const isBase = (rootY - currentY) < 3;
            
            if (!isBase) {
                const roll = Math.random();
                let drift = 0;
                
                // Only 5% chance to drift left or right (was 20%)
                if (roll < 0.05) drift = -1;
                else if (roll > 0.95) drift = 1;
                
                // Bias correction: If we are too far from rootX, force a return drift sometimes
                if (currentX < rootX - 1 && Math.random() < 0.3) drift = 1;
                if (currentX > rootX + 1 && Math.random() < 0.3) drift = -1;

                currentX += drift;
            }

            // Calculate start X for this row
            const startX = currentX - Math.floor((rowWidth - 1) / 2);

            for (let w = 0; w < rowWidth; w++) {
                placements.push({ x: startX + w, y: currentY, type: BLOCKS.WOOD });
                placedWood++;
            }
            
            currentY--;

            // Safety break
            if (rootY - currentY > 50) break; 
        }

        // 5. Generate Leaves
        const topY = currentY + 1; 
        const topX = currentX;
        
        // Leaf radius
        const leafRadius = 2 + (baseWidth * 1.5);
        const rangeX = Math.ceil(leafRadius);
        const rangeY = Math.ceil(leafRadius * 0.8);

        for (let ly = topY - rangeY; ly <= topY + rangeY; ly++) {
            for (let lx = topX - rangeX; lx <= topX + rangeX; lx++) {
                const xDist = (lx - topX) / rangeX;
                const yDist = (ly - topY) / rangeY;
                const dist = Math.sqrt(xDist * xDist + yDist * yDist);
                
                if (dist < 1.0 - (Math.random() * 0.25)) {
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
