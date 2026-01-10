/**
 * Player Physics Module
 *
 * Pure functions for physics calculations.
 * All functions operate on fixed-point values and return new values.
 */

import {
    FP_ONE, FP_SHIFT,
    FRICTION_FACTOR_FP,
    GRAVITY_PER_TICK_FP,
    BOARD_DECAY_PER_TICK_FP,
    TERMINAL_VELOCITY_FP,
    WATER_GRAVITY_FACTOR_FP,
    ACCELERATOR_AMOUNT_FP,
    GRAVITY_LOW_FACTOR_VAL,
    KNOCKBACK_STRENGTH_FP,
    KNOCKBACK_OFFSET_FP,
    TILE_SIZE_FP,
    TILE_SIZE_SQ,
    LOW_FRICTION_EXIT_SPEED_FP
} from './fixed_point.js';

/**
 * Applies friction to horizontal velocity.
 * @param {number} vx_FP - Current velocity in FP
 * @returns {number} New velocity in FP
 */
export function applyFriction(vx_FP) {
    return Math.trunc((vx_FP * FRICTION_FACTOR_FP) / FP_ONE);
}

/**
 * Decays board velocity (skateboard/conveyor momentum).
 * @param {number} boardVx_FP - Current board velocity in FP
 * @param {boolean} lowFrictionActive - Low friction mode active (halves decay)
 * @returns {{boardVx: number, lowFrictionActive: boolean}} New board velocity and friction state
 */
export function applyBoardDecay(boardVx_FP, lowFrictionActive) {
    if (boardVx_FP === 0) {
        return { boardVx: 0, lowFrictionActive: false };
    }

    // In low friction mode, decay is halved (shift right by 1)
    const decay = lowFrictionActive ? (BOARD_DECAY_PER_TICK_FP >> 1) : BOARD_DECAY_PER_TICK_FP;

    let newBoardVx;
    if (boardVx_FP > 0) {
        newBoardVx = Math.max(0, boardVx_FP - decay);
    } else {
        newBoardVx = Math.min(0, boardVx_FP + decay);
    }

    // Exit low friction mode when speed drops below threshold
    let newLowFrictionActive = lowFrictionActive;
    if (lowFrictionActive && Math.abs(newBoardVx) < LOW_FRICTION_EXIT_SPEED_FP) {
        newLowFrictionActive = false;
    }

    return { boardVx: newBoardVx, lowFrictionActive: newLowFrictionActive };
}

/**
 * Calculates gravity to apply based on current state.
 * @param {number} vy_FP - Current vertical velocity in FP
 * @param {boolean} isInWater - Whether player center is in water
 * @param {boolean} lowGravityActive - Moon jump mode active
 * @param {boolean} fastballActive - Fastball lift mode active
 * @param {number} boardVx_FP - Current board velocity for fastball calculation
 * @returns {{vy: number, fastballActive: boolean}} New velocity and fastball state
 */
export function applyGravity(vy_FP, isInWater, lowGravityActive, fastballActive, boardVx_FP) {
    if (vy_FP >= TERMINAL_VELOCITY_FP) {
        return { vy: vy_FP, fastballActive };
    }

    let gravityToApply = GRAVITY_PER_TICK_FP;
    let newFastballActive = fastballActive;

    if (isInWater) {
        // Reduced gravity in water
        gravityToApply = Math.floor((gravityToApply * WATER_GRAVITY_FACTOR_FP) / FP_ONE);
    } else {
        // Apply Low Gravity (Moon Jump Mode) if active
        if (lowGravityActive) {
            gravityToApply = Math.floor(gravityToApply * GRAVITY_LOW_FACTOR_VAL);
        }

        // Fastball Mode: Apply lift proportional to horizontal momentum
        if (fastballActive) {
            const currentSpeedFP = Math.abs(boardVx_FP);

            // If slowed down significantly, disable the mode
            if (currentSpeedFP < (ACCELERATOR_AMOUNT_FP >> 2)) {
                newFastballActive = false;
            } else {
                // Calculate Lift = Gravity * (CurrentSpeed / ReferenceMaxSpeed)
                const liftFP = Math.floor((gravityToApply * currentSpeedFP) / ACCELERATOR_AMOUNT_FP);
                gravityToApply -= liftFP;
            }
        }
    }

    return {
        vy: vy_FP + gravityToApply,
        fastballActive: newFastballActive
    };
}

/**
 * Calculates explosion knockback impulse.
 * All inputs and calculations are in Fixed-Point format (Q20.12).
 * @param {number} playerCenterX_FP - Player center X in FP
 * @param {number} playerCenterY_FP - Player center Y in FP
 * @param {number} vx_FP - Current player vx in FP
 * @param {number} vy_FP - Current player vy in FP
 * @param {number} originX_FP - Explosion center X in FP
 * @param {number} originY_FP - Explosion center Y in FP
 * @param {number} radius_FP - Explosion radius in FP
 * @param {number} sizeMultiplier_FP - Scaling factor (FP)
 * @returns {{vx: number, vy: number, affected: boolean}} New velocities
 */
export function calculateExplosionImpulse(
    playerCenterX_FP, playerCenterY_FP,
    vx_FP, vy_FP,
    originX_FP, originY_FP,
    radius_FP, sizeMultiplier_FP
) {
    const dx = playerCenterX_FP - originX_FP;
    const dy = playerCenterY_FP - originY_FP;

    // Squared distance in FP^2 domain
    const distSq = dx * dx + dy * dy;
    const radiusSq = radius_FP * radius_FP;
    const knockbackRangeSq = radiusSq * TILE_SIZE_SQ;

    if (distSq >= knockbackRangeSq || distSq <= 0) {
        return { vx: vx_FP, vy: vy_FP, affected: false };
    }

    // sqrt unavoidable, floor to maintain FP integer domain
    const dist = Math.floor(Math.sqrt(distSq));

    // Normalized direction in FP
    const dirX = Math.floor((dx * FP_ONE) / dist);
    const dirY = Math.floor((dy * FP_ONE) / dist);

    // Clamp distance for attenuation
    const clampedDist = Math.max(dist, TILE_SIZE_FP);

    // Energy calculation in FP
    const totalStrength_FP = Math.floor((KNOCKBACK_STRENGTH_FP * sizeMultiplier_FP) / FP_ONE);
    const knockbackRange_FP = Math.floor((radius_FP * TILE_SIZE_FP) / FP_ONE);
    const strengthSq_FP = Math.floor((totalStrength_FP * totalStrength_FP) / FP_ONE);
    const energyNumerator = strengthSq_FP * knockbackRange_FP;
    const energyDenom = clampedDist + KNOCKBACK_OFFSET_FP;
    const energy_FP = Math.floor(energyNumerator / energyDenom);

    // vDotN calculation in FP
    const vDotN_FP = Math.floor(((vx_FP * dirX) + (vy_FP * dirY)) / FP_ONE);

    // deltaV = -vDotN + sqrt(vDotN^2 + 2*energy)
    const vDotNSq_FP = Math.floor((vDotN_FP * vDotN_FP) / FP_ONE);
    const twoEnergy_FP = energy_FP * 2;
    const discriminant_FP = vDotNSq_FP + twoEnergy_FP;
    const sqrtTerm_FP = Math.floor(Math.sqrt(Math.max(0, discriminant_FP) * FP_ONE));
    const deltaV_FP = -vDotN_FP + sqrtTerm_FP;

    return {
        vx: vx_FP + Math.floor((dirX * deltaV_FP) / FP_ONE),
        vy: vy_FP + Math.floor((dirY * deltaV_FP) / FP_ONE),
        affected: true
    };
}
