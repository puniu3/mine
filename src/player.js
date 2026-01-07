/**
 * Player module
 * Refactored for Fixed Timestep Physics (720Hz)
 * All physics calculations use Q20.12 fixed-point arithmetic.
 * Floats appear only at rendering boundaries (getters/draw).
 */

import { isBlockSolid, isBlockBreakable, getBlockMaterialType, isNaturalBlock } from './utils.js';
import { sounds } from './audio.js';
import {
    TILE_SIZE, BLOCKS, BLOCK_PROPS,
    JUMP_FORCE, BIG_JUMP_FORCE, TERMINAL_VELOCITY,
    UPWARD_COLLISION_VELOCITY_THRESHOLD, MAX_NATURAL_BLOCK_ID,
    TNT_KNOCKBACK_STRENGTH, TNT_KNOCKBACK_DISTANCE_OFFSET,
    ACCELERATOR_ACCELERATION_AMOUNT,
    TICK_TIME_SCALE, GRAVITY_PER_TICK, PHYSICS_TPS, PHYSICS_DT
} from './constants.js';

// --- Q20.12 Fixed-point arithmetic ---
const FP_SHIFT = 12;
const FP_ONE = 1 << FP_SHIFT; // 4096
const toFP = (val) => Math.floor(val * FP_ONE);
const toFloat = (val) => val / FP_ONE;

// --- Pre-calculated FP Physics Constants (720Hz native) ---
// All physics factors converted to Q20.12 for pure integer arithmetic
// Using TICK_TIME_SCALE from constants.js (60 / PHYSICS_TPS)

// Friction: 0.8^timeScale per tick (multiply then shift)
const FRICTION_FACTOR_FP = Math.floor(Math.pow(0.8, TICK_TIME_SCALE) * FP_ONE);

// Gravity per tick in FP - using pre-calculated constant from constants.js
const GRAVITY_PER_TICK_FP = toFP(GRAVITY_PER_TICK);

// Board velocity decay per tick in FP (15 units per second / TPS)
const BOARD_DECAY_PER_TICK_FP = toFP(15 / PHYSICS_TPS);

// Time scale for position integration (velocity * timeScale)
const TICK_TIME_SCALE_FP = toFP(TICK_TIME_SCALE);

// Velocity constants in FP
const WALK_SPEED_FP = toFP(5);
const JUMP_FORCE_FP = toFP(JUMP_FORCE);
const BIG_JUMP_FORCE_FP = toFP(BIG_JUMP_FORCE);
const TERMINAL_VELOCITY_FP = toFP(TERMINAL_VELOCITY);
const UPWARD_COLLISION_THRESHOLD_FP = toFP(UPWARD_COLLISION_VELOCITY_THRESHOLD);
const VELOCITY_BOOST_ON_BREAK_FP = toFP(2);

// Collision epsilon in FP (~0.01 pixels)
const COLLISION_EPSILON_FP = 41; // 0.01 * 4096 ≈ 41

// Tile size in FP
const TILE_SIZE_FP = toFP(TILE_SIZE);

// Small offset for feet detection (0.1 pixels in FP)
const FEET_OFFSET_FP = toFP(0.1);

// Animation velocity threshold in FP
const ANIM_VX_THRESHOLD_FP = toFP(0.1);

// Accelerator force in FP
const ACCELERATOR_AMOUNT_FP = toFP(ACCELERATOR_ACCELERATION_AMOUNT);

// Jump pad force lookup table: BIG_JUMP_FORCE * sqrt(stackCount) in FP
// Pre-computed to eliminate runtime float calculations
const JUMP_PAD_FORCE_TABLE_FP = [];
for (let i = 0; i <= 16; i++) {
    JUMP_PAD_FORCE_TABLE_FP[i] = toFP(BIG_JUMP_FORCE * Math.sqrt(i));
}

// TNT explosion constants in FP
const KNOCKBACK_STRENGTH_FP = toFP(TNT_KNOCKBACK_STRENGTH);
const KNOCKBACK_OFFSET_FP = toFP(TNT_KNOCKBACK_DISTANCE_OFFSET * TILE_SIZE);
const TILE_SIZE_SQ = TILE_SIZE * TILE_SIZE;

export class Player {
    constructor(world, addToInventory = null) {
        this.world = world;
        this.addToInventory = addToInventory;

        // Internal fixed-point storage (Q20.12)
        this._x = 0;
        this._y = 0;
        this._vx = 0;
        this._vy = 0;
        this._boardVx = 0;

        // Dimensions in FP (Q20.12)
        this._width = toFP(0.6 * TILE_SIZE);   // 19.2 pixels
        this._height = toFP(1.8 * TILE_SIZE);  // 57.6 pixels

        // Initialize position in FP
        this._x = toFP((world.width / 2) * TILE_SIZE);
        this._y = 0;

        this.grounded = false;
        this.facingRight = true;
        this.animTimer = 0;

        this.findSpawnPoint();
    }

    // --- Float interface for external use (rendering, save/load) ---
    // Internal FP storage with external float getters/setters

    get x() { return toFloat(this._x); }
    set x(val) { this._x = toFP(val); }

    get y() { return toFloat(this._y); }
    set y(val) { this._y = toFP(val); }

    get vx() { return toFloat(this._vx); }
    set vx(val) { this._vx = toFP(val); }

    get vy() { return toFloat(this._vy); }
    set vy(val) { this._vy = toFP(val); }

    get boardVx() { return toFloat(this._boardVx); }
    set boardVx(val) { this._boardVx = toFP(val); }

    get width() { return toFloat(this._width); }
    get height() { return toFloat(this._height); }

    /**
     * Returns the grid boundaries of the player using strict integer arithmetic.
     * Pure FP calculation - no floats involved.
     */
    getGridRect() {
        const divisor = TILE_SIZE_FP;

        const startX = Math.floor(this._x / divisor);
        const startY = Math.floor(this._y / divisor);
        const endX = Math.floor((this._x + this._width) / divisor);
        const endY = Math.floor((this._y + this._height) / divisor);

        return { startX, endX, startY, endY };
    }

    /**
     * Applies acceleration force deterministically within the fixed-point domain.
     * Calculates sqrt(current_velocity^2 + ACCELERATOR_AMOUNT^2).
     * Uses pre-calculated FP constant for acceleration amount.
     * @param {number} direction - 1 for right, -1 for left
     */
    applyAcceleratorForce(direction) {
        const currentMagSq = this._boardVx * this._boardVx;
        const addMagSq = ACCELERATOR_AMOUNT_FP * ACCELERATOR_AMOUNT_FP;

        // sqrt is unavoidable, but inputs/outputs are deterministic FP values
        const newMag = Math.floor(Math.sqrt(currentMagSq + addMagSq));

        this._boardVx = (direction > 0) ? newMag : -newMag;
        this.facingRight = (direction > 0);
    }

    /**
     * Applies explosion knockback deterministically.
     * All inputs and calculations are in Fixed-Point format (Q20.12).
     * sqrt is unavoidable but all intermediate values remain in FP domain.
     * NOTE: Uses Math.floor division instead of >> to avoid 32-bit overflow.
     * @param {number} originX_FP - Explosion center X in fixed-point
     * @param {number} originY_FP - Explosion center Y in fixed-point
     * @param {number} radius_FP - Explosion radius in fixed-point
     * @param {number} sizeMultiplier_FP - Scaling factor based on cluster size (in fixed-point)
     */
    applyExplosionImpulse(originX_FP, originY_FP, radius_FP, sizeMultiplier_FP) {
        // Calculate player center in FP (pure integer arithmetic)
        const myCenterX = this._x + (this._width >> 1);
        const myCenterY = this._y + (this._height >> 1);

        const dx = myCenterX - originX_FP;
        const dy = myCenterY - originY_FP;

        // Squared distance in FP^2 domain
        // JS Numbers are 53-bit integers, safe for typical map sizes
        const distSq = dx * dx + dy * dy;
        const radiusSq = radius_FP * radius_FP;
        const knockbackRangeSq = radiusSq * TILE_SIZE_SQ;

        if (distSq < knockbackRangeSq && distSq > 0) {
            // sqrt unavoidable, floor to maintain FP integer domain
            const dist = Math.floor(Math.sqrt(distSq));

            // Normalized direction in FP
            const dirX = Math.floor((dx * FP_ONE) / dist);
            const dirY = Math.floor((dy * FP_ONE) / dist);

            // Clamp distance for attenuation (all FP)
            const clampedDist = Math.max(dist, TILE_SIZE_FP);

            // === Energy calculation in FP ===
            // NOTE: Use Math.floor division to avoid 32-bit overflow from >> operator
            // totalStrength = KNOCKBACK_STRENGTH * sizeMultiplier
            const totalStrength_FP = Math.floor((KNOCKBACK_STRENGTH_FP * sizeMultiplier_FP) / FP_ONE);

            // knockbackRange = radius * TILE_SIZE (in pixel space, FP)
            const knockbackRange_FP = Math.floor((radius_FP * TILE_SIZE_FP) / FP_ONE);

            // Energy = (strength^2 * range) / (clampedDist + offset)
            const strengthSq_FP = Math.floor((totalStrength_FP * totalStrength_FP) / FP_ONE);
            const energyNumerator = strengthSq_FP * knockbackRange_FP;
            const energyDenom = clampedDist + KNOCKBACK_OFFSET_FP;
            const energy_FP = Math.floor(energyNumerator / energyDenom);

            // === vDotN calculation in FP ===
            // vDotN = (vx * dirX + vy * dirY) in FP scale
            const vDotN_FP = Math.floor(((this._vx * dirX) + (this._vy * dirY)) / FP_ONE);

            // === deltaV calculation ===
            // deltaV = -vDotN + sqrt(vDotN^2 + 2*energy)
            const vDotNSq_FP = Math.floor((vDotN_FP * vDotN_FP) / FP_ONE);
            const twoEnergy_FP = energy_FP * 2;
            const discriminant_FP = vDotNSq_FP + twoEnergy_FP;

            // sqrt(discriminant * FP_ONE) gives result in FP scale
            const sqrtTerm_FP = Math.floor(Math.sqrt(Math.max(0, discriminant_FP) * FP_ONE));
            const deltaV_FP = -vDotN_FP + sqrtTerm_FP;

            // Apply impulse (all FP)
            this._vx += Math.floor((dirX * deltaV_FP) / FP_ONE);
            this._vy += Math.floor((dirY * deltaV_FP) / FP_ONE);

            this.grounded = false;
        }
    }

    findSpawnPoint() {
        // Use FP position directly divided by FP tile size to get grid coordinate
        const sx = Math.floor(this._x / TILE_SIZE_FP);

        // Start searching from the middle of the world height instead of the top.
        // This helps avoid spawning on floating islands which are typically generated in the sky.
        const searchStartY = Math.floor(this.world.height / 2);

        // Check the block at the search start height
        const startBlock = this.world.getBlock(sx, searchStartY);

        if (startBlock !== BLOCKS.AIR && startBlock !== BLOCKS.CLOUD) {
            // We started inside the terrain (mountain/ground).
            // Search upwards to find the surface.
            for (let y = searchStartY; y >= 0; y--) {
                const block = this.world.getBlock(sx, y);
                if (block === BLOCKS.AIR || block === BLOCKS.CLOUD) {
                    // Found air above ground.
                    // y is the first air block, so y+1 is the ground.
                    // We position the player slightly above the ground (y - 1).
                    this._y = (y - 1) * TILE_SIZE_FP;
                    return;
                }
            }
        } else {
            // We started in the air (valley/plain).
            // Search downwards to find the ground.
            for (let y = searchStartY; y < this.world.height; y++) {
                const block = this.world.getBlock(sx, y);
                if (block !== BLOCKS.AIR && block !== BLOCKS.CLOUD) {
                    // Found ground. Spawn above it.
                    this._y = (y - 2) * TILE_SIZE_FP;
                    return;
                }
            }
        }

        // Fallback: If no valid spot found, default to scanning from the top
        for (let y = 0; y < this.world.height; y++) {
             const block = this.world.getBlock(sx, y);
             if (block !== BLOCKS.AIR && block !== BLOCKS.CLOUD) {
                 this._y = (y - 2) * TILE_SIZE_FP;
                 break;
             }
        }
    }

    getCenterX() {
        return this.x + this.width / 2;
    }

    getCenterY() {
        return this.y + this.height / 2;
    }

    getRect() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }

    /**
     * Physics Tick - Pure FP arithmetic
     * Fixed Timestep (720Hz) - one tick per physics step
     * All calculations operate directly on _vx, _vy, _x, _y in Q20.12 format.
     * @param {Object} input - Input state
     */
    tick(input) {
        // 1. Horizontal Movement & Friction (FP)
        if (input.keys.left) {
            this._vx = -WALK_SPEED_FP;
            this.facingRight = false;
        } else if (input.keys.right) {
            this._vx = WALK_SPEED_FP;
            this.facingRight = true;
        } else {
            // Apply friction: vx = vx * FRICTION_FACTOR_FP / FP_ONE
            this._vx = (this._vx * FRICTION_FACTOR_FP) >> FP_SHIFT;
        }

        // 2. Check for interactions with the block below (Jump Pad)
        // Calculate feet position in FP, then convert to grid coordinates
        const feetCenterX_FP = this._x + (this._width >> 1);
        const feetY_FP = this._y + this._height + FEET_OFFSET_FP;
        const feetX = Math.floor(feetCenterX_FP / TILE_SIZE_FP);
        const feetY = Math.floor(feetY_FP / TILE_SIZE_FP);
        const blockBelow = this.world.getBlock(feetX, feetY);

        // Priority 1: Jump Pad Interaction
        if (blockBelow === BLOCKS.JUMP_PAD) {
            const stackCount = this.countVerticalJumpPads(feetX, feetY);
            // Jump force from pre-computed lookup table (pure FP)
            const clampedCount = Math.min(stackCount, 16);
            this._vy = -JUMP_PAD_FORCE_TABLE_FP[clampedCount];
            this.grounded = false;
            sounds.playBigJump();
        }
        // Priority 2: Normal Jump
        else if (input.keys.jump && this.grounded) {
            this._vy = -JUMP_FORCE_FP;
            this.grounded = false;
            sounds.playJump();
        }

        // 3. Board velocity decay (FP)
        if (this._boardVx !== 0) {
            if (this._boardVx > 0) {
                this._boardVx = Math.max(0, this._boardVx - BOARD_DECAY_PER_TICK_FP);
            } else {
                this._boardVx = Math.min(0, this._boardVx + BOARD_DECAY_PER_TICK_FP);
            }
        }

        // 4. Gravity Application (FP)
        if (this._vy < TERMINAL_VELOCITY_FP) {
            this._vy += GRAVITY_PER_TICK_FP;
        }

        // 5. Apply Movement (FP)
        // Position += velocity * timeScale (all in FP)
        const totalVx_FP = this._vx + this._boardVx;

        // Horizontal movement: x += totalVx * timeScale
        this._x += (totalVx_FP * TICK_TIME_SCALE_FP) >> FP_SHIFT;
        this.handleCollisions(true, totalVx_FP);

        // Vertical movement: y += vy * timeScale
        this._y += (this._vy * TICK_TIME_SCALE_FP) >> FP_SHIFT;
        this.handleCollisions(false, this._vy);

        // 6. World Wrapping
        this.wrapHorizontally();
        this.wrapVertically();

        // 7. Animation Timer (rendering only - float is acceptable)
        if (this._vx > ANIM_VX_THRESHOLD_FP || this._vx < -ANIM_VX_THRESHOLD_FP) {
            this.animTimer += PHYSICS_DT;
        }
    }

    countVerticalJumpPads(x, y) {
        let count = 0;
        let currentY = y;
        while (this.world.getBlock(x, currentY) === BLOCKS.JUMP_PAD) {
            count++;
            currentY--;
        }
        currentY = y + 1;
        while (this.world.getBlock(x, currentY) === BLOCKS.JUMP_PAD) {
            count++;
            currentY++;
        }
        return count;
    }

    /**
     * World wrapping - Horizontal
     * Operates directly on _x in Q20.12 format
     */
    wrapHorizontally() {
        const worldSpan_FP = this.world.width * TILE_SIZE_FP;
        while (this._x >= worldSpan_FP) {
            this._x -= worldSpan_FP;
        }
        while (this._x + this._width <= 0) {
            this._x += worldSpan_FP;
        }
    }

    /**
     * World wrapping - Vertical
     * Operates directly on _y in Q20.12 format
     */
    wrapVertically() {
        const worldSpan_FP = this.world.height * TILE_SIZE_FP;
        while (this._y >= worldSpan_FP) {
            this._y -= worldSpan_FP;
        }
        while (this._y + this._height <= 0) {
            this._y += worldSpan_FP;
        }
    }

    respawn() {
        this._y = 0;
        this._vy = 0;
        this._vx = 0;
        this._boardVx = 0;
        this._x = toFP((this.world.width / 2) * TILE_SIZE);
        this.findSpawnPoint();
    }

    /**
     * Collision handling - Pure FP arithmetic
     * All position calculations use Q20.12 format
     * @param {boolean} horizontal - True for horizontal collision, false for vertical
     * @param {number} velocity_FP - Current velocity in FP format
     */
    handleCollisions(horizontal, velocity_FP) {
        // Calculate grid bounds from FP position
        const startX = Math.floor(this._x / TILE_SIZE_FP);
        const endX = Math.floor((this._x + this._width) / TILE_SIZE_FP);
        const startY = Math.floor(this._y / TILE_SIZE_FP);
        const endY = Math.floor((this._y + this._height) / TILE_SIZE_FP);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const block = this.world.getBlock(x, y);
                if (isBlockSolid(block, BLOCK_PROPS)) {
                    if (horizontal) {
                        if (velocity_FP > 0) {
                            // Moving right - push left of block
                            this._x = x * TILE_SIZE_FP - this._width - COLLISION_EPSILON_FP;
                        } else if (velocity_FP < 0) {
                            // Moving left - push right of block
                            this._x = (x + 1) * TILE_SIZE_FP + COLLISION_EPSILON_FP;
                        }
                        this._vx = 0;
                        this._boardVx = 0;
                    } else {
                        if (this._vy > 0) {
                            // Moving down - land on block
                            this._y = y * TILE_SIZE_FP - this._height - COLLISION_EPSILON_FP;
                            this.grounded = true;
                            this._vy = 0;
                        } else if (this._vy < 0) {
                            // Moving up - hit ceiling
                            this._y = (y + 1) * TILE_SIZE_FP + COLLISION_EPSILON_FP;

                            // Block breaking from below
                            if (this._vy < UPWARD_COLLISION_THRESHOLD_FP &&
                                isBlockBreakable(block, BLOCK_PROPS) &&
                                isNaturalBlock(block, MAX_NATURAL_BLOCK_ID)) {
                                if (this.addToInventory) {
                                    this.addToInventory(block);
                                }
                                sounds.playDig(getBlockMaterialType(block, BLOCK_PROPS));
                                this.world.setBlock(x, y, BLOCKS.AIR);
                                this._vy += VELOCITY_BOOST_ON_BREAK_FP;
                                return;
                            }

                            // Bounce off jump pad from below
                            if (block === BLOCKS.JUMP_PAD) {
                                const stackCount = this.countVerticalJumpPads(x, y);
                                // Bounce force from pre-computed lookup table (pure FP)
                                const clampedCount = Math.min(stackCount, 16);
                                this._vy = JUMP_PAD_FORCE_TABLE_FP[clampedCount];
                                sounds.playBigJump();
                            } else {
                                this._vy = 0;
                            }
                        }
                        return;
                    }
                }
            }
        }
        if (!horizontal) this.grounded = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
        const swing = Math.sin(this.animTimer * 0.01) * 5;
        ctx.fillStyle = '#f8b090';
        ctx.fillRect(4, 0, 12, 12);
        ctx.fillStyle = '#00bcd4';
        ctx.fillRect(4, 12, 12, 18);
        ctx.fillStyle = '#3f51b5';
        ctx.fillRect(4, 30, 5, 18 + (Math.abs(this.vx) > 0.1 ? swing : 0));
        ctx.fillRect(11, 30, 5, 18 - (Math.abs(this.vx) > 0.1 ? swing : 0));
        ctx.fillStyle = '#f8b090';
        if (this.facingRight) ctx.fillRect(10, 12, 6, 18 + swing);
        else ctx.fillRect(4, 12, -6, 18 + swing);
        ctx.restore();
    }
}
