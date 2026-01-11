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
        const pHeadTileX = Math.floor(pCenterX / TILE_SIZE);

        // Target is always the feet tile in the center column
        const targetTx = pHeadTileX;
        // Ensure feet calculation gets the tile strictly containing the feet bottom
        const targetTy = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

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
     * @param {string} mode - Interaction mode: 'auto' (default), 'break', or 'place'.
     */
    function handlePointer(screenX, screenY, mode = 'auto') {
        const worldPos = screenToWorld(screenX, screenY, camera.x, camera.y);
        const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

        // Basic reach check (distance from player center)
        if (!isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
            return;
        }

        // ========================================================================
        // 1. Auto-Climb Trigger Detection (Top Priority)
        // ========================================================================
        // Only trigger auto-climb in 'auto' mode
        if (mode === 'auto') {
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
                executeClimb();
                return;
            }
        }

        // ========================================================================
        // 2. Block Breaking
        // ========================================================================
        const currentBlock = world.getBlock(bx, by);

        if ((mode === 'auto' || mode === 'break') &&
            currentBlock !== BLOCKS.AIR && isBlockBreakable(currentBlock, BLOCK_PROPS)) {
            inventory.addToInventory(currentBlock);
            sounds.playDig(getBlockMaterialType(currentBlock, BLOCK_PROPS));
            emitBlockBreakParticles(bx, by, currentBlock);
            world.setBlock(bx, by, BLOCKS.AIR);
            return;
        }

        // ========================================================================
        // 3. Normal Block Placement
        // ========================================================================
        if ((mode === 'auto' || mode === 'place') &&
            (currentBlock === BLOCKS.AIR || isBlockTransparent(currentBlock, BLOCK_PROPS)) && currentBlock !== BLOCKS.WORKBENCH) {
            const playerRect = player.getRect();
            const blockRect = { x: bx * TILE_SIZE, y: by * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
            
            // Standard check: prevent placing inside player
            const isIntersecting = rectsIntersect(playerRect, blockRect);

            if (!isIntersecting) {
                const selectedBlock = inventory.getSelectedBlockId();
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
