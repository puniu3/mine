export function createInput(canvas, { onHotbarSelect, onHotbarMove, onTouch, onClimb }) {
    const input = {
        keyboard: { left: false, right: false, jump: false },
        keys: { left: false, right: false, jump: false },
        mouse: { x: 0, y: 0, leftDown: false, active: false },
        cursor: { x: 0, y: 0, active: false },
        lastInputSource: 'mouse',
        gamepad: {
            connected: false,
            index: null,
            cursorX: 0,
            cursorY: 0,
            active: false,
            initialized: false,
            prevButtons: [],
            actions: { breakPressed: false, placePressed: false },
            ui: {
                upPressed: false,
                downPressed: false,
                leftPressed: false,
                rightPressed: false,
                confirmPressed: false,
                cancelPressed: false
            }
        }
    };

    let lastTouchTime = 0;
    const stickDeadzone = 0.2;
    const triggerThreshold = 0.5;
    const cursorSpeed = 12;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const applyDeadzone = (value, deadzone) => {
        if (Math.abs(value) < deadzone) return 0;
        return value;
    };

    const isButtonPressed = (button) => {
        if (!button) return false;
        return button.pressed || button.value >= triggerThreshold;
    };

    const setCombinedKeys = (gamepadKeys) => {
        input.keys.left = input.keyboard.left || gamepadKeys.left;
        input.keys.right = input.keyboard.right || gamepadKeys.right;
        input.keys.jump = input.keyboard.jump || gamepadKeys.jump;
    };

    const setCursorFromSource = () => {
        if (input.lastInputSource === 'gamepad' && input.gamepad.active) {
            input.cursor.x = input.gamepad.cursorX;
            input.cursor.y = input.gamepad.cursorY;
            input.cursor.active = true;
            return;
        }
        if (input.mouse.active) {
            input.cursor.x = input.mouse.x;
            input.cursor.y = input.mouse.y;
            input.cursor.active = true;
            return;
        }
        input.cursor.active = false;
    };

    const getConnectedGamepad = () => {
        if (!navigator.getGamepads) return null;
        const pads = navigator.getGamepads();
        if (!pads) return null;
        if (input.gamepad.index !== null && pads[input.gamepad.index]) {
            return pads[input.gamepad.index];
        }
        return Array.from(pads).find(pad => pad);
    };

    // Hide mobile controls on first keydown, then remove listener
    const hideMobileControls = () => {
        const el = document.getElementById('mobile-controls');
        if (el) el.style.display = 'none';
        window.removeEventListener('keydown', hideMobileControls);
    };
    window.addEventListener('keydown', hideMobileControls);

    window.addEventListener('keydown', e => {
        switch (e.code) {
            case 'KeyA': case 'ArrowLeft': input.keyboard.left = true; e.preventDefault(); break;
            case 'KeyD': case 'ArrowRight': input.keyboard.right = true; e.preventDefault(); break;
            case 'KeyW': case 'ArrowUp': case 'Space': input.keyboard.jump = true; e.preventDefault(); break;
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
            case 'KeyA': case 'ArrowLeft': input.keyboard.left = false; break;
            case 'KeyD': case 'ArrowRight': input.keyboard.right = false; break;
            case 'KeyW': case 'ArrowUp': case 'Space': input.keyboard.jump = false; break;
        }
    });

    window.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        input.mouse.x = e.clientX - rect.left;
        input.mouse.y = e.clientY - rect.top;
        
        if (Date.now() - lastTouchTime > 500) {
            input.mouse.active = true;
            input.lastInputSource = 'mouse';
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
            input.keyboard[key] = true;
            input.mouse.active = false;
            lastTouchTime = Date.now();
        });
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            input.keyboard[key] = false;
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

    window.addEventListener('gamepadconnected', (e) => {
        input.gamepad.connected = true;
        input.gamepad.index = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        if (input.gamepad.index === e.gamepad.index) {
            input.gamepad.connected = false;
            input.gamepad.index = null;
            input.gamepad.active = false;
            input.gamepad.initialized = false;
        }
    });

    input.updateGamepad = (logicalWidth, logicalHeight) => {
        input.gamepad.actions.breakPressed = false;
        input.gamepad.actions.placePressed = false;
        input.gamepad.ui.upPressed = false;
        input.gamepad.ui.downPressed = false;
        input.gamepad.ui.leftPressed = false;
        input.gamepad.ui.rightPressed = false;
        input.gamepad.ui.confirmPressed = false;
        input.gamepad.ui.cancelPressed = false;

        const pad = getConnectedGamepad();
        if (!pad) {
            input.gamepad.connected = false;
            input.gamepad.active = false;
            setCombinedKeys({ left: false, right: false, jump: false });
            setCursorFromSource();
            return;
        }

        input.gamepad.connected = true;
        input.gamepad.index = pad.index;

        const leftX = applyDeadzone(pad.axes[0] || 0, stickDeadzone);
        const rightX = applyDeadzone(pad.axes[2] || 0, stickDeadzone);
        const rightY = applyDeadzone(pad.axes[3] || 0, stickDeadzone);

        const buttonA = isButtonPressed(pad.buttons[0]);
        const buttonX = isButtonPressed(pad.buttons[2]);
        const buttonB = isButtonPressed(pad.buttons[1]);
        const buttonLB = isButtonPressed(pad.buttons[4]);
        const buttonRB = isButtonPressed(pad.buttons[5]);
        const buttonLT = isButtonPressed(pad.buttons[6]);
        const buttonRT = isButtonPressed(pad.buttons[7]);
        const dpadUp = isButtonPressed(pad.buttons[12]);
        const dpadDown = isButtonPressed(pad.buttons[13]);
        const dpadLeft = isButtonPressed(pad.buttons[14]);
        const dpadRight = isButtonPressed(pad.buttons[15]);

        const prevButtons = input.gamepad.prevButtons.length ? input.gamepad.prevButtons : pad.buttons.map(() => false);

        if (buttonX && !prevButtons[2] && onClimb) {
            onClimb();
        }

        if (onHotbarMove) {
            if (buttonLB && !prevButtons[4]) onHotbarMove(-1);
            if (buttonRB && !prevButtons[5]) onHotbarMove(1);
        }

        if (buttonLT && !prevButtons[6]) input.gamepad.actions.placePressed = true;
        if (buttonRT && !prevButtons[7]) input.gamepad.actions.breakPressed = true;
        if (dpadUp && !prevButtons[12]) input.gamepad.ui.upPressed = true;
        if (dpadDown && !prevButtons[13]) input.gamepad.ui.downPressed = true;
        if (dpadLeft && !prevButtons[14]) input.gamepad.ui.leftPressed = true;
        if (dpadRight && !prevButtons[15]) input.gamepad.ui.rightPressed = true;
        if (buttonA && !prevButtons[0]) input.gamepad.ui.confirmPressed = true;
        if (buttonB && !prevButtons[1]) input.gamepad.ui.cancelPressed = true;

        if (logicalWidth && logicalHeight && !input.gamepad.initialized) {
            input.gamepad.cursorX = logicalWidth / 2;
            input.gamepad.cursorY = logicalHeight / 2;
            input.gamepad.initialized = true;
        }

        if (logicalWidth && logicalHeight) {
            if (rightX !== 0 || rightY !== 0) {
                input.gamepad.active = true;
                input.mouse.active = false;
                input.lastInputSource = 'gamepad';
            }
            input.gamepad.cursorX = clamp(input.gamepad.cursorX + rightX * cursorSpeed, 0, logicalWidth);
            input.gamepad.cursorY = clamp(input.gamepad.cursorY + rightY * cursorSpeed, 0, logicalHeight);
        }

        if (leftX !== 0 || buttonA || buttonX || buttonLT || buttonRT || buttonLB || buttonRB) {
            input.lastInputSource = 'gamepad';
            input.mouse.active = false;
            input.gamepad.active = true;
        }

        setCombinedKeys({
            left: leftX < -stickDeadzone,
            right: leftX > stickDeadzone,
            jump: buttonA
        });

        input.gamepad.prevButtons = pad.buttons.map(isButtonPressed);
        setCursorFromSource();
    };

    return input;
}
