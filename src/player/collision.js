/**
 * Player Collision Module
 *
 * Handles collision detection and resolution with the world.
 * Uses fixed-point arithmetic for deterministic behavior.
 */

import {
    TILE_SIZE_FP,
    COLLISION_EPSILON_FP,
    UPWARD_COLLISION_THRESHOLD_FP,
    VELOCITY_BOOST_ON_BREAK_FP,
    JUMP_PAD_FORCE_TABLE_FP,
    FP_SHIFT
} from './fixed_point.js';
import { isBlockSolid, isBlockBreakable, getBlockMaterialType, isNaturalBlock } from '../utils.js';
import { BLOCKS, BLOCK_PROPS, NATURAL_BLOCK_IDS } from '../constants.js';
import { sounds } from '../audio.js';
import { emitBlockBreakParticles } from '../block_particles.js';

/**
 * Counts vertical jump pads at a position.
 * @param {Object} world - World accessor
 * @param {number} x - Grid X
 * @param {number} y - Grid Y
 * @returns {number} Count of connected jump pads
 */
export function countVerticalJumpPads(world, x, y) {
    let count = 0;
    let currentY = y;

    // Count upward
    while (world.getBlock(x, currentY) === BLOCKS.JUMP_PAD) {
        count++;
        currentY--;
    }

    // Count downward
    currentY = y + 1;
    while (world.getBlock(x, currentY) === BLOCKS.JUMP_PAD) {
        count++;
        currentY++;
    }

    return count;
}

/**
 * Handles collision resolution for horizontal or vertical movement.
 * @param {Object} state - Player state {_x, _y, _vx, _vy, _width, _height, _boardVx}
 * @param {Object} world - World accessor
 * @param {boolean} horizontal - True for horizontal, false for vertical
 * @param {number} velocity_FP - Current velocity in FP
 * @param {Function|null} addToInventory - Callback for block breaking
 * @returns {Object} {x, y, vx, vy, boardVx, grounded, lowGravityActive, blockBroken}
 */
export function handleCollisions(state, world, horizontal, velocity_FP, addToInventory) {
    let { _x, _y, _vx, _vy, _width, _height, _boardVx, lowGravityActive } = state;
    let grounded = false;
    let blockBroken = false;

    // Calculate grid bounds from FP position
    const startX = Math.floor(_x / TILE_SIZE_FP);
    const endX = Math.floor((_x + _width) / TILE_SIZE_FP);
    const startY = Math.floor(_y / TILE_SIZE_FP);
    const endY = Math.floor((_y + _height) / TILE_SIZE_FP);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const block = world.getBlock(x, y);

            if (isBlockSolid(block, BLOCK_PROPS)) {
                if (horizontal) {
                    if (velocity_FP > 0) {
                        // Moving right - push left of block
                        _x = x * TILE_SIZE_FP - _width - COLLISION_EPSILON_FP;
                    } else if (velocity_FP < 0) {
                        // Moving left - push right of block
                        _x = (x + 1) * TILE_SIZE_FP + COLLISION_EPSILON_FP;
                    }
                    _vx = 0;
                    _boardVx = 0;
                } else {
                    if (_vy > 0) {
                        // Moving down - land on block
                        _y = y * TILE_SIZE_FP - _height - COLLISION_EPSILON_FP;
                        grounded = true;
                        _vy = 0;
                        // Reset special physics modes on landing
                        lowGravityActive = false;
                    } else if (_vy < 0) {
                        // Moving up - hit ceiling
                        _y = (y + 1) * TILE_SIZE_FP + COLLISION_EPSILON_FP;

                        // Block breaking from below
                        if (_vy < UPWARD_COLLISION_THRESHOLD_FP &&
                            isBlockBreakable(block, BLOCK_PROPS) &&
                            isNaturalBlock(block, NATURAL_BLOCK_IDS)) {
                            if (addToInventory) {
                                addToInventory(block);
                            }
                            sounds.playDig(getBlockMaterialType(block, BLOCK_PROPS));
                            emitBlockBreakParticles(x, y, block);
                            world.setBlock(x, y, BLOCKS.AIR);
                            _vy += VELOCITY_BOOST_ON_BREAK_FP;
                            blockBroken = true;

                            return {
                                _x, _y, _vx, _vy, _boardVx,
                                grounded: false,
                                lowGravityActive,
                                blockBroken
                            };
                        }

                        // Bounce off jump pad from below
                        if (block === BLOCKS.JUMP_PAD) {
                            const stackCount = countVerticalJumpPads(world, x, y);
                            const clampedCount = Math.min(stackCount, 128);
                            _vy = JUMP_PAD_FORCE_TABLE_FP[clampedCount];
                            sounds.playBigJump();
                        } else {
                            _vy = 0;
                        }
                    }

                    return {
                        _x, _y, _vx, _vy, _boardVx,
                        grounded,
                        lowGravityActive,
                        blockBroken
                    };
                }
            }
        }
    }

    // No vertical collision - not grounded
    if (!horizontal) {
        grounded = false;
    }

    return {
        _x, _y, _vx, _vy, _boardVx,
        grounded,
        lowGravityActive,
        blockBroken
    };
}

/**
 * Checks if there's enough head clearance above the player.
 * Used for underwater jump validation.
 * @param {number} x_FP - Player X in FP
 * @param {number} y_FP - Player Y in FP
 * @param {number} width_FP - Player width in FP
 * @param {number} clearance_FP - Required clearance in FP
 * @param {Object} world - World accessor
 * @returns {boolean} True if clearance exists
 */
export function checkHeadClearance(x_FP, y_FP, width_FP, clearance_FP, world) {
    const headCheckY_FP = y_FP - clearance_FP;
    const headCheckY = Math.floor(headCheckY_FP / TILE_SIZE_FP);
    const startX = Math.floor(x_FP / TILE_SIZE_FP);
    const endX = Math.floor((x_FP + width_FP) / TILE_SIZE_FP);

    for (let checkX = startX; checkX <= endX; checkX++) {
        if (isBlockSolid(world.getBlock(checkX, headCheckY), BLOCK_PROPS)) {
            return false;
        }
    }

    return true;
}
