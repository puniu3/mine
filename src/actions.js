import { emitBlockBreakParticles } from './block_particles.js';

/**
 * Game Actions Module
 * Encapsulates block interaction logic.
 *
 * @param {Object} context - The game context and dependencies.
 * @param {Object} context.world - The game world instance.
 * @param {Object} context.player - The player instance.
 * @param {Object} context.inventory - Inventory management functions.
 * @param {Function} context.inventory.addToInventory - Function to add item to inventory.
 * @param {Function} context.inventory.consumeFromInventory - Function to consume item from inventory.
 * @param {Function} context.inventory.getSelectedBlockId - Function to get currently selected block ID.
 * @param {Object} context.camera - Camera object with x and y properties.
 * @param {number} context.camera.x - Current camera X position.
 * @param {number} context.camera.y - Current camera Y position.
 * @param {Object} context.sounds - Sound manager.
 * @param {Function} context.sounds.playDig - Function to play digging sound.
 * @param {Object} context.constants - Game constants.
 * @param {number} context.constants.TILE_SIZE - Size of a tile in pixels.
 * @param {Object} context.constants.BLOCKS - Block ID definitions.
 * @param {Object} context.constants.BLOCK_PROPS - Block properties.
 * @param {number} context.constants.REACH - Player interaction reach distance.
 * @param {Object} context.utils - Utility functions.
 * @param {Function} context.utils.screenToWorld - Convert screen coords to world coords.
 * @param {Function} context.utils.worldToTile - Convert world coords to tile coords.
 * @param {Function} context.utils.isWithinReach - Check if point is within reach.
 * @param {Function} context.utils.isBlockBreakable - Check if block is breakable.
 * @param {Function} context.utils.isBlockTransparent - Check if block is transparent.
 * @param {Function} context.utils.getBlockMaterialType - Get material type of block.
 * @param {Function} context.utils.rectsIntersect - Check if two rects intersect.
 * @param {Function} context.utils.hasAdjacentBlock - Check if block has neighbors.
 * @param {Function} [context.onBlockPlaced] - Callback when block is placed.
 * @returns {Object} Action methods { handlePointer }.
 */
export function createActions({
    world,
    player,
    inventory,
    camera,
    sounds,
    constants,
    utils,
    onBlockPlaced
}) {
    const { TILE_SIZE, BLOCKS, BLOCK_PROPS, REACH } = constants;
    const {
        screenToWorld,
        worldToTile,
        isWithinReach,
        isBlockBreakable,
        isBlockTransparent,
        isBlockSolid,
        getBlockMaterialType,
        rectsIntersect
    } = utils;

    /**
     * Checks if a target tile has at least one valid supporting neighbor.
     * Valid supports are any block except Air and Water.
     * This allows placing blocks on transparent blocks like Workbench or Sapling, but not Water.
     * @param {number} tx - Target tile X.
     * @param {number} ty - Target tile Y.
     * @returns {boolean} True if a valid supporting neighbor exists.
     */
    function hasSolidNeighbor(tx, ty) {
        const offsets = [
            { dx: 0, dy: -1 }, // Top
            { dx: 0, dy: 1 },  // Bottom
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }   // Right
        ];

        for (const { dx, dy } of offsets) {
            const nb = world.getBlock(tx + dx, ty + dy);
            // Logic updated: Valid support is any block that is not AIR and not WATER.
            // This allows other transparent blocks (e.g. Workbench, Sapling) to serve as support.
            if (nb !== BLOCKS.AIR && nb !== BLOCKS.WATER) {
                return true;
            }
        }
        return false;
    }

    /**
     * Executes the climb action: places selected block at player's feet and moves player up.
     * @returns {boolean} True if climb was successful.
     */
    function executeClimb() {
        const pCenterX = player.getCenterX();
        const centerTx = Math.floor(pCenterX / TILE_SIZE);

        // Tile Y coordinate where the player's feet are (usually air)
        const targetTy = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

        // Tile Y coordinate of the block the player is standing on (one tile below feet)
        const standingBlockTy = Math.floor((player.y + player.height + 0.1) / TILE_SIZE);

        // Find the X coordinate of the solid block the player is actually standing on
        // This handles the case where player is on the edge of a block, leaning into air
        const leftTx = Math.floor(player.x / TILE_SIZE);
        const rightTx = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);

        let targetTx = centerTx; // Default to center

        // Check if center tile has a solid block underneath
        const blockAtCenter = world.getBlock(centerTx, standingBlockTy);
        if (!isBlockSolid(blockAtCenter, BLOCK_PROPS)) {
            // Center is not on solid ground, check left and right edges
            const blockAtLeft = world.getBlock(leftTx, standingBlockTy);
            const blockAtRight = world.getBlock(rightTx, standingBlockTy);

            if (isBlockSolid(blockAtLeft, BLOCK_PROPS)) {
                targetTx = leftTx;
            } else if (isBlockSolid(blockAtRight, BLOCK_PROPS)) {
                targetTx = rightTx;
            }
        }

        // Validation: Is the feet block replaceable (Air/Water/Grass)?
        // Must be transparent AND (AIR or breakable). 
        const blockAtFeet = world.getBlock(targetTx, targetTy);
        const isFeetReplaceable = isBlockTransparent(blockAtFeet, BLOCK_PROPS) && 
            (blockAtFeet === BLOCKS.AIR || isBlockBreakable(blockAtFeet, BLOCK_PROPS));

        // Validation: Is the space ABOVE the new block free for the player to stand?
        const newPlayerY = (targetTy * TILE_SIZE) - player.height;
        const isAreaAboveFree = world.checkAreaFree(player.x, newPlayerY, player.width, player.height);

        if (isFeetReplaceable && isAreaAboveFree) {
            const selectedBlock = inventory.getSelectedBlockId();

            // Skip if placing the same block type on itself
            if (blockAtFeet === selectedBlock) {
                return false;
            }

            const isCloud = selectedBlock === BLOCKS.CLOUD;

            // Strict Rule: Must attach to a solid block (not Water), unless it's a Cloud.
            const hasSupport = isCloud || hasSolidNeighbor(targetTx, targetTy);

            if (hasSupport) {
                if (inventory.consumeFromInventory(selectedBlock)) {
                    // If replacing a non-air transparent block (e.g. Water/Sapling), add it to inventory
                    if (blockAtFeet !== BLOCKS.AIR) {
                        inventory.addToInventory(blockAtFeet);
                    }

                    world.setBlock(targetTx, targetTy, selectedBlock);
                    sounds.playDig('dirt'); // Or appropriate sound
                    if (onBlockPlaced) onBlockPlaced(targetTx, targetTy, selectedBlock);

                    // Teleport player on top ONLY if the placed block is NOT transparent
                    if (!isBlockTransparent(selectedBlock, BLOCK_PROPS)) {
                        player.y = newPlayerY - 0.1;
                        player.vy = 0;
                        player.grounded = true;
                    }
                    return true;
                } else {
                    sounds.playPop(); // Out of ammo
                }
            }
        }
        return false;
    }

    /**
     * Triggers climb action directly (for key binding).
     */
    function triggerClimb() {
        executeClimb();
    }

    /**
     * Handles pointer interaction (mouse/touch) for breaking and placing blocks.
     * @param {number} screenX - Screen X coordinate.
     * @param {number} screenY - Screen Y coordinate.
     * @param {string} [mode] - Optional mode: 'break' for break only, 'place' for place only.
     */
    function handlePointer(screenX, screenY, mode) {
        const worldPos = screenToWorld(screenX, screenY, camera.x, camera.y);
        const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

        // Basic reach check (distance from player center)
        if (!isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
            return;
        }

        // ========================================================================
        // 1. Auto-Climb Trigger Detection (Top Priority)
        // ========================================================================
        const pCenterX = player.getCenterX();
        const pHeadTileX = Math.floor(pCenterX / TILE_SIZE);
        const pHeadTileY = Math.floor(player.y / TILE_SIZE);

        // Condition 1: Tile containing the center of the player's head
        const isHeadTile = (bx === pHeadTileX && by === pHeadTileY);

        // Condition 2: Upper half of the tile directly below the head tile
        const isBelowHead = (bx === pHeadTileX && by === pHeadTileY + 1);
        const isUpperHalf = (worldPos.y % TILE_SIZE) < (TILE_SIZE / 2);
        const isBelowHeadUpperHalf = isBelowHead && isUpperHalf;

        // Condition 3: Specific Rect (32px wide, 48px high, top at player.y - 4, centered)
        const rectX = pCenterX - 16;
        const rectY = player.y - 4;
        const rectW = 32;
        const rectH = 48;
        const isInsideRect = (
            worldPos.x >= rectX &&
            worldPos.x < rectX + rectW &&
            worldPos.y >= rectY &&
            worldPos.y < rectY + rectH
        );

        if (isHeadTile || isBelowHeadUpperHalf || isInsideRect) {
            // Climb involves block placement at feet - only execute in default mode (mouse/touch)
            // Gamepad place mode (LT) should only do normal block placement
            if (!mode) {
                executeClimb();
                return;
            }
        }

        // ========================================================================
        // 2. Block Breaking
        // ========================================================================
        const currentBlock = world.getBlock(bx, by);

        // Only break blocks in 'break' mode or default mode (not 'place' mode)
        if (mode !== 'place' && currentBlock !== BLOCKS.AIR && isBlockBreakable(currentBlock, BLOCK_PROPS)) {
            inventory.addToInventory(currentBlock);
            sounds.playDig(getBlockMaterialType(currentBlock, BLOCK_PROPS));
            emitBlockBreakParticles(bx, by, currentBlock);
            world.setBlock(bx, by, BLOCKS.AIR);
            return;
        }

        // ========================================================================
        // 3. Normal Block Placement
        // ========================================================================
        // Only place blocks in 'place' mode or default mode (not 'break' mode)
        if (mode !== 'break' && (currentBlock === BLOCKS.AIR || isBlockTransparent(currentBlock, BLOCK_PROPS)) && currentBlock !== BLOCKS.WORKBENCH) {
            const playerRect = player.getRect();
            const blockRect = { x: bx * TILE_SIZE, y: by * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
            
            // Standard check: prevent placing inside player
            const isIntersecting = rectsIntersect(playerRect, blockRect);

            if (!isIntersecting) {
                const selectedBlock = inventory.getSelectedBlockId();

                // Skip if placing the same block type on itself
                if (currentBlock === selectedBlock) {
                    return;
                }

                const isCloud = selectedBlock === BLOCKS.CLOUD;

                // Strict Rule: Must attach to a solid block (not Water), unless it's a Cloud.
                // Replaces previous lenient hasAdjacentBlock check.
                const hasSupport = isCloud || hasSolidNeighbor(bx, by);

                if (hasSupport) {
                    if (inventory.consumeFromInventory(selectedBlock)) {
                        // If replacing a non-air transparent block (e.g. Water/Sapling), add it to inventory
                        if (currentBlock !== BLOCKS.AIR) {
                            inventory.addToInventory(currentBlock);
                        }

                        world.setBlock(bx, by, selectedBlock);
                        sounds.playDig('dirt');
                        if (onBlockPlaced) onBlockPlaced(bx, by, selectedBlock);
                    } else {
                        sounds.playPop();
                    }
                }
            }
        }
    }

    return {
        handlePointer,
        triggerClimb
    };
}
