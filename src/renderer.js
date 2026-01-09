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
    getStarRenderData
} from './sky.js';
import { drawJackpotParticles } from './jackpot.js';
import { draw as drawFireworks } from './fireworks.js';
import { draw as drawBlockParticles } from './block_particles.js';

export function drawGame(ctx, {
    world,
    player,
    cameraX,
    cameraY,
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

    // --- 4. Celestial Bodies (Sun & Moon) ---
    const sun = getSunRenderData(normalizedTime, altitude, logicalWidth, logicalHeight);
    const moon = getMoonRenderData(normalizedTime, altitude, logicalWidth, logicalHeight, currentDay);
    const bodies = [sun, moon];

    bodies.forEach(body => {
        if (!body.isVisible) return;
        
        ctx.globalAlpha = body.opacity !== undefined ? body.opacity : 1.0;

        if (body.type === 'sun') {
            // --- Sun Rendering (Simple Circle) ---
            ctx.beginPath();
            ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.shadowColor = body.shadow.color;
            ctx.shadowBlur = body.shadow.blur;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.type === 'moon') {
            // --- Moon Rendering (Realistic Phases with Tilt) ---
            const r = body.radius;
            const phase = body.phase; // 0.0 ~ 1.0
            
            // Save context to apply rotation
            ctx.save();
            
            // 1. Move origin to the moon's center
            ctx.translate(body.x, body.y);
            
            // 2. Rotate 45 degrees (PI/4) Clockwise
            // Northern Hemisphere: Waxing crescent is on the Right (Rotated -> Bottom-Right)
            // Waning crescent is on the Left (Rotated -> Top-Left)
            const MOON_TILT = Math.PI / 4; 
            ctx.rotate(MOON_TILT);

            // Draw Shadow/Glow
            ctx.shadowColor = body.shadow.color;
            ctx.shadowBlur = body.shadow.blur;
            
            ctx.fillStyle = body.color;
            ctx.beginPath();

            // Geometric Phase Logic (Drawing at 0,0 relative to translated origin)
            
            if (phase <= 0.5) {
                // === Waxing (New -> Full) ===
                // Right side is the "Limb" (Arc).
                // 1. Draw Right Semi-Circle from Top(-PI/2) to Bottom(PI/2)
                ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);

                // 2. Draw Terminator (Ellipse curve) from Bottom back to Top
                // xp goes from r (New) -> 0 (Half) -> -r (Full)
                const xp = r * Math.cos(phase * 2 * Math.PI); 
                const w = Math.abs(xp);
                
                // Ellipse connecting (0, r) to (0, -r).
                // If xp > 0 (Crescent), we want the curve to bow Right (inner curve).
                //   -> Anticlockwise = true (PI/2 -> 0 -> 3PI/2)
                // If xp < 0 (Gibbous), we want the curve to bow Left (outer curve).
                //   -> Anticlockwise = false (PI/2 -> PI -> 3PI/2)
                ctx.ellipse(0, 0, w, r, 0, Math.PI / 2, 3 * Math.PI / 2, xp > 0);

            } else {
                // === Waning (Full -> New) ===
                // Left side is the "Limb" (Arc).
                // 1. Draw Left Semi-Circle from Bottom(PI/2) to Top(-PI/2)
                ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2, false);

                // 2. Draw Terminator from Top back to Bottom
                // xp goes from r (Full) -> 0 (Half) -> -r (New)
                const xp = -r * Math.cos(phase * 2 * Math.PI);
                const w = Math.abs(xp);

                // Ellipse connecting (0, -r) to (0, r).
                // If xp > 0 (Gibbous), we want curve to bow Right (outer curve).
                //   -> Clockwise = false (-PI/2 -> 0 -> PI/2)
                // If xp < 0 (Crescent), we want curve to bow Left (inner curve).
                //   -> Anticlockwise = true (-PI/2 -> -PI -> PI/2)
                ctx.ellipse(0, 0, w, r, 0, -Math.PI / 2, Math.PI / 2, xp < 0);
            }

            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow for craters

            // --- Craters (Clipped to Lit Area) ---
            ctx.save();
            ctx.clip(); // Clip drawing to the moon shape we just defined
            
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            // Crater positions relative to moon center (rotated with the context)
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

            ctx.restore(); // Restore clip
            ctx.restore(); // Restore translation/rotation
        }

        ctx.globalAlpha = 1.0;
    });

    // --- Calculate Visible Range ---
    // Moved up to support water masking pass
    const { startX, endX, startY, endY } = calculateVisibleTileRange(
        cameraX, cameraY, logicalWidth, logicalHeight, TILE_SIZE
    );

    // --- 4.5 Water Masking Pass ---
    // Repaint the sky gradient over celestial bodies where water exists
    // to prevent stars/sun/moon from showing through the transparent water.
    ctx.fillStyle = gradient;
    
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const normalizedY = (y % world.height + world.height) % world.height;
            const block = world.getBlock(x, normalizedY);

            if (block === BLOCKS.WATER) {
                // Calculate precise screen coordinates matching the main render loop
                const screenX = x * TILE_SIZE - Math.floor(cameraX);
                const screenY = y * TILE_SIZE - Math.floor(cameraY);
                
                // Fill with the sky gradient (defined in screen space)
                // This erases anything drawn behind this tile
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    // --- 5. World Rendering ---
    
    const NO_SHADOW_BLOCKS = new Set([
        BLOCKS.CLOUD,
        // BLOCKS.FIREWORK,
        BLOCKS.JUMP_PAD,
        // BLOCKS.TNT,
        // BLOCKS.SAPLING,
        BLOCKS.JACKPOT,
        BLOCKS.ACCELERATOR_LEFT,
        BLOCKS.ACCELERATOR_RIGHT,
    ]);

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            // Handle vertical wrapping for block rendering
            const normalizedY = (y % world.height + world.height) % world.height;
            const block = world.getBlock(x, normalizedY);

            if (block !== BLOCKS.AIR && textures[block]) {
                // Special rendering for TNT with active timer
                if (block === BLOCKS.TNT && tntManager && tntManager.hasTimerAt(x, normalizedY)) {
                    // Create "about to explode" effect for kids
                    const time = now * 0.01; // Fast animation

                    // 1. Shake effect - small random offset
                    const shakeX = Math.sin(time * 15 + x * 7) * 1.2;
                    const shakeY = Math.cos(time * 18 + y * 5) * 1.2;
                    // Draw TNT with shake
                    ctx.drawImage(
                        textures[block],
                        x * TILE_SIZE + shakeX,
                        y * TILE_SIZE + shakeY
                    );

                    // 2. Pulsing red/orange overlay (danger!)
                    const pulse = (Math.sin(time * 8) + 1) / 2; // 0 to 1
                    ctx.fillStyle = `rgba(255, ${Math.floor(100 - pulse * 100)}, 0, ${0.2 + pulse * 0.3})`;
                    ctx.fillRect(
                        x * TILE_SIZE + shakeX,
                        y * TILE_SIZE + shakeY,
                        TILE_SIZE,
                        TILE_SIZE
                    );

                    // 3. Sparkling fuse effect at top
                    const sparkle = Math.sin(time * 20) > 0.3;
                    if (sparkle) {
                        // Draw bright spark at the top (fuse)
                        const sparkX = x * TILE_SIZE + TILE_SIZE / 2 + shakeX + (Math.random() - 0.5) * 8;
                        const sparkY = y * TILE_SIZE + shakeY + 2;
                        const sparkSize = 3 + Math.random() * 3;

                        // Glowing spark
                        ctx.fillStyle = '#ffff00';
                        ctx.beginPath();
                        ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
                        ctx.fill();

                        // Outer glow
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

    // --- 6. Entities & Particles ---
    if (player) player.draw(ctx);
    drawJackpotParticles(ctx, cameraX, cameraY, logicalWidth, logicalHeight);
    drawFireworks(ctx, cameraX, cameraY, logicalWidth, logicalHeight);
    drawBlockParticles(ctx, cameraX, cameraY, logicalWidth, logicalHeight);

    // --- 7. Cursor Highlight ---
    if (input && input.mouse && input.mouse.active) {
        const worldPos = screenToWorld(input.mouse.x, input.mouse.y, cameraX, cameraY);
        const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);
        if (isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    ctx.restore();
}
