import { HOTBAR_ITEMS } from './constants.js';

// Gamepad button indices for Xbox controller (Standard Gamepad mapping)
const GAMEPAD_BUTTONS = {
    A: 0,           // Jump
    B: 1,           // Close UI
    X: 2,           // Climb
    Y: 3,
    LB: 4,          // Hotbar left
    RB: 5,          // Hotbar right
    LT: 6,          // Place block
    RT: 7,          // Break block
    BACK: 8,
    START: 9,
    L_STICK: 10,
    R_STICK: 11,
    DPAD_UP: 12,
    DPAD_DOWN: 13,
    DPAD_LEFT: 14,
    DPAD_RIGHT: 15
};

// Gamepad axis indices
const GAMEPAD_AXES = {
    LEFT_X: 0,      // Movement
    LEFT_Y: 1,
    RIGHT_X: 2,     // Cursor
    RIGHT_Y: 3
};

// Deadzone and sensitivity settings
const DEADZONE = 0.01;
const CURSOR_SENSITIVITY = .3;

export function createInput(canvas, { onHotbarSelect, onTouch, onClimb }) {
    const input = {
        keys: { left: false, right: false, jump: false },
        mouse: { x: 0, y: 0, leftDown: false, active: false },
        gamepad: {
            connected: false,
            cursorX: 0,
            cursorY: 0,
            cursorActive: false,
            breakAction: false,
            placeAction: false,
            // Previous button states for edge detection
            prevButtons: {}
        }
    };

    let lastTouchTime = 0;
    let gamepadIndex = null;

    // Hide mobile controls on first keydown, then remove listener
    const hideMobileControls = () => {
        const el = document.getElementById('mobile-controls');
        if (el) el.style.display = 'none';
        window.removeEventListener('keydown', hideMobileControls);
    };
    window.addEventListener('keydown', hideMobileControls);

    window.addEventListener('keydown', e => {
        switch (e.code) {
            case 'KeyA': case 'ArrowLeft': input.keys.left = true; e.preventDefault(); break;
            case 'KeyD': case 'ArrowRight': input.keys.right = true; e.preventDefault(); break;
            case 'KeyW': case 'ArrowUp': case 'Space': input.keys.jump = true; e.preventDefault(); break;
            case 'Digit1': if (onHotbarSelect) onHotbarSelect(0); break;
            case 'Digit2': if (onHotbarSelect) onHotbarSelect(1); break;
            case 'Digit3': if (onHotbarSelect) onHotbarSelect(2); break;
            case 'Digit4': if (onHotbarSelect) onHotbarSelect(3); break;
            case 'Digit5': if (onHotbarSelect) onHotbarSelect(4); break;
            case 'Digit6': if (onHotbarSelect) onHotbarSelect(5); break;
            case 'Digit7': if (onHotbarSelect) onHotbarSelect(6); break;
            case 'Digit8': if (onHotbarSelect) onHotbarSelect(7); break;
            case 'Digit9': if (onHotbarSelect) onHotbarSelect(8); break;
            case 'KeyS': case 'ArrowDown': if (onClimb) onClimb(); break;
        }
    });

    window.addEventListener('keyup', e => {
        switch (e.code) {
            case 'KeyA': case 'ArrowLeft': input.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': input.keys.right = false; break;
            case 'KeyW': case 'ArrowUp': case 'Space': input.keys.jump = false; break;
        }
    });

    window.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        input.mouse.x = e.clientX - rect.left;
        input.mouse.y = e.clientY - rect.top;
        
        if (Date.now() - lastTouchTime > 500) {
            input.mouse.active = true;
        }
    });

    window.addEventListener('mousedown', e => {
        if (e.target !== canvas) return;
        input.mouse.leftDown = true;
    });

    window.addEventListener('mouseup', () => {
        input.mouse.leftDown = false;
    });

    window.addEventListener('touchstart', () => {
        input.mouse.active = false;
        lastTouchTime = Date.now();
    }, { passive: true });

    const setupTouch = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            input.keys[key] = true;
            input.mouse.active = false;
            lastTouchTime = Date.now();
        });
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            input.keys[key] = false;
        });
    };

    setupTouch('btn-left', 'left');
    setupTouch('btn-right', 'right');
    setupTouch('btn-jump', 'jump');
    canvas.addEventListener('touchstart', e => {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        input.mouse.active = false;
        lastTouchTime = Date.now();
        if (onTouch) onTouch(t.clientX - rect.left, t.clientY - rect.top);
    }, { passive: false });

    // --- Gamepad Support ---

    // Apply deadzone to axis value
    function applyDeadzone(value) {
        if (Math.abs(value) < DEADZONE) return 0;
        // Normalize value to 0-1 range after deadzone
        const sign = Math.sign(value);
        return sign * (Math.abs(value) - DEADZONE) / (1 - DEADZONE);
    }

    // Check if button was just pressed (edge detection)
    function isButtonJustPressed(buttons, index) {
        const isPressed = buttons[index] && buttons[index].pressed;
        const wasPressed = input.gamepad.prevButtons[index];
        return isPressed && !wasPressed;
    }

    // Gamepad connection handlers
    window.addEventListener('gamepadconnected', (e) => {
        if(e.gamepad.mapping !== 'standard') return;
        gamepadIndex = e.gamepad.index;
        input.gamepad.connected = true;
        input.gamepad.cursorActive = true;

        // Initialize cursor at center of screen
        const rect = canvas.getBoundingClientRect();
        input.gamepad.cursorX = rect.width / 2;
        input.gamepad.cursorY = rect.height / 2;

        // Hide mobile controls when gamepad is connected
        const el = document.getElementById('mobile-controls');
        if (el) el.style.display = 'none';
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        if (e.gamepad.index === gamepadIndex) {
            gamepadIndex = null;
            input.gamepad.connected = false;
            input.gamepad.cursorActive = false;
        }
    });

    // Check for already connected gamepads (e.g., connected during title screen)
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
        if (gp && gp.connected && gp.mapping === 'standard') {
            gamepadIndex = gp.index;
            input.gamepad.connected = true;
            input.gamepad.cursorActive = true;

            // Initialize cursor at center of screen
            const rect = canvas.getBoundingClientRect();
            input.gamepad.cursorX = rect.width / 2;
            input.gamepad.cursorY = rect.height / 2;

            // Hide mobile controls when gamepad is connected
            const el = document.getElementById('mobile-controls');
            if (el) el.style.display = 'none';
            break;
        }
    }

    // Hotbar selection tracking for LB/RB
    let currentHotbarIndex = 0;

    // Track previous player screen position for cursor following
    let prevPlayerScreenX = null;
    let prevPlayerScreenY = null;

    /**
     * Poll gamepad state - should be called every frame
     * @param {Object} options - Polling options
     * @param {number} options.screenWidth - Logical screen width for cursor clamping
     * @param {number} options.screenHeight - Logical screen height for cursor clamping
     * @param {number} options.playerScreenX - Player center X position on screen
     * @param {number} options.playerScreenY - Player center Y position on screen
     * @param {number} options.reach - Player interaction reach distance
     * @param {boolean} options.skipJump - Skip A button jump input (for crafting UI)
     */
    function pollGamepads({ screenWidth, screenHeight, playerScreenX, playerScreenY, reach, skipJump }) {
        if (gamepadIndex === null) return;

        const gamepads = navigator.getGamepads();
        const gp = gamepads[gamepadIndex];

        if (!gp) return;

        const { axes, buttons } = gp;

        // --- Movement (Left Stick) ---
        const leftX = applyDeadzone(axes[GAMEPAD_AXES.LEFT_X] || 0);
        input.keys.left = leftX < -0.3;
        input.keys.right = leftX > 0.3;
        input.gamepad.axisLeftX = leftX;

        // --- Jump (A Button) ---
        // Skip when crafting UI is open (A button used for item selection instead)
        if (!skipJump && buttons[GAMEPAD_BUTTONS.A]) {
            input.keys.jump = buttons[GAMEPAD_BUTTONS.A].pressed;
        }

        // --- Climb (X Button) ---
        if (isButtonJustPressed(buttons, GAMEPAD_BUTTONS.X)) {
            if (onClimb) onClimb();
        }

        // --- Cursor follows player movement to prevent jitter at boundary ---
        if (prevPlayerScreenX !== null && prevPlayerScreenY !== null) {
            const playerDeltaX = playerScreenX - prevPlayerScreenX;
            const playerDeltaY = playerScreenY - prevPlayerScreenY;
            input.gamepad.cursorX += playerDeltaX;
            input.gamepad.cursorY += playerDeltaY;
        }
        prevPlayerScreenX = playerScreenX;
        prevPlayerScreenY = playerScreenY;

        // --- Virtual Cursor Movement (Right Stick) ---
        const rightX = applyDeadzone(axes[GAMEPAD_AXES.RIGHT_X] || 0);
        const rightY = applyDeadzone(axes[GAMEPAD_AXES.RIGHT_Y] || 0);

        if (rightX !== 0 || rightY !== 0) {
            input.gamepad.cursorX += rightX * CURSOR_SENSITIVITY;
            input.gamepad.cursorY += rightY * CURSOR_SENSITIVITY;
            input.gamepad.cursorActive = true;
        }

        // Clamp cursor to player's reach radius (circular constraint)
        if (reach !== undefined && playerScreenX !== undefined && playerScreenY !== undefined) {
            const dx = input.gamepad.cursorX - playerScreenX;
            const dy = input.gamepad.cursorY - playerScreenY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > reach) {
                // Clamp to edge of reach circle
                const scale = reach / distance;
                input.gamepad.cursorX = playerScreenX + dx * scale;
                input.gamepad.cursorY = playerScreenY + dy * scale;
            }
        } else {
            // Fallback to screen bounds if reach not provided
            input.gamepad.cursorX = Math.max(0, Math.min(screenWidth, input.gamepad.cursorX));
            input.gamepad.cursorY = Math.max(0, Math.min(screenHeight, input.gamepad.cursorY));
        }

        // --- Break Block (RT) ---
        if (buttons[GAMEPAD_BUTTONS.RT]) {
            input.gamepad.breakAction = buttons[GAMEPAD_BUTTONS.RT].pressed && buttons[GAMEPAD_BUTTONS.RT].value > 0.5;
        }

        // --- Place Block (LT) ---
        if (buttons[GAMEPAD_BUTTONS.LT]) {
            input.gamepad.placeAction = buttons[GAMEPAD_BUTTONS.LT].pressed && buttons[GAMEPAD_BUTTONS.LT].value > 0.5;
        }

        // --- Hotbar Selection (LB/RB) ---
        const hotbarLength = HOTBAR_ITEMS.length;
        if (isButtonJustPressed(buttons, GAMEPAD_BUTTONS.LB)) {
            currentHotbarIndex = (currentHotbarIndex - 1 + hotbarLength) % hotbarLength;
            if (onHotbarSelect) onHotbarSelect(currentHotbarIndex);
        }
        if (isButtonJustPressed(buttons, GAMEPAD_BUTTONS.RB)) {
            currentHotbarIndex = (currentHotbarIndex + 1) % hotbarLength;
            if (onHotbarSelect) onHotbarSelect(currentHotbarIndex);
        }

        // Store button states for next frame (edge detection)
        for (let i = 0; i < buttons.length; i++) {
            input.gamepad.prevButtons[i] = buttons[i] && buttons[i].pressed;
        }
    }

    // Expose polling function on input object
    input.pollGamepads = pollGamepads;

    return input;
}
