/**
 * Save/Load Module
 * Handles game state persistence using localStorage and Web Worker
 */

import { rleDecode } from './utils.js';

const SAVE_KEY = 'blockCraftSave';
const AUTOSAVE_INTERVAL = 5000;

/**
 * Inline Worker code as a string (to work with bundled builds)
 */
const WORKER_CODE = `
const SAVE_SCHEMA_VERSION = 2;

function rleEncode(data) {
    if (data.length === 0) return new Uint8Array(0);
    const result = [];
    let i = 0;
    while (i < data.length) {
        const value = data[i];
        let count = 1;
        while (i + count < data.length && data[i + count] === value && count < 65535) {
            count++;
        }
        result.push(value);
        if (count <= 255) {
            result.push(count);
        } else {
            result.push(0);
            result.push((count >> 8) & 0xff);
            result.push(count & 0xff);
        }
        i += count;
    }
    return new Uint8Array(result);
}

function uint8ToBase64(bytes) {
    const chunkSize = 0x8000;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const slice = bytes.subarray(i, i + chunkSize);
        chunks.push(String.fromCharCode(...slice));
    }
    return btoa(chunks.join(''));
}

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SAVE') {
        try {
            const { map, width, height, player, inventory, timers } = payload;
            const compressedMap = rleEncode(map);
            const base64Map = uint8ToBase64(compressedMap);
            const state = {
                schema: SAVE_SCHEMA_VERSION,
                world: { width, height, map: base64Map },
                player,
                inventory,
                timers
            };
            const jsonString = JSON.stringify(state);
            self.postMessage({ type: 'SAVE_COMPLETE', data: jsonString });
        } catch (err) {
            self.postMessage({ type: 'SAVE_ERROR', error: err.message });
        }
    }
};
`;

/**
 * Convert base64 string to Uint8Array
 * (Used for loading on main thread)
 */
function base64ToUint8(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Load game state from localStorage (standalone, synchronous)
 */
export function loadGameState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.warn('Failed to parse saved state', err);
        localStorage.removeItem(SAVE_KEY);
        return null;
    }
}

/**
 * Create save manager with dependencies
 */
export function createSaveManager({ world, player, timers, inventory, utils, constants }) {
    let autosaveHandle = null;
    let isSaving = false;
    let worker = null;

    // Initialize Web Worker using inline Blob (works with bundled builds)
    try {
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        worker = new Worker(workerUrl);
        
        worker.onmessage = (e) => {
            const { type, data, error } = e.data;
            
            if (type === 'SAVE_COMPLETE') {
                try {
                    // Final I/O: This is the only synchronous blocking part, but it's just writing a string.
                    // If this still causes lag, we must move to IndexedDB.
                    localStorage.setItem(SAVE_KEY, data);
                } catch (err) {
                    console.warn('LocalStorage write failed:', err);
                } finally {
                    isSaving = false;
                }
            } else if (type === 'SAVE_ERROR') {
                console.warn('Worker save failed:', error);
                isSaving = false;
            }
        };

        worker.onerror = (err) => {
            console.error('Save Worker Error:', err);
            isSaving = false;
        };

    } catch (err) {
        console.warn('Failed to initialize Save Worker, autosave disabled.', err);
    }

    /**
     * Save current game state
     * Creates a snapshot and offloads processing to Worker
     */
    function saveGameState() {
        if (!world || !player || !worker) return;

        // Prevent overlapping saves
        if (isSaving) return;
        isSaving = true;

        // Create a snapshot of the current state.
        // Structured Clone will deep copy these to the worker, preventing race conditions.
        // The main thread is only blocked for the duration of this object creation/copying (very fast).
        const snapshot = {
            map: world.map, // Uint8Array copy
            width: world.width,
            height: world.height,
            player: {
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy,
                grounded: player.grounded,
                facingRight: player.facingRight
            },
            inventory: inventory.getInventoryState(),
            timers: {
                tnt: timers.tnt.map(t => ({ x: t.x, y: t.y, timer: t.timer })),
                saplings: timers.saplings.map(s => ({ x: s.x, y: s.y, timer: s.timer }))
            }
        };

        // Offload to worker
        worker.postMessage({
            type: 'SAVE',
            payload: snapshot
        });
    }

    /**
     * Apply saved state to game objects
     */
    function applySavedState(state) {
        if (!state) return;

        if (state.world && state.world.map && state.world.width === world.width && state.world.height === world.height) {
            const rawData = base64ToUint8(state.world.map);
            // Schema v2+: RLE compressed; v1 or missing: uncompressed
            const decodedMap = (state.schema >= 2) ? rleDecode(rawData) : rawData;
            if (decodedMap.length === world.map.length) {
                world.map = decodedMap;
            }
        }

        if (state.player) {
            player.x = state.player.x ?? player.x;
            player.y = state.player.y ?? player.y;
            player.vx = state.player.vx ?? player.vx;
            player.vy = state.player.vy ?? player.vy;
            player.grounded = state.player.grounded ?? player.grounded;
            player.facingRight = state.player.facingRight ?? player.facingRight;
            player.wrapVertically();
            // player.wrapHorizontally();
        }

        if (state.inventory) {
            inventory.loadInventoryState(state.inventory);
        }

        if (state.timers) {
            timers.tnt.length = 0;
            (state.timers.tnt || []).forEach(t => {
                if (typeof t.x === 'number' && typeof t.y === 'number' && typeof t.timer === 'number') {
                    timers.tnt.push({ x: t.x, y: t.y, timer: t.timer });
                }
            });

            timers.saplings.length = 0;
            (state.timers.saplings || []).forEach(s => {
                if (typeof s.x === 'number' && typeof s.y === 'number' && typeof s.timer === 'number') {
                    timers.saplings.push({ x: s.x, y: s.y, timer: s.timer });
                }
            });
        }
    }

    /**
     * Start autosave interval
     */
    function startAutosave() {
        if (autosaveHandle) clearInterval(autosaveHandle);
        autosaveHandle = setInterval(saveGameState, AUTOSAVE_INTERVAL);
    }

    return {
        saveGameState,
        applySavedState,
        startAutosave
    };
}
