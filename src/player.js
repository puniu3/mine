/**
 * Player module
 */

import { clamp, isBlockSolid } from './utils.js';
import { sounds } from './audio.js';
import {
    TILE_SIZE, GRAVITY, JUMP_FORCE, BLOCKS, BLOCK_PROPS, TERMINAL_VELOCITY
} from './constants.js';

export class Player {
    constructor(world) {
        this.world = world;
        this.width = 0.6 * TILE_SIZE;
        this.height = 1.8 * TILE_SIZE;
        this.x = (world.width / 2) * TILE_SIZE;
        this.y = 0;
        this.vx = 0; // Input-derived velocity
        this.vy = 0;
        this.boardVx = 0; // Accelerator board velocity
        this.grounded = false;
        this.facingRight = true;
        this.animTimer = 0;

        this.findSpawnPoint();
    }

    findSpawnPoint() {
        const sx = Math.floor(this.x / TILE_SIZE);
        for (let y = 0; y < this.world.height; y++) {
            const block = this.world.getBlock(sx, y);
            // Skip air and cloud blocks to ensure spawning on solid ground
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

    checkAcceleratorOverlap() {
        const startX = Math.floor(this.x / TILE_SIZE);
        const endX = Math.floor((this.x + this.width) / TILE_SIZE);
        const startY = Math.floor(this.y / TILE_SIZE);
        const endY = Math.floor((this.y + this.height) / TILE_SIZE);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const block = this.world.getBlock(x, y);
                if (block === BLOCKS.ACCELERATOR_LEFT) {
                    this.boardVx += -15;
                    this.facingRight = false;
                    return;
                } else if (block === BLOCKS.ACCELERATOR_RIGHT) {
                    this.boardVx += 15;
                    this.facingRight = true;
                    return;
                }
            }
        }
    }

    update(input, dt) {
        // Time Scale: normalize physics to 60 FPS target
        const timeScale = dt / (1000 / 60);

        if (input.keys.left) {
            this.vx = -5;
            this.facingRight = false;
        } else if (input.keys.right) {
            this.vx = 5;
            this.facingRight = true;
        } else {
            // Apply friction with time scaling (exponential decay)
            this.vx *= Math.pow(0.8, timeScale);
        }

        if (input.keys.jump && this.grounded) {
            this.vy = -JUMP_FORCE;
            this.grounded = false;
            sounds.playJump();
        }

        // Jump Pad Check
        // Check block directly under feet center
        const feetX = Math.floor(this.getCenterX() / TILE_SIZE);
        const feetY = Math.floor((this.y + this.height + 0.1) / TILE_SIZE);
        if (this.world.getBlock(feetX, feetY) === BLOCKS.JUMP_PAD) {
             this.vy = -JUMP_FORCE * 1.8;
             this.grounded = false;
             sounds.playBigJump();
        }

        // Jump Pad Check from below
        // Check block directly above head center when moving upward
        const headX = Math.floor(this.getCenterX() / TILE_SIZE);
        const headY = Math.floor((this.y - 0.1) / TILE_SIZE);
        if (this.vy < 0 && this.world.getBlock(headX, headY) === BLOCKS.JUMP_PAD) {
            this.vy = JUMP_FORCE * 1.8;
            sounds.playBigJump();
        }

        // Accelerator Check
        // Check tiles player overlaps with
        this.checkAcceleratorOverlap();

        // Board velocity decay (linear decay to 0 over 1 second)
        if (this.boardVx !== 0) {
            const decayAmount = 15 * (dt / 1000); // 15 units per second
            if (this.boardVx > 0) {
                this.boardVx = Math.max(0, this.boardVx - decayAmount);
            } else {
                this.boardVx = Math.min(0, this.boardVx + decayAmount);
            }
        }

        // Apply gravity with time scaling
        this.vy = Math.min(this.vy + GRAVITY * timeScale, TERMINAL_VELOCITY);

        // Use combined velocity for movement with time scaling
        const totalVx = this.vx + this.boardVx;
        this.x += totalVx * timeScale;
        this.handleCollisions(true, totalVx);
        this.y += this.vy * timeScale;
        this.handleCollisions(false);

        // Wrap position
        this.wrapHorizontally();
        this.wrapVertically();

        if (Math.abs(totalVx) > 0.1) this.animTimer += dt;
    }

    wrapHorizontally() {
        const worldSpan = this.world.width * TILE_SIZE;
        while (this.x >= worldSpan) {
            this.x -= worldSpan;
        }
        while (this.x + this.width <= 0) {
            this.x += worldSpan;
        }
    }

    wrapVertically() {
        const worldSpan = this.world.height * TILE_SIZE;
        while (this.y >= worldSpan) {
            this.y -= worldSpan;
        }
        while (this.y + this.height <= 0) {
            this.y += worldSpan;
        }
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
        const startX = Math.floor(this.x / TILE_SIZE);
        const endX = Math.floor((this.x + this.width) / TILE_SIZE);
        const startY = Math.floor(this.y / TILE_SIZE);
        const endY = Math.floor((this.y + this.height) / TILE_SIZE);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (isBlockSolid(this.world.getBlock(x, y), BLOCK_PROPS)) {
                    if (horizontal) {
                        if (vx > 0) this.x = x * TILE_SIZE - this.width - 0.01;
                        else if (vx < 0) this.x = (x + 1) * TILE_SIZE + 0.01;
                        this.vx = 0;
                        this.boardVx = 0; // Also reset board velocity on collision
                    } else {
                        if (this.vy > 0) {
                            this.y = y * TILE_SIZE - this.height - 0.01;
                            this.grounded = true;
                            this.vy = 0;
                        } else if (this.vy < 0) {
                            this.y = (y + 1) * TILE_SIZE + 0.01;
                            this.vy = 0;
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
        ctx.fillRect(4, 0, 12, 12); // Head
        ctx.fillStyle = '#00bcd4';
        ctx.fillRect(4, 12, 12, 18); // Body
        ctx.fillStyle = '#3f51b5'; // Legs
        ctx.fillRect(4, 30, 5, 18 + (Math.abs(this.vx) > 0.1 ? swing : 0));
        ctx.fillRect(11, 30, 5, 18 - (Math.abs(this.vx) > 0.1 ? swing : 0));
        ctx.fillStyle = '#f8b090'; // Arms
        if (this.facingRight) ctx.fillRect(10, 12, 6, 18 + swing);
        else ctx.fillRect(4, 12, -6, 18 + swing);
        ctx.restore();
    }
}
