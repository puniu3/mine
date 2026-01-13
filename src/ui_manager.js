import { loadGameState } from './save.js';
import { exportWorldToImage, importWorldFromImage, downloadBlob } from './world_share.js';
import { strings, setLanguage } from './i18n.js';
import { sounds } from './audio.js';

// Gamepad button indices
const GP_A = 0;
const GP_B = 1;
const GP_DPAD_UP = 12;
const GP_DPAD_DOWN = 13;

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

    // --- Volume Settings Logic ---
    const bgmSlider = document.getElementById('vol-bgm');
    const sfxSlider = document.getElementById('vol-sfx');
    const volumeToggleBtn = document.getElementById('volume-toggle-btn');
    const volumePopup = document.getElementById('volume-popup');

    function initVolumeSettings() {
        // Load from LocalStorage (default 0.5)
        const savedBgm = localStorage.getItem('pictoco_vol_bgm');
        const savedSfx = localStorage.getItem('pictoco_vol_sfx');

        const bgmVol = savedBgm !== null ? parseFloat(savedBgm) : 0.5;
        const sfxVol = savedSfx !== null ? parseFloat(savedSfx) : 0.5;

        // Update Sliders
        if (bgmSlider) bgmSlider.value = bgmVol;
        if (sfxSlider) sfxSlider.value = sfxVol;

        // Apply to Sound Manager
        sounds.setMusicVolume(bgmVol);
        sounds.setSfxVolume(sfxVol);
    }

    if (bgmSlider) {
        bgmSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            sounds.setMusicVolume(val);
            localStorage.setItem('pictoco_vol_bgm', val);
        });
    }

    if (sfxSlider) {
        sfxSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            sounds.setSfxVolume(val);
            localStorage.setItem('pictoco_vol_sfx', val);
        });
    }

    // Toggle Volume Popup
    if (volumeToggleBtn && volumePopup) {
        volumeToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (volumePopup.classList.contains('open')) {
                volumePopup.classList.remove('open');
            } else {
                volumePopup.classList.add('open');
            }
        });
    }

    initVolumeSettings();

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

    // Event: Close popups when clicking outside
    document.addEventListener('click', (e) => {
        // Close Language Popup
        if (langPopup && langPopup.classList.contains('open')) {
            if (!langPopup.contains(e.target) && e.target !== langCurrentBtn) {
                closeLangPopup();
            }
        }

        // Close Volume Popup
        if (volumePopup && volumePopup.classList.contains('open')) {
            if (!volumePopup.contains(e.target) && e.target !== volumeToggleBtn) {
                volumePopup.classList.remove('open');
            }
        }
    });

    // --- Gamepad Navigation for Start Screen ---
    let titleSelectedIndex = 0;
    let prevDpadUp = false;
    let prevDpadDown = false;
    let prevAButton = false;

    function getVisibleTitleButtons() {
        const startScreen = document.getElementById('start-screen');
        if (!startScreen || startScreen.style.display === 'none') return [];

        const buttons = [];
        const savedState = loadGameState();

        // Primary buttons (based on save state)
        if (savedState) {
            const continueBtn = document.getElementById('continue-btn');
            if (continueBtn) buttons.push(continueBtn);
            const resetBtn = document.getElementById('reset-btn');
            if (resetBtn) buttons.push(resetBtn);
        } else {
            const startBtn = document.getElementById('start-btn');
            if (startBtn) buttons.push(startBtn);
        }

        // World button is always visible
        const worldBtn = document.getElementById('world-btn');
        if (worldBtn) buttons.push(worldBtn);

        return buttons;
    }

    function updateTitleSelection() {
        const buttons = getVisibleTitleButtons();
        buttons.forEach((btn, index) => {
            if (index === titleSelectedIndex) {
                btn.classList.add('gamepad-selected');
                btn.focus();
            } else {
                btn.classList.remove('gamepad-selected');
            }
        });
    }

    function pollTitleGamepad() {
        const startScreen = document.getElementById('start-screen');
        if (!startScreen || startScreen.style.display === 'none') return;

        // Check if world modal is open
        if (worldModal && worldModal.classList.contains('visible')) return;

        const gamepads = navigator.getGamepads();
        let gp = null;
        for (const pad of gamepads) {
            if (pad && pad.connected) {
                gp = pad;
                break;
            }
        }
        if (!gp) return;

        const { buttons } = gp;
        const visibleButtons = getVisibleTitleButtons();

        // D-PAD Up
        const dpadUp = buttons[GP_DPAD_UP] && buttons[GP_DPAD_UP].pressed;
        if (dpadUp && !prevDpadUp) {
            titleSelectedIndex = Math.max(0, titleSelectedIndex - 1);
            updateTitleSelection();
        }
        prevDpadUp = dpadUp;

        // D-PAD Down
        const dpadDown = buttons[GP_DPAD_DOWN] && buttons[GP_DPAD_DOWN].pressed;
        if (dpadDown && !prevDpadDown) {
            titleSelectedIndex = Math.min(visibleButtons.length - 1, titleSelectedIndex + 1);
            updateTitleSelection();
        }
        prevDpadDown = dpadDown;

        // A Button - Activate selected button
        const aButton = buttons[GP_A] && buttons[GP_A].pressed;
        if (aButton && !prevAButton) {
            const selectedBtn = visibleButtons[titleSelectedIndex];
            if (selectedBtn) selectedBtn.click();
        }
        prevAButton = aButton;
    }

    // Poll gamepad for title screen navigation
    setInterval(pollTitleGamepad, 50);

    // Initialize selection on gamepad connect
    window.addEventListener('gamepadconnected', () => {
        titleSelectedIndex = 0;
        updateTitleSelection();
    });
}
