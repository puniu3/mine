/**
 * Player Module - Orchestrator
 *
 * Thin wrapper that coordinates all player subsystems.
 * Maintains state and delegates to specialized modules.
 */

import { TILE_SIZE, BLOCKS, PHYSICS_DT } from '../constants.js';
import { createBubble } from '../fireworks.js';

// Fixed-point system
import {
    toFP, toFloat, FP_SHIFT,
    TILE_SIZE_FP,
    TICK_TIME_SCALE_FP,
    WATER_SCALE_FP,
    ANIM_VX_THRESHOLD_FP,
    ACCELERATOR_AMOUNT_FP,
    HEAD_CLEARANCE_FP
} from './fixed_point.js';

// Physics
import { applyFriction, applyBoardDecay, applyGravity, calculateExplosionImpulse } from './physics.js';

// Collision
import { handleCollisions, checkHeadClearance } from './collision.js';

// Movement
import { processHorizontalInput, processMizukiri, processJumpPad, processJump } from './movement.js';

// Rendering
import { drawPlayer } from './render.js';

export class Player {
    constructor(world, addToInventory = null, onTNTJumpPad = null) {
        this.world = world;
        this.addToInventory = addToInventory;
        this.onTNTJumpPad = onTNTJumpPad;

        // Internal fixed-point storage (Q20.12)
        this._x = 0;
        this._y = 0;
        this._vx = 0;
        this._vy = 0;
        this._boardVx = 0;

        // Dimensions in FP
        this._width = toFP(0.6 * TILE_SIZE);   // 19.2 pixels
        this._height = toFP(1.8 * TILE_SIZE);  // 57.6 pixels

        // Initialize position
        this._x = toFP((world.width / 2) * TILE_SIZE);
        this._y = 0;

        this.grounded = false;
        this.facingRight = true;
        this.animTimer = 0;

        // Physics States
        this.fastballActive = false;
        this.lowGravityActive = false;
        this.lowFrictionActive = false;

        // Bubble breath timer
        this.bubbleTimer = 0;

        this.findSpawnPoint();
    }

    // --- Float interface for external use ---
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

    getGridRect() {
        const startX = Math.floor(this._x / TILE_SIZE_FP);
        const startY = Math.floor(this._y / TILE_SIZE_FP);
        const endX = Math.floor((this._x + this._width) / TILE_SIZE_FP);
        const endY = Math.floor((this._y + this._height) / TILE_SIZE_FP);
        return { startX, endX, startY, endY };
    }

    getCenterX() { return this.x + this.width / 2; }
    getCenterY() { return this.y + this.height / 2; }
    getRect() { return { x: this.x, y: this.y, w: this.width, h: this.height }; }

    applyAcceleratorForce(direction) {
        const currentMagSq = this._boardVx * this._boardVx;
        const addMagSq = ACCELERATOR_AMOUNT_FP * ACCELERATOR_AMOUNT_FP;
        const newMag = Math.floor(Math.sqrt(currentMagSq + addMagSq));
        this._boardVx = (direction > 0) ? newMag : -newMag;
        this.facingRight = (direction > 0);
    }

    activateFastballMode() {
        this.fastballActive = true;
    }

    activateLowFrictionMode() {
        this.lowFrictionActive = true;
    }

    applyExplosionImpulse(originX_FP, originY_FP, radius_FP, sizeMultiplier_FP) {
        const myCenterX = this._x + (this._width >> 1);
        const myCenterY = this._y + (this._height >> 1);

        const result = calculateExplosionImpulse(
            myCenterX, myCenterY,
            this._vx, this._vy,
            originX_FP, originY_FP,
            radius_FP, sizeMultiplier_FP
        );

        if (result.affected) {
            this._vx = result.vx;
            this._vy = result.vy;
            this.grounded = false;
        }
    }

    findSpawnPoint() {
        const sx = Math.floor(this._x / TILE_SIZE_FP);
        const searchStartY = Math.floor(this.world.height * 0.4);
        const startBlock = this.world.getBlock(sx, searchStartY);

        if (startBlock !== BLOCKS.AIR && startBlock !== BLOCKS.CLOUD) {
            // Inside terrain - search upward
            for (let y = searchStartY; y >= 0; y--) {
                const block = this.world.getBlock(sx, y);
                if (block === BLOCKS.AIR || block === BLOCKS.CLOUD) {
                    this._y = (y - 1) * TILE_SIZE_FP;
                    return;
                }
            }
        } else {
            // In air - search downward
            for (let y = searchStartY; y < this.world.height; y++) {
                const block = this.world.getBlock(sx, y);
                if (block !== BLOCKS.AIR && block !== BLOCKS.CLOUD) {
                    this._y = (y - 2) * TILE_SIZE_FP;
                    return;
                }
            }
        }

        // Fallback
        for (let y = 0; y < this.world.height; y++) {
            const block = this.world.getBlock(sx, y);
            if (block !== BLOCKS.AIR && block !== BLOCKS.CLOUD) {
                this._y = (y - 2) * TILE_SIZE_FP;
                break;
            }
        }
    }

    respawn() {
        this._y = 0;
        this._vy = 0;
        this._vx = 0;
        this._boardVx = 0;
        this._x = toFP((this.world.width / 2) * TILE_SIZE);
        this.findSpawnPoint();
        this.fastballActive = false;
        this.lowGravityActive = false;
        this.lowFrictionActive = false;
    }

    /**
     * Physics Tick - Fixed Timestep (720Hz)
     */
    tick(input) {
        // Check if player center is in water
        const centerX_FP = this._x + (this._width >> 1);
        const centerY_FP = this._y + (this._height >> 1);
        const centerGridX = Math.floor(centerX_FP / TILE_SIZE_FP);
        const centerGridY = Math.floor(centerY_FP / TILE_SIZE_FP);
        const isInWater = this.world.getBlock(centerGridX, centerGridY) === BLOCKS.WATER;

        // 1. Horizontal Movement & Friction
        const moveResult = processHorizontalInput(input, this._vx, this.facingRight, applyFriction);
        this._vx = moveResult.vx;
        this.facingRight = moveResult.facingRight;

        // 1b. Mizukiri (Water Skipping)
        const skipVy = processMizukiri(
            this._x, this._y, this._width, this._height,
            this._vx, this._vy, this._boardVx, this.world
        );
        if (skipVy !== null) {
            this._vy = skipVy;
        }

        // 2. Jump Pad Interaction (Priority 1)
        const jumpPadResult = processJumpPad(
            this._x, this._y, this._width, this._height,
            this.world, this.onTNTJumpPad
        );

        if (jumpPadResult) {
            this._vy = jumpPadResult.vy;
            this.grounded = false;
            if (jumpPadResult.lowGravityActive) {
                this.lowGravityActive = true;
            }
            if (jumpPadResult.tntTriggered && this.onTNTJumpPad) {
                this.onTNTJumpPad(jumpPadResult.feetX, jumpPadResult.tntPositions);
            }
        } else {
            // Normal Jump (Priority 2)
            const jumpResult = processJump(
                input, this.grounded, isInWater, this._vy,
                this._x, this._y, this._width, HEAD_CLEARANCE_FP,
                this.world, checkHeadClearance
            );
            if (jumpResult) {
                this._vy = jumpResult.vy;
                this.grounded = jumpResult.grounded;
            }
        }

        // 3. Board velocity decay (with low friction mode)
        const decayResult = applyBoardDecay(this._boardVx, this.lowFrictionActive);
        this._boardVx = decayResult.boardVx;
        this.lowFrictionActive = decayResult.lowFrictionActive;

        // 4. Gravity
        const gravityResult = applyGravity(
            this._vy, isInWater,
            this.lowGravityActive, this.fastballActive,
            this._boardVx
        );
        this._vy = gravityResult.vy;
        this.fastballActive = gravityResult.fastballActive;

        // 5. Apply Movement
        let timeScale_FP = TICK_TIME_SCALE_FP;
        if (isInWater) {
            timeScale_FP = (timeScale_FP * WATER_SCALE_FP) >> FP_SHIFT;
        }

        const totalVx_FP = this._vx + this._boardVx;

        // Horizontal movement
        this._x += (totalVx_FP * timeScale_FP) >> FP_SHIFT;
        const hResult = handleCollisions(
            { _x: this._x, _y: this._y, _vx: this._vx, _vy: this._vy, _width: this._width, _height: this._height, _boardVx: this._boardVx, lowGravityActive: this.lowGravityActive },
            this.world, true, totalVx_FP, this.addToInventory
        );
        this._x = hResult._x;
        this._vx = hResult._vx;
        this._boardVx = hResult._boardVx;

        // Vertical movement
        this._y += (this._vy * timeScale_FP) >> FP_SHIFT;
        const vResult = handleCollisions(
            { _x: this._x, _y: this._y, _vx: this._vx, _vy: this._vy, _width: this._width, _height: this._height, _boardVx: this._boardVx, lowGravityActive: this.lowGravityActive },
            this.world, false, this._vy, this.addToInventory
        );
        this._y = vResult._y;
        this._vy = vResult._vy;
        this.grounded = vResult.grounded;
        this.lowGravityActive = vResult.lowGravityActive;

        // 6. World Wrapping
        this.wrapHorizontally();
        this.wrapVertically();

        // 7. Animation Timer
        if (this._vx > ANIM_VX_THRESHOLD_FP || this._vx < -ANIM_VX_THRESHOLD_FP) {
            this.animTimer += PHYSICS_DT;
        }

        // 8. Bubble Breath Logic
        const headX = this.getCenterX();
        const headY = this.y + 4;
        const headGridX = Math.floor(headX / TILE_SIZE);
        const headGridY = Math.floor(headY / TILE_SIZE);

        if (this.world.getBlock(headGridX, headGridY) === BLOCKS.WATER) {
            this.bubbleTimer++;
            if (this.bubbleTimer > 40) {
                let distanceToSurface = TILE_SIZE;
                for (let checkY = headGridY - 1; checkY >= 0; checkY--) {
                    if (this.world.getBlock(headGridX, checkY) !== BLOCKS.WATER) {
                        distanceToSurface = headY - (checkY + 1) * TILE_SIZE;
                        break;
                    }
                }
                createBubble(headX, headY, Math.max(TILE_SIZE, distanceToSurface));
                this.bubbleTimer = Math.floor(Math.random() * -30);
            }
        } else {
            this.bubbleTimer = 0;
        }
    }

    wrapHorizontally() {
        const worldSpan_FP = this.world.width * TILE_SIZE_FP;
        while (this._x >= worldSpan_FP) this._x -= worldSpan_FP;
        while (this._x + this._width <= 0) this._x += worldSpan_FP;
    }

    wrapVertically() {
        const worldSpan_FP = this.world.height * TILE_SIZE_FP;
        while (this._y >= worldSpan_FP) this._y -= worldSpan_FP;
        while (this._y + this._height <= 0) this._y += worldSpan_FP;
    }

    draw(ctx) {
        drawPlayer(ctx, this.x, this.y, this.vx, this.facingRight, this.animTimer);
    }
}
