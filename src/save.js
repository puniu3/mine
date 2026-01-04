/**
 * Save/Load Module
 * Handles game state persistence using localStorage
 */

const SAVE_KEY = 'blockCraftSave';
const AUTOSAVE_INTERVAL = 5000;

/**
 * Convert Uint8Array to base64 string
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
 * Convert base64 string to Uint8Array
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
 * Load game state from localStorage (standalone, no dependencies)
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

    /**
     * Save current game state to localStorage
     */
    function saveGameState() {
        if (!world || !player) return;
        try {
            const state = {
                world: {
                    width: world.width,
                    height: world.height,
                    map: uint8ToBase64(world.map)
                },
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
            localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn('Failed to save game state', err);
        }
    }

    /**
     * Apply saved state to game objects
     */
    function applySavedState(state) {
        if (!state) return;

        if (state.world && state.world.map && state.world.width === world.width && state.world.height === world.height) {
            const decodedMap = base64ToUint8(state.world.map);
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
            player.x = utils.clamp(player.x, 0, world.width * constants.TILE_SIZE - player.width);
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
