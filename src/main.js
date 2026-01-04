/**
 * 2D Minecraft Clone Script (Inventory + Auto-Climb Edition)
 *
 * Architecture:
 * - Constants: Block definitions, Physics settings.
 * - Inventory: Manages item counts.
 * - TextureGen: Procedural texture generation.
 * - Game Engine: Loop, Physics, Collision, Input.
 *
 * Dependencies: utils.js, audio.js, constants.js, texture_gen.js
 */

import {
    clamp, smoothCamera, clampCamera,
    screenToWorld,
    rectsIntersect, isWithinReach,
    isBlockSolid, isBlockTransparent, isBlockBreakable, getBlockMaterialType,
    worldToTile,
    hasAdjacentBlock,
    calculateVisibleTileRange
} from './utils.js';
import { sounds } from './audio.js';
import {
    TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, GRAVITY, JUMP_FORCE, REACH, CAMERA_SMOOTHING,
    BLOCKS, BLOCK_PROPS
} from './constants.js';
import { generateTextures } from './texture_gen.js';

// New modules
import { createInput } from './input.js';
import {
    updateInventoryUI, addToInventory, consumeFromInventory,
    initHotbarUI, selectHotbar, getSelectedBlockId
} from './inventory.js';
import { isCraftingOpen, updateCrafting } from './crafting.js';
import { update as updateFireworks, draw as drawFireworks, createExplosionParticles } from './fireworks.js';
import { createActions } from './actions.js';
import { World } from './world.js';

// --- Texture Generator ---
let textures = {};

// --- Sky Coloring Helpers ---
const SKY_GRADIENT_ANCHORS = {
    top: { top: '#87CEEB', bottom: '#B3E5FC' },
    bottom: { top: '#1b1b25', bottom: '#0a0c14' }
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(lerp(r1, r2, t));
    const g = Math.round(lerp(g1, g2, t));
    const b = Math.round(lerp(b1, b2, t));

    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getSkyGradientColors(altitude) {
    const t = clamp(altitude, 0, 1);
    return {
        top: lerpColor(SKY_GRADIENT_ANCHORS.top.top, SKY_GRADIENT_ANCHORS.bottom.top, t),
        bottom: lerpColor(SKY_GRADIENT_ANCHORS.top.bottom, SKY_GRADIENT_ANCHORS.bottom.bottom, t)
    };
}

class Player {
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
            if (this.world.getBlock(sx, y) !== BLOCKS.AIR) {
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

        this.vy += GRAVITY;
        this.x += this.vx;
        this.handleCollisions(true);
        this.y += this.vy;
        this.handleCollisions(false);

        // Clamp position
        this.x = clamp(this.x, 0, this.world.width * TILE_SIZE - this.width);

        // Wrap vertically so the world connects top-to-bottom
        const worldSpan = this.world.height * TILE_SIZE;
        if (this.y >= worldSpan) {
            this.y -= worldSpan;
        } else if (this.y + this.height <= 0) {
            this.y += worldSpan;
        }

        if (Math.abs(this.vx) > 0.1) this.animTimer += dt;
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
                    }
                    return;
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

// --- Main Loop ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let world, player;
let lastTime = 0;
let cameraX = 0, cameraY = 0;
let input;
let actions;
const tntTimers = [];
const saplingTimers = [];
const SAPLING_GROWTH_TIME = 6000;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
    if (window.innerWidth <= 768) {
        const el = document.getElementById('mobile-controls');
        if (el) el.style.display = 'block';
    }
}
window.addEventListener('resize', resize);

function init() {
    world = new World(WORLD_WIDTH, WORLD_HEIGHT);
    player = new Player(world);
    textures = generateTextures(); // Initialize textures here

    // Initialize Actions
    actions = createActions({
        world,
        player,
        inventory: {
            addToInventory,
            consumeFromInventory,
            getSelectedBlockId
        },
        camera: {
            get x() { return cameraX; },
            get y() { return cameraY; }
        },
        sounds,
        constants: {
            TILE_SIZE,
            BLOCKS,
            BLOCK_PROPS,
            REACH
        },
        utils: {
            screenToWorld,
            worldToTile,
            isWithinReach,
            isBlockBreakable,
            isBlockTransparent,
            getBlockMaterialType,
            rectsIntersect,
            hasAdjacentBlock
        },
        onBlockPlaced: (x, y, type) => {
            if (type === BLOCKS.TNT) {
                tntTimers.push({ x, y, timer: 3000 });
            } else if (type === BLOCKS.SAPLING) {
                saplingTimers.push({ x, y, timer: SAPLING_GROWTH_TIME });
            }
        }
    });

    // Initialize Input
    input = createInput(canvas, {
        onHotbarSelect: selectHotbar,
        onTouch: (x, y) => actions.handlePointer(x, y)
    });

    initHotbarUI(textures);
    updateInventoryUI();
    resize();
    requestAnimationFrame(loop);
}

function update(dt) {
    if (!player) return;
    player.update(input, dt);

    // Camera with smooth following
    const targetCamX = player.getCenterX() - canvas.width / 2;
    const targetCamY = player.getCenterY() - canvas.height / 2;
    cameraX = smoothCamera(cameraX, targetCamX, CAMERA_SMOOTHING);
    cameraY = smoothCamera(cameraY, targetCamY, CAMERA_SMOOTHING);
    cameraX = clampCamera(cameraX, 0, world.width * TILE_SIZE, canvas.width);
    cameraY = clampCamera(cameraY, -500, world.height * TILE_SIZE, canvas.height);

    // Interaction
    if (input.mouse.leftDown) {
        if (!isCraftingOpen) {
            actions.handlePointer(input.mouse.x, input.mouse.y);
        }
        input.mouse.leftDown = false;
    }

    // --- Check Crafting ---
    updateCrafting(player, world, textures);

    // --- Update Fireworks ---
    updateFireworks(dt, world, cameraX, cameraY, canvas);

    // --- Update TNT ---
    for (let i = tntTimers.length - 1; i >= 0; i--) {
        const tnt = tntTimers[i];
        // Remove timers for TNT blocks that no longer exist
        if (world.getBlock(tnt.x, tnt.y) !== BLOCKS.TNT) {
            tntTimers.splice(i, 1);
            continue;
        }
        tnt.timer -= dt;
        if (tnt.timer <= 0) {
            explodeTNT(tnt.x, tnt.y);
            tntTimers.splice(i, 1);
        }
    }

    // --- Update Sapling Growth ---
    for (let i = saplingTimers.length - 1; i >= 0; i--) {
        const sapling = saplingTimers[i];
        if (world.getBlock(sapling.x, sapling.y) !== BLOCKS.SAPLING) {
            saplingTimers.splice(i, 1);
            continue;
        }
        sapling.timer -= dt;
        if (sapling.timer <= 0) {
            growSapling(sapling.x, sapling.y);
            saplingTimers.splice(i, 1);
        }
    }
}

function explodeTNT(x, y) { // x, y are tile coordinates
    sounds.playExplosion();

    // Explosion Radius
    const radius = 8;
    const startX = Math.max(0, x - radius);
    const endX = Math.min(world.width - 1, x + radius);
    const startY = Math.max(0, y - radius);
    const endY = Math.min(world.height - 1, y + radius);

    // Create particles at center
    createExplosionParticles(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);

    for (let by = startY; by <= endY; by++) {
        for (let bx = startX; bx <= endX; bx++) {
            // Distance check for circle shape
            const dx = bx - x;
            const dy = by - y;
            if (dx*dx + dy*dy <= radius*radius) {
                const block = world.getBlock(bx, by);
                if (block !== BLOCKS.AIR && isBlockBreakable(block, BLOCK_PROPS)) {
                    if (block !== BLOCKS.TNT) {
                        addToInventory(block);
                    }
                    world.setBlock(bx, by, BLOCKS.AIR);
                }
            }
        }
    }
}

function liftPlayerAbove(blockRect) {
    const targetY = blockRect.y - player.height - 0.1;
    if (player.y > targetY) {
        player.y = targetY;
    }
    player.vy = 0;
    player.grounded = true;

    const startX = Math.floor(player.x / TILE_SIZE);
    const endX = Math.floor((player.x + player.width) / TILE_SIZE);
    const startY = Math.floor(player.y / TILE_SIZE);
    const endY = Math.floor((player.y + player.height) / TILE_SIZE);

    let adjustedTop = null;

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const block = world.getBlock(x, y);
            if (!isBlockSolid(block, BLOCK_PROPS)) continue;

            if (isBlockBreakable(block, BLOCK_PROPS)) {
                world.setBlock(x, y, BLOCKS.AIR);
            } else {
                const candidateTop = y * TILE_SIZE;
                adjustedTop = adjustedTop === null ? candidateTop : Math.min(adjustedTop, candidateTop);
            }
        }
    }

    if (adjustedTop !== null) {
        player.y = adjustedTop - player.height - 0.1;
    }
}

function placeGrowthBlock(x, y, type) {
    if (x < 0 || x >= world.width || y < 0 || y >= world.height) return;

    const existing = world.getBlock(x, y);
    if (BLOCK_PROPS[existing] && BLOCK_PROPS[existing].unbreakable) return;

    if (existing !== BLOCKS.AIR && existing !== BLOCKS.SAPLING) {
        world.setBlock(x, y, BLOCKS.AIR);
    }

    const blockRect = { x: x * TILE_SIZE, y: y * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
    if (rectsIntersect(player.getRect(), blockRect)) {
        liftPlayerAbove(blockRect);
    }

    world.setBlock(x, y, type);
}

function growSapling(x, y) {
    const height = 4;
    const placements = [];
    for (let i = 0; i < height; i++) {
        placements.push({ x, y: y - i, type: BLOCKS.WOOD });
    }

    const topY = y - (height - 1);
    for (let lx = x - 2; lx <= x + 2; lx++) {
        for (let ly = topY - 2; ly <= topY; ly++) {
            if (Math.abs(lx - x) === 2 && Math.abs(ly - topY) === 2) continue;
            placements.push({ x: lx, y: ly, type: BLOCKS.LEAVES });
        }
    }

    placements.forEach(({ x: px, y: py, type }) => placeGrowthBlock(px, py, type));
}

function draw() {
    if (!world) return;
    const altitude = player ? clamp(player.getCenterY() / (world.height * TILE_SIZE), 0, 1) : 0.5;
    const { top: skyTop, bottom: skyBottom } = getSkyGradientColors(altitude);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(1, skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    // Calculate visible range (used by fireworks update too, but we recalculate here for drawing)
    const { startX, endX, startY, endY } = calculateVisibleTileRange(
        cameraX, cameraY, canvas.width, canvas.height, TILE_SIZE
    );

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const block = world.getBlock(x, y);
            if (block !== BLOCKS.AIR && textures[block]) {
                ctx.drawImage(textures[block], x * TILE_SIZE, y * TILE_SIZE);
                // Shadow
                const neighborAbove = world.getBlock(x, y - 1);
                if (neighborAbove !== BLOCKS.AIR && !isBlockTransparent(neighborAbove, BLOCK_PROPS)) {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    player.draw(ctx);

    // Particles
    drawFireworks(ctx);

    // Highlight
    const worldPos = screenToWorld(input.mouse.x, input.mouse.y, cameraX, cameraY);
    const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);
    if (isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    ctx.restore();

}

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

// Start Screen Button
document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    sounds.init();
    init();
});
