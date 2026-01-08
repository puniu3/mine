/**
 * 2D Minecraft Clone Script (Inventory + Auto-Climb Edition)
 * Refactored Version
 */

import {
    clamp,
    screenToWorld,
    rectsIntersect, isWithinReach,
    isBlockSolid, isBlockTransparent, isBlockBreakable, getBlockMaterialType,
    worldToTile,
    hasAdjacentBlock
} from './utils.js';
import { sounds } from './audio.js';
import {
    TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, REACH,
    BLOCKS, BLOCK_PROPS,
    PHYSICS_TPS, PHYSICS_DT
} from './constants.js';
import { generateTextures } from './texture_gen.js';
import { createInput } from './input.js';
import {
    updateInventoryUI, addToInventory, consumeFromInventory,
    initHotbarUI, selectHotbar, getSelectedBlockId,
    getInventoryState, loadInventoryState
} from './inventory.js';
import { isCraftingOpen, updateCrafting } from './crafting.js';
import { tick as tickFireworks, createExplosionParticles } from './fireworks.js';
import { createActions } from './actions.js';
import { World } from './world.js';
import { Player } from './player.js';
import { drawJackpotParticles, handleJackpotOverlap, tick as tickJackpots } from './jackpot.js';
import { handleAcceleratorOverlap, tick as tickAccelerators, initAccelerator } from './accelerator.js';
import { createSaveManager, loadGameState } from './save.js';
import { createTNTManager } from './tnt.js';
import { findSpawnPosition } from './world_share.js';
import { drawGame } from './renderer.js';

// --- New Modules ---
import { createSaplingManager } from './sapling_manager.js';
import { initUI } from './ui_manager.js';
import { createCamera } from './camera.js';

// --- Texture Generator ---
let textures = {};

// --- Main Loop Variables ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let world, player;
let lastTime = 0;
let camera; // Camera instance
let input;
let actions;
let tntManager = null;
let saplingManager = null;
let saveManager = null;

// Physics Settings (720Hz High-Frequency Step)
// - Syncs perfectly with 144Hz monitors (5 steps per frame).
// - Prevents "tunneling" (clipping through blocks) at high speeds.
// PHYSICS_TPS and PHYSICS_DT are now imported from constants.js
// Allow a small epsilon to stabilize step counts on 60Hz monitors.
// If accumulator is within 0.25ms of a full step, force the step.
const PHYSICS_EPSILON = 0.25;
let accumulator = 0;

// Logical (CSS) canvas dimensions
let logicalWidth = window.innerWidth;
let logicalHeight = window.innerHeight;

// --- Initialization ---
function resize() {
    const dpr = window.devicePixelRatio || 1;
    logicalWidth = window.innerWidth;
    logicalHeight = window.innerHeight;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';

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

    // TNT + JUMP_PAD super launch callback
    // tntPositions is an array of Y coordinates for all connected TNTs
    const handleTNTJumpPad = (tntX, tntPositions) => {
        // Play explosion sound once
        sounds.playExplosion();
        // Remove all connected TNT blocks and cancel their timers
        for (const tntY of tntPositions) {
            world.setBlock(tntX, tntY, BLOCKS.AIR);
            if (tntManager) {
                tntManager.cancelTimerAt(tntX, tntY);
            }
        }
        // No particles - camera moves too fast to see them
    };

    player = new Player(world, addToInventory, handleTNTJumpPad);
    textures = generateTextures();

    // Initialize Camera
    camera = createCamera();

    // Initialize Managers
    tntManager = createTNTManager({
        world,
        player,
        sounds,
        addToInventory,
        createExplosionParticles
    });

    saplingManager = createSaplingManager({
        world,
        player
    });

    // Initialize Accelerator with TNT callback
    initAccelerator({
        onTNTAccelerator: (tntX, tntY) => {
            // Play explosion sound
            sounds.playExplosion();
            // Remove TNT block (don't add to inventory)
            world.setBlock(tntX, tntY, BLOCKS.AIR);
            // Cancel any active timer for this TNT
            if (tntManager) {
                tntManager.cancelTimerAt(tntX, tntY);
            }
            // Create explosion particles at TNT location
            const pixelX = tntX * TILE_SIZE + TILE_SIZE / 2;
            const pixelY = tntY * TILE_SIZE + TILE_SIZE / 2;
            createExplosionParticles(pixelX, pixelY);
        }
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
        camera: camera, // Pass the camera instance directly
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
                // Check upward for JUMP_PAD (through connected TNTs)
                let checkY = y - 1;
                while (world.getBlock(x, checkY) === BLOCKS.TNT) {
                    checkY--;
                }
                const blockAboveChain = world.getBlock(x, checkY);

                // Skip timer if ACCELERATOR_LEFT is to the left (TNT is to its right)
                const blockLeft = world.getBlock(x - 1, y);
                // Skip timer if ACCELERATOR_RIGHT is to the right (TNT is to its left)
                const blockRight = world.getBlock(x + 1, y);

                const hasJumpPadAboveChain = blockAboveChain === BLOCKS.JUMP_PAD;
                const hasAccelLeftToLeft = blockLeft === BLOCKS.ACCELERATOR_LEFT;
                const hasAccelRightToRight = blockRight === BLOCKS.ACCELERATOR_RIGHT;

                if (!hasJumpPadAboveChain && !hasAccelLeftToLeft && !hasAccelRightToRight) {
                    tntManager.onBlockPlaced(x, y);
                }
            } else if (type === BLOCKS.JUMP_PAD) {
                // Cancel timers for all connected TNTs below
                let checkY = y + 1;
                while (world.getBlock(x, checkY) === BLOCKS.TNT) {
                    tntManager.cancelTimerAt(x, checkY);
                    checkY++;
                }
            } else if (type === BLOCKS.ACCELERATOR_LEFT) {
                // Cancel TNT timer if TNT is to the right of this accelerator
                const blockRight = world.getBlock(x + 1, y);
                if (blockRight === BLOCKS.TNT) {
                    tntManager.cancelTimerAt(x + 1, y);
                }
            } else if (type === BLOCKS.ACCELERATOR_RIGHT) {
                // Cancel TNT timer if TNT is to the left of this accelerator
                const blockLeft = world.getBlock(x - 1, y);
                if (blockLeft === BLOCKS.TNT) {
                    tntManager.cancelTimerAt(x - 1, y);
                }
            } else if (type === BLOCKS.SAPLING) {
                saplingManager.addSapling(x, y);
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
            saplings: saplingManager.getTimers()
        },
        inventory: {
            getInventoryState,
            loadInventoryState
        },
        utils: { clamp },
        constants: { TILE_SIZE }
    });

    // Restore state if provided
    if (savedState) {
        saveManager.applySavedState(savedState);
        if (savedState.timers && savedState.timers.saplings) {
            saplingManager.restoreTimers(savedState.timers.saplings);
        }
    } else {
        updateInventoryUI();
    }
    resize();

    // Center camera
    camera.setPosition(
        player.getCenterX() - logicalWidth / 2,
        player.getCenterY() - logicalHeight / 2
    );

    saveManager.startAutosave();
    saveManager.saveGameState();
    
    // Ensure loop is only running once
    if (lastTime === 0) {
        requestAnimationFrame(loop);
    }
}

// --- Tick Loop (Physics) ---
function tick() {
    if (!player) return;
    player.tick(input);

    // Input Handling
    if (input.mouse.leftDown) {
        if (!isCraftingOpen) {
            actions.handlePointer(input.mouse.x, input.mouse.y);
        }
        input.mouse.leftDown = false;
    }

    // System Updates
    updateCrafting(player, world, textures);

    handleJackpotOverlap(player, world, sounds);
    tickJackpots();

    handleAcceleratorOverlap(player, world);
    tickAccelerators();

    tickFireworks(world, camera.x, camera.y, { width: logicalWidth, height: logicalHeight });

    tntManager.tick();
    saplingManager.tick();
}

// --- Camera Update (Per Frame) ---
function updateCamera() {
    if (!player) return;

    camera.update(player, world, logicalWidth, logicalHeight);
}

// --- Draw Loop ---
function draw() {
    drawGame(ctx, {
        world,
        player,
        cameraX: camera.x,
        cameraY: camera.y,
        logicalWidth,
        logicalHeight,
        textures,
        input
    });
}

function loop(timestamp) {
    if (lastTime === 0) {
        lastTime = timestamp;
        requestAnimationFrame(loop);
        return;
    }

    let frameTime = timestamp - lastTime;
    lastTime = timestamp;

    if (frameTime > 50) {
        frameTime = 50;
    }

    accumulator += frameTime;

    // Modified Logic: Use EPSILON to allow "rounding up" the step count.
    // If we are very close to a full step (within PHYSICS_EPSILON), execute it.
    // This allows accumulator to dip slightly below zero, stabilizing the 
    // step count per frame (e.g. consistently 12 steps for 60Hz) 
    // and preventing jitter caused by 11/12 oscillation.
    while (accumulator >= PHYSICS_DT - PHYSICS_EPSILON) {
        tick();
        accumulator -= PHYSICS_DT;
    }

    // Camera update is still separated, but now benefits from stable physics steps
    updateCamera();

    draw();
    
    requestAnimationFrame(loop);
}

// --- Initialize UI & Event Listeners ---
initUI({
    onStartGame: () => {
        sounds.init();
        init();
    },
    onLoadGame: (savedState) => {
        sounds.init();
        init(savedState);
    },
    onImportWorld: (worldMap) => {
        sounds.init();
        
        // Load existing inventory state to preserve it
        const savedState = loadGameState();
        const inventoryState = savedState?.inventory || null;

        // Reset game
        init();

        // Override map
        world.map = worldMap;

        // Restore inventory
        if (inventoryState) {
            loadInventoryState(inventoryState);
        }

        // Find spawn and teleport
        const spawn = findSpawnPosition(worldMap, WORLD_WIDTH, WORLD_HEIGHT);
        player.x = spawn.x * TILE_SIZE;
        player.y = spawn.y * TILE_SIZE;
        player.vx = 0;
        player.vy = 0;

        camera.setPosition(
            player.getCenterX() - logicalWidth / 2,
            player.getCenterY() - logicalHeight / 2
        );
    }
});
