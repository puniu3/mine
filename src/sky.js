/**
 * Sky rendering module
 */

import { clamp } from './utils.js';

const SKY_BANDS = {
    surface: { top: '#87CEEB', bottom: '#E0F7FA' },
    underground: { top: '#1b1b25', bottom: '#0a0c14' },
    stratosphere: { top: '#0d1b42', bottom: '#6fb3ff' }
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(lerp(r1, r2, t));
    const g = Math.round(lerp(g1, g2, t));
    const b = Math.round(lerp(b1, b2, t));

    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 元のロジックを内部関数として定義（端の処理なし）
function getRawSkyGradientColors(altitude) {
    // altitude: 0 = top of world (high sky), 1 = bottom (deep underground)
    const surfaceLower = 0.45;
    const surfaceUpper = 0.55;

    if (altitude < surfaceLower) {
        const t = clamp(altitude / surfaceLower, 0, 1);
        return {
            top: lerpColor(SKY_BANDS.stratosphere.top, SKY_BANDS.surface.top, t),
            bottom: lerpColor(SKY_BANDS.stratosphere.bottom, SKY_BANDS.surface.bottom, t)
        };
    }

    if (altitude > surfaceUpper) {
        const t = clamp((altitude - surfaceUpper) / (1 - surfaceUpper), 0, 1);
        return {
            top: lerpColor(SKY_BANDS.surface.top, SKY_BANDS.underground.top, t),
            bottom: lerpColor(SKY_BANDS.surface.bottom, SKY_BANDS.underground.bottom, t)
        };
    }

    return SKY_BANDS.surface;
}

// 公開する関数：端の処理を追加
export function getSkyGradientColors(altitude) {
    // 端からどれくらいの範囲でブレンドするか (0.0〜0.15, 0.85〜1.0 の範囲で補間)
    const LOOP_SMOOTH_MARGIN = 0.15; 
    
    const baseColor = getRawSkyGradientColors(altitude);

    // 上端付近 (0.0): 下端 (1.0) の色を混ぜる
    if (altitude < LOOP_SMOOTH_MARGIN) {
        const otherColor = getRawSkyGradientColors(1.0);
        // t は端(0)で0、範囲終了(margin)で1
        const t = altitude / LOOP_SMOOTH_MARGIN;
        // 端で50%ブレンド、範囲終了で0%ブレンド（元の色に戻る）
        const blendFactor = 0.5 * (1 - t);
        
        return {
            top: lerpColor(baseColor.top, otherColor.top, blendFactor),
            bottom: lerpColor(baseColor.bottom, otherColor.bottom, blendFactor)
        };
    }

    // 下端付近 (1.0): 上端 (0.0) の色を混ぜる
    if (altitude > 1.0 - LOOP_SMOOTH_MARGIN) {
        const otherColor = getRawSkyGradientColors(0.0);
        // t は端(1)で0、範囲終了(1-margin)で1
        const t = (1.0 - altitude) / LOOP_SMOOTH_MARGIN;
        // 端で50%ブレンド、範囲終了で0%ブレンド
        const blendFactor = 0.5 * (1 - t);

        return {
            top: lerpColor(baseColor.top, otherColor.top, blendFactor),
            bottom: lerpColor(baseColor.bottom, otherColor.bottom, blendFactor)
        };
    }

    // それ以外の範囲は元の色をそのまま返す
    return baseColor;
}
