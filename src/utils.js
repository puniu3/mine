/**
 * 2D Minecraft Clone - Utility Functions
 * Pure function utility module
 */

// ============================================================================
// Type Definitions (JSDoc)
// ============================================================================

/**
 * @typedef {Object} Rectangle
 * @property {number} x - Top-left X coordinate
 * @property {number} y - Top-left Y coordinate
 * @property {number} w - Width
 * @property {number} h - Height
 */

/**
 * @typedef {Object} Point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} TileCoord
 * @property {number} tx - Tile X coordinate
 * @property {number} ty - Tile Y coordinate
 */

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Clamp a value within a specified range
 * @param {number} value - Input value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Perform linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0.0 ~ 1.0)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Generate a random integer within an inclusive range.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {number} Random integer in range.
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate Euclidean distance between two points
 * @param {number} x1 - Point 1 X coordinate
 * @param {number} y1 - Point 1 Y coordinate
 * @param {number} x2 - Point 2 X coordinate
 * @param {number} y2 - Point 2 Y coordinate
 * @returns {number} Distance between two points
 */
export function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

// ============================================================================
// Coordinate Conversion
// ============================================================================

/**
 * Convert world coordinates to tile coordinates
 * @param {number} worldX - World X coordinate (pixels)
 * @param {number} worldY - World Y coordinate (pixels)
 * @param {number} tileSize - Tile size (pixels)
 * @returns {TileCoord} Tile coordinates
 */
export function worldToTile(worldX, worldY, tileSize) {
    return {
        tx: Math.floor(worldX / tileSize),
        ty: Math.floor(worldY / tileSize)
    };
}

/**
 * Convert tile coordinates to world coordinates (top-left of tile)
 * @param {number} tileX - Tile X coordinate
 * @param {number} tileY - Tile Y coordinate
 * @param {number} tileSize - Tile size (pixels)
 * @returns {Point} World coordinates
 */
export function tileToWorld(tileX, tileY, tileSize) {
    return {
        x: tileX * tileSize,
        y: tileY * tileSize
    };
}

/**
 * Convert 2D coordinates to 1D array index
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @returns {number} Array index (-1 if out of bounds)
 */
export function coordToIndex(x, y, width, height) {
    if (x < 0 || x >= width) {
        return -1;
    }

    // Wrap vertically so the world connects top-to-bottom
    const wrappedY = ((y % height) + height) % height;
    return wrappedY * width + x;
}

/**
 * Convert screen coordinates to world coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} cameraX - Camera X position
 * @param {number} cameraY - Camera Y position
 * @returns {Point} World coordinates
 */
export function screenToWorld(screenX, screenY, cameraX, cameraY) {
    return {
        x: screenX + cameraX,
        y: screenY + cameraY
    };
}

// ============================================================================
// Collision Detection
// ============================================================================

/**
 * Check if two rectangles intersect
 * @param {Rectangle} rect1 - Rectangle 1
 * @param {Rectangle} rect2 - Rectangle 2
 * @returns {boolean} True if intersecting
 */
export function rectsIntersect(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.w &&
        rect1.x + rect1.w > rect2.x &&
        rect1.y < rect2.y + rect2.h &&
        rect1.y + rect1.h > rect2.y
    );
}

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate
 * @param {Rectangle} rect - Rectangle
 * @returns {boolean} True if inside rectangle
 */
export function pointInRect(px, py, rect) {
    return (
        px >= rect.x &&
        px < rect.x + rect.w &&
        py >= rect.y &&
        py < rect.y + rect.h
    );
}

/**
 * Check if a point is within reach distance
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} reach - Reach distance
 * @returns {boolean} True if within reach
 */
export function isWithinReach(px, py, centerX, centerY, reach) {
    return distance(px, py, centerX, centerY) <= reach;
}

// ============================================================================
// Block Utilities
// ============================================================================

/**
 * Check if a block is solid
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {solid?: boolean}>} blockProps - Block properties dictionary
 * @returns {boolean} True if solid
 */
export function isBlockSolid(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && props.solid === true;
}

/**
 * Check if a block is transparent
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {transparent?: boolean}>} blockProps - Block properties dictionary
 * @returns {boolean} True if transparent
 */
export function isBlockTransparent(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && props.transparent === true;
}

/**
 * Check if a block is breakable
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {unbreakable?: boolean}>} blockProps - Block properties dictionary
 * @returns {boolean} True if breakable
 */
export function isBlockBreakable(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && !props.unbreakable;
}

/**
 * Get the drop item when a block is broken
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {drop?: number}>} blockProps - Block properties dictionary
 * @returns {number} Dropped block type ID
 */
export function getBlockDrop(blockType, blockProps) {
    const props = blockProps[blockType];
    return (props && props.drop !== undefined) ? props.drop : blockType;
}

/**
 * Get the material type of a block
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {type?: string}>} blockProps - Block properties dictionary
 * @returns {string|undefined} Block material type string
 */
export function getBlockMaterialType(blockType, blockProps) {
    const props = blockProps[blockType];
    return props ? props.type : undefined;
}

// ============================================================================
// Terrain Generation
// ============================================================================

/**
 * Calculate terrain height at a given X coordinate
 * @param {number} x - X coordinate
 * @param {number} baseHeight - Base height
 * @param {Object} [shape] - Wave shape configuration
 * @param {number} [shape.largeAmplitude=12] - Large wave amplitude
 * @param {number} [shape.smallAmplitude=3] - Small wave amplitude
 * @param {number} [shape.largeFrequency=30] - Large wave frequency divisor
 * @param {number} [shape.smallFrequency=8] - Small wave frequency divisor
 * @returns {number} Terrain height (Y coordinate)
 */
export function calculateTerrainHeight(x, baseHeight, shape = {}) {
    const largeAmplitude = shape.largeAmplitude ?? 12;
    const smallAmplitude = shape.smallAmplitude ?? 3;
    const largeFrequency = shape.largeFrequency ?? 30;
    const smallFrequency = shape.smallFrequency ?? 8;

    const h = Math.sin(x / largeFrequency) * largeAmplitude + Math.sin(x / smallFrequency) * smallAmplitude;
    return Math.floor(baseHeight + h);
}

/**
 * Generate terrain height array for entire world
 * @param {number} width - World width
 * @param {number} baseHeight - Base height
 * @returns {number[]} Height array for each X coordinate
 */
export function generateTerrainHeights(width, baseHeight) {
    const heights = [];
    for (let x = 0; x < width; x++) {
        heights.push(calculateTerrainHeight(x, baseHeight));
    }
    return heights;
}

/**
 * Generate biome layout and matching heights.
 * @param {number} width - World width.
 * @param {Object.<string, {baseHeight: number, terrain?: Object, weight?: number}>} biomeConfigs - Biome settings keyed by biome name.
 * @param {number} minSize - Minimum biome segment width.
 * @param {number} maxSize - Maximum biome segment width.
 * @returns {{heights: number[], biomeByColumn: string[]}} Heights and biome names per column.
 */
export function generateBiomeHeights(width, biomeConfigs, minSize, maxSize) {
    const heights = [];
    const biomeByColumn = [];
    const biomeKeys = Object.keys(biomeConfigs);
    let lastSegmentStart = 0;

    // 【修正点】重み付きランダム選択の準備
    let totalWeight = 0;
    const selectionMap = biomeKeys.map(key => {
        // weightが設定されていない場合はデフォルトで1とする
        const weight = biomeConfigs[key].weight !== undefined ? biomeConfigs[key].weight : 1;
        totalWeight += weight;
        return { key, threshold: totalWeight };
    });

    let x = 0;
    while (x < width) {
        // 【修正点】単純なランダムではなく、重みに基づいてバイオームを選択
        const r = Math.random() * totalWeight;
        const selected = selectionMap.find(item => r < item.threshold);
        const biome = selected ? selected.key : biomeKeys[0]; // fallback

        const length = Math.min(width - x, randomInt(minSize, maxSize));

        const config = biomeConfigs[biome];
        const segmentHeights = [];
        for (let i = 0; i < length; i++) {
            const column = x + i;
            segmentHeights[i] = calculateTerrainHeight(column, config.baseHeight, config.terrain);
        }

        if (x > 0) {
            const previousHeight = heights[x - 1];
            const firstHeight = segmentHeights[0];

            if (firstHeight !== previousHeight) {
                if (firstHeight > previousHeight) {
                    const slopeLength = Math.min(8, length);
                    for (let i = 0; i < slopeLength; i++) {
                        const t = (i + 1) / slopeLength;
                        segmentHeights[i] = Math.round(lerp(previousHeight, segmentHeights[i], t));
                    }
                } else {
                    const slopeLength = Math.min(8, x - lastSegmentStart);
                    const prevSlice = heights.slice(x - slopeLength, x);
                    for (let i = 0; i < slopeLength; i++) {
                        const t = (i + 1) / slopeLength;
                        const idx = x - slopeLength + i;
                        heights[idx] = Math.round(lerp(prevSlice[i], firstHeight, t));
                    }
                }
            }
        }

        for (let i = 0; i < length; i++) {
            const column = x + i;
            heights[column] = segmentHeights[i];
            biomeByColumn[column] = biome;
        }
        x += length;
        lastSegmentStart = x - length;
    }

    return { heights, biomeByColumn };
}

// ============================================================================
// Camera
// ============================================================================

/**
 * Calculate camera position with smooth following
 * @param {number} currentCam - Current camera position
 * @param {number} targetCam - Target camera position
 * @param {number} smoothing - Smoothing factor (0.0 ~ 1.0)
 * @returns {number} New camera position
 */
export function smoothCamera(currentCam, targetCam, smoothing) {
    return currentCam + (targetCam - currentCam) * smoothing;
}

/**
 * Clamp camera position within bounds
 * @param {number} cameraPos - Camera position
 * @param {number} minPos - Minimum position
 * @param {number} worldSize - World size (pixels)
 * @param {number} viewportSize - Viewport size (pixels)
 * @returns {number} Clamped camera position
 */
export function clampCamera(cameraPos, minPos, worldSize, viewportSize) {
    return clamp(cameraPos, minPos, worldSize - viewportSize);
}

// ============================================================================
// Render Range Calculation
// ============================================================================

/**
 * Calculate visible tile range for rendering
 * @param {number} cameraX - Camera X position
 * @param {number} cameraY - Camera Y position
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} tileSize - Tile size
 * @returns {{startX: number, endX: number, startY: number, endY: number}} Visible range
 */
export function calculateVisibleTileRange(cameraX, cameraY, canvasWidth, canvasHeight, tileSize) {
    const startX = Math.floor(cameraX / tileSize);
    const endX = startX + Math.ceil(canvasWidth / tileSize) + 1;
    const startY = Math.floor(cameraY / tileSize);
    const endY = startY + Math.ceil(canvasHeight / tileSize) + 1;
    return { startX, endX, startY, endY };
}

// ============================================================================
// Neighbor Check
// ============================================================================

/**
 * Neighbor offset array
 * @type {Array<[number, number]>}
 */
export const NEIGHBOR_OFFSETS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**
 * Check if there is an adjacent non-air block at the specified position
 * @param {number} tx - Tile X coordinate
 * @param {number} ty - Tile Y coordinate
 * @param {function(number, number): number} getBlockFn - Block getter function
 * @param {number} airBlockId - Air block ID
 * @returns {boolean} True if adjacent block exists
 */
export function hasAdjacentBlock(tx, ty, getBlockFn, airBlockId) {
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        if (getBlockFn(tx + dx, ty + dy) !== airBlockId) {
            return true;
        }
    }
    return false;
}
