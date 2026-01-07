/**
 * Player module
 * Refactored for Fixed Timestep Physics (720Hz)
 */

import { clamp, isBlockSolid, isBlockBreakable, getBlockMaterialType, isNaturalBlock } from './utils.js';
import { sounds } from './audio.js';
import {
    TILE_SIZE, GRAVITY, JUMP_FORCE, BIG_JUMP_FORCE, BLOCKS, BLOCK_PROPS, TERMINAL_VELOCITY,
    UPWARD_COLLISION_VELOCITY_THRESHOLD, MAX_NATURAL_BLOCK_ID,
    TNT_KNOCKBACK_STRENGTH, TNT_KNOCKBACK_DISTANCE_OFFSET
} from './constants.js';

// --- Physics Constants (720Hz Fixed Step) ---
const PHYSICS_TPS = 720;
const FIXED_DT_MS = 1000 / PHYSICS_TPS; // approx 1.38ms
const BASE_FPS = 60;

// The physics simulation runs at 720Hz, but values (Gravity, Speed) are tuned for 60Hz.
// We scale the delta-time relative to a 60Hz frame.
// TIME_SCALE ~= 0.08333
const FIXED_TIME_SCALE = FIXED_DT_MS / (1000 / BASE_FPS);

// Pre-calculated Physics Factors per Tick
// Friction: 0.8 per 60Hz frame -> converted to per-tick factor
const FRICTION_FACTOR = Math.pow(0.8, FIXED_TIME_SCALE);
const GRAVITY_PER_TICK = GRAVITY * FIXED_TIME_SCALE;
const BOARD_DECAY_PER_TICK = 15 * (FIXED_DT_MS / 1000);

// Q20.12 Fixed-point arithmetic constants
const FP_SHIFT = 12;
const FP_ONE = 1 << FP_SHIFT;
const toFP = (val) => Math.floor(val * FP_ONE);
const toFloat = (val) => val / FP_ONE;

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

        this.width = 0.6 * TILE_SIZE;
        this.height = 1.8 * TILE_SIZE;
        
        // Initialize position using setters
        this.x = (world.width / 2) * TILE_SIZE;
        this.y = 0;
        
        this.grounded = false;
        this.facingRight = true;
        this.animTimer = 0;

        this.findSpawnPoint();
    }

    // Shadowing properties: Internal fixed-point storage with external floating-point interface

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

    /**
     * Returns the grid boundaries of the player using strict integer arithmetic on internal state.
     * This avoids floating point errors when determining which blocks the player is touching.
     * TILE_SIZE is 32.
     */
    getGridRect() {
        const divisor = TILE_SIZE * FP_ONE;
        
        const startX = Math.floor(this._x / divisor);
        const startY = Math.floor(this._y / divisor);
        const endX = Math.floor((this._x + this.width * FP_ONE) / divisor);
        const endY = Math.floor((this._y + this.height * FP_ONE) / divisor);

        return { startX, endX, startY, endY };
    }

    /**
     * Applies acceleration force deterministically within the fixed-point domain.
     * Calculates sqrt(current_velocity^2 + added_acceleration^2).
     * @param {number} direction - 1 for right, -1 for left
     * @param {number} amount - Acceleration amount (float)
     */
    applyAcceleratorForce(direction, amount) {
        const fpAmount = toFP(amount);
        
        const currentMagSq = this._boardVx * this._boardVx;
        const addMagSq = fpAmount * fpAmount;
        
        const newMag = Math.floor(Math.sqrt(currentMagSq + addMagSq));

        this._boardVx = (direction > 0) ? newMag : -newMag;
        this.facingRight = (direction > 0);
    }

    /**
     * Applies explosion knockback deterministically.
     * All inputs are expected to be in Fixed-Point format (Q20.12).
     * @param {number} originX_FP - Explosion center X in fixed-point
     * @param {number} originY_FP - Explosion center Y in fixed-point
     * @param {number} radius_FP - Explosion radius in fixed-point
     * @param {number} sizeMultiplier_FP - Scaling factor based on cluster size (in fixed-point)
     */
    applyExplosionImpulse(originX_FP, originY_FP, radius_FP, sizeMultiplier_FP) {
        // Calculate player center in FP
        const myCenterX = this._x + toFP(this.width / 2);
        const myCenterY = this._y + toFP(this.height / 2);

        const dx = myCenterX - originX_FP;
        const dy = myCenterY - originY_FP;
        
        // Squared distance in FP domain (conceptually Dist^2 * FP_ONE^2)
        // We use floating point Math.sqrt here but floor the result immediately 
        // to stay within integer domain for the final physics application.
        // Javascript Numbers are 53-bit integers, so dx*dx is safe for typical map sizes.
        const distSq = dx * dx + dy * dy;
        const radiusSq = radius_FP * radius_FP;
        const knockbackRangeSq = radiusSq * (TILE_SIZE * TILE_SIZE); // radius is in blocks, TILE_SIZE scales it

        if (distSq < knockbackRangeSq && distSq > 0) {
            const dist = Math.floor(Math.sqrt(distSq));
            
            // Normalized direction * FP_ONE
            const dirX = Math.floor((dx * FP_ONE) / dist);
            const dirY = Math.floor((dy * FP_ONE) / dist);

            // Clamped distance for attenuation calc
            const minDist = TILE_SIZE * FP_ONE;
            const clampedDist = Math.max(dist, minDist);

            // Calculate Energy/Strength
            // Formula: Strength scales with sqrt(count) which is sizeMultiplier.
            // We do the heavy math in float for precision but snap to FP.
            
            // Convert back to float temporarily for the complex kinetic formula, 
            // but ensure inputs are the deterministic FP values we calculated.
            const f_totalStrength = TNT_KNOCKBACK_STRENGTH * (sizeMultiplier_FP / FP_ONE);
            const f_knockbackRange = (radius_FP / FP_ONE) * TILE_SIZE;
            const f_clampedDist = clampedDist / FP_ONE;
            const f_offset = TNT_KNOCKBACK_DISTANCE_OFFSET * TILE_SIZE;
            
            const explosionEnergy = (f_totalStrength ** 2 * f_knockbackRange) / (f_clampedDist + f_offset);

            // Current velocity projected onto explosion normal
            const vDotN = (this._vx * dirX + this._vy * dirY) / (FP_ONE * FP_ONE); // Result is float
            
            // Kinetic Energy Formula: deltaV = -vDotN + sqrt(vDotN^2 + 2 * Energy)
            const deltaV_Float = -vDotN + Math.sqrt(Math.max(0, vDotN * vDotN + 2 * explosionEnergy));
            
            // Apply impulse in fixed-point
            const deltaV_FP = toFP(deltaV_Float);
            
            this._vx += Math.floor((dirX * deltaV_FP) / FP_ONE);
            this._vy += Math.floor((dirY * deltaV_FP) / FP_ONE);
            
            this.grounded = false;
        }
    }

    findSpawnPoint() {
        const sx = Math.floor(this.x / TILE_SIZE);
        
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
                    this.y = (y - 1) * TILE_SIZE; 
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
                    this.y = (y - 2) * TILE_SIZE;
                    return;
                }
            }
        }

        // Fallback: If no valid spot found, default to scanning from the top
        for (let y = 0; y < this.world.height; y++) {
             const block = this.world.getBlock(sx, y);
             if (block !== BLOCKS.AIR && block !== BLOCKS.CLOUD) {
                 this.y = (y - 2) * TILE_SIZE;
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
     * Physics Update Loop
     * Now optimized for Fixed Timestep (ignores variable dt, assumes FIXED_DT_MS)
     * @param {Object} input - Input state
     * @param {number} dt - (Unused in logic, assumed to be ~1.38ms)
     */
    update(input, dt) {
        // 1. Horizontal Movement & Friction
        if (input.keys.left) {
            this.vx = -5;
            this.facingRight = false;
        } else if (input.keys.right) {
            this.vx = 5;
            this.facingRight = true;
        } else {
            // Apply constant friction per tick
            this.vx *= FRICTION_FACTOR;
        }

        // 2. Check for interactions with the block below (Jump Pad)
        const feetX = Math.floor(this.getCenterX() / TILE_SIZE);
        const feetY = Math.floor((this.y + this.height + 0.1) / TILE_SIZE);
        const blockBelow = this.world.getBlock(feetX, feetY);

        // Priority 1: Jump Pad Interaction
        // If standing on a jump pad, it overrides normal jumping behavior
        if (blockBelow === BLOCKS.JUMP_PAD) {
            const stackCount = this.countVerticalJumpPads(feetX, feetY);
            this.vy = -BIG_JUMP_FORCE * Math.pow(stackCount, 0.5);
            this.grounded = false;
            sounds.playBigJump();
        } 
        // Priority 2: Normal Jump
        // Only trigger normal jump if NOT on a jump pad
        else if (input.keys.jump && this.grounded) {
            this.vy = -JUMP_FORCE;
            this.grounded = false;
            sounds.playJump();
        }

        // 3. Board velocity decay
        if (this._boardVx !== 0) {
            let currentBoardVx = this.boardVx; // Convert to float for calculation
            if (currentBoardVx > 0) {
                this.boardVx = Math.max(0, currentBoardVx - BOARD_DECAY_PER_TICK);
            } else {
                this.boardVx = Math.min(0, currentBoardVx + BOARD_DECAY_PER_TICK);
            }
        }

        // 4. Gravity Application
        // Clamp to terminal velocity
        let nextVy = this.vy + GRAVITY_PER_TICK;
        if (nextVy > TERMINAL_VELOCITY) nextVy = TERMINAL_VELOCITY;
        this.vy = nextVy;

        const totalVx = this.vx + this.boardVx;
        
        // 5. Apply Movement (scaled by Time Scale)
        this.x += totalVx * FIXED_TIME_SCALE;
        this.handleCollisions(true, totalVx);
        
        this.y += this.vy * FIXED_TIME_SCALE;
        this.handleCollisions(false);

        // 6. World Wrapping
        this.wrapHorizontally();
        this.wrapVertically();

        // 7. Animation Timer
        // Use fixed time step for consistent animation speed regardless of framerate
        if (Math.abs(totalVx) > 0.1) {
            this.animTimer += FIXED_DT_MS;
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

    wrapHorizontally() {
        const worldSpan = this.world.width * TILE_SIZE;
        let currentX = this.x;
        while (currentX >= worldSpan) {
            currentX -= worldSpan;
        }
        while (currentX + this.width <= 0) {
            currentX += worldSpan;
        }
        this.x = currentX;
    }

    wrapVertically() {
        const worldSpan = this.world.height * TILE_SIZE;
        let currentY = this.y;
        while (currentY >= worldSpan) {
            currentY -= worldSpan;
        }
        while (currentY + this.height <= 0) {
            currentY += worldSpan;
        }
        this.y = currentY;
    }

    respawn() {
        this.y = 0;
        this.vy = 0;
        this.vx = 0;
        this.boardVx = 0;
        this.x = (this.world.width / 2) * TILE_SIZE;
        this.findSpawnPoint();
    }

    handleCollisions(horizontal, vx = this.vx) {
        const currX = this.x;
        const currY = this.y;
        
        const startX = Math.floor(currX / TILE_SIZE);
        const endX = Math.floor((currX + this.width) / TILE_SIZE);
        const startY = Math.floor(currY / TILE_SIZE);
        const endY = Math.floor((currY + this.height) / TILE_SIZE);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const block = this.world.getBlock(x, y);
                if (isBlockSolid(block, BLOCK_PROPS)) {
                    if (horizontal) {
                        if (vx > 0) this.x = x * TILE_SIZE - this.width - 0.01;
                        else if (vx < 0) this.x = (x + 1) * TILE_SIZE + 0.01;
                        this.vx = 0;
                        this.boardVx = 0;
                    } else {
                        if (this.vy > 0) {
                            this.y = y * TILE_SIZE - this.height - 0.01;
                            this.grounded = true;
                            this.vy = 0;
                        } else if (this.vy < 0) {
                            this.y = (y + 1) * TILE_SIZE + 0.01;

                            if (this.vy < UPWARD_COLLISION_VELOCITY_THRESHOLD &&
                                isBlockBreakable(block, BLOCK_PROPS) &&
                                isNaturalBlock(block, MAX_NATURAL_BLOCK_ID)) {
                                if (this.addToInventory) {
                                    this.addToInventory(block);
                                }
                                sounds.playDig(getBlockMaterialType(block, BLOCK_PROPS));
                                this.world.setBlock(x, y, BLOCKS.AIR);
                                this.vy += 2;
                                return;
                            }

                            if (block === BLOCKS.JUMP_PAD) {
                                const stackCount = this.countVerticalJumpPads(x, y);
                                this.vy = BIG_JUMP_FORCE * Math.pow(stackCount, 0.5);
                                sounds.playBigJump();
                            } else {
                                this.vy = 0;
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
