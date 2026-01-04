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
        this.vx = 0;
        this.vy = 0;
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

    update(input, dt) {
        if (input.keys.left) {
            this.vx = -5;
            this.facingRight = false;
        } else if (input.keys.right) {
            this.vx = 5;
            this.facingRight = true;
        } else {
            this.vx *= 0.8;
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

        this.vy = Math.min(this.vy + GRAVITY, TERMINAL_VELOCITY);
        this.x += this.vx;
        this.handleCollisions(true);
        this.y += this.vy;
        this.handleCollisions(false);

        // Wrap position
        this.wrapHorizontally();
        this.wrapVertically();

        if (Math.abs(this.vx) > 0.1) this.animTimer += dt;
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
        this.x = (this.world.width / 2) * TILE_SIZE;
        this.findSpawnPoint();
    }

    handleCollisions(horizontal) {
        const startX = Math.floor(this.x / TILE_SIZE);
        const endX = Math.floor((this.x + this.width) / TILE_SIZE);
        const startY = Math.floor(this.y / TILE_SIZE);
        const endY = Math.floor((this.y + this.height) / TILE_SIZE);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (isBlockSolid(this.world.getBlock(x, y), BLOCK_PROPS)) {
                    if (horizontal) {
                        if (this.vx > 0) this.x = x * TILE_SIZE - this.width - 0.01;
                        else if (this.vx < 0) this.x = (x + 1) * TILE_SIZE + 0.01;
                        this.vx = 0;
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
