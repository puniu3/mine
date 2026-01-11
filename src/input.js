export function createInput(canvas, { onHotbarSelect, onHotbarScroll, onTouch, onClimb }) {
    const input = {
        keys: { left: false, right: false, jump: false },
        mouse: { x: 0, y: 0, leftDown: false, active: false },
        gamepad: {
            active: false,
            connected: false,
            cursorX: 0,
            cursorY: 0,
            rtDown: false,
            ltDown: false
        }
    };

    // Internal state for edge detection
    const gamepadState = {
        buttons: new Array(16).fill(false),
        lastHotbarTime: 0
    };

    let lastTouchTime = 0;

    // Hide mobile controls on first keydown, then remove listener
    const hideMobileControls = () => {
        const el = document.getElementById('mobile-controls');
        if (el) el.style.display = 'none';
        window.removeEventListener('keydown', hideMobileControls);
    };
    window.addEventListener('keydown', hideMobileControls);

    window.addEventListener('keydown', e => {
        // Any key press disables gamepad active mode to allow keyboard override
        if (input.gamepad.active) input.gamepad.active = false;

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
        input.gamepad.active = false; // Mouse movement disables gamepad cursor
        
        if (Date.now() - lastTouchTime > 500) {
            input.mouse.active = true;
        }
    });

    window.addEventListener('mousedown', e => {
        if (e.target !== canvas) return;
        input.mouse.leftDown = true;
        input.gamepad.active = false;
    });

    window.addEventListener('mouseup', () => {
        input.mouse.leftDown = false;
    });

    window.addEventListener('touchstart', () => {
        input.mouse.active = false;
        input.gamepad.active = false;
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
        input.gamepad.active = false;
        lastTouchTime = Date.now();
        if (onTouch) onTouch(t.clientX - rect.left, t.clientY - rect.top);
    }, { passive: false });

    // Initialize cursor at center (use logic dimensions via getBoundingClientRect if possible, else canvas dimensions)
    // Note: canvas.width is physical, rect is logical. We want logical for cursor.
    const rect = canvas.getBoundingClientRect();
    input.gamepad.cursorX = rect.width / 2;
    input.gamepad.cursorY = rect.height / 2;

    input.update = () => {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0]; // Support first gamepad

        if (gp && gp.connected) {
            input.gamepad.connected = true;

            const DEADZONE = 0.15;

            // Left Stick: Movement
            const lx = gp.axes[0];

            // Only override keys if stick is moved outside deadzone
            if (Math.abs(lx) > DEADZONE) {
                input.keys.left = lx < -DEADZONE;
                input.keys.right = lx > DEADZONE;
                input.gamepad.active = true;
            } else if (input.gamepad.active) {
                // If gamepad is active but stick is neutral, clear keys
                // This assumes that if input.gamepad.active is true, the user is using the gamepad.
                // We ensure input.gamepad.active becomes false on any keydown/mousedown event.
                input.keys.left = false;
                input.keys.right = false;
            }

            // Jump (A = 0)
            if (gp.buttons[0].pressed) {
                input.keys.jump = true;
                input.gamepad.active = true;
            }

            // Climb (X = 2) - Edge Trigger
            if (gp.buttons[2].pressed && !gamepadState.buttons[2]) {
                 if (onClimb) onClimb();
                 input.gamepad.active = true;
            }
            gamepadState.buttons[2] = gp.buttons[2].pressed;

            // Right Stick: Virtual Cursor
            const rx = gp.axes[2];
            const ry = gp.axes[3];

            if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
                input.gamepad.active = true;
                const sensitivity = 15;
                input.gamepad.cursorX += rx * sensitivity;
                input.gamepad.cursorY += ry * sensitivity;

                // Clamp to logical canvas dimensions (client rect)
                // This ensures consistency with mouse coordinates and correct rendering on High-DPI screens
                const rect = canvas.getBoundingClientRect();
                input.gamepad.cursorX = Math.max(0, Math.min(rect.width, input.gamepad.cursorX));
                input.gamepad.cursorY = Math.max(0, Math.min(rect.height, input.gamepad.cursorY));
            }

            // Triggers
            input.gamepad.rtDown = gp.buttons[7].pressed; // Destroy
            input.gamepad.ltDown = gp.buttons[6].pressed; // Place

            if (input.gamepad.rtDown || input.gamepad.ltDown) {
                input.gamepad.active = true;
            }

            // Hotbar Selection (LB=4, RB=5)
            if (gp.buttons[4].pressed && !gamepadState.buttons[4]) {
                 if (onHotbarScroll) onHotbarScroll(-1);
                 input.gamepad.active = true;
            }
            gamepadState.buttons[4] = gp.buttons[4].pressed;

            if (gp.buttons[5].pressed && !gamepadState.buttons[5]) {
                 if (onHotbarScroll) onHotbarScroll(1);
                 input.gamepad.active = true;
            }
            gamepadState.buttons[5] = gp.buttons[5].pressed;

        } else {
            input.gamepad.connected = false;
        }
    };

    return input;
}
