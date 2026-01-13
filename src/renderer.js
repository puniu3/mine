/**
 * Game Rendering Module
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
    drawAurora
} from './sky.js';
import { drawJackpotParticles } from './jackpot.js';
import { draw as drawFireworks } from './fireworks.js';
import { draw as drawBlockParticles } from './block_particles.js';

export function drawGame(ctx, {
    world,
    player,
    cameraX,
    cameraY,
    zoom = 1,
    logicalWidth,
    logicalHeight,
    textures,
    input,
    tntManager
}) {
    if (!world) return;

    // --- 1. Calculate Time & Altitude ---
    const now = Date.now();
    const normalizedTime = (now % DAY_DURATION_MS) / DAY_DURATION_MS;
    const currentDay = Math.floor(now / DAY_DURATION_MS);

    // Altitude: 0.0 (Top) to 1.0 (Bottom)
    const worldHeightPixels = world.height * TILE_SIZE;
    const cameraCenterY = cameraY + logicalHeight / 2;
    let altitude = ((cameraCenterY % worldHeightPixels) + worldHeightPixels) % worldHeightPixels / worldHeightPixels;

    // --- 2. Sky Gradient ---
    const { top: skyTop, bottom: skyBottom } = getSkyGradientColors(normalizedTime, altitude);

    const gradient = ctx.createLinearGradient(0, 0, 0, logicalHeight);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(1, skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // --- 3. Stars ---
    const stars = getStarRenderData(normalizedTime, altitude, logicalWidth, logicalHeight);
    ctx.fillStyle = '#FFFFFF';
    stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // --- 3.5 Aurora Borealis ---
    drawAurora(ctx, normalizedTime, altitude, logicalWidth, logicalHeight);

    // --- 4. Celestial Bodies & Atmosphere (Bloom) ---
    const sun = getSunRenderData(normalizedTime, altitude, logicalWidth, logicalHeight);
    const moon = getMoonRenderData(normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);
    const bodies = [sun, moon];

    // 4.1 Draw Glow/Bloom first (Behind the body)
    bodies.forEach(body => {
        if (!body.isVisible) return;
        ctx.globalAlpha = body.opacity !== undefined ? body.opacity : 1.0;

        // Create atmospheric glow
        const glowRadius = body.radius * 6;
        const glow = ctx.createRadialGradient(body.x, body.y, body.radius, body.x, body.y, glowRadius);
        
        // Use glowColor from sky.js or fallback
        const gColor = body.glowColor || 'rgba(255, 255, 255, 0.2)';
        
        glow.addColorStop(0, gColor);
        glow.addColorStop(0.3, gColor.replace(/[\d.]+\)$/, '0.1)')); // Fade opacity
        glow.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(body.x, body.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // 4.2 Draw Physical Bodies (Sun/Moon Discs)
    bodies.forEach(body => {
        if (!body.isVisible) return;
        
        ctx.globalAlpha = body.opacity !== undefined ? body.opacity : 1.0;

        if (body.type === 'sun') {
            // --- Sun Rendering ---
            ctx.beginPath();
            ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.shadowColor = body.shadow.color;
            ctx.shadowBlur = body.shadow.blur;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.type === 'moon') {
            // --- Moon Rendering ---
            const r = body.radius;
            const phase = body.phase; 
            
            ctx.save();
            ctx.translate(body.x, body.y);
            const MOON_TILT = Math.PI / 4; 
            ctx.rotate(MOON_TILT);

            ctx.shadowColor = body.shadow.color;
            ctx.shadowBlur = body.shadow.blur;
            
            ctx.fillStyle = body.color;
            ctx.beginPath();

            // Geometric Phase Logic
            if (phase <= 0.5) {
                // Waxing
                ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
                const xp = r * Math.cos(phase * 2 * Math.PI); 
                const w = Math.abs(xp);
                ctx.ellipse(0, 0, w, r, 0, Math.PI / 2, 3 * Math.PI / 2, xp > 0);
            } else {
                // Waning
                ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2, false);
                const xp = -r * Math.cos(phase * 2 * Math.PI);
                const w = Math.abs(xp);
                ctx.ellipse(0, 0, w, r, 0, -Math.PI / 2, Math.PI / 2, xp < 0);
            }

            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Craters
            ctx.save();
            ctx.clip(); 
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            const craters = [
                { dx: -8, dy: -5, r: 6 },
                { dx: 10, dy: 8, r: 4 },
                { dx: -5, dy: 10, r: 3 }
            ];
            craters.forEach(c => {
                ctx.beginPath();
                ctx.arc(c.dx, c.dy, c.r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore(); 
            ctx.restore(); 
        }
        ctx.globalAlpha = 1.0;
    });

    // --- Calculate Visible Range ---
    const { startX, endX, startY, endY } = calculateVisibleTileRange(
        cameraX, cameraY, logicalWidth, logicalHeight, TILE_SIZE, zoom
    );

    // Apply global zoom and translation for the world rendering
    ctx.save();
    ctx.scale(zoom, zoom);

    // --- 5. Water Masking Pass ---
    // Erase sky elements behind water to handle transparency correctly
    ctx.fillStyle = gradient;
    
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const normalizedY = (y % world.height + world.height) % world.height;
            const block = world.getBlock(x, normalizedY);

            if (block === BLOCKS.WATER) {
                const screenX = x * TILE_SIZE - Math.floor(cameraX);
                const screenY = y * TILE_SIZE - Math.floor(cameraY);
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Note: Water Mask (Step 5) uses explicit subtraction (x*TILE - cameraX)
    // so it naturally works inside the scaled context, producing (World - Camera) * Zoom.
    // However, Steps 6-9 use a global translation.
    // To harmonize, we will wrap Steps 6-9 in the translation as before,
    // but ensure Step 5's manual calculation is consistent or updated.
    // Actually, Step 5 relies on `screenX = x * TILE - cameraX`.
    // Inside `scale(zoom)`, this draws at `(x * TILE - cameraX) * zoom`. Correct.

    // Global translation for World Entities (Steps 6, 7, 8, 9)
    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    // --- 6. World Rendering ---
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

            if (block !== BLOCKS.AIR && textures[block]) {
                // Special rendering for TNT
                if (block === BLOCKS.TNT && tntManager && tntManager.hasTimerAt(x, normalizedY)) {
                    const time = now * 0.01; 
                    const shakeX = Math.sin(time * 15 + x * 7) * 1.2;
                    const shakeY = Math.cos(time * 18 + y * 5) * 1.2;
                    
                    ctx.drawImage(
                        textures[block],
                        x * TILE_SIZE + shakeX,
                        y * TILE_SIZE + shakeY
                    );

                    const pulse = (Math.sin(time * 8) + 1) / 2;
                    ctx.fillStyle = `rgba(255, ${Math.floor(100 - pulse * 100)}, 0, ${0.2 + pulse * 0.3})`;
                    ctx.fillRect(
                        x * TILE_SIZE + shakeX,
                        y * TILE_SIZE + shakeY,
                        TILE_SIZE,
                        TILE_SIZE
                    );

                    const sparkle = Math.sin(time * 20) > 0.3;
                    if (sparkle) {
                        const sparkX = x * TILE_SIZE + TILE_SIZE / 2 + shakeX + (Math.random() - 0.5) * 8;
                        const sparkY = y * TILE_SIZE + shakeY + 2;
                        const sparkSize = 3 + Math.random() * 3;
                        ctx.fillStyle = '#ffff00';
                        ctx.beginPath();
                        ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
                        ctx.beginPath();
                        ctx.arc(sparkX, sparkY, sparkSize + 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    ctx.drawImage(textures[block], x * TILE_SIZE, y * TILE_SIZE);
                }

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

    // --- 7. Entities & Particles ---
    if (player) player.draw(ctx);
    drawJackpotParticles(ctx, cameraX, cameraY, logicalWidth, logicalHeight);
    drawFireworks(ctx, cameraX, cameraY, logicalWidth, logicalHeight);
    drawBlockParticles(ctx, cameraX, cameraY, logicalWidth, logicalHeight);

    // --- 8. Cursor Highlight ---
    if (input && input.mouse && input.mouse.active) {
        // screenToWorld uses zoom now
        const worldPos = screenToWorld(input.mouse.x, input.mouse.y, cameraX, cameraY, zoom);
        const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);
        if (isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // --- 9. Gamepad Virtual Cursor ---
    if (input && input.gamepad && input.gamepad.cursorActive && input.gamepad.connected) {
        const gcX = input.gamepad.cursorX;
        const gcY = input.gamepad.cursorY;
        const worldPos = screenToWorld(gcX, gcY, cameraX, cameraY, zoom);
        const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

        ctx.strokeStyle = 'rgba(255, 235, 59, 0.7)';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // Restore translation
    ctx.restore();

    // Restore scale
    ctx.restore();

    // --- 10. Gamepad Crosshair ---
    if (input && input.gamepad && input.gamepad.cursorActive && input.gamepad.connected) {
        const gcX = input.gamepad.cursorX;
        const gcY = input.gamepad.cursorY;
        const crosshairSize = 12;
        const innerGap = 4;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gcX - crosshairSize, gcY);
        ctx.lineTo(gcX - innerGap, gcY);
        ctx.moveTo(gcX + innerGap, gcY);
        ctx.lineTo(gcX + crosshairSize, gcY);
        ctx.moveTo(gcX, gcY - crosshairSize);
        ctx.lineTo(gcX, gcY - innerGap);
        ctx.moveTo(gcX, gcY + innerGap);
        ctx.lineTo(gcX, gcY + crosshairSize);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(gcX, gcY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
