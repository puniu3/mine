export function createInput(canvas, { onHotbarSelect, onTouch }) {
    const input = {
        keys: { left: false, right: false, jump: false },
        mouse: { x: 0, y: 0, leftDown: false }
    };

    window.addEventListener('keydown', e => {
        switch (e.code) {
            case 'KeyA': case 'ArrowLeft': input.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': input.keys.right = true; break;
            case 'KeyW': case 'ArrowUp': case 'Space': input.keys.jump = true; break;
            case 'Digit1': if (onHotbarSelect) onHotbarSelect(0); break;
            case 'Digit2': if (onHotbarSelect) onHotbarSelect(1); break;
            case 'Digit3': if (onHotbarSelect) onHotbarSelect(2); break;
            case 'Digit4': if (onHotbarSelect) onHotbarSelect(3); break;
            case 'Digit5': if (onHotbarSelect) onHotbarSelect(4); break;
            case 'Digit6': if (onHotbarSelect) onHotbarSelect(5); break;
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
    });

    window.addEventListener('mousedown', e => {
        if (e.target !== canvas) return;
        input.mouse.leftDown = true;
    });

    window.addEventListener('mouseup', () => {
        input.mouse.leftDown = false;
    });

    const setupTouch = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            input.keys[key] = true;
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
        if (onTouch) onTouch(t.clientX - rect.left, t.clientY - rect.top);
    }, { passive: false });

    return input;
}
