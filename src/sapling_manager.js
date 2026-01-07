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
     * Handles vertical wrapping smoothly.
     */
    function liftPlayerAbove(blockRect) {
        // 1. Calculate ideal target position based on the block that hit the player.
        // Even if blockRect.y is 0 (top of map), targetY becoming negative is mathematically correct
        // for the displacement before we wrap it.
        const targetY = blockRect.y - player.height - 0.1;
        
        // Update player position
        player.y = targetY;

        // 2. Normalize player Y immediately to handle the "warp".
        // This ensures the player stays within world bounds [0, worldPixelHeight).
        const worldPixelHeight = world.height * TILE_SIZE;
        player.y = ((player.y % worldPixelHeight) + worldPixelHeight) % worldPixelHeight;

        player.vy = 0;
        player.grounded = true;

        // 3. Check for suffocation (blocks inside player's new body position)
        // We use the new normalized coordinates.
        const startX = Math.floor(player.x / TILE_SIZE);
        const endX = Math.floor((player.x + player.width) / TILE_SIZE);
        
        const startY = Math.floor(player.y / TILE_SIZE);
        // Determine endY based on player height. 
        // Note: We intentionally allow the loop to go beyond world.height in 'y' index
        // to correctly calculate 'adjustedTop' using Math.min in a linear space.
        const endY = Math.floor((player.y + player.height) / TILE_SIZE);

        let adjustedTop = null;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                // Ensure we check the wrapped coordinate for data access
                const wrappedY = ((y % world.height) + world.height) % world.height;
                const wrappedX = ((x % world.width) + world.width) % world.width; // Safety check
                
                const block = world.getBlock(wrappedX, wrappedY);
                if (!isBlockSolid(block, BLOCK_PROPS)) continue;

                if (isBlockBreakable(block, BLOCK_PROPS)) {
                    // Break leaves/blocks stuck inside player
                    world.setBlock(wrappedX, wrappedY, BLOCKS.AIR);
                } else {
                    // For solid unbreakable blocks, we need to push the player further up.
                    // We use 'y' (linear index) instead of 'wrappedY' for position calculation
                    // to ensure Math.min works correctly if the player is straddling the world seam.
                    const candidateTop = y * TILE_SIZE;
                    adjustedTop = adjustedTop === null ? candidateTop : Math.min(adjustedTop, candidateTop);
                }
            }
        }

        if (adjustedTop !== null) {
            // adjustedTop is in linear space relative to startY.
            player.y = adjustedTop - player.height - 0.1;
            
            // Normalize again in case the adjustment pushed them across the boundary again
            player.y = ((player.y % worldPixelHeight) + worldPixelHeight) % worldPixelHeight;
        }
    }

    /**
     * Places a specific block for the tree and handles collision.
     * Handles vertical wrapping for world connectivity.
     */
    function placeGrowthBlock(x, y, type) {
        // Only constrain X (unless horizontal wrapping is also desired, but strictly keeping vertical as requested)
        if (x < 0 || x >= world.width) return;

        // Wrap Y coordinate for vertical loop
        const wrappedY = ((y % world.height) + world.height) % world.height;

        const existing = world.getBlock(x, wrappedY);
        if (BLOCK_PROPS[existing] && BLOCK_PROPS[existing].unbreakable) return;

        if (existing !== BLOCKS.AIR && existing !== BLOCKS.SAPLING) {
            world.setBlock(x, wrappedY, BLOCKS.AIR);
        }

        const blockRect = { x: x * TILE_SIZE, y: wrappedY * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
        
        // Check intersection. 
        // Note: This check works for standard overlap. If the player is wrapping exactly at the seam,
        // standard AABB might miss if not normalized, but generally player physics keeps player normalized.
        // If overlap is detected, liftPlayerAbove handles the complex wrapping math.
        if (rectsIntersect(player.getRect(), blockRect)) {
            liftPlayerAbove(blockRect);
        }

        world.setBlock(x, wrappedY, type);
    }

    /**
     * Finds all connected saplings starting from a specific coordinate using Flood Fill (BFS).
     * Handles vertical wrapping so saplings at the bottom connect to saplings at the top.
     */
    function getConnectedSaplings(startX, startY) {
        const group = [];
        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        const key = (x, y) => `${x},${y}`;

        visited.add(key(startX, startY));

        while (queue.length > 0) {
            const current = queue.shift();
            
            // Check current block with wrapping logic implicitly handled by start coordinates,
            // but we must ensure we access the world correctly.
            // Note: coordinates in the queue are already wrapped when added.
            if (world.getBlock(current.x, current.y) === BLOCKS.SAPLING) {
                group.push(current);

                const neighborsOffsets = [
                    { dx: 1, dy: 0 },
                    { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 },
                    { dx: 0, dy: -1 }
                ];

                for (const offset of neighborsOffsets) {
                    const nx = current.x + offset.dx;
                    const rawNy = current.y + offset.dy;
                    
                    // Wrap Y coordinate
                    const ny = ((rawNy % world.height) + world.height) % world.height;

                    if (nx >= 0 && nx < world.width) {
                        const k = key(nx, ny);
                        if (!visited.has(k) && world.getBlock(nx, ny) === BLOCKS.SAPLING) {
                            visited.add(k);
                            queue.push({ x: nx, y: ny });
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

        const likelyWrapped = height > world.height / 2;

        if (!likelyWrapped && ratio >= 2.0) {
            // PATTERN: TALL (Vertical Stack)
            currentWidth = 1; 
            woodBonus = 1.5; 
            driftChance = 0.02; 
        } else if (!likelyWrapped && ratio <= 0.5) {
            // PATTERN: THICK (Horizontal Row)
            currentWidth = width;
            woodBonus = 0.8; 
            driftChance = 0.05; 
        } else {
            // PATTERN: BONSAI (Cluster/Blob) or Wrapped Group
            currentWidth = Math.ceil(Math.sqrt(count));
            driftChance = 0.3; 
            widthVarianceChance = 0.3; 
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
            
            // Apply width variance
            if (widthVarianceChance > 0 && Math.random() < widthVarianceChance) {
                rowWidth += (Math.random() < 0.5 ? -1 : 1);
            }
            if (rowWidth < 1) rowWidth = 1;

            // Determine drift
            const isBase = (rootY - currentY) < 2; 
            
            if (!isBase) {
                if (Math.random() < driftChance) {
                    const driftDir = Math.random() < 0.5 ? -1 : 1;
                    currentX += driftDir;
                }
                if (currentX < rootX - 3 && Math.random() < 0.2) currentX++;
                if (currentX > rootX + 3 && Math.random() < 0.2) currentX--;
            }

            const startX = currentX - Math.floor((rowWidth - 1) / 2);

            for (let w = 0; w < rowWidth; w++) {
                placements.push({ x: startX + w, y: currentY, type: BLOCKS.WOOD });
                placedWood++;
            }
            
            currentY--;

            if (rootY - currentY > 100) break; 
        }

        // 5. Generate Leaves
        const topY = currentY + 1; 
        const topX = currentX;
        
        let leafRadius = 2 + (currentWidth * 0.8);
        if (leafRadius > 6) leafRadius = 6;

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
                // Saplings are removed by growSaplingGroup, logic below cleans up
            }
        }
        
        // Clean up timers for saplings that no longer exist
        for (let i = saplingTimers.length - 1; i >= 0; i--) {
            if (world.getBlock(saplingTimers[i].x, saplingTimers[i].y) !== BLOCKS.SAPLING) {
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
