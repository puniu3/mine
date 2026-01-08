export function createInput(canvas, { onHotbarSelect, onTouch, onClimb }) {
    const input = {
        keys: { left: false, right: false, jump: false },
        mouse: { x: 0, y: 0, leftDown: false, active: false }
    };

    let lastTouchTime = 0;

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
            case 'KeyS': if (onClimb) onClimb(); break;
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

    return input;
}
