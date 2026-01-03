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
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Perform linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0.0 ~ 1.0)
 * @returns {number} Interpolated value
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Calculate Euclidean distance between two points
 * @param {number} x1 - Point 1 X coordinate
 * @param {number} y1 - Point 1 Y coordinate
 * @param {number} x2 - Point 2 X coordinate
 * @param {number} y2 - Point 2 Y coordinate
 * @returns {number} Distance between two points
 */
function distance(x1, y1, x2, y2) {
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
function worldToTile(worldX, worldY, tileSize) {
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
function tileToWorld(tileX, tileY, tileSize) {
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
function coordToIndex(x, y, width, height) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
        return -1;
    }
    return y * width + x;
}

/**
 * Convert screen coordinates to world coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {number} cameraX - Camera X position
 * @param {number} cameraY - Camera Y position
 * @returns {Point} World coordinates
 */
function screenToWorld(screenX, screenY, cameraX, cameraY) {
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
function rectsIntersect(rect1, rect2) {
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
function pointInRect(px, py, rect) {
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
function isWithinReach(px, py, centerX, centerY, reach) {
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
function isBlockSolid(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && props.solid === true;
}

/**
 * Check if a block is transparent
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {transparent?: boolean}>} blockProps - Block properties dictionary
 * @returns {boolean} True if transparent
 */
function isBlockTransparent(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && props.transparent === true;
}

/**
 * Check if a block is breakable
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {unbreakable?: boolean}>} blockProps - Block properties dictionary
 * @returns {boolean} True if breakable
 */
function isBlockBreakable(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && !props.unbreakable;
}

/**
 * Get the drop item when a block is broken
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {drop?: number}>} blockProps - Block properties dictionary
 * @returns {number} Dropped block type ID
 */
function getBlockDrop(blockType, blockProps) {
    const props = blockProps[blockType];
    return (props && props.drop !== undefined) ? props.drop : blockType;
}

/**
 * Get the material type of a block
 * @param {number} blockType - Block type ID
 * @param {Object.<number, {type?: string}>} blockProps - Block properties dictionary
 * @returns {string|undefined} Block material type string
 */
function getBlockMaterialType(blockType, blockProps) {
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
 * @returns {number} Terrain height (Y coordinate)
 */
function calculateTerrainHeight(x, baseHeight) {
    const h = Math.sin(x / 30) * 12 + Math.sin(x / 8) * 3;
    return Math.floor(baseHeight + h);
}

/**
 * Generate terrain height array for entire world
 * @param {number} width - World width
 * @param {number} baseHeight - Base height
 * @returns {number[]} Height array for each X coordinate
 */
function generateTerrainHeights(width, baseHeight) {
    const heights = [];
    for (let x = 0; x < width; x++) {
        heights.push(calculateTerrainHeight(x, baseHeight));
    }
    return heights;
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
function smoothCamera(currentCam, targetCam, smoothing) {
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
function clampCamera(cameraPos, minPos, worldSize, viewportSize) {
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
function calculateVisibleTileRange(cameraX, cameraY, canvasWidth, canvasHeight, tileSize) {
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
const NEIGHBOR_OFFSETS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**
 * Check if there is an adjacent non-air block at the specified position
 * @param {number} tx - Tile X coordinate
 * @param {number} ty - Tile Y coordinate
 * @param {function(number, number): number} getBlockFn - Block getter function
 * @param {number} airBlockId - Air block ID
 * @returns {boolean} True if adjacent block exists
 */
function hasAdjacentBlock(tx, ty, getBlockFn, airBlockId) {
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        if (getBlockFn(tx + dx, ty + dy) !== airBlockId) {
            return true;
        }
    }
    return false;
}
