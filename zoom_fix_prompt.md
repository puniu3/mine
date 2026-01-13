# Task: Implement and Compare Zoom Glitch Fixes

I am experiencing visual glitches (white lines/gaps between tiles) when zooming out in the game. I have identified 4 potential solutions. Please implement **all four** strategies in `src/renderer.js`, controlled by a debug toggle (e.g., a global variable `window.ZOOM_RENDER_MODE` or a keyboard shortcut), so I can compare them side-by-side in real-time.

## Requirements

1.  **Modify `src/renderer.js`** to support the following rendering modes:
    *   **Mode 0 (Default):** Current implementation (Direct `ctx.scale` with standard `drawImage`).
    *   **Mode 1 (Overlap):** Draw tiles slightly larger (e.g., `TILE_SIZE + 0.5`) to cover sub-pixel gaps.
    *   **Mode 2 (Nearest Neighbor):** Disable image smoothing (`ctx.imageSmoothingEnabled = false`) to enforce pixelated edges.
    *   **Mode 3 (Integer Snapping):** Instead of `ctx.scale`, manually calculate screen coordinates using `Math.floor()` to snap tiles to integer pixels (e.g., `x = Math.floor((tileX * TILE_SIZE - cameraX) * zoom)`).
    *   **Mode 4 (Offscreen Buffer):** Render the world at 1x scale (native resolution) to an offscreen Canvas, then draw that canvas to the main screen scaled up/down.

2.  **Add a Toggle mechanism:**
    *   Add a simple key listener (e.g., pressing 'Z' or 'F1') in `src/main.js` or `src/input.js` that cycles through these modes.
    *   Display the current active mode name on the screen (e.g., via `ctx.fillText` in the UI layer) so I know which one is active.

3.  **Verify:**
    *   Ensure the game runs and the zoom functionality works in all modes.
    *   Check that the visual artifacts are reduced or eliminated in the proposed modes.
