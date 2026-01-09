/**
 * Player Movement Module
 *
 * Handles input processing, jumping, and special movement mechanics.
 * Includes water skipping (mizukiri), jump pads, and TNT interactions.
 */

import {
    toFP, FP_ONE, FP_SHIFT,
    WALK_SPEED_FP,
    JUMP_FORCE_FP,
    WATER_JUMP_FORCE_FP,
    WATER_JUMP_VY_THRESHOLD_FP,
    JUMP_PAD_FORCE_TABLE_FP,
    TILE_SIZE_FP,
    FEET_OFFSET_FP,
    SKIP_SPEED_THRESHOLD_FP,
    TAN_15_DEG_FP
} from './fixed_point.js';
import { BLOCKS, JUMP_FORCE } from '../constants.js';
import { sounds } from '../audio.js';
import { countVerticalJumpPads } from './collision.js';

/**
 * Processes horizontal input and returns new velocity.
 * @param {Object} input - Input state with keys.left/right
 * @param {number} currentVx_FP - Current velocity in FP
 * @param {boolean} currentFacing - Current facing direction
 * @param {Function} applyFriction - Friction function
 * @returns {{vx: number, facingRight: boolean}}
 */
export function processHorizontalInput(input, currentVx_FP, currentFacing, applyFriction) {
    if (input.keys.left) {
        return { vx: -WALK_SPEED_FP, facingRight: false };
    } else if (input.keys.right) {
        return { vx: WALK_SPEED_FP, facingRight: true };
    } else {
        return { vx: applyFriction(currentVx_FP), facingRight: currentFacing };
    }
}

/**
 * Checks and processes water skipping (mizukiri).
 * @param {number} x_FP - Player X in FP
 * @param {number} y_FP - Player Y in FP
 * @param {number} width_FP - Player width in FP
 * @param {number} height_FP - Player height in FP
 * @param {number} vx_FP - Horizontal velocity in FP
 * @param {number} vy_FP - Vertical velocity in FP
 * @param {number} boardVx_FP - Board velocity in FP
 * @param {Object} world - World accessor
 * @returns {number|null} New vy_FP if skip occurred, null otherwise
 */
export function processMizukiri(x_FP, y_FP, width_FP, height_FP, vx_FP, vy_FP, boardVx_FP, world) {
    // Only when falling
    if (vy_FP <= 0) return null;

    const feetCenterX_FP = x_FP + (width_FP >> 1);
    const feetY_FP = y_FP + height_FP + FEET_OFFSET_FP;
    const feetX = Math.floor(feetCenterX_FP / TILE_SIZE_FP);
    const feetY = Math.floor(feetY_FP / TILE_SIZE_FP);

    // Check if feet are in water
    if (world.getBlock(feetX, feetY) !== BLOCKS.WATER) return null;

    // Check if at surface (block above is NOT water)
    const blockAbove = world.getBlock(feetX, feetY - 1);
    if (blockAbove === BLOCKS.WATER) return null;

    const totalVx = vx_FP + boardVx_FP;
    const absVx = totalVx > 0 ? totalVx : -totalVx;
    const absVy = vy_FP; // Known to be > 0

    // Condition 1: Speed threshold
    if (absVx < SKIP_SPEED_THRESHOLD_FP) return null;

    // Condition 2: Shallow angle (< 15 degrees)
    // abs(vy) < abs(vx) * tan(15)
    if ((absVy * FP_ONE) < (absVx * TAN_15_DEG_FP)) {
        sounds.playJump();
        return toFP(JUMP_FORCE * -0.5);
    }

    return null;
}

/**
 * Counts connected TNTs below a jump pad.
 * @param {Object} world - World accessor
 * @param {number} x - Grid X
 * @param {number} startY - Starting Y to search from
 * @returns {number[]} Array of Y positions of TNT blocks
 */
export function countConnectedTNTsBelowJumpPad(world, x, startY) {
    const tntPositions = [];
    let currentY = startY;

    while (world.getBlock(x, currentY) === BLOCKS.TNT) {
        tntPositions.push(currentY);
        currentY++;
    }

    return tntPositions;
}

/**
 * Processes jump pad interaction.
 * @param {number} x_FP - Player X in FP
 * @param {number} y_FP - Player Y in FP
 * @param {number} width_FP - Player width in FP
 * @param {number} height_FP - Player height in FP
 * @param {Object} world - World accessor
 * @param {Function|null} onTNTJumpPad - Callback for TNT jump pad
 * @returns {{vy: number, lowGravityActive: boolean, tntTriggered: boolean, feetX: number, tntPositions: number[]}|null}
 */
export function processJumpPad(x_FP, y_FP, width_FP, height_FP, world, onTNTJumpPad) {
    const feetCenterX_FP = x_FP + (width_FP >> 1);
    const feetY_FP = y_FP + height_FP + FEET_OFFSET_FP;
    const feetX = Math.floor(feetCenterX_FP / TILE_SIZE_FP);
    const feetY = Math.floor(feetY_FP / TILE_SIZE_FP);
    const blockBelow = world.getBlock(feetX, feetY);

    if (blockBelow !== BLOCKS.JUMP_PAD) return null;

    // Determine Moon Jump (Low Gravity) condition
    let bottomPadY = feetY;
    while (world.getBlock(feetX, bottomPadY + 1) === BLOCKS.JUMP_PAD) {
        bottomPadY++;
    }

    // Check if base of jump pad stack is on a cloud
    const blockSupport = world.getBlock(feetX, bottomPadY + 1);
    const lowGravityActive = blockSupport === BLOCKS.CLOUD;

    // Check for connected TNTs below
    const tntPositions = countConnectedTNTsBelowJumpPad(world, feetX, feetY + 1);

    if (tntPositions.length > 0 && onTNTJumpPad) {
        // TNT + JUMP_PAD super launch
        const superStackCount = tntPositions.length * 20;
        const clampedCount = Math.min(superStackCount, 128);
        return {
            vy: -JUMP_PAD_FORCE_TABLE_FP[clampedCount],
            lowGravityActive,
            tntTriggered: true,
            feetX,
            tntPositions
        };
    } else {
        // Normal jump pad behavior
        const stackCount = countVerticalJumpPads(world, feetX, feetY);
        const clampedCount = Math.min(stackCount, 128);
        sounds.playBigJump();
        return {
            vy: -JUMP_PAD_FORCE_TABLE_FP[clampedCount],
            lowGravityActive,
            tntTriggered: false,
            feetX,
            tntPositions: []
        };
    }
}

/**
 * Processes normal jump input.
 * @param {Object} input - Input state
 * @param {boolean} grounded - Is player grounded
 * @param {boolean} isInWater - Is player in water
 * @param {number} vy_FP - Current vertical velocity in FP
 * @param {number} x_FP - Player X in FP
 * @param {number} y_FP - Player Y in FP
 * @param {number} width_FP - Player width in FP
 * @param {number} clearance_FP - Head clearance required in FP
 * @param {Object} world - World accessor
 * @param {Function} checkHeadClearance - Head clearance check function
 * @returns {{vy: number, grounded: boolean, jumped: boolean}|null}
 */
export function processJump(input, grounded, isInWater, vy_FP, x_FP, y_FP, width_FP, clearance_FP, world, checkHeadClearance) {
    if (!input.keys.jump) return null;

    // Ground jump
    if (grounded) {
        sounds.playJump();
        return { vy: -JUMP_FORCE_FP, grounded: false, jumped: true };
    }

    // Water jump (when falling slowly enough and has head clearance)
    if (isInWater && vy_FP > WATER_JUMP_VY_THRESHOLD_FP) {
        if (checkHeadClearance(x_FP, y_FP, width_FP, clearance_FP, world)) {
            sounds.playJump();
            return { vy: -WATER_JUMP_FORCE_FP, grounded: false, jumped: true };
        }
    }

    return null;
}
