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
        rectsIntersect,
        hasAdjacentBlock
    } = utils;

    /**
     * Handles pointer interaction (mouse/touch) for breaking and placing blocks.
     * @param {number} screenX - Screen X coordinate.
     * @param {number} screenY - Screen Y coordinate.
     */
    function handlePointer(screenX, screenY) {
        const worldPos = screenToWorld(screenX, screenY, camera.x, camera.y);
        // Use 'let' for by because we might modify it (target shifting)
        let { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

        // Check reach
        if (!isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
            return;
        }

        const currentBlock = world.getBlock(bx, by);

        // Break
        if (currentBlock !== BLOCKS.AIR && isBlockBreakable(currentBlock, BLOCK_PROPS)) {
            inventory.addToInventory(currentBlock);
            sounds.playDig(getBlockMaterialType(currentBlock, BLOCK_PROPS));
            world.setBlock(bx, by, BLOCKS.AIR);
            return;
        }

        // Place
        if ((currentBlock === BLOCKS.AIR || isBlockTransparent(currentBlock, BLOCK_PROPS)) && currentBlock !== BLOCKS.WORKBENCH) {
            const playerRect = player.getRect();
            const blockRect = { x: bx * TILE_SIZE, y: by * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };

            const isIntersecting = rectsIntersect(playerRect, blockRect);

            let canPlace = false;
            let shouldClimb = false;

            if (!isIntersecting) {
                canPlace = true;
            } else {
                // Logic modification: Specific body part handling
                const playerHeadTileY = Math.floor(player.y / TILE_SIZE);
                // Use -0.01 to ensure we get the tile the feet are actually inside/on
                const playerFeetTileY = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

                if (by === playerHeadTileY) {
                    // Case: User tapped the upper body (Head)
                    // Action: Shift placement target to feet and trigger climb
                    by = playerFeetTileY;

                    // Calculate where the player needs to move (on top of the new block)
                    const targetPlayerY = (by * TILE_SIZE) - player.height;

                    // Check if the area above the new block position is free
                    if (world.checkAreaFree(player.x, targetPlayerY, player.width, player.height)) {
                        canPlace = true;
                        shouldClimb = true;
                    }
                } else if (by === playerFeetTileY) {
                    // Case: User tapped the lower body (Feet)
                    // Action: Prevent placement
                    canPlace = false;
                } else {
                    // Case: Intersecting but distinct from head/feet logic (fallback)
                    // Try standard auto-climb check just in case
                    const targetY = blockRect.y - player.height;
                    if (world.checkAreaFree(player.x, targetY, player.width, player.height)) {
                        canPlace = true;
                        shouldClimb = true;
                    }
                }
            }

            if (canPlace) {
                // Check neighbors (allow placement if climbing OR has neighbor)
                const hasNeighbor = shouldClimb || hasAdjacentBlock(bx, by, (x, y) => world.getBlock(x, y), BLOCKS.AIR);

                if (hasNeighbor) {
                    const selectedBlock = inventory.getSelectedBlockId();
                    if (inventory.consumeFromInventory(selectedBlock)) {
                        world.setBlock(bx, by, selectedBlock);
                        sounds.playDig('dirt');
                        if (onBlockPlaced) onBlockPlaced(bx, by, selectedBlock); // Trigger hook
                        if (shouldClimb) {
                            // Move player on top of the newly placed block
                            player.y = (by * TILE_SIZE) - player.height - 0.1;
                            player.vy = 0;
                            player.grounded = true;
                        }
                    } else {
                        sounds.playPop();
                    }
                }
            }
        }
    }

    return {
        handlePointer
    };
}
