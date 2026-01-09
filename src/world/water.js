/**
 * Water simulation - settling and ocean restoration
 */

import { BLOCKS, BLOCK_PROPS } from '../constants.js';
import { isBlockSolid } from '../utils.js';
import { BIOMES } from './biomes.js';

/**
 * Simulates water physics to fix generation artifacts.
 * Rules applied in order:
 * 1. Gravity: Fall down into AIR.
 * 2. Diagonal Flow: Slide down-left or down-right into AIR (fixes vertical walls).
 * 3. Spreading: Flow sideways if supported by solid/water.
 */
export function simulateWaterSettling(world) {
    const passes = 12;

    for (let pass = 0; pass < passes; pass++) {
        let changes = 0;

        const scanLeftToRight = pass % 2 === 0;
        const startX = scanLeftToRight ? 0 : world.width - 1;
        const endX = scanLeftToRight ? world.width : -1;
        const stepX = scanLeftToRight ? 1 : -1;

        for (let y = 0; y < world.height - 1; y++) {
            for (let x = startX; x !== endX; x += stepX) {
                if (world.getBlock(x, y) === BLOCKS.WATER) {

                    // Rule 1: Gravity (Straight Down)
                    if (world.getBlock(x, y + 1) === BLOCKS.AIR) {
                        world.setBlock(x, y + 1, BLOCKS.WATER);
                        world.setBlock(x, y, BLOCKS.AIR);
                        changes++;
                        continue;
                    }

                    // Rule 2: Diagonal Flow (Slide Down)
                    const left = (x - 1 + world.width) % world.width;
                    const right = (x + 1) % world.width;
                    const down = y + 1;

                    const canGoLeftDown = world.getBlock(left, y) === BLOCKS.AIR && world.getBlock(left, down) === BLOCKS.AIR;
                    const canGoRightDown = world.getBlock(right, y) === BLOCKS.AIR && world.getBlock(right, down) === BLOCKS.AIR;

                    if (canGoLeftDown || canGoRightDown) {
                        const goLeft = (canGoLeftDown && canGoRightDown) ? Math.random() < 0.5 : canGoLeftDown;
                        const targetX = goLeft ? left : right;
                        world.setBlock(targetX, down, BLOCKS.WATER);
                        world.setBlock(x, y, BLOCKS.AIR);
                        changes++;
                        continue;
                    }

                    // Rule 3: Spreading (Sideways)
                    const below = world.getBlock(x, y + 1);
                    if (below === BLOCKS.WATER || isBlockSolid(below, BLOCK_PROPS)) {
                        const canGoLeft = world.getBlock(left, y) === BLOCKS.AIR;
                        const canGoRight = world.getBlock(right, y) === BLOCKS.AIR;

                        if (canGoLeft || canGoRight) {
                            let goLeft;

                            if (canGoLeft && canGoRight) {
                                // Look 2 blocks away for cohesion (wrapping applied)
                                const left2 = (x - 2 + world.width) % world.width;
                                const right2 = (x + 2) % world.width;

                                const leftNeighbor = world.getBlock(left2, y);
                                const rightNeighbor = world.getBlock(right2, y);

                                const isLeftAttractive = leftNeighbor === BLOCKS.WATER || isBlockSolid(leftNeighbor, BLOCK_PROPS);
                                const isRightAttractive = rightNeighbor === BLOCKS.WATER || isBlockSolid(rightNeighbor, BLOCK_PROPS);

                                if (isLeftAttractive && !isRightAttractive) {
                                    goLeft = true;
                                } else if (!isLeftAttractive && isRightAttractive) {
                                    goLeft = false;
                                } else {
                                    goLeft = Math.random() < 0.5;
                                }
                            } else {
                                goLeft = canGoLeft;
                            }

                            const targetX = goLeft ? left : right;
                            world.setBlock(targetX, y, BLOCKS.WATER);
                            world.setBlock(x, y, BLOCKS.AIR);
                            changes++;
                        }
                    }
                }
            }
        }
        if (changes === 0) break;
    }
}

/**
 * Fixes Ocean water levels.
 * Uses wrapped distance checks so shores wrap correctly.
 */
export function restoreOceanLevels(world, biomeByColumn, seaLevel) {
    const BORDER_MARGIN = 5;

    for (let x = 0; x < world.width; x++) {
        if (biomeByColumn[x] === BIOMES.OCEAN) {

            let isNearShore = false;
            for (let dx = -BORDER_MARGIN; dx <= BORDER_MARGIN; dx++) {
                // Check wrapped neighbor column
                const checkX = (x + dx + world.width) % world.width;
                if (biomeByColumn[checkX] !== BIOMES.OCEAN) {
                    isNearShore = true;
                    break;
                }
            }

            if (isNearShore) continue;

            const surfaceStart = seaLevel + 1;
            for (let y = surfaceStart; y < world.height; y++) {
                const block = world.getBlock(x, y);
                if (block === BLOCKS.AIR) {
                    world.setBlock(x, y, BLOCKS.WATER);
                } else if (isBlockSolid(block, BLOCK_PROPS) || block === BLOCKS.WATER) {
                    break;
                }
            }
        }
    }
}
