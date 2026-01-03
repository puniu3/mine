/**
 * 2D Minecraft Clone - Utility Functions
 * 純粋関数ユーティリティモジュール
 */

// ============================================================================
// 型定義 (JSDoc)
// ============================================================================

/**
 * @typedef {Object} Rectangle
 * @property {number} x - 左上X座標
 * @property {number} y - 左上Y座標
 * @property {number} w - 幅
 * @property {number} h - 高さ
 */

/**
 * @typedef {Object} Point
 * @property {number} x - X座標
 * @property {number} y - Y座標
 */

/**
 * @typedef {Object} TileCoord
 * @property {number} tx - タイルX座標
 * @property {number} ty - タイルY座標
 */

// ============================================================================
// 数学ユーティリティ
// ============================================================================

/**
 * 値を指定範囲内に制限する
 * @param {number} value - 入力値
 * @param {number} min - 最小値
 * @param {number} max - 最大値
 * @returns {number} 制限された値
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 線形補間を行う
 * @param {number} a - 開始値
 * @param {number} b - 終了値
 * @param {number} t - 補間係数 (0.0 ~ 1.0)
 * @returns {number} 補間された値
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * 2点間のユークリッド距離を計算する
 * @param {number} x1 - 点1のX座標
 * @param {number} y1 - 点1のY座標
 * @param {number} x2 - 点2のX座標
 * @param {number} y2 - 点2のY座標
 * @returns {number} 2点間の距離
 */
function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

// ============================================================================
// 座標変換
// ============================================================================

/**
 * ワールド座標からタイル座標へ変換する
 * @param {number} worldX - ワールドX座標（ピクセル）
 * @param {number} worldY - ワールドY座標（ピクセル）
 * @param {number} tileSize - タイルサイズ（ピクセル）
 * @returns {TileCoord} タイル座標
 */
function worldToTile(worldX, worldY, tileSize) {
    return {
        tx: Math.floor(worldX / tileSize),
        ty: Math.floor(worldY / tileSize)
    };
}

/**
 * タイル座標からワールド座標へ変換する（タイル左上）
 * @param {number} tileX - タイルX座標
 * @param {number} tileY - タイルY座標
 * @param {number} tileSize - タイルサイズ（ピクセル）
 * @returns {Point} ワールド座標
 */
function tileToWorld(tileX, tileY, tileSize) {
    return {
        x: tileX * tileSize,
        y: tileY * tileSize
    };
}

/**
 * 2D座標から1D配列インデックスへ変換する
 * @param {number} x - X座標
 * @param {number} y - Y座標
 * @param {number} width - マップ幅
 * @param {number} height - マップ高さ
 * @returns {number} 配列インデックス（範囲外の場合は-1）
 */
function coordToIndex(x, y, width, height) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
        return -1;
    }
    return y * width + x;
}

/**
 * スクリーン座標をワールド座標に変換する
 * @param {number} screenX - スクリーンX座標
 * @param {number} screenY - スクリーンY座標
 * @param {number} cameraX - カメラX位置
 * @param {number} cameraY - カメラY位置
 * @returns {Point} ワールド座標
 */
function screenToWorld(screenX, screenY, cameraX, cameraY) {
    return {
        x: screenX + cameraX,
        y: screenY + cameraY
    };
}

// ============================================================================
// 衝突判定
// ============================================================================

/**
 * 2つの矩形が交差しているかを判定する
 * @param {Rectangle} rect1 - 矩形1
 * @param {Rectangle} rect2 - 矩形2
 * @returns {boolean} 交差している場合true
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
 * 点が矩形内にあるかを判定する
 * @param {number} px - 点のX座標
 * @param {number} py - 点のY座標
 * @param {Rectangle} rect - 矩形
 * @returns {boolean} 矩形内の場合true
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
 * 点がリーチ範囲内にあるかを判定する
 * @param {number} px - 点のX座標
 * @param {number} py - 点のY座標
 * @param {number} centerX - 中心X座標
 * @param {number} centerY - 中心Y座標
 * @param {number} reach - リーチ距離
 * @returns {boolean} リーチ範囲内の場合true
 */
function isWithinReach(px, py, centerX, centerY, reach) {
    return distance(px, py, centerX, centerY) <= reach;
}

// ============================================================================
// ブロック関連
// ============================================================================

/**
 * ブロックが固体かどうかを判定する
 * @param {number} blockType - ブロックタイプID
 * @param {Object.<number, {solid?: boolean}>} blockProps - ブロックプロパティ辞書
 * @returns {boolean} 固体の場合true
 */
function isBlockSolid(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && props.solid === true;
}

/**
 * ブロックが透明かどうかを判定する
 * @param {number} blockType - ブロックタイプID
 * @param {Object.<number, {transparent?: boolean}>} blockProps - ブロックプロパティ辞書
 * @returns {boolean} 透明の場合true
 */
function isBlockTransparent(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && props.transparent === true;
}

/**
 * ブロックが破壊可能かどうかを判定する
 * @param {number} blockType - ブロックタイプID
 * @param {Object.<number, {unbreakable?: boolean}>} blockProps - ブロックプロパティ辞書
 * @returns {boolean} 破壊可能な場合true
 */
function isBlockBreakable(blockType, blockProps) {
    const props = blockProps[blockType];
    return props && !props.unbreakable;
}

/**
 * ブロック破壊時のドロップアイテムを取得する
 * @param {number} blockType - ブロックタイプID
 * @param {Object.<number, {drop?: number}>} blockProps - ブロックプロパティ辞書
 * @returns {number} ドロップするブロックタイプID
 */
function getBlockDrop(blockType, blockProps) {
    const props = blockProps[blockType];
    return (props && props.drop !== undefined) ? props.drop : blockType;
}

/**
 * ブロックのタイプ（素材）を取得する
 * @param {number} blockType - ブロックタイプID
 * @param {Object.<number, {type?: string}>} blockProps - ブロックプロパティ辞書
 * @returns {string|undefined} ブロックタイプ文字列
 */
function getBlockMaterialType(blockType, blockProps) {
    const props = blockProps[blockType];
    return props ? props.type : undefined;
}

// ============================================================================
// 地形生成
// ============================================================================

/**
 * 指定X座標での地形高さを計算する
 * @param {number} x - X座標
 * @param {number} baseHeight - 基準高さ
 * @returns {number} 地形の高さ（Y座標）
 */
function calculateTerrainHeight(x, baseHeight) {
    const h = Math.sin(x / 30) * 12 + Math.sin(x / 8) * 3;
    return Math.floor(baseHeight + h);
}

/**
 * 地形全体の高さ配列を生成する
 * @param {number} width - ワールド幅
 * @param {number} baseHeight - 基準高さ
 * @returns {number[]} 各X座標での高さ配列
 */
function generateTerrainHeights(width, baseHeight) {
    const heights = [];
    for (let x = 0; x < width; x++) {
        heights.push(calculateTerrainHeight(x, baseHeight));
    }
    return heights;
}

// ============================================================================
// カメラ
// ============================================================================

/**
 * カメラ位置を計算する（スムーズ追従）
 * @param {number} currentCam - 現在のカメラ位置
 * @param {number} targetCam - 目標のカメラ位置
 * @param {number} smoothing - スムージング係数 (0.0 ~ 1.0)
 * @returns {number} 新しいカメラ位置
 */
function smoothCamera(currentCam, targetCam, smoothing) {
    return currentCam + (targetCam - currentCam) * smoothing;
}

/**
 * カメラ位置を範囲内に制限する
 * @param {number} cameraPos - カメラ位置
 * @param {number} minPos - 最小位置
 * @param {number} worldSize - ワールドサイズ（ピクセル）
 * @param {number} viewportSize - ビューポートサイズ（ピクセル）
 * @returns {number} 制限されたカメラ位置
 */
function clampCamera(cameraPos, minPos, worldSize, viewportSize) {
    return clamp(cameraPos, minPos, worldSize - viewportSize);
}

// ============================================================================
// 描画範囲計算
// ============================================================================

/**
 * 描画すべきタイル範囲を計算する
 * @param {number} cameraX - カメラX位置
 * @param {number} cameraY - カメラY位置
 * @param {number} canvasWidth - キャンバス幅
 * @param {number} canvasHeight - キャンバス高さ
 * @param {number} tileSize - タイルサイズ
 * @returns {{startX: number, endX: number, startY: number, endY: number}} 描画範囲
 */
function calculateVisibleTileRange(cameraX, cameraY, canvasWidth, canvasHeight, tileSize) {
    const startX = Math.floor(cameraX / tileSize);
    const endX = startX + Math.ceil(canvasWidth / tileSize) + 1;
    const startY = Math.floor(cameraY / tileSize);
    const endY = startY + Math.ceil(canvasHeight / tileSize) + 1;
    return { startX, endX, startY, endY };
}

// ============================================================================
// 隣接チェック
// ============================================================================

/**
 * 隣接オフセット配列
 * @type {Array<[number, number]>}
 */
const NEIGHBOR_OFFSETS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**
 * 指定位置に隣接する非空気ブロックがあるかを判定する
 * @param {number} tx - タイルX座標
 * @param {number} ty - タイルY座標
 * @param {function(number, number): number} getBlockFn - ブロック取得関数
 * @param {number} airBlockId - 空気ブロックのID
 * @returns {boolean} 隣接ブロックがある場合true
 */
function hasAdjacentBlock(tx, ty, getBlockFn, airBlockId) {
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        if (getBlockFn(tx + dx, ty + dy) !== airBlockId) {
            return true;
        }
    }
    return false;
}
