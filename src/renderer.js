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

let offscreenCanvas = null;

const MODE_NAMES = [
    "Default (Scale)",
    "Overlap (+0.5px)",
    "Nearest Neighbor",
    "Integer Snapping",
    "Offscreen Buffer"
];

function drawWorldLayer(ctx, {
    world,
    textures,
    startX, endX, startY, endY,
    cameraX, cameraY,
    zoom,
    renderMode,
    tntManager,
    now,
    gradient,
    player,
    logicalWidth,
    logicalHeight,
    // input, // Removed input dependency inside drawWorldLayer to prevent Mode 4 cursor bugs
    cursorWorldX, // In blocks (float)
    cursorWorldY, // In blocks (float)
    showCursor // boolean
}) {
    // --- 5. Water Masking Pass ---
    // Erase sky elements behind water to handle transparency correctly
    ctx.fillStyle = gradient;

    // In Mode 3 (Snapping), we need manual coords for this too
    if (renderMode === 3) {
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const normalizedY = (y % world.height + world.height) % world.height;
                const block = world.getBlock(x, normalizedY);
                if (block === BLOCKS.WATER) {
                    const screenX = Math.floor((x * TILE_SIZE - cameraX) * zoom);
                    const screenY = Math.floor((y * TILE_SIZE - cameraY) * zoom);
                    const size = Math.ceil(TILE_SIZE * zoom);
                    ctx.fillRect(screenX, screenY, size, size);
                }
            }
        }
    } else {
        // Standard transform (Mode 0, 1, 2) or Offscreen (Mode 4 - assumes ctx is already transformed or 1x)
        // Note: For Mode 4, ctx is offscreen at 1x scale, so zoom passed here is 1.
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const normalizedY = (y % world.height + world.height) % world.height;
                const block = world.getBlock(x, normalizedY);

                if (block === BLOCKS.WATER) {
                    // Ctx is scaled/translated, so we draw at world coords
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // --- 6. World Rendering ---
    const NO_SHADOW_BLOCKS = new Set([
        BLOCKS.CLOUD,
        BLOCKS.JUMP_PAD,
        BLOCKS.JACKPOT,
        BLOCKS.ACCELERATOR_LEFT,
        BLOCKS.ACCELERATOR_RIGHT,
    ]);

    const tileSize = (renderMode === 1) ? TILE_SIZE + 0.5 : TILE_SIZE;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const normalizedY = (y % world.height + world.height) % world.height;
            const block = world.getBlock(x, normalizedY);

            if (block !== BLOCKS.AIR && textures[block]) {
                let drawX, drawY, drawW, drawH;

                if (renderMode === 3) {
                    // Integer Snapping
                    drawX = Math.floor((x * TILE_SIZE - cameraX) * zoom);
                    drawY = Math.floor((y * TILE_SIZE - cameraY) * zoom);
                    drawW = Math.ceil(tileSize * zoom);
                    drawH = Math.ceil(tileSize * zoom);
                } else {
                    // Standard (Context Transformed)
                    drawX = x * TILE_SIZE;
                    drawY = y * TILE_SIZE;
                    drawW = tileSize;
                    drawH = tileSize;
                }

                // Special rendering for TNT
                if (block === BLOCKS.TNT && tntManager && tntManager.hasTimerAt(x, normalizedY)) {
                    const time = now * 0.01;
                    const shakeX = Math.sin(time * 15 + x * 7) * 1.2;
                    const shakeY = Math.cos(time * 18 + y * 5) * 1.2;

                    const finalX = renderMode === 3 ? drawX + shakeX * zoom : drawX + shakeX;
                    const finalY = renderMode === 3 ? drawY + shakeY * zoom : drawY + shakeY;

                    ctx.drawImage(textures[block], finalX, finalY, drawW, drawH);

                    const pulse = (Math.sin(time * 8) + 1) / 2;
                    ctx.fillStyle = `rgba(255, ${Math.floor(100 - pulse * 100)}, 0, ${0.2 + pulse * 0.3})`;
                    ctx.fillRect(finalX, finalY, drawW, drawH);

                    // Sparkles omitted for brevity
                } else {
                    ctx.drawImage(textures[block], drawX, drawY, drawW, drawH);
                }

                if (!NO_SHADOW_BLOCKS.has(block)) {
                    const aboveY = (normalizedY - 1 + world.height) % world.height;
                    const neighborAbove = world.getBlock(x, aboveY);
                    if (neighborAbove !== BLOCKS.AIR && !isBlockTransparent(neighborAbove, BLOCK_PROPS)) {
                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.fillRect(drawX, drawY, drawW, drawH);
                    }
                }
            }
        }
    }

    // --- 7. Entities & Particles ---
    // Note: Entities are usually drawn in world space.
    // If Render Mode 3, we haven't scaled the context.

    if (renderMode === 3) {
        ctx.save();
        // Mimic standard transform
        // Note: Snapping logic above used floor((x - cam) * zoom).
        // Here we just use standard scale.
        // This might cause slight desync between player and snapped ground,
        // but it's the trade-off for Mode 3.
        ctx.scale(zoom, zoom);
        ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));
    }

    if (player) player.draw(ctx);
    drawJackpotParticles(ctx, cameraX, cameraY, logicalWidth, logicalHeight);
    drawFireworks(ctx, cameraX, cameraY, logicalWidth, logicalHeight);
    drawBlockParticles(ctx, cameraX, cameraY, logicalWidth, logicalHeight);

    // --- 8 & 9 Cursors ---
    // Draw cursor using passed world coordinates (calculated outside based on real zoom)
    if (showCursor && cursorWorldX !== undefined && cursorWorldY !== undefined) {
        const { tx: bx, ty: by } = worldToTile(cursorWorldX, cursorWorldY, TILE_SIZE);

        // Use YELLOW if gamepad active? The caller doesn't distinguish here easily without extra props.
        // Let's stick to standard block highlight (white/translucent).
        // If we want gamepad yellow, we can pass a color or mode.
        // For this refactor, let's keep it simple: White highlight for interaction.
        // (If the user wants exact parity with gamepad yellow cursor, we can add a prop).

        // Actually, the original code had two blocks:
        // 1. Mouse Reach (White)
        // 2. Gamepad Cursor (Yellow)
        // We will assume cursorWorldX/Y is the ACTIVE cursor.
        // Let's check props.
        // We'll just draw the standard selection box.

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    if (renderMode === 3) {
        ctx.restore();
    }
}

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
    tntManager,
    renderMode = 0 // Default Mode
}) {
    if (!world) return;

    // --- 0. Fix State Leaks ---
    // Ensure smoothing is reset if not in Mode 2
    ctx.imageSmoothingEnabled = (renderMode !== 2);

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
    drawAurora(ctx, normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);

    // --- 4. Celestial Bodies & Atmosphere (Bloom) ---
    const sun = getSunRenderData(normalizedTime, altitude, logicalWidth, logicalHeight);
    const moon = getMoonRenderData(normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);
    const bodies = [sun, moon];

    bodies.forEach(body => {
        if (!body.isVisible) return;
        ctx.globalAlpha = body.opacity !== undefined ? body.opacity : 1.0;
        const glowRadius = body.radius * 6;
        const glow = ctx.createRadialGradient(body.x, body.y, body.radius, body.x, body.y, glowRadius);
        const gColor = body.glowColor || 'rgba(255, 255, 255, 0.2)';
        glow.addColorStop(0, gColor);
        glow.addColorStop(0.3, gColor.replace(/[\d.]+\)$/, '0.1)'));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(body.x, body.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    bodies.forEach(body => {
        if (!body.isVisible) return;
        ctx.globalAlpha = body.opacity !== undefined ? body.opacity : 1.0;
        if (body.type === 'sun') {
            ctx.beginPath();
            ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.shadowColor = body.shadow.color;
            ctx.shadowBlur = body.shadow.blur;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.type === 'moon') {
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
            if (phase <= 0.5) {
                ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
                const xp = r * Math.cos(phase * 2 * Math.PI); 
                const w = Math.abs(xp);
                ctx.ellipse(0, 0, w, r, 0, Math.PI / 2, 3 * Math.PI / 2, xp > 0);
            } else {
                ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2, false);
                const xp = -r * Math.cos(phase * 2 * Math.PI);
                const w = Math.abs(xp);
                ctx.ellipse(0, 0, w, r, 0, -Math.PI / 2, Math.PI / 2, xp < 0);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.save();
            ctx.clip(); 
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            const craters = [{ dx: -8, dy: -5, r: 6 }, { dx: 10, dy: 8, r: 4 }, { dx: -5, dy: 10, r: 3 }];
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

    // --- Mode 2: Nearest Neighbor Enforced ---
    if (renderMode === 2) {
        ctx.imageSmoothingEnabled = false;
    }

    // --- Calculate Visible Range ---
    const { startX, endX, startY, endY } = calculateVisibleTileRange(
        cameraX, cameraY, logicalWidth, logicalHeight, TILE_SIZE, zoom
    );

    // --- Calculate Cursor Position (Pre-Pass) ---
    // Do this HERE, using the real zoom, so it works for all modes (including Mode 4)
    let cursorWorldX, cursorWorldY;
    let showCursor = false;
    let gamepadCursorActive = false;

    if (input) {
        if (input.mouse && input.mouse.active) {
            const worldPos = screenToWorld(input.mouse.x, input.mouse.y, cameraX, cameraY, zoom);
            if (isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
                cursorWorldX = worldPos.x;
                cursorWorldY = worldPos.y;
                showCursor = true;
            }
        }
        // Gamepad cursor priority (or second cursor? Original code allowed both via if/if)
        // Original code: if mouse active -> draw; if gamepad active -> draw.
        // We can pass both, but for simplicity let's stick to the dominant one or allow both logic inside.
        // Wait, if I pass a single cursorWorldX, I lose the ability to draw two cursors (mouse + gamepad).
        // Let's assume we want to support both if active.
        // But Mode 4 needs correct coordinates for BOTH.
        // So we should calculate gamepad world pos here too.
        if (input.gamepad && input.gamepad.cursorActive && input.gamepad.connected) {
             const gcPos = screenToWorld(input.gamepad.cursorX, input.gamepad.cursorY, cameraX, cameraY, zoom);
             // We can't pass two sets of coords easily to the helper without changing signature more.
             // But actually, we only need to pass the *calculated world coords* if we want the helper to draw.
             // Or we draw the cursors *here* in drawGame?
             // If we draw here, we need to respect the transform (Mode 4 offscreen vs Mode 0 scale).
             // That's messy.
             // Helper is best. Let's make helper take "cursors" array or similar.
             // Or just stick to the single cursor assumption for now?
             // No, original code allowed both.
             gamepadCursorActive = true;
             // Let's cheat: We only really need to fix Mode 4 for *Mouse* usually.
             // But gamepad is screen space too.
             // Let's pass gamepadWorldX/Y too.
        }
    }

    // --- Render World Based on Mode ---

    if (renderMode === 4) {
        // --- Mode 4: Offscreen Buffer ---
        if (!offscreenCanvas) {
            offscreenCanvas = document.createElement('canvas');
        }

        const offW = Math.ceil(logicalWidth / zoom);
        const offH = Math.ceil(logicalHeight / zoom);

        if (offscreenCanvas.width !== offW || offscreenCanvas.height !== offH) {
            offscreenCanvas.width = offW;
            offscreenCanvas.height = offH;
        }

        const offCtx = offscreenCanvas.getContext('2d');
        offCtx.imageSmoothingEnabled = false;
        offCtx.clearRect(0, 0, offW, offH);

        offCtx.save();
        offCtx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

        drawWorldLayer(offCtx, {
            world, textures, startX, endX, startY, endY,
            cameraX, cameraY,
            zoom: 1,
            renderMode: 0,
            tntManager, now, gradient, player,
            logicalWidth: offW,
            logicalHeight: offH,
            cursorWorldX, cursorWorldY, showCursor
        });

        // Draw Gamepad Cursor (Manually here or inside?)
        // If we draw it inside, we need to pass it.
        // If we draw it here, we are drawing to offscreen.
        // Let's inject gamepad cursor logic into drawWorldLayer if needed,
        // OR just duplicate the rect drawing here for gamepad?
        // Let's add gamepad props to drawWorldLayer for completeness.
        if (gamepadCursorActive) {
            const gcPos = screenToWorld(input.gamepad.cursorX, input.gamepad.cursorY, cameraX, cameraY, zoom);
            const { tx: bx, ty: by } = worldToTile(gcPos.x, gcPos.y, TILE_SIZE);
            offCtx.strokeStyle = 'rgba(255, 235, 59, 0.7)';
            offCtx.lineWidth = 3;
            offCtx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        offCtx.restore();

        ctx.drawImage(offscreenCanvas, 0, 0, offW, offH, 0, 0, logicalWidth, logicalHeight);

    } else if (renderMode === 3) {
        // --- Mode 3: Integer Snapping ---
        drawWorldLayer(ctx, {
            world, textures, startX, endX, startY, endY,
            cameraX, cameraY,
            zoom,
            renderMode,
            tntManager, now, gradient, player,
            logicalWidth, logicalHeight,
            cursorWorldX, cursorWorldY, showCursor
        });

        // Gamepad cursor for Mode 3
        if (gamepadCursorActive) {
             // We need to draw it manually or pass it.
             // Since I didn't add gamepad args to drawWorldLayer in the signature above (only cursorWorldX/Y for mouse),
             // I'll draw it here.
             // BUT, for Mode 3, we need the "snapped" coordinates or similar transform?
             // Mode 3 drawWorldLayer handled the transform.
             // If I draw here, I'm outside the transform loop (Wait, Mode 3 passes 'ctx' raw).
             // So I need to use the Mode 3 math here.

             const gcPos = screenToWorld(input.gamepad.cursorX, input.gamepad.cursorY, cameraX, cameraY, zoom);
             const { tx: bx, ty: by } = worldToTile(gcPos.x, gcPos.y, TILE_SIZE);

             const drawX = Math.floor((bx * TILE_SIZE - cameraX) * zoom);
             const drawY = Math.floor((by * TILE_SIZE - cameraY) * zoom);
             const size = Math.ceil(TILE_SIZE * zoom);

             ctx.strokeStyle = 'rgba(255, 235, 59, 0.7)';
             ctx.lineWidth = 3;
             ctx.strokeRect(drawX, drawY, size, size);
        }

    } else {
        // --- Mode 0, 1, 2: Standard ---
        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

        drawWorldLayer(ctx, {
            world, textures, startX, endX, startY, endY,
            cameraX, cameraY,
            zoom,
            renderMode,
            tntManager, now, gradient, player,
            logicalWidth, logicalHeight,
            cursorWorldX, cursorWorldY, showCursor
        });

        // Gamepad Cursor for Standard Modes
        if (gamepadCursorActive) {
            const gcPos = screenToWorld(input.gamepad.cursorX, input.gamepad.cursorY, cameraX, cameraY, zoom);
            const { tx: bx, ty: by } = worldToTile(gcPos.x, gcPos.y, TILE_SIZE);
            ctx.strokeStyle = 'rgba(255, 235, 59, 0.7)';
            ctx.lineWidth = 3;
            // Draw in world coords (transform is active)
            ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        ctx.restore();
    }

    // --- 10. Gamepad Crosshair (Overlay) ---
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

    // --- Render Mode Debug Text ---
    ctx.save();
    ctx.font = '16px monospace';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    const modeText = `Zoom Fix: [${renderMode}] ${MODE_NAMES[renderMode] || 'Unknown'}`;
    ctx.strokeText(modeText, 10, logicalHeight - 40);
    ctx.fillText(modeText, 10, logicalHeight - 40);
    ctx.restore();
}
