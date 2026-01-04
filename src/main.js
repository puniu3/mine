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
    TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, REACH, CAMERA_SMOOTHING,
    BLOCKS, BLOCK_PROPS, TNT_KNOCKBACK_STRENGTH
} from './constants.js';
import { generateTextures } from './texture_gen.js';
import { createInput } from './input.js';
import {
    updateInventoryUI, addToInventory, consumeFromInventory,
    initHotbarUI, selectHotbar, getSelectedBlockId,
    getInventoryState, loadInventoryState
} from './inventory.js';
import { isCraftingOpen, updateCrafting } from './crafting.js';
import { update as updateFireworks, draw as drawFireworks, createExplosionParticles } from './fireworks.js';
import { createActions } from './actions.js';
import { World } from './world.js';
import { Player } from './player.js';
import { getSkyGradientColors } from './sky.js';
import { drawJackpotParticles, handleJackpotOverlap, updateJackpots } from './jackpot.js';
import { handleAcceleratorOverlap, updateAccelerators } from './accelerator.js';

// --- Texture Generator ---
let textures = {};

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
const SAVE_KEY = 'blockCraftSave';
const AUTOSAVE_INTERVAL = 5000;
let autosaveHandle = null;

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

function init(savedState = null) {
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

    if (savedState) {
        applySavedState(savedState);
    } else {
        updateInventoryUI();
    }
    resize();
    startAutosave();
    saveGameState();
    requestAnimationFrame(loop);
}

function update(dt) {
    if (!player) return;
    player.update(input, dt);

    // Camera with smooth following
    const targetCamX = player.getCenterX() - canvas.width / 2;
    const targetCamY = player.getCenterY() - canvas.height / 2;

    // Handle horizontal wrapping: if player wrapped around, adjust camera to follow smoothly
    const worldWidthPixels = world.width * TILE_SIZE;
    const cameraDiff = targetCamX - cameraX;
    if (Math.abs(cameraDiff) > worldWidthPixels / 2) {
        // Player wrapped, adjust camera to maintain continuity
        if (cameraDiff > 0) {
            cameraX += worldWidthPixels;
        } else {
            cameraX -= worldWidthPixels;
        }
    }

    cameraX = smoothCamera(cameraX, targetCamX, CAMERA_SMOOTHING);
    cameraY = targetCamY;

    // Interaction
    if (input.mouse.leftDown) {
        if (!isCraftingOpen) {
            actions.handlePointer(input.mouse.x, input.mouse.y);
        }
        input.mouse.leftDown = false;
    }

    // --- Check Crafting ---
    updateCrafting(player, world, textures);

    // --- Jackpot Blocks ---
    handleJackpotOverlap(player, world, sounds);
    updateJackpots(dt);

    // --- Accelerator Blocks ---
    handleAcceleratorOverlap(player, world);
    updateAccelerators(dt);

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

    // Apply knockback to player
    const explosionX = x * TILE_SIZE + TILE_SIZE / 2;
    const explosionY = y * TILE_SIZE + TILE_SIZE / 2;
    const playerCenterX = player.getCenterX();
    const playerCenterY = player.getCenterY();

    // Calculate distance in world coordinates
    const distanceX = playerCenterX - explosionX;
    const distanceY = playerCenterY - explosionY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Apply knockback if player is within range (using radius in pixels)
    const knockbackRange = radius * TILE_SIZE;
    if (distance < knockbackRange && distance > 0) {
        // Normalize direction vector
        const dirX = distanceX / distance;
        const dirY = distanceY / distance;

        // Calculate knockback strength:
        const clampedDistance = Math.max(distance, TILE_SIZE);
        const knockbackStrength =
            (TNT_KNOCKBACK_STRENGTH * knockbackRange) / (clampedDistance + TILE_SIZE * 2);

        // Apply velocity to player
        player.vx = dirX * knockbackStrength;
        player.vy = dirY * knockbackStrength;
        player.grounded = false;
    }

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

    // Blocks that should not be darkened when under other blocks
    const NO_SHADOW_BLOCKS = new Set([
        BLOCKS.CLOUD,
        BLOCKS.FIREWORK,
        BLOCKS.JUMP_PAD,
        BLOCKS.TNT,
        BLOCKS.SAPLING,
        BLOCKS.JACKPOT,
        BLOCKS.ACCELERATOR_LEFT,
        BLOCKS.ACCELERATOR_RIGHT
    ]);

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const block = world.getBlock(x, y);
            if (block !== BLOCKS.AIR && textures[block]) {
                ctx.drawImage(textures[block], x * TILE_SIZE, y * TILE_SIZE);
                // Shadow (skip for certain blocks)
                if (!NO_SHADOW_BLOCKS.has(block)) {
                    const neighborAbove = world.getBlock(x, y - 1);
                    if (neighborAbove !== BLOCKS.AIR && !isBlockTransparent(neighborAbove, BLOCK_PROPS)) {
                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
    }

    player.draw(ctx);

    // Jackpot Particles
    drawJackpotParticles(ctx);

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

function uint8ToBase64(bytes) {
    const chunkSize = 0x8000;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const slice = bytes.subarray(i, i + chunkSize);
        chunks.push(String.fromCharCode(...slice));
    }
    return btoa(chunks.join(''));
}

function base64ToUint8(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function saveGameState() {
    if (!world || !player) return;
    try {
        const state = {
            world: {
                width: world.width,
                height: world.height,
                map: uint8ToBase64(world.map)
            },
            player: {
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy,
                grounded: player.grounded,
                facingRight: player.facingRight
            },
            inventory: getInventoryState(),
            timers: {
                tnt: tntTimers.map(t => ({ x: t.x, y: t.y, timer: t.timer })),
                saplings: saplingTimers.map(s => ({ x: s.x, y: s.y, timer: s.timer }))
            }
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (err) {
        console.warn('Failed to save game state', err);
    }
}

function loadGameState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.warn('Failed to parse saved state', err);
        localStorage.removeItem(SAVE_KEY);
        return null;
    }
}

function applySavedState(state) {
    if (!state) return;

    if (state.world && state.world.map && state.world.width === world.width && state.world.height === world.height) {
        const decodedMap = base64ToUint8(state.world.map);
        if (decodedMap.length === world.map.length) {
            world.map = decodedMap;
        }
    }

    if (state.player) {
        player.x = state.player.x ?? player.x;
        player.y = state.player.y ?? player.y;
        player.vx = state.player.vx ?? player.vx;
        player.vy = state.player.vy ?? player.vy;
        player.grounded = state.player.grounded ?? player.grounded;
        player.facingRight = state.player.facingRight ?? player.facingRight;
        player.wrapVertically();
        player.x = clamp(player.x, 0, world.width * TILE_SIZE - player.width);
    }

    if (state.inventory) {
        loadInventoryState(state.inventory);
    }

    if (state.timers) {
        tntTimers.length = 0;
        (state.timers.tnt || []).forEach(t => {
            if (typeof t.x === 'number' && typeof t.y === 'number' && typeof t.timer === 'number') {
                tntTimers.push({ x: t.x, y: t.y, timer: t.timer });
            }
        });

        saplingTimers.length = 0;
        (state.timers.saplings || []).forEach(s => {
            if (typeof s.x === 'number' && typeof s.y === 'number' && typeof s.timer === 'number') {
                saplingTimers.push({ x: s.x, y: s.y, timer: s.timer });
            }
        });
    }
}

function startAutosave() {
    if (autosaveHandle) clearInterval(autosaveHandle);
    autosaveHandle = setInterval(saveGameState, AUTOSAVE_INTERVAL);
}

function hideStartScreen() {
    const screen = document.getElementById('start-screen');
    if (screen) screen.style.display = 'none';
}

function refreshContinueButton() {
    const savedState = loadGameState();
    const continueBtn = document.getElementById('continue-btn');
    if (!continueBtn) return;
    continueBtn.style.display = savedState ? 'inline-block' : 'none';
}

refreshContinueButton();

// Start Screen Buttons
document.getElementById('start-btn').addEventListener('click', () => {
    hideStartScreen();
    sounds.init();
    init();
});

const continueButton = document.getElementById('continue-btn');
if (continueButton) {
    continueButton.addEventListener('click', () => {
        const savedState = loadGameState();
        if (!savedState) return;
        hideStartScreen();
        sounds.init();
        init(savedState);
    });
}
