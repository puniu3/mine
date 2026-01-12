/**
 * Save Worker
 * Handles heavy compression and serialization tasks off the main thread.
 */

import { rleEncode } from './utils.js';

/** Current save schema version */
const SAVE_SCHEMA_VERSION = 2;

/**
 * Convert Uint8Array to base64 string
 * (Moved from main thread to worker)
 */
function uint8ToBase64(bytes) {
    const chunkSize = 0x8000;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const slice = bytes.subarray(i, i + chunkSize);
        chunks.push(String.fromCharCode(...slice));
    }
    return btoa(chunks.join(''));
}

/**
 * Handle messages from the main thread
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'SAVE') {
        try {
            const { map, width, height, player, inventory, timers } = payload;

            // 1. Heavy Task: RLE Compression (CPU intensive)
            const compressedMap = rleEncode(map);

            // 2. Heavy Task: Base64 Conversion (CPU intensive)
            const base64Map = uint8ToBase64(compressedMap);

            // Construct final state object
            const state = {
                schema: SAVE_SCHEMA_VERSION,
                world: {
                    width: width,
                    height: height,
                    map: base64Map
                },
                player: player,
                inventory: inventory,
                timers: timers
            };

            // 3. Heavy Task: JSON Serialization (CPU intensive)
            const jsonString = JSON.stringify(state);

            // Send result back to main thread
            self.postMessage({
                type: 'SAVE_COMPLETE',
                data: jsonString
            });

        } catch (err) {
            self.postMessage({
                type: 'SAVE_ERROR',
                error: err.message
            });
        }
    }
};
