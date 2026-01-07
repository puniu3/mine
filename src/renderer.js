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
    REACH
} from './constants.js';
import {
    getSkyGradientColors,
    getSunRenderData,
    getMoonRenderData,
    getStarRenderData
} from './sky.js';
import { drawJackpotParticles } from './jackpot.js';
import { draw as drawFireworks } from './fireworks.js';

export function drawGame(ctx, {
    world,
    player,
    cameraX,
    cameraY,
    logicalWidth,
    logicalHeight,
    textures,
    input,
    dayDuration
}) {
    if (!world) return;

    // --- 1. Calculate Time & Altitude ---
    const normalizedTime = (Date.now() % dayDuration) / dayDuration;

    // Altitude: 0.0 (Top) to 1.0 (Bottom)
    let altitude = 0.5;
    if (player) {
        altitude = player.getCenterY() / (world.height * TILE_SIZE);
    }
    altitude = Math.max(0, Math.min(1, altitude));

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
    const moon = getMoonRenderData(normalizedTime, altitude, logicalWidth, logicalHeight);
    const bodies = [sun, moon];

    bodies.forEach(body => {
        if (body.isVisible) {
            ctx.globalAlpha = body.opacity !== undefined ? body.opacity : 1.0;

            ctx.beginPath();
            ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.shadowColor = body.shadow.color;
            ctx.shadowBlur = body.shadow.blur;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.closePath();

            // Simple Moon Craters
            if (body.type === 'moon') {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.beginPath();
                ctx.arc(body.x - 8, body.y - 5, 6, 0, Math.PI * 2);
                ctx.arc(body.x + 10, body.y + 8, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1.0;
        }
    });

    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    // --- 5. World Rendering ---
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
        BLOCKS.ACCELERATOR_RIGHT,
        BLOCKS.WATER
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

    // --- 6. Entities & Particles ---
    if (player) player.draw(ctx);
    drawJackpotParticles(ctx);
    drawFireworks(ctx);

    // --- 7. Cursor Highlight ---
    if (input && input.mouse) {
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
