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
    BLOCKS, BLOCK_PROPS
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
import { 
    getSkyGradientColors, 
    getSunRenderData, 
    getMoonRenderData,
    getStarRenderData
} from './sky.js';
import { drawJackpotParticles, handleJackpotOverlap, updateJackpots } from './jackpot.js';
import { handleAcceleratorOverlap, updateAccelerators } from './accelerator.js';
import { createSaveManager, loadGameState } from './save.js';
import { createTNTManager } from './tnt.js';
import { exportWorldToImage, importWorldFromImage, downloadBlob, findSpawnPosition } from './world_share.js';

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
let tntManager = null;
const saplingTimers = [];
const SAPLING_GROWTH_TIME = 6000;
let saveManager = null;

// Day/Night Cycle Settings
const DAY_DURATION_MS = 360000; // 6 minutes per day

// Logical (CSS) canvas dimensions for coordinate calculations
let logicalWidth = window.innerWidth;
let logicalHeight = window.innerHeight;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    logicalWidth = window.innerWidth;
    logicalHeight = window.innerHeight;

    // Set canvas resolution to match physical pixels
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    // Set CSS size to match logical pixels
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';

    // Scale context so drawing uses logical coordinates
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    if (logicalWidth <= 768) {
        const el = document.getElementById('mobile-controls');
        if (el) el.style.display = 'block';
    }
}
window.addEventListener('resize', resize);

function init(savedState = null) {
    world = new World(WORLD_WIDTH, WORLD_HEIGHT);
    player = new Player(world, addToInventory);
    textures = generateTextures(); // Initialize textures here

    // Initialize TNT Manager
    tntManager = createTNTManager({
        world,
        player,
        sounds,
        addToInventory,
        createExplosionParticles
    });

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
                tntManager.onBlockPlaced(x, y);
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

    // Initialize Save Manager
    saveManager = createSaveManager({
        world,
        player,
        timers: {
            tnt: tntManager.getTimers(),
            saplings: saplingTimers
        },
        inventory: {
            getInventoryState,
            loadInventoryState
        },
        utils: {
            clamp
        },
        constants: {
            TILE_SIZE
        }
    });

    if (savedState) {
        saveManager.applySavedState(savedState);
    } else {
        updateInventoryUI();
    }
    resize();

    // Initialize camera to center on player immediately
    cameraX = player.getCenterX() - logicalWidth / 2;
    cameraY = player.getCenterY() - logicalHeight / 2;

    saveManager.startAutosave();
    saveManager.saveGameState();
    requestAnimationFrame(loop);
}

function update(dt) {
    if (!player) return;
    player.update(input, dt);

    // Camera with smooth following
    const targetCamX = player.getCenterX() - logicalWidth / 2;
    const targetCamY = player.getCenterY() - logicalHeight / 2;

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
    updateFireworks(dt, world, cameraX, cameraY, { width: logicalWidth, height: logicalHeight });

    // --- Update TNT ---
    tntManager.update(dt);

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
    
    // --- Day/Night Calculation ---
    const normalizedTime = (Date.now() % DAY_DURATION_MS) / DAY_DURATION_MS;

    // 1. Sky Gradient
    const { top: skyTop, bottom: skyBottom } = getSkyGradientColors(normalizedTime);
    const gradient = ctx.createLinearGradient(0, 0, 0, logicalHeight);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(1, skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // 2. Stars
    const stars = getStarRenderData(normalizedTime, logicalWidth, logicalHeight);
    ctx.fillStyle = '#FFFFFF';
    stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 3. Celestial Bodies (Sun & Moon)
    const sun = getSunRenderData(normalizedTime, logicalWidth, logicalHeight);
    const moon = getMoonRenderData(normalizedTime, logicalWidth, logicalHeight);
    
    const bodies = [sun, moon];

    bodies.forEach(body => {
        if (body.isVisible) {
            ctx.beginPath();
            ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.shadowColor = body.shadow.color;
            ctx.shadowBlur = body.shadow.blur;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();

            // Simple Moon Craters (Optional Detail)
            if (body.type === 'moon') {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.beginPath();
                ctx.arc(body.x - 8, body.y - 5, 6, 0, Math.PI * 2);
                ctx.arc(body.x + 10, body.y + 8, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });

    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    const { startX, endX, startY, endY } = calculateVisibleTileRange(
        cameraX, cameraY, logicalWidth, logicalHeight, TILE_SIZE
    );

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
            // Handle vertical wrapping for block rendering
            const normalizedY = (y % world.height + world.height) % world.height;
            const block = world.getBlock(x, normalizedY);

            if (block !== BLOCKS.AIR && textures[block]) {
                ctx.drawImage(textures[block], x * TILE_SIZE, y * TILE_SIZE);
                
                if (!NO_SHADOW_BLOCKS.has(block)) {
                    const aboveY = (normalizedY - 1 + world.height) % world.height;
                    const neighborAbove = world.getBlock(x, aboveY);
                    if (neighborAbove !== BLOCKS.AIR && !isBlockTransparent(neighborAbove, BLOCK_PROPS)) {
                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
    }

    player.draw(ctx);

    drawJackpotParticles(ctx);
    drawFireworks(ctx);

    // Highlight cursor
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
  let dt = timestamp - lastTime;
  lastTime = timestamp;

  // Clamp dt to avoid huge physics jumps after tab switching
  dt = Math.min(dt, 50); // 50ms ~= 3 frames at 60fps

  update(dt);
  draw();
  requestAnimationFrame(loop);
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

// World Share Modal
const worldModal = document.getElementById('world-modal');
const worldBtn = document.getElementById('world-btn');
const worldCloseBtn = document.getElementById('world-close-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

function showWorldModal() {
    worldModal.style.display = 'block';
}

function hideWorldModal() {
    worldModal.style.display = 'none';
}

worldBtn.addEventListener('click', showWorldModal);
worldCloseBtn.addEventListener('click', hideWorldModal);

// Export world to image
exportBtn.addEventListener('click', async () => {
    const savedState = loadGameState();
    if (!savedState || !savedState.world || !savedState.world.map) {
        alert('セーブデータがありません');
        return;
    }

    // Decode base64 to Uint8Array
    const binary = atob(savedState.world.map);
    const worldMap = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        worldMap[i] = binary.charCodeAt(i);
    }

    const blob = await exportWorldToImage(worldMap, savedState.world.width, savedState.world.height);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    downloadBlob(blob, `world_${timestamp}.png`);
});

// Import world from image
importBtn.addEventListener('click', async () => {
    const file = importFile.files[0];
    if (!file) {
        alert('えを えらんでね');
        return;
    }

    try {
        const worldMap = await importWorldFromImage(file);

        // Load inventory from existing save if available
        const savedState = loadGameState();
        const inventoryState = savedState?.inventory || null;

        hideWorldModal();
        hideStartScreen();
        sounds.init();

        // Initialize game
        init();

        // Replace world map
        world.map = worldMap;

        // Restore inventory if available
        if (inventoryState) {
            loadInventoryState(inventoryState);
        }

        // Find spawn position and teleport player
        const spawn = findSpawnPosition(worldMap, WORLD_WIDTH, WORLD_HEIGHT);
        player.x = spawn.x * TILE_SIZE;
        player.y = spawn.y * TILE_SIZE;
        player.vx = 0;
        player.vy = 0;

        // Update camera
        cameraX = player.getCenterX() - logicalWidth / 2;
        cameraY = player.getCenterY() - logicalHeight / 2;

    } catch (err) {
        alert('この えでは ワールドを つくれないよ' + err.message);
    }
});
