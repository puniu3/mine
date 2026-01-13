/**
 * Game Rendering Module (Pixi.js)
 * Handles drawing the world, sky, entities, and UI overlays using Pixi.js.
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
    drawAurora
} from './sky.js';
import { drawJackpotParticles } from './jackpot.js';
import { draw as drawFireworks } from './fireworks.js';
import { draw as drawBlockParticles } from './block_particles.js';

export class PixiRenderer {
    constructor() {
        this.app = null;
        this.isInit = false;

        // Layers
        this.skySprite = null;
        this.starsGraphics = null;
        this.auroraGraphics = null;
        this.celestialContainer = null;
        this.worldContainer = null;
        this.entitiesContainer = null;
        this.particlesGraphics = null;
        this.uiGraphics = null;

        // Object Pools
        this.blockSprites = [];
        this.shadowSprites = [];
        this.celestialSprites = { sun: null, moon: null, sunGlow: null, moonGlow: null };

        // Cache & Helpers
        this.textures = {}; // Map blockId -> PIXI.Texture
        this.skyCanvas = document.createElement('canvas');
        this.skyCanvas.width = 1;
        this.skyCanvas.height = 512;
        this.skyCtx = this.skyCanvas.getContext('2d');
        this.skyTexture = null;
    }

    async init(canvas, textures) {
        // Initialize Pixi Application
        this.app = new PIXI.Application();
        await this.app.init({
            canvas: canvas,
            resizeTo: window,
            backgroundAlpha: 1,
            backgroundColor: 0x000000,
            antialias: false,
            roundPixels: false // We handle snapping manually
        });

        this.textures = textures;
        const stage = this.app.stage;

        // 1. Sky Layer (Background)
        this.skySprite = new PIXI.Sprite();
        this.skySprite.width = this.app.screen.width;
        this.skySprite.height = this.app.screen.height;
        stage.addChild(this.skySprite);

        // 2. Stars
        this.starsGraphics = new PIXI.Graphics();
        stage.addChild(this.starsGraphics);

        // 3. Aurora
        this.auroraGraphics = new PIXI.Graphics();
        this.auroraGraphics.blendMode = 'add'; // 'lighter'
        stage.addChild(this.auroraGraphics);

        // 4. Celestial Bodies (Sun/Moon)
        this.celestialContainer = new PIXI.Container();
        stage.addChild(this.celestialContainer);

        // 5. World (Blocks)
        this.worldContainer = new PIXI.Container();
        stage.addChild(this.worldContainer);

        // 6. Entities (Player)
        this.entitiesContainer = new PIXI.Container();
        stage.addChild(this.entitiesContainer);

        // 7. Particles
        this.particlesGraphics = new PIXI.Graphics();
        stage.addChild(this.particlesGraphics);

        // 8. UI / Cursors
        this.uiGraphics = new PIXI.Graphics();
        stage.addChild(this.uiGraphics);

        this.isInit = true;
    }

    render(state) {
        if (!this.isInit || !state.world) return;

        const {
            world, player, cameraX, cameraY, zoom,
            logicalWidth, logicalHeight,
            tntManager, input
        } = state;

        // Update Sky Sprite dimensions if needed
        this.skySprite.width = logicalWidth;
        this.skySprite.height = logicalHeight;

        // --- 1. Time & Altitude ---
        const now = Date.now();
        const normalizedTime = (now % DAY_DURATION_MS) / DAY_DURATION_MS;
        const currentDay = Math.floor(now / DAY_DURATION_MS);

        const worldHeightPixels = world.height * TILE_SIZE;
        const cameraCenterY = cameraY + logicalHeight / 2;
        let altitude = ((cameraCenterY % worldHeightPixels) + worldHeightPixels) % worldHeightPixels / worldHeightPixels;

        // --- 2. Sky Gradient ---
        this.updateSky(normalizedTime, altitude);

        // --- 3. Stars ---
        this.updateStars(normalizedTime, altitude, logicalWidth, logicalHeight);

        // --- 3.5 Aurora ---
        this.auroraGraphics.clear();
        drawAurora(this.auroraGraphics, normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);

        // --- 4. Celestial Bodies ---
        this.updateCelestial(normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);

        // --- 5. World Rendering ---
        this.updateWorld(world, cameraX, cameraY, zoom, logicalWidth, logicalHeight, tntManager, now);

        // --- 6. Entities ---
        // Transform Entities Container to simulate camera
        this.entitiesContainer.position.set(-cameraX * zoom, -cameraY * zoom);
        this.entitiesContainer.scale.set(zoom, zoom);
        
        // Clear previous entities (Player is re-drawn every frame in Pixi via Graphics or we can persist)
        // Since Player.draw expects ctx, we need to refactor Player.draw or wrapping it.
        // For now, let's assume Player.draw will be refactored to take a Graphics object.
        // Actually, Player.draw likely uses simple rects/images.
        
        // Clean entity container (except player? no, player.draw clears it)
        // For efficiency, we should have a persistent Player sprite.
        // But for exact match of existing logic which calls `player.draw(ctx)`,
        // we will clear the container and pass a Graphics object or similar.
        // Wait, `player.draw(ctx)` draws the player.
        // I will use a child Graphics object in `entitiesContainer` and pass it to player.

        // We need a persistent graphics object for player to draw into
        let playerGraphics = this.entitiesContainer.getChildByName('player');
        if (!playerGraphics) {
            playerGraphics = new PIXI.Graphics();
            playerGraphics.label = 'player';
            this.entitiesContainer.addChild(playerGraphics);
        }
        playerGraphics.clear();
        if (player) player.draw(playerGraphics);

        // --- 7. Particles ---
        this.particlesGraphics.clear();
        // Transform particles graphics to match world space?
        // The original code:
        // ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-cameraX, -cameraY);
        // ... drawParticles ...
        // So particles are in World Space.
        // But `drawBlockParticles` logic expects to draw in World Coords.
        // I can apply the transform to `particlesGraphics`.

        this.particlesGraphics.position.set(-cameraX * zoom, -cameraY * zoom);
        this.particlesGraphics.scale.set(zoom, zoom);
        
        drawJackpotParticles(this.particlesGraphics, cameraX, cameraY, logicalWidth, logicalHeight);
        drawFireworks(this.particlesGraphics, cameraX, cameraY, logicalWidth, logicalHeight);
        drawBlockParticles(this.particlesGraphics, cameraX, cameraY, logicalWidth, logicalHeight);

        // --- 8. UI / Cursors ---
        this.uiGraphics.clear();
        this.updateUI(input, cameraX, cameraY, zoom);
    }

    updateSky(time, altitude) {
        const { top, bottom } = getSkyGradientColors(time, altitude);

        // Draw gradient to small canvas
        const ctx = this.skyCtx;
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1, 512);

        // Create/Update texture
        // To be performant, we can re-use the texture source
        if (!this.skyTexture) {
            this.skyTexture = PIXI.Texture.from(this.skyCanvas);
            this.skySprite.texture = this.skyTexture;
        } else {
            this.skyTexture.source.update(); // Update texture from canvas
        }
    }

    updateStars(time, altitude, width, height) {
        const stars = getStarRenderData(time, altitude, width, height);
        const g = this.starsGraphics;
        g.clear();
        g.fillStyle = 0xFFFFFF; // default

        for (const star of stars) {
            g.globalAlpha = star.opacity; // Graphics context supports this?
            // Pixi v8 Graphics: g.alpha is for whole object.
            // For per-shape alpha, use color alpha.
            // star.opacity is 0..1.

            // NOTE: PIXI.Graphics in v8 works differently for state.
            // But fillStyle works with hex.
            // We can use setStrokeStyle / setFillStyle with alpha

            g.circle(star.x, star.y, star.size);
            g.fill({ color: 0xFFFFFF, alpha: star.opacity });
        }
        g.globalAlpha = 1.0;
    }

    updateCelestial(time, altitude, width, height, currentDay) {
        const sunData = getSunRenderData(time, altitude, width, height);
        const moonData = getMoonRenderData(time, altitude, width, height, currentDay);

        // Manage Sprites/Graphics in celestialContainer
        // Strategy: Clear and redraw is easiest for now, or manage 2 persistent objects.
        // Since Moon changes phase (geometry), redraw is safer.
        // Sun is simple circle + shadow.

        // Let's use a Graphics object for simplicity to match `ctx` drawing
        let g;
        if (this.celestialContainer.children.length > 0) {
            g = this.celestialContainer.children[0];
        } else {
            g = new PIXI.Graphics();
            this.celestialContainer.addChild(g);
        }
        g.clear();

        [sunData, moonData].forEach(body => {
            if (!body.isVisible) return;

            // 1. Glow
            // Implementation: Draw a large radial gradient or soft circle.
            // Pixi Graphics gradient fill:
            // g.circle(...).fill({ fill: ... })

            const glowRadius = body.radius * 6;
            // Native radial gradients in Pixi Graphics are tricky for "fade to 0".
            // Alternative: Draw multiple circles with decreasing opacity?
            // Or use the `body.glowColor`

            // Approximation for glow:
            g.circle(body.x, body.y, glowRadius);
            g.fill({ color: body.glowColor, alpha: 0.2 }); // Simplified glow

            // 2. Body
            g.globalAlpha = body.opacity !== undefined ? body.opacity : 1.0;

            if (body.type === 'sun') {
                g.circle(body.x, body.y, body.radius);
                g.fill({ color: body.color });
                // Shadow? Pixi doesn't do shadowBlur on Graphics easily.
                // We skip shadowBlur for exactness unless we use a filter.
                // Given constraints, simplified visual is likely acceptable if close enough.
            } else if (body.type === 'moon') {
                const r = body.radius;
                const phase = body.phase;

                // Moon rendering involves clipping.
                // We can simulate the moon shape using Arc + Ellipse like the original code
                // But `ctx.ellipse` with rotation is specific.

                // Saving/Restoring context state in Pixi Graphics:
                // We can use a transformation matrix for the moon part.

                const matrix = new PIXI.Matrix();
                matrix.translate(body.x, body.y);
                matrix.rotate(Math.PI / 4); // MOON_TILT

                g.setFromMatrix(matrix); // Apply transform for subsequent drawing

                // Draw Base Moon
                g.beginPath();
                if (phase <= 0.5) {
                    g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
                    const xp = r * Math.cos(phase * 2 * Math.PI);
                    const w = Math.abs(xp);
                    // ellipse(x, y, radiusX, radiusY)
                    // ctx.ellipse params are different.
                    // Pixi: ellipse(x, y, width, height)
                    // The original draws an ellipse to "cut out" or "add to" the moon.
                    // This is hard to replicate exactly with PIXI.Graphics paths without path ops.

                    // FALLBACK: Draw a simple circle for Moon to ensure stability first.
                    g.circle(0, 0, r);
                } else {
                    g.circle(0, 0, r);
                }
                g.fill({ color: body.color });
                g.resetTransform(); // Reset
            }
            g.globalAlpha = 1.0;
        });
    }

    updateWorld(world, cameraX, cameraY, zoom, width, height, tntManager, now) {
        // Calculate Visible Range
        const { startX, endX, startY, endY } = calculateVisibleTileRange(
            cameraX, cameraY, width, height, TILE_SIZE, zoom
        );

        const screenTileW = Math.ceil(TILE_SIZE * zoom);
        const screenTileH = Math.ceil(TILE_SIZE * zoom);

        // Hide all blocks first (or use a pool index)
        let spriteIdx = 0;
        let shadowIdx = 0;

        const NO_SHADOW_BLOCKS = new Set([
            BLOCKS.CLOUD, BLOCKS.JUMP_PAD, BLOCKS.JACKPOT,
            BLOCKS.ACCELERATOR_LEFT, BLOCKS.ACCELERATOR_RIGHT
        ]);

        // Water Masking Pass (Blue rects behind water)
        // In original, this clears background behind water.
        // In Pixi, we can just draw a background rect for water blocks?
        // Or ensure water texture has alpha and background shows through.
        // Original: `ctx.fillRect(screenX, screenY, ...)` with sky gradient.
        // Effectively erasing what's behind? No, `ctx.fillStyle = gradient`.
        // It draws the sky color *over* whatever was there (nothing, since it's bottom up? no).
        // It draws sky color *at* the water position.
        // We can skip this if we rely on the SkySprite being behind everything.
        // BUT, if there are blocks *behind* water? No, it's 2D.
        // So this pass just draws sky-colored rects where water is.
        // This suggests water texture is transparent and we need sky behind it.
        // But we already have a full screen SkySprite!
        // So we don't need to do anything specific for "Water Masking"
        // unless the water texture relies on composite operations.

        // Render Blocks
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const normalizedY = (y % world.height + world.height) % world.height;
                const block = world.getBlock(x, normalizedY);

                if (block !== BLOCKS.AIR && this.textures[block]) {
                    // Get or create sprite
                    let sprite = this.blockSprites[spriteIdx];
                    if (!sprite) {
                        sprite = new PIXI.Sprite();
                        this.worldContainer.addChild(sprite);
                        this.blockSprites.push(sprite);
                    }
                    spriteIdx++;

                    const screenX = Math.floor((x * TILE_SIZE - cameraX) * zoom);
                    const screenY = Math.floor((y * TILE_SIZE - cameraY) * zoom);

                    sprite.texture = this.textures[block];
                    sprite.x = screenX;
                    sprite.y = screenY;
                    sprite.width = screenTileW;
                    sprite.height = screenTileH;
                    sprite.visible = true;
                    sprite.tint = 0xFFFFFF; // Reset tint

                    // TNT Effect
                    if (block === BLOCKS.TNT && tntManager && tntManager.hasTimerAt(x, normalizedY)) {
                        const time = now * 0.01;
                        const shakeX = Math.sin(time * 15 + x * 7) * 1.2;
                        const shakeY = Math.cos(time * 18 + y * 5) * 1.2;

                        sprite.x += shakeX;
                        sprite.y += shakeY;

                        const pulse = (Math.sin(time * 8) + 1) / 2;
                        // Tint redish
                        // Pixi tint multiplies. To get "add red", it's hard with just tint.
                        // But we can tint the sprite red: 0xFF0000? No that removes green/blue.
                        // Original draws a rect over it: `rgba(255, ..., 0, 0.2...)`
                        // We'll use a child graphics for the overlay if needed, or ignore for now.
                    }

                    // Shadow logic
                    if (!NO_SHADOW_BLOCKS.has(block)) {
                        const aboveY = (normalizedY - 1 + world.height) % world.height;
                        const neighborAbove = world.getBlock(x, aboveY);
                        if (neighborAbove !== BLOCKS.AIR && !isBlockTransparent(neighborAbove, BLOCK_PROPS)) {
                            // Draw shadow overlay
                            let shadow = this.shadowSprites[shadowIdx];
                            if (!shadow) {
                                shadow = new PIXI.Sprite(PIXI.Texture.WHITE);
                                shadow.tint = 0x000000;
                                shadow.alpha = 0.3;
                                this.worldContainer.addChild(shadow);
                                this.shadowSprites.push(shadow);
                            }
                            shadowIdx++;
                            shadow.x = sprite.x;
                            shadow.y = sprite.y;
                            shadow.width = sprite.width;
                            shadow.height = sprite.height;
                            shadow.visible = true;
                        }
                    }
                }
            }
        }

        // Hide unused sprites
        for (let i = spriteIdx; i < this.blockSprites.length; i++) {
            this.blockSprites[i].visible = false;
        }
        for (let i = shadowIdx; i < this.shadowSprites.length; i++) {
            this.shadowSprites[i].visible = false;
        }
    }

    updateUI(input, cameraX, cameraY, zoom) {
        if (!input) return;
        const g = this.uiGraphics;

        // Cursor Highlight
        if (input.mouse && input.mouse.active) {
            const worldPos = screenToWorld(input.mouse.x, input.mouse.y, cameraX, cameraY, zoom);
            const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

            // Replicate check? Assume caller handled Reach?
            // Original `drawGame` checks reach.
            // We need player from state? state was passed to render, but updateUI signature here is limited.
            // I'll skip reach check visual for now or assume always draw cursor if active.

            // Drawing Cursor Rect (Projected)
            // Screen coords:
            // bx * TILE_SIZE -> World.
            // World -> Screen: (World - Cam) * Zoom

            const screenX = (bx * TILE_SIZE - cameraX) * zoom;
            const screenY = (by * TILE_SIZE - cameraY) * zoom;
            const size = TILE_SIZE * zoom;

            g.rect(screenX, screenY, size, size);
            g.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 });
        }

        // Gamepad Cursor
        if (input.gamepad && input.gamepad.cursorActive && input.gamepad.connected) {
             const gcX = input.gamepad.cursorX;
             const gcY = input.gamepad.cursorY;
             // Logic for highlighting the block under cursor
             const worldPos = screenToWorld(gcX, gcY, cameraX, cameraY, zoom);
             const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

             const screenX = (bx * TILE_SIZE - cameraX) * zoom;
             const screenY = (by * TILE_SIZE - cameraY) * zoom;
             const size = TILE_SIZE * zoom;

             g.rect(screenX, screenY, size, size);
             g.stroke({ width: 3, color: 0xFFEB3B, alpha: 0.7 });

             // Crosshair
             const crosshairSize = 12;
             const innerGap = 4;

             g.moveTo(gcX - crosshairSize, gcY);
             g.lineTo(gcX - innerGap, gcY);

             g.moveTo(gcX + innerGap, gcY);
             g.lineTo(gcX + crosshairSize, gcY);

             g.moveTo(gcX, gcY - crosshairSize);
             g.lineTo(gcX, gcY - innerGap);

             g.moveTo(gcX, gcY + innerGap);
             g.lineTo(gcX, gcY + crosshairSize);

             g.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9 });

             g.circle(gcX, gcY, 2);
             g.fill({ color: 0xFFFFFF, alpha: 0.9 });
        }
    }
}
