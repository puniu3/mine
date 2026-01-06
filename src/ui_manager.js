import { loadGameState } from './save.js';
import { exportWorldToImage, importWorldFromImage, downloadBlob } from './world_share.js';

/**
 * Initializes UI event listeners and DOM interactions.
 * @param {Object} callbacks - Functions to communicate back to the main game loop.
 * @param {Function} callbacks.onStartGame - Called when New Game is clicked.
 * @param {Function} callbacks.onLoadGame - Called when Continue is clicked.
 * @param {Function} callbacks.onImportWorld - Called when a world image is successfully imported.
 */
export function initUI(callbacks) {
    const { onStartGame, onLoadGame, onImportWorld } = callbacks;

    // --- Start Screen Logic ---
    function hideStartScreen() {
        const screen = document.getElementById('start-screen');
        if (screen) screen.style.display = 'none';
    }

    function refreshContinueButton() {
        const savedState = loadGameState();
        const continueBtn = document.getElementById('continue-btn');
        if (!continueBtn) return;
        continueBtn.style.display = savedState ? 'inline-block' : 'none';
    }

    // Initialize button state immediately
    refreshContinueButton();

    // Event: Start New Game
    document.getElementById('start-btn').addEventListener('click', () => {
        hideStartScreen();
        onStartGame();
    });

    // Event: Continue Game
    const continueButton = document.getElementById('continue-btn');
    if (continueButton) {
        continueButton.addEventListener('click', () => {
            const savedState = loadGameState();
            if (!savedState) return;
            hideStartScreen();
            onLoadGame(savedState);
        });
    }

    // --- World Share Modal Logic ---
    const worldModal = document.getElementById('world-modal');
    const worldBtn = document.getElementById('world-btn');
    const worldCloseBtn = document.getElementById('world-close-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    function showWorldModal() { if(worldModal) worldModal.style.display = 'block'; }
    function hideWorldModal() { if(worldModal) worldModal.style.display = 'none'; }

    if(worldBtn) worldBtn.addEventListener('click', showWorldModal);
    if(worldCloseBtn) worldCloseBtn.addEventListener('click', hideWorldModal);

    // Event: Export World
    if(exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const savedState = loadGameState();
            if (!savedState || !savedState.world || !savedState.world.map) {
                alert('セーブデータがありません');
                return;
            }

            // Decode base64 to Uint8Array
            const binary = atob(savedState.world.map);
            const worldMap = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                worldMap[i] = binary.charCodeAt(i);
            }

            const blob = await exportWorldToImage(worldMap, savedState.world.width, savedState.world.height);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            downloadBlob(blob, `world_${timestamp}.png`);
        });
    }

    // Event: Import World
    if(importBtn && importFile) {
        importBtn.addEventListener('click', async () => {
            const file = importFile.files[0];
            if (!file) {
                alert('えを えらんでね');
                return;
            }

            try {
                const worldMap = await importWorldFromImage(file);
                
                // Hide UIs
                hideWorldModal();
                hideStartScreen();

                // Pass the raw map data back to Main
                onImportWorld(worldMap);

            } catch (err) {
                alert('この えでは ワールドを つくれないよ' + err.message);
            }
        });
    }
}
