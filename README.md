# Block Craft 2D XL - プロジェクト構造

2Dマインクラフトクローンゲームのソースコード構成です。

## ディレクトリ構造

```
mine/
├── index.html    # メインHTMLファイル（エントリーポイント）
├── style.css     # スタイルシート
├── utils.js      # 純粋関数ユーティリティ
├── audio.js      # オーディオモジュール
├── main.js       # メインゲームロジック
└── README.md     # このファイル
```

## ファイル説明

### index.html
- **役割**: アプリケーションのエントリーポイント
- **内容**:
  - HTML構造（Canvas、UI要素、スタート画面）
  - 外部CSS/JSファイルの読み込み
  - モバイル用タッチコントロールのDOM要素

### style.css
- **役割**: 全てのビジュアルスタイル定義
- **内容**:
  - ゲームキャンバスのスタイル（ピクセル化レンダリング）
  - スタート画面のオーバーレイ
  - ホットバー（アイテムスロット）UI
  - モバイル用タッチコントロール（D-Pad、ジャンプボタン）
  - デバッグ情報・メッセージログ表示

### utils.js
- **役割**: 純粋関数ユーティリティ（副作用なし、テスト容易）
- **JSDoc型定義**:
  - `Rectangle`: 矩形型 `{x, y, w, h}`
  - `Point`: 座標型 `{x, y}`
  - `TileCoord`: タイル座標型 `{tx, ty}`
- **関数一覧**:

| カテゴリ | 関数名 | 説明 |
|---------|--------|------|
| 数学 | `clamp(value, min, max)` | 値を範囲内に制限 |
| 数学 | `lerp(a, b, t)` | 線形補間 |
| 数学 | `distance(x1, y1, x2, y2)` | 2点間距離 |
| 座標変換 | `worldToTile(worldX, worldY, tileSize)` | ワールド→タイル座標 |
| 座標変換 | `tileToWorld(tileX, tileY, tileSize)` | タイル→ワールド座標 |
| 座標変換 | `coordToIndex(x, y, width, height)` | 2D→1D配列インデックス |
| 座標変換 | `screenToWorld(screenX, screenY, cameraX, cameraY)` | スクリーン→ワールド座標 |
| 衝突判定 | `rectsIntersect(rect1, rect2)` | 矩形交差判定 |
| 衝突判定 | `pointInRect(px, py, rect)` | 点が矩形内か判定 |
| 衝突判定 | `isWithinReach(px, py, centerX, centerY, reach)` | リーチ範囲判定 |
| ブロック | `isBlockSolid(blockType, blockProps)` | 固体ブロック判定 |
| ブロック | `isBlockTransparent(blockType, blockProps)` | 透明ブロック判定 |
| ブロック | `isBlockBreakable(blockType, blockProps)` | 破壊可能判定 |
| ブロック | `getBlockDrop(blockType, blockProps)` | ドロップアイテム取得 |
| ブロック | `getBlockMaterialType(blockType, blockProps)` | 素材タイプ取得 |
| 地形生成 | `calculateTerrainHeight(x, baseHeight)` | 地形高さ計算 |
| 地形生成 | `generateTerrainHeights(width, baseHeight)` | 地形高さ配列生成 |
| カメラ | `smoothCamera(currentCam, targetCam, smoothing)` | スムーズ追従 |
| カメラ | `clampCamera(cameraPos, minPos, worldSize, viewportSize)` | カメラ位置制限 |
| 描画 | `calculateVisibleTileRange(...)` | 可視タイル範囲計算 |
| 隣接 | `hasAdjacentBlock(tx, ty, getBlockFn, airBlockId)` | 隣接ブロック判定 |

### audio.js
- **役割**: サウンドエンジン（Web Audio API使用）
- **内容**:
  - `SoundManager` クラス
    - `init()`: AudioContext初期化
    - `playJump()`: ジャンプ効果音（矩形波）
    - `playDig(type)`: 掘削効果音（ノイズ + フィルター）
    - `playPop()`: UI選択効果音
  - グローバルインスタンス `sounds`

### main.js
- **役割**: ゲームコアロジック
- **依存**: `utils.js`, `audio.js`
- **内容**:
  - **定数・設定**: タイルサイズ、ワールドサイズ、物理定数
  - **ブロック定義**: `BLOCKS`（タイプ）、`BLOCK_PROPS`（プロパティ）
  - **インベントリシステム**: アイテム管理、UI更新
  - **テクスチャ生成**: プロシージャルテクスチャ（Canvas 2D）
  - **ゲームクラス**:
    - `World`: ワールド生成、ブロック管理
    - `Player`: プレイヤー移動、衝突判定、描画
  - **メインループ**: `init()`, `update()`, `draw()`, `loop()`
  - **入力処理**: キーボード、マウス、タッチイベント

## 依存関係

```
index.html
    ├── style.css (スタイル)
    ├── utils.js (最初に読み込み - 純粋関数定義)
    ├── audio.js (soundsインスタンス定義)
    └── main.js (utils.js, audio.jsに依存)
```

## アーキテクチャ設計

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│                  (エントリーポイント)                  │
└─────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  style.css  │  │  utils.js   │  │  audio.js   │
│  (スタイル)  │  │ (純粋関数)   │  │ (サウンド)   │
└─────────────┘  └──────┬──────┘  └──────┬──────┘
                        │                │
                        ▼                ▼
               ┌─────────────────────────────┐
               │          main.js            │
               │     (ゲームロジック)         │
               │  ┌─────────┐ ┌─────────┐   │
               │  │  World  │ │ Player  │   │
               │  └─────────┘ └─────────┘   │
               └─────────────────────────────┘
```

## 技術スタック

- **HTML5 Canvas**: ゲーム描画
- **Web Audio API**: サウンド生成
- **Vanilla JavaScript**: フレームワーク不使用
- **CSS3**: UI・レスポンシブデザイン
- **JSDoc**: 型定義ドキュメント

## ゲーム機能

1. **ワールド生成**: プロシージャル地形生成（サイン波ベース）
2. **ブロック操作**: 破壊・設置（リーチ制限あり）
3. **インベントリ**: ホットバーでアイテム管理
4. **オートクライム**: 足元にブロック設置時の自動上昇
5. **モバイル対応**: タッチコントロール
