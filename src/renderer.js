/**
 * Game Rendering Module (PixiJS)
 * Handles drawing the world, sky, entities, and UI overlays.
 */

import {
    screenToWorld,
    worldToTile,
    isWithinReach,
    isBlockTransparent,
    calculateVisibleTileRange
} from './utils.js';
import {
    TILE_SIZE,
    BLOCKS,
    BLOCK_PROPS,
    REACH,
    DAY_DURATION_MS
} from './constants.js';
import {
    getSkyGradientColors,
    getSunRenderData,
    getMoonRenderData,
    getStarRenderData,
    getAltitudeVisibility
} from './sky.js';
import { drawJackpotParticles } from './jackpot.js'; // Will be refactored to use Pixi
import { draw as drawFireworks } from './fireworks.js'; // Will be refactored
import { draw as drawBlockParticles } from './block_particles.js'; // Will be refactored

const PIXI = window.PIXI;

// --- Global Renderer State ---
let app;
let isInitialized = false;

// Texture Cache (Block ID -> PIXI.Texture)
const blockTextureCache = {};

// Sprite Pools
const blockSprites = []; // Array of PIXI.Sprite
let blockSpriteCount = 0; // Number of active sprites in current frame

// Layers (Containers)
let skyContainer;
let starContainer;
let celestialContainer; // Sun, Moon
let auroraContainer;
let worldContainer;
let entityContainer; // Player, Particles
let uiContainer;     // Cursor, Highlights

// Reusable Graphics/Sprites
let skyGradientSprite;
let skyCanvas; // Canvas for generating gradient texture
let skyCtx;

let auroraTexture; // Gradient texture for aurora ribbons
let glowTexture; // Radial gradient for sun/moon glow

// --- Initialization ---

export async function initRenderer(canvas) {
    if (isInitialized) return;

    app = new PIXI.Application();

    // Initialize Pixi Application
    await app.init({
        canvas: canvas,
        backgroundAlpha: 0, // Transparent, we draw sky manually
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: window
    });

    // Create Layers
    skyContainer = new PIXI.Container();
    starContainer = new PIXI.Container();
    auroraContainer = new PIXI.Container();
    celestialContainer = new PIXI.Container();
    worldContainer = new PIXI.Container();
    entityContainer = new PIXI.Container();
    uiContainer = new PIXI.Container();

    app.stage.addChild(skyContainer);
    app.stage.addChild(starContainer);
    app.stage.addChild(auroraContainer);
    app.stage.addChild(celestialContainer);
    app.stage.addChild(worldContainer);
    app.stage.addChild(entityContainer);
    app.stage.addChild(uiContainer);

    // Initialize Sky Gradient Helper
    skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1;
    skyCanvas.height = 256;
    skyCtx = skyCanvas.getContext('2d');
    skyGradientSprite = new PIXI.Sprite();
    skyContainer.addChild(skyGradientSprite);

    // Initialize Aurora Texture
    const auroraCanvas = document.createElement('canvas');
    auroraCanvas.width = 1;
    auroraCanvas.height = 256;
    const aCtx = auroraCanvas.getContext('2d');
    const grad = aCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.6)'); // Slightly transparent white base
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 1, 256);
    auroraTexture = PIXI.Texture.from(auroraCanvas);

    // Initialize Glow Texture (Radial Gradient)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gCtx = glowCanvas.getContext('2d');
    const glowGrad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    glowGrad.addColorStop(0, 'rgba(255,255,255,1)');
    glowGrad.addColorStop(0.3, 'rgba(255,255,255,0.1)');
    glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
    gCtx.fillStyle = glowGrad;
    gCtx.fillRect(0, 0, 128, 128);
    glowTexture = PIXI.Texture.from(glowCanvas);

    isInitialized = true;
    console.log("Pixi Renderer Initialized");
}

export function setBlockTextures(generatedTextures) {
    // Convert HTMLCanvasElement textures to PIXI.Textures
    for (const [id, canvas] of Object.entries(generatedTextures)) {
        const texture = PIXI.Texture.from(canvas);
        texture.source.scaleMode = 'nearest'; // Ensure pixel art look
        blockTextureCache[id] = texture;
    }
}

// --- Helper: Get or Create Sprite from Pool ---
function getBlockSprite(index) {
    if (index < blockSprites.length) {
        const sprite = blockSprites[index];
        sprite.visible = true;
        sprite.alpha = 1; // Reset alpha
        sprite.tint = 0xFFFFFF; // Reset tint
        return sprite;
    } else {
        const sprite = new PIXI.Sprite();
        sprite.anchor.set(0); // Top-left origin
        worldContainer.addChild(sprite);
        blockSprites.push(sprite);
        return sprite;
    }
}

function hideUnusedSprites(usedCount) {
    for (let i = usedCount; i < blockSprites.length; i++) {
        blockSprites[i].visible = false;
    }
}

// --- Main Render Function ---

export function drawGame(state) {
    if (!isInitialized || !app) return;

    const {
        world,
        player,
        cameraX,
        cameraY,
        zoom = 1,
        logicalWidth,
        logicalHeight,
        input,
        tntManager
    } = state;

    // --- 0. Update Layer Transforms (Camera) ---
    // World and Entity layers move with camera
    // We implement camera by moving the container
    // cameraX/Y is top-left of viewport in world coords

    // Actually, the previous renderer drew tiles at `(x * TILE_SIZE - cameraX) * zoom`.
    // We can achieve this by setting container position and scale.

    worldContainer.x = -cameraX * zoom;
    worldContainer.y = -cameraY * zoom;
    worldContainer.scale.set(zoom);

    entityContainer.x = -cameraX * zoom;
    entityContainer.y = -cameraY * zoom;
    entityContainer.scale.set(zoom);

    // UI/Sky layers are screen space (mostly)
    // Sky is screen space

    // --- 1. Calculate Time & Altitude ---
    const now = Date.now();
    const normalizedTime = (now % DAY_DURATION_MS) / DAY_DURATION_MS;
    const currentDay = Math.floor(now / DAY_DURATION_MS);
    const worldHeightPixels = world.height * TILE_SIZE;
    const cameraCenterY = cameraY + logicalHeight / 2;
    let altitude = ((cameraCenterY % worldHeightPixels) + worldHeightPixels) % worldHeightPixels / worldHeightPixels;

    // --- 2. Sky Gradient ---
    updateSky(normalizedTime, altitude, logicalWidth, logicalHeight);

    // --- 3. Stars ---
    updateStars(normalizedTime, altitude, logicalWidth, logicalHeight);

    // --- 4. Celestial Bodies (Sun/Moon) ---
    updateCelestialBodies(normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);

    // --- 5. Aurora ---
    updateAurora(normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);

    // --- 6. World Rendering (Blocks) ---
    blockSpriteCount = 0;

    const { startX, endX, startY, endY } = calculateVisibleTileRange(
        cameraX, cameraY, logicalWidth, logicalHeight, TILE_SIZE, zoom
    );

    const NO_SHADOW_BLOCKS = new Set([
        BLOCKS.CLOUD,
        BLOCKS.JUMP_PAD,
        BLOCKS.JACKPOT,
        BLOCKS.ACCELERATOR_LEFT,
        BLOCKS.ACCELERATOR_RIGHT,
    ]);

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const normalizedY = (y % world.height + world.height) % world.height;
            const block = world.getBlock(x, normalizedY);

            if (block !== BLOCKS.AIR && blockTextureCache[block]) {
                const sprite = getBlockSprite(blockSpriteCount++);

                // Position in World Coordinates
                sprite.x = x * TILE_SIZE;
                sprite.y = y * TILE_SIZE;
                sprite.width = TILE_SIZE;
                sprite.height = TILE_SIZE;
                sprite.texture = blockTextureCache[block];

                // Logic from original renderer:
                // TNT Special Effects
                if (block === BLOCKS.TNT && tntManager && tntManager.hasTimerAt(x, normalizedY)) {
                    const time = now * 0.01;
                    const shakeX = Math.sin(time * 15 + x * 7) * 1.2;
                    const shakeY = Math.cos(time * 18 + y * 5) * 1.2;
                    sprite.x += shakeX;
                    sprite.y += shakeY;
                    
                    // Pulse red
                    const pulse = (Math.sin(time * 8) + 1) / 2;
                    // Tint logic: 0xFFFFFF is normal.
                    // To tint RED, we want (1, 0, 0) multiply? No, Pixi tint multiplies.
                    // If texture is white/red, multiplying by Red makes it Red.
                    // But if texture is arbitrary, we want to overlay red.
                    // Pixi Sprite doesn't support overlay color easily without custom shader.
                    // Simple hack: Tint it reddish (removes green/blue).
                    const val = Math.floor(255 * (1 - pulse * 0.5)); // 255 to 128
                    // R=255, G=val, B=val
                    sprite.tint = (255 << 16) | (val << 8) | val;
                }

                // Shadow Logic
                if (!NO_SHADOW_BLOCKS.has(block)) {
                    const aboveY = (normalizedY - 1 + world.height) % world.height;
                    const neighborAbove = world.getBlock(x, aboveY);
                    if (neighborAbove !== BLOCKS.AIR && !isBlockTransparent(neighborAbove, BLOCK_PROPS)) {
                        // Apply shadow tint
                        // Original was black with 0.3 alpha.
                        // Multiply: 0.7 intensity
                        const shadowVal = Math.floor(255 * 0.7);
                        // Combine with existing tint (if any)
                        const currentTint = sprite.tint;
                        const r = ((currentTint >> 16) & 0xFF) * 0.7;
                        const g = ((currentTint >> 8) & 0xFF) * 0.7;
                        const b = (currentTint & 0xFF) * 0.7;
                        sprite.tint = (r << 16) | (g << 8) | b;
                    }
                }
            }
        }
    }

    hideUnusedSprites(blockSpriteCount);

    // --- 7. Entities & Particles ---
    // We pass the entityContainer to these functions?
    // Or we continue to assume they draw to "ctx"?
    // The instructions say "Refactor Rendering Logic".
    // I need to update those modules later.
    // For now, I will create a "Graphics Context Adapter" OR
    // I'll rely on the plan to refactor them in Step 5.
    // BUT the game will crash if I call `player.draw(ctx)` and ctx is gone.
    // Wait, `renderGame` doesn't receive `ctx`.
    // I must update `player.draw` to accept a Pixi container or renderer.

    // For this step (Core Rendering), I am establishing the system.
    // I will call `player.draw(entityContainer)` and hope to patch Player soon.
    // Actually, I should probably do a quick patch on Player in the next steps.
    // Important: `entityContainer` is already scaled/positioned for world space.

    // --- TEMPORARY: Clear entity container every frame and redraw? ---
    // This mimics immediate mode for entities.
    entityContainer.removeChildren();

    if (player && typeof player.renderPixi === 'function') {
        player.renderPixi(entityContainer);
    }

    drawJackpotParticles(entityContainer, cameraX, cameraY, logicalWidth, logicalHeight);
    drawFireworks(entityContainer, cameraX, cameraY, logicalWidth, logicalHeight);
    drawBlockParticles(entityContainer, cameraX, cameraY, logicalWidth, logicalHeight);

    // --- 8. UI Overlay (Cursor) ---
    uiContainer.removeChildren();
    const uiGraphics = new PIXI.Graphics();
    uiContainer.addChild(uiGraphics);

    if (input && input.mouse && input.mouse.active) {
        // screenToWorld uses zoom now
        const worldPos = screenToWorld(input.mouse.x, input.mouse.y, cameraX, cameraY, zoom);
        // We need tile coordinates
        const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

        if (isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
            // Draw Cursor
            // Since UI container is in screen space? No, let's keep UI container in screen space.
            // But we want to draw the cursor at the TILE position (World Space projected to Screen).

            const screenX = (bx * TILE_SIZE - cameraX) * zoom;
            const screenY = (by * TILE_SIZE - cameraY) * zoom;
            const size = TILE_SIZE * zoom;

            uiGraphics.rect(screenX, screenY, size, size);
            uiGraphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 });
        }
    }

    // Gamepad Highlight
     if (input && input.gamepad && input.gamepad.cursorActive && input.gamepad.connected) {
        const gcX = input.gamepad.cursorX;
        const gcY = input.gamepad.cursorY;
        const worldPos = screenToWorld(gcX, gcY, cameraX, cameraY, zoom);
        const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

        const screenX = (bx * TILE_SIZE - cameraX) * zoom;
        const screenY = (by * TILE_SIZE - cameraY) * zoom;
        const size = TILE_SIZE * zoom;

        uiGraphics.rect(screenX, screenY, size, size);
        uiGraphics.stroke({ width: 3, color: 0xFFEB3B, alpha: 0.7 });

        // Crosshair (Screen Space)
        const crosshairSize = 12;
        const innerGap = 4;

        uiGraphics.beginPath();
        uiGraphics.moveTo(gcX - crosshairSize, gcY);
        uiGraphics.lineTo(gcX - innerGap, gcY);
        uiGraphics.moveTo(gcX + innerGap, gcY);
        uiGraphics.lineTo(gcX + crosshairSize, gcY);
        uiGraphics.moveTo(gcX, gcY - crosshairSize);
        uiGraphics.lineTo(gcX, gcY - innerGap);
        uiGraphics.moveTo(gcX, gcY + innerGap);
        uiGraphics.lineTo(gcX, gcY + crosshairSize);
        uiGraphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9 });

        uiGraphics.circle(gcX, gcY, 2);
        uiGraphics.fill(0xFFFFFF);
    }
}

// --- Helpers for Sub-systems ---

function updateSky(time, altitude, width, height) {
    const { top, bottom } = getSkyGradientColors(time, altitude);

    // Update gradient texture
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 1, 256);

    // Update Pixi Sprite
    if (!skyGradientSprite._cachedTexture) {
         skyGradientSprite._cachedTexture = PIXI.Texture.from(skyCanvas, {
            scaleMode: 'linear' // Ensure smooth gradient scaling
         });
         skyGradientSprite._cachedTexture.source.scaleMode = 'linear';
         skyGradientSprite.texture = skyGradientSprite._cachedTexture;
    } else {
         skyGradientSprite._cachedTexture.source.update(); // Force update from canvas
    }

    skyGradientSprite.width = width;
    skyGradientSprite.height = height;
}

// Pool for stars
let starGraphics;
function updateStars(time, altitude, width, height) {
    if (!starGraphics) {
        starGraphics = new PIXI.Graphics();
        starContainer.addChild(starGraphics);
    }
    starGraphics.clear();

    const stars = getStarRenderData(time, altitude, width, height);
    if (stars.length === 0) return;

    starGraphics.fillStyle = 0xFFFFFF; // Stars are white

    for (const star of stars) {
        starGraphics.globalAlpha = star.opacity; // Graphics context alpha?
        // PIXI Graphics doesn't have globalAlpha per shape unless we batch.
        // We can use alpha in the fill color?
        // 0xFFFFFF with alpha.
        starGraphics.circle(star.x, star.y, star.size);
        starGraphics.fill({ color: 0xFFFFFF, alpha: star.opacity });
    }
}

// Sun/Moon Sprites
let sunGraphics;
let sunGlowSprite;
let moonGraphics;
let moonGlowSprite;

function updateCelestialBodies(time, altitude, width, height, day) {
    if (!sunGraphics) {
        // Sun Body
        sunGraphics = new PIXI.Graphics();
        celestialContainer.addChild(sunGraphics);

        // Sun Glow (Sprite with texture)
        sunGlowSprite = new PIXI.Sprite(glowTexture);
        sunGlowSprite.anchor.set(0.5);
        // Blend mode add or normal? Glows are usually additive.
        // Original canvas used source-over, but additive is nicer.
        // Let's stick to default for now to match Canvas.
        celestialContainer.addChildAt(sunGlowSprite, 0); // Behind body
    }
    if (!moonGraphics) {
        // Moon Body
        moonGraphics = new PIXI.Graphics();
        celestialContainer.addChild(moonGraphics);

        // Moon Glow
        moonGlowSprite = new PIXI.Sprite(glowTexture);
        moonGlowSprite.anchor.set(0.5);
        celestialContainer.addChildAt(moonGlowSprite, 0); // Behind body
    }

    sunGraphics.clear();
    moonGraphics.clear();

    const sun = getSunRenderData(time, altitude, width, height);
    const moon = getMoonRenderData(time, altitude, width, height, day);

    // Update Sun
    if (sun.isVisible) {
        // Glow
        sunGlowSprite.visible = true;
        sunGlowSprite.x = sun.x;
        sunGlowSprite.y = sun.y;

        // Radius * 6 is total radius.
        // Texture is 128x128 (radius 64).
        // Scale = (DesiredRadius * 2) / 128
        const scale = (sun.radius * 6 * 2) / 128;
        sunGlowSprite.scale.set(scale);

        // Tint
        // glowColor string "rgba(r,g,b,a)" needs parsing for Tint + Alpha
        // Quick/dirty: Use a known color or parse it?
        // sun.glowColor is used for fill color in original.
        // We can just tint the white texture.
        // But Pixi tint expects Hex.
        // We need a helper to convert color string to hex.
        // Or hardcode based on sky logic?
        // Sky module returns: 'rgba(255, 255, 200, 0.4)' or 'rgba(255, 100, 50, 0.4)'

        let glowHex = 0xFFFFC8; // Default
        if (sun.glowColor.includes('100, 50')) glowHex = 0xFF6432;

        sunGlowSprite.tint = glowHex;
        sunGlowSprite.alpha = 0.4; // Hardcoded from sky.js string for now, or use generic

        // Body
        sunGraphics.circle(sun.x, sun.y, sun.radius);
        sunGraphics.fill({ color: sun.color, alpha: sun.opacity });
    } else {
        sunGlowSprite.visible = false;
    }

    // Update Moon
    if (moon.isVisible) {
        // Glow
        moonGlowSprite.visible = true;
        moonGlowSprite.x = moon.x;
        moonGlowSprite.y = moon.y;

        const scale = (moon.radius * 6 * 2) / 128;
        moonGlowSprite.scale.set(scale);

        // Moon glow: 'rgba(200, 220, 255, 0.2)'
        moonGlowSprite.tint = 0xC8DCFF;
        moonGlowSprite.alpha = 0.2;

        // Body
        moonGraphics.circle(moon.x, moon.y, moon.radius);
        moonGraphics.fill({ color: moon.color, alpha: moon.opacity });
    } else {
        moonGlowSprite.visible = false;
    }
}

let auroraGraphics;
function updateAurora(time, altitude, width, height, dayCount) {
    if (!auroraGraphics) {
        auroraGraphics = new PIXI.Graphics();
        auroraContainer.addChild(auroraGraphics);
    }
    auroraGraphics.clear();

    // 1. Visibility Check
    if (dayCount % 28 !== 0) {
        auroraContainer.visible = false;
        return;
    }

    let opacity = 0;
    if (time > 0.4 && time < 0.6) {
        if (time < 0.45) opacity = (time - 0.4) * 20;
        else if (time > 0.55) opacity = (0.6 - time) * 20;
        else opacity = 1.0;
    } else {
        auroraContainer.visible = false;
        return;
    }

    const altVis = getAltitudeVisibility(altitude);
    opacity *= altVis;

    if (opacity <= 0.01) {
        auroraContainer.visible = false;
        return;
    }
    auroraContainer.visible = true;
    auroraContainer.alpha = opacity; // Use container alpha

    const t = Date.now() / 4000;

    const ribbons = [
        { color: 0xA06432, h: 160, s: 100, l: 50, yBase: height * 0.2, amp: height * 0.1, speed: 1.0, widthScale: 1.0 }, // Green
        { color: 0x64643C, h: 260, s: 100, l: 60, yBase: height * 0.15, amp: height * 0.15, speed: 0.7, widthScale: 1.5 }, // Purple (Hue 260)
        { color: 0xBE6432, h: 190, s: 100, l: 50, yBase: height * 0.25, amp: height * 0.08, speed: 1.3, widthScale: 0.8 }  // Cyan
    ];

    // Helper to convert HSL to Hex number for Pixi
    // We already stored colors approx in hex above, but let's stick to simple
    // Actually, ribbon color should be white if we use the texture?
    // No, texture is white gradient. Color multiplies.
    // So we use HSL -> Hex.

    // We use a matrix to stretch the gradient texture to the screen height
    const matrix = new PIXI.Matrix();
    matrix.scale(1, height / 256); // Stretch 256px texture to screen height

    for (let i = 0; i < ribbons.length; i++) {
        const r = ribbons[i];

        // Construct points for the ribbon polygon
        // Bottom edge is wavy. Top edge is at y=0.
        // We iterate x.
        const points = [];
        const step = 40;

        // Start top-left
        points.push(0, 0);

        // Bottom wavy edge
        for (let x = 0; x <= width + step; x += step) {
            const noise1 = Math.sin(x * 0.002 * r.widthScale + t * r.speed + i);
            const noise2 = Math.sin(x * 0.005 * r.widthScale - t * r.speed * 0.5);
            const y = r.yBase + (noise1 * r.amp) + (noise2 * r.amp * 0.5);
            points.push(x, y);
        }

        // Top-right
        points.push(width + step, 0);

        // Close shape is handled by poly? No, we pushed vertices in order.

        // Convert HSL to RGB Hex
        // Simple HSL to RGB conversion helper or just use hardcoded hex
        // Green (160): #33ffaa -> 0x33ffaa
        // Purple (260): #aa66ff -> 0xaa66ff
        // Cyan (190): #33ccff -> 0x33ccff
        let hexColor = 0xFFFFFF;
        if (r.h === 160) hexColor = 0x33FFAA;
        if (r.h === 260) hexColor = 0xAA66FF;
        if (r.h === 190) hexColor = 0x33CCFF;

        auroraGraphics.poly(points);
        // Blend mode lighter
        auroraGraphics.blendMode = 'add';
        auroraGraphics.fill({
            texture: auroraTexture,
            color: hexColor,
            matrix: matrix,
            alpha: 0.6
        });
    }
}

// --- Expose for external access if needed ---
export function getApp() {
    return app;
}

export function getEntityContainer() {
    return entityContainer;
}

export function getWorldContainer() {
    return worldContainer;
}
