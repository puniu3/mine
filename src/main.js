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
import { isCraftingOpen, updateCrafting, pollCraftingGamepad } from './crafting.js';
import { tick as tickFireworks, createExplosionParticles } from './fireworks.js';
import { tick as tickBlockParticles, initBlockParticles } from './block_particles.js';
import { createActions } from './actions.js';
import { World } from './world/index.js';
import { Player } from './player/index.js';
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
import { initI18n } from './i18n.js';

initI18n();

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
    initBlockParticles(textures);

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
    // tntPositions is an array of X coordinates for all connected TNTs
    initAccelerator({
        onTNTAccelerator: (tntPositions, tntY) => {
            // Play explosion sound once
            sounds.playExplosion();
            // Remove all connected TNT blocks and cancel their timers
            for (const tntX of tntPositions) {
                world.setBlock(tntX, tntY, BLOCKS.AIR);
                if (tntManager) {
                    tntManager.cancelTimerAt(tntX, tntY);
                }
            }
            // No particles - camera moves too fast to see them
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
            isBlockSolid,
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
                const hasJumpPadAboveChain = blockAboveChain === BLOCKS.JUMP_PAD;

                // Check left for ACCELERATOR_LEFT (through connected TNTs)
                let checkLeft = x - 1;
                while (world.getBlock(checkLeft, y) === BLOCKS.TNT) {
                    checkLeft--;
                }
                const hasAccelLeftOnLeft = world.getBlock(checkLeft, y) === BLOCKS.ACCELERATOR_LEFT;

                // Check right for ACCELERATOR_RIGHT (through connected TNTs)
                let checkRight = x + 1;
                while (world.getBlock(checkRight, y) === BLOCKS.TNT) {
                    checkRight++;
                }
                const hasAccelRightOnRight = world.getBlock(checkRight, y) === BLOCKS.ACCELERATOR_RIGHT;

                const isProtected = hasJumpPadAboveChain || hasAccelLeftOnLeft || hasAccelRightOnRight;

                if (!isProtected) {
                    tntManager.onBlockPlaced(x, y);
                } else {
                    // Cancel timers for TNTs that just got connected to protected chain
                    if (hasJumpPadAboveChain) {
                        let belowY = y + 1;
                        while (world.getBlock(x, belowY) === BLOCKS.TNT) {
                            tntManager.cancelTimerAt(x, belowY);
                            belowY++;
                        }
                    }
                    if (hasAccelLeftOnLeft) {
                        // Cancel timers for TNTs to the right
                        let rightX = x + 1;
                        while (world.getBlock(rightX, y) === BLOCKS.TNT) {
                            tntManager.cancelTimerAt(rightX, y);
                            rightX++;
                        }
                    }
                    if (hasAccelRightOnRight) {
                        // Cancel timers for TNTs to the left
                        let leftX = x - 1;
                        while (world.getBlock(leftX, y) === BLOCKS.TNT) {
                            tntManager.cancelTimerAt(leftX, y);
                            leftX--;
                        }
                    }
                }
            } else if (type === BLOCKS.JUMP_PAD) {
                // Cancel timers for all connected TNTs below
                let checkY = y + 1;
                while (world.getBlock(x, checkY) === BLOCKS.TNT) {
                    tntManager.cancelTimerAt(x, checkY);
                    checkY++;
                }
            } else if (type === BLOCKS.ACCELERATOR_LEFT) {
                // Cancel timers for all connected TNTs to the right
                let checkX = x + 1;
                while (world.getBlock(checkX, y) === BLOCKS.TNT) {
                    tntManager.cancelTimerAt(checkX, y);
                    checkX++;
                }
            } else if (type === BLOCKS.ACCELERATOR_RIGHT) {
                // Cancel timers for all connected TNTs to the left
                let checkX = x - 1;
                while (world.getBlock(checkX, y) === BLOCKS.TNT) {
                    tntManager.cancelTimerAt(checkX, y);
                    checkX--;
                }
            } else if (type === BLOCKS.SAPLING) {
                saplingManager.addSapling(x, y);
            }
        }
    });

    // Initialize Input
    input = createInput(canvas, {
        onHotbarSelect: selectHotbar,
        onTouch: (x, y) => actions.handlePointer(x, y),
        onClimb: () => actions.triggerClimb()
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

    // Poll gamepad state (every physics tick for responsive input)
    if (input.pollGamepads) {
        // Calculate player's screen position for cursor clamping
        const playerScreenX = player.getCenterX() - camera.x;
        const playerScreenY = player.getCenterY() - camera.y;

        input.pollGamepads({
            screenWidth: logicalWidth,
            screenHeight: logicalHeight,
            playerScreenX,
            playerScreenY,
            reach: REACH
        });
    }

    // Disable jump while crafting UI is open (A button should only select items)
    if (isCraftingOpen) {
        input.keys.jump = false;
    }

    player.tick(input);

    // Input Handling - Mouse
    if (input.mouse.leftDown) {
        if (!isCraftingOpen) {
            actions.handlePointer(input.mouse.x, input.mouse.y);
        }
        input.mouse.leftDown = false;
    }

    // Input Handling - Gamepad (RT for break only, LT for place only)
    if (input.gamepad && input.gamepad.connected && !isCraftingOpen) {
        const gcX = input.gamepad.cursorX;
        const gcY = input.gamepad.cursorY;

        // RT - Break block only
        if (input.gamepad.breakAction) {
            actions.handlePointer(gcX, gcY, 'break');
            input.gamepad.breakAction = false;
        }

        // LT - Place block only (including climb)
        if (input.gamepad.placeAction) {
            actions.handlePointer(gcX, gcY, 'place');
            input.gamepad.placeAction = false;
        }
    }

    // System Updates
    updateCrafting(player, world, textures);

    // Poll gamepad for crafting UI navigation
    if (isCraftingOpen) {
        pollCraftingGamepad();
    }

    handleJackpotOverlap(player, world, sounds);
    tickJackpots();

    handleAcceleratorOverlap(player, world);
    tickAccelerators();

    tickFireworks(world, camera.x, camera.y, { width: logicalWidth, height: logicalHeight });
    tickBlockParticles();

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
        input,
        tntManager
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

// --- Service Worker Registration for PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
