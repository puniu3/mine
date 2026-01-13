# Task: Implement Integer Snapping for Tile Rendering

The current camera zoom implementation causes visual gaps (white lines) between tiles due to sub-pixel rendering. I want to switch to an "Integer Snapping" approach to resolve this.

Please refactor `src/renderer.js` to implement this fix.

## Implementation Details

1.  **Refactor Step 5 (Water Masking) and Step 6 (World Rendering):**
    *   Remove the `ctx.scale(zoom, zoom)` and `ctx.translate(...)` wrappers that currently surround these steps.
    *   Instead, inside the tile loops, manually calculate the screen-space coordinates for each tile.

2.  **Coordinate Logic:**
    *   Use `Math.floor()` for positions to ensure they snap to integer pixels.
    *   Use `Math.ceil()` for the width and height to ensure the tile covers the entire potential sub-pixel area, preventing gaps.
    *   **Formula:**
        ```javascript
        const screenX = Math.floor((x * TILE_SIZE - cameraX) * zoom);
        const screenY = Math.floor((y * TILE_SIZE - cameraY) * zoom);
        const screenW = Math.ceil(TILE_SIZE * zoom);
        const screenH = Math.ceil(TILE_SIZE * zoom);
        ```

3.  **Update Drawing Calls:**
    *   Apply these new coordinates (`screenX`, `screenY`, `screenW`, `screenH`) to all `ctx.drawImage` and `ctx.fillRect` calls within Steps 5 and 6.
    *   *Note:* For Step 5 (Water), the existing logic uses subtraction `(x * TILE - cameraX)`. Ensure this is updated to the new multiplied-then-floored logic correctly.

4.  **Handle Entities (Step 7) & Particles:**
    *   For the subsequent steps (Entities, Particles, Cursor), you must also adjust their coordinate system so they match the world.
    *   You have two options:
        *   **Option A:** Apply the same manual calculation to entities (cleanest visual alignment).
        *   **Option B:** Wrap Steps 7+ in a `ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-Math.floor(cameraX), ...);` block to restore the previous behavior for sprites, **provided** it aligns well with the snapped terrain.
    *   *Guidance:* Since entities are sprites and don't tile, precise integer snapping is less critical for them, but they must appear at the correct relative position to the blocks. Option B is likely simpler for entities, but ensure the translation matches the logic used for tiles.

5.  **Clean Up:**
    *   Ensure no unused variables or code paths remain from the old scaling logic.
