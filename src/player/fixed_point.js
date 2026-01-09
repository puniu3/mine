/**
 * Q20.12 Fixed-Point Arithmetic System for Player Physics
 *
 * All physics calculations use fixed-point arithmetic to ensure
 * deterministic behavior across different platforms and frame rates.
 *
 * This module is completely independent and exports only constants
 * and conversion functions.
 */

import {
    TILE_SIZE,
    JUMP_FORCE, BIG_JUMP_FORCE, TERMINAL_VELOCITY,
    UPWARD_COLLISION_VELOCITY_THRESHOLD,
    TNT_KNOCKBACK_STRENGTH, TNT_KNOCKBACK_DISTANCE_OFFSET,
    ACCELERATOR_ACCELERATION_AMOUNT,
    TICK_TIME_SCALE, GRAVITY_PER_TICK, GRAVITY_LOW_FACTOR, PHYSICS_TPS,
    WATER_GRAVITY_FACTOR, WATER_JUMP_FORCE, WATER_JUMP_VY_THRESHOLD
} from '../constants.js';

// --- Q20.12 Fixed-point core ---
export const FP_SHIFT = 12;
export const FP_ONE = 1 << FP_SHIFT; // 4096

export const toFP = (val) => Math.floor(val * FP_ONE);
export const toFloat = (val) => val / FP_ONE;

// --- Pre-calculated FP Physics Constants (720Hz native) ---

// Friction: 0.8^timeScale per tick
export const FRICTION_FACTOR_FP = Math.floor(Math.pow(0.8, TICK_TIME_SCALE) * FP_ONE);

// Gravity per tick in FP
export const GRAVITY_PER_TICK_FP = toFP(GRAVITY_PER_TICK);

// Board velocity decay per tick in FP (15 units per second / TPS)
export const BOARD_DECAY_PER_TICK_FP = toFP(15 / PHYSICS_TPS);

// Time scale for position integration
export const TICK_TIME_SCALE_FP = toFP(TICK_TIME_SCALE);

// Velocity constants in FP
export const WALK_SPEED_FP = toFP(5);
export const JUMP_FORCE_FP = toFP(JUMP_FORCE);
export const BIG_JUMP_FORCE_FP = toFP(BIG_JUMP_FORCE);
export const WATER_JUMP_FORCE_FP = toFP(WATER_JUMP_FORCE);
export const WATER_JUMP_VY_THRESHOLD_FP = toFP(WATER_JUMP_VY_THRESHOLD);
export const WATER_GRAVITY_FACTOR_FP = toFP(WATER_GRAVITY_FACTOR);
export const TERMINAL_VELOCITY_FP = toFP(TERMINAL_VELOCITY);
export const UPWARD_COLLISION_THRESHOLD_FP = toFP(UPWARD_COLLISION_VELOCITY_THRESHOLD);
export const VELOCITY_BOOST_ON_BREAK_FP = toFP(2);

// Collision epsilon in FP (~0.01 pixels)
export const COLLISION_EPSILON_FP = 41; // 0.01 * 4096 ≈ 41

// Tile size in FP
export const TILE_SIZE_FP = toFP(TILE_SIZE);

// Small offset for feet detection (0.1 pixels in FP)
export const FEET_OFFSET_FP = toFP(0.1);

// Head clearance required for underwater jump (0.2 tiles in FP)
export const HEAD_CLEARANCE_FP = toFP(0.2 * TILE_SIZE);

// Animation velocity threshold in FP
export const ANIM_VX_THRESHOLD_FP = toFP(0.1);

// Accelerator force in FP
export const ACCELERATOR_AMOUNT_FP = toFP(ACCELERATOR_ACCELERATION_AMOUNT);

// TNT explosion constants in FP
export const KNOCKBACK_STRENGTH_FP = toFP(TNT_KNOCKBACK_STRENGTH);
export const KNOCKBACK_OFFSET_FP = toFP(TNT_KNOCKBACK_DISTANCE_OFFSET * TILE_SIZE);
export const TILE_SIZE_SQ = TILE_SIZE * TILE_SIZE;

// Mizukiri (Water Skipping) Constants
export const SKIP_SPEED_THRESHOLD_FP = WALK_SPEED_FP * 2;
// tan(15 degrees) ≈ 0.267949 -> 0.267949 * 4096 ≈ 1097
export const TAN_15_DEG_FP = 1097;

// Water movement scale (0.6 in FP)
export const WATER_SCALE_FP = 2458; // 0.6 * 4096

// Low gravity factor (exported for physics module)
export const GRAVITY_LOW_FACTOR_VAL = GRAVITY_LOW_FACTOR;

// Jump pad force lookup table: BIG_JUMP_FORCE * sqrt(stackCount) in FP
// Pre-computed to eliminate runtime float calculations
export const JUMP_PAD_FORCE_TABLE_FP = [];
for (let i = 0; i <= 128; i++) {
    JUMP_PAD_FORCE_TABLE_FP[i] = toFP(BIG_JUMP_FORCE * Math.sqrt(i));
}
