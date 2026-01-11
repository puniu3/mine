import { loadGameState } from './save.js';
import { exportWorldToImage, importWorldFromImage, downloadBlob } from './world_share.js';
import { strings, setLanguage } from './i18n.js';

/**
 * Initializes UI event listeners and DOM interactions.
 * @param {Object} callbacks - Functions to communicate back to the main game loop.
 * @param {Function} callbacks.onStartGame - Called when New Game is clicked.
 * @param {Function} callbacks.onLoadGame - Called when Continue is clicked.
 * @param {Function} callbacks.onImportWorld - Called when a world image is successfully imported.
 */
export function initUI(callbacks) {
    const { onStartGame, onLoadGame, onImportWorld } = callbacks;
    const uiGamepadState = {
        prevButtons: [],
        focusIndex: 0,
        context: null
    };

    // --- Start Screen Logic ---
    function hideStartScreen() {
        const screen = document.getElementById('start-screen');
        if (screen) screen.style.display = 'none';
    }

    /**
     * Updates the Start Screen state based on save data availability.
     * Toggles the 'has-save' class on the container to let CSS handle visibility.
     */
    function updateStartScreenState() {
        const savedState = loadGameState();
        const container = document.querySelector('.start-buttons');
        
        if (container) {
            if (savedState) {
                container.classList.add('has-save');
            } else {
                container.classList.remove('has-save');
            }
        }
    }

    // Initialize button state immediately on load
    updateStartScreenState();

    // Event: Start New Game (Fresh Start)
    const startButton = document.getElementById('start-btn');
    if (startButton) {
        startButton.addEventListener('click', () => {
            hideStartScreen();
            onStartGame();
        });
    }

    // Event: Start New Game (Reset / Start Over)
    const resetButton = document.getElementById('reset-btn');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            hideStartScreen();
            onStartGame();
        });
    }

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

    function updateWorldModalState() {
        // Export button: disabled if no save data
        if (exportBtn) {
            const savedState = loadGameState();
            exportBtn.disabled = !savedState || !savedState.world || !savedState.world.map;
        }
        // Import button: disabled if no file selected
        if (importBtn && importFile) {
            importBtn.disabled = !importFile.files[0];
        }
    }

    function showWorldModal() {
        if (worldModal) {
            worldModal.classList.add('visible');
            updateWorldModalState();
        }
    }
    function hideWorldModal() { if(worldModal) worldModal.classList.remove('visible'); }

    if(worldBtn) worldBtn.addEventListener('click', showWorldModal);
    if(worldCloseBtn) worldCloseBtn.addEventListener('click', hideWorldModal);

    // Close modal when clicking outside (on the overlay)
    if(worldModal) {
        worldModal.addEventListener('click', (e) => {
            if (e.target === worldModal) {
                hideWorldModal();
            }
        });
    }
    if(importFile) importFile.addEventListener('change', updateWorldModalState);

    // Event: Export World
    if(exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const savedState = loadGameState();
            if (!savedState || !savedState.world || !savedState.world.map) return;

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
            if (!file) return;

            try {
                const worldMap = await importWorldFromImage(file);

                // Hide UIs
                hideWorldModal();
                hideStartScreen();

                // Pass the raw map data back to Main
                onImportWorld(worldMap);

            } catch (err) {
                alert(strings.msg_import_err);
            }
        });
    }

    // --- Language Selector Logic ---
    const langCurrentBtn = document.getElementById('lang-current');
    const langPopup = document.getElementById('lang-popup');
    const langOptions = document.querySelectorAll('.lang-option');

    function updateLanguageUI() {
        // Import currentLanguage dynamically to get the latest value
        import('./i18n.js').then(({ currentLanguage: lang }) => {
            // Update current button with selected language flag
            if (langCurrentBtn) {
                // Clear previous content
                langCurrentBtn.innerHTML = '';
                // Create flag element
                const flag = document.createElement('div');
                flag.className = `flag-icon flag-${lang}`;
                langCurrentBtn.appendChild(flag);
            }
            // Update active state on options
            langOptions.forEach(btn => {
                if (btn.dataset.lang === lang) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    }

    function openLangPopup() {
        if (langPopup) langPopup.classList.add('open');
    }

    function closeLangPopup() {
        if (langPopup) langPopup.classList.remove('open');
    }

    // Initialize UI state
    updateLanguageUI();

    // Event: Toggle popup on current language button click
    if (langCurrentBtn) {
        langCurrentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (langPopup && langPopup.classList.contains('open')) {
                closeLangPopup();
            } else {
                openLangPopup();
            }
        });
    }

    // Event: Language option click
    langOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const langCode = btn.dataset.lang;
            setLanguage(langCode);
            updateLanguageUI();
            closeLangPopup();
        });
    });

    // Event: Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (langPopup && langPopup.classList.contains('open')) {
            if (!langPopup.contains(e.target) && e.target !== langCurrentBtn) {
                closeLangPopup();
            }
        }
    });

    const isVisible = (el) => el && el.offsetParent !== null;

    const getFocusableButtons = (context) => {
        if (context === 'start') {
            return Array.from(document.querySelectorAll('.start-buttons .action-btn'))
                .filter(btn => isVisible(btn) && !btn.disabled);
        }
        if (context === 'world') {
            return [exportBtn, importBtn, worldCloseBtn].filter(btn => isVisible(btn) && !btn.disabled);
        }
        return [];
    };

    const getUiContext = () => {
        if (worldModal && worldModal.classList.contains('visible')) {
            return 'world';
        }
        const startScreen = document.getElementById('start-screen');
        if (isVisible(startScreen)) {
            return 'start';
        }
        return null;
    };

    const updateFocus = (buttons) => {
        if (!buttons.length) return;
        if (uiGamepadState.focusIndex >= buttons.length) {
            uiGamepadState.focusIndex = 0;
        }
        buttons.forEach((btn, index) => {
            if (index === uiGamepadState.focusIndex) {
                btn.classList.add('gamepad-focus');
                btn.focus();
            } else {
                btn.classList.remove('gamepad-focus');
            }
        });
    };

    const isButtonPressed = (button) => button && (button.pressed || button.value > 0.5);

    const pollUiGamepad = () => {
        const context = getUiContext();
        if (context !== uiGamepadState.context) {
            uiGamepadState.context = context;
            uiGamepadState.focusIndex = 0;
        }

        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = pads ? Array.from(pads).find(p => p) : null;

        if (!context || !pad) {
            const buttons = getFocusableButtons(uiGamepadState.context);
            buttons.forEach(btn => btn.classList.remove('gamepad-focus'));
            requestAnimationFrame(pollUiGamepad);
            return;
        }

        const buttons = getFocusableButtons(context);
        if (!buttons.length) {
            requestAnimationFrame(pollUiGamepad);
            return;
        }

        const prevButtons = uiGamepadState.prevButtons.length
            ? uiGamepadState.prevButtons
            : pad.buttons.map(() => false);

        const dpadUp = isButtonPressed(pad.buttons[12]);
        const dpadDown = isButtonPressed(pad.buttons[13]);
        const confirm = isButtonPressed(pad.buttons[0]);
        const cancel = isButtonPressed(pad.buttons[1]);

        if (dpadUp && !prevButtons[12]) {
            uiGamepadState.focusIndex = Math.max(0, uiGamepadState.focusIndex - 1);
        }
        if (dpadDown && !prevButtons[13]) {
            uiGamepadState.focusIndex = Math.min(buttons.length - 1, uiGamepadState.focusIndex + 1);
        }
        updateFocus(buttons);

        if (confirm && !prevButtons[0]) {
            buttons[uiGamepadState.focusIndex]?.click();
        }
        if (cancel && !prevButtons[1] && context === 'world') {
            hideWorldModal();
        }

        uiGamepadState.prevButtons = pad.buttons.map(isButtonPressed);
        requestAnimationFrame(pollUiGamepad);
    };

    pollUiGamepad();
}
