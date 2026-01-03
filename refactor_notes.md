# main.js 切り離し候補

## Player 周り
- `main.js` 内で `Player` クラスが物理・入力応答・描画まで抱えている（行43-178）。
- 外部とのインタフェースは `update(input, dt)` と `draw(ctx)` に集中しており、必要な依存は `world` と `constants/utils/sounds` に限られる。
- `player.js` にクラスを移し、`main.js` はインスタンス生成と `update/draw/getCenter` の呼び出しだけにすると境界が小さくなる。

## 爆発(TNT) 管理
- `main.js` が `tntTimers` 配列の更新と `explodeTNT` を直接持っている（行190-341）。
- 必要な外部資源は `world` へのブロック操作、`addToInventory`、`createExplosionParticles`、`sounds`、`BLOCKS/TILE_SIZE` のみ。
- これらを引数で受け取る `tnt.js` のようなモジュールに移せば、爆発演出を改造してもゲームループや入力処理に影響を与えない。

## 描画・カメラ
- `draw()` が背景生成、タイル描画、プレイヤー描画、ハイライト描画まで担っている（行343-391）。
- 依存は `world`、`player`、`textures` とカメラ座標だけで完結しており、副作用は `debug-info` への UI 更新程度。
- `renderer.js` に `renderScene({ctx, world, player, textures, camera, input})` を切り出せば、ゲームループの更新ロジックと描画ロジックが分離され、描画最適化やカメラ演出を別途変更しやすくなる。

## 初期化ハーネス
- `init()` がワールド生成、テクスチャ生成、アクション・入力・UI 初期化まで抱えている（行203-257）。
- これらは手続き的で、外部から参照される状態は `world` と `player` 生成後のインスタンスのみ。初期化手順を `bootstrap.js` にまとめれば、テスト用に異なるワールドやテクスチャを差し替える際の参照範囲が限定される。
