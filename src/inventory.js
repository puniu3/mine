import { BLOCKS, BLOCK_PROPS, HOTBAR_ITEMS } from './constants.js';
import { getBlockDrop } from './utils.js';
import { sounds } from './audio.js';

// --- Inventory System ---
export const inventory = {};

// Initialize Inventory
HOTBAR_ITEMS.forEach(id => inventory[id] = 0);
// Give a small starter kit
inventory[BLOCKS.DIRT] = 10;

// State for selected item
let selectedHotbarIndex = 0;
export function getSelectedBlockId() {
    return HOTBAR_ITEMS[selectedHotbarIndex];
}

export function updateInventoryUI() {
    HOTBAR_ITEMS.forEach((block, i) => {
        const countEl = document.getElementById(`slot-count-${i}`);
        if (countEl) {
            countEl.innerText = inventory[block];
            const slotEl = document.getElementById(`slot-${i}`);
            if (slotEl) {
                slotEl.style.opacity = inventory[block] > 0 ? '1' : '0.5';
            }
        }
    });
}

export function addToInventory(blockType) {
    if (blockType === BLOCKS.AIR) return;
    const drop = getBlockDrop(blockType, BLOCK_PROPS);
    if (inventory[drop] !== undefined) {
        inventory[drop]++;
        updateInventoryUI();
    }
}

export function consumeFromInventory(blockType) {
    if (inventory[blockType] > 0) {
        inventory[blockType]--;
        updateInventoryUI();
        return true;
    }
    return false;
}

function updateScrollIndicators() {
    const hotbar = document.getElementById('hotbar');
    const leftIndicator = document.getElementById('hotbar-scroll-left');
    const rightIndicator = document.getElementById('hotbar-scroll-right');

    if (!hotbar || !leftIndicator || !rightIndicator) return;

    const canScrollLeft = hotbar.scrollLeft > 0;
    const canScrollRight = hotbar.scrollLeft < hotbar.scrollWidth - hotbar.clientWidth - 1;

    leftIndicator.classList.toggle('visible', canScrollLeft);
    rightIndicator.classList.toggle('visible', canScrollRight);
}

export function initHotbarUI(textures) {
    const container = document.getElementById('hotbar');
    container.innerHTML = '';
    HOTBAR_ITEMS.forEach((block, i) => {
        const div = document.createElement('div');
        div.className = 'slot' + (i === 0 ? ' active' : '');
        div.id = `slot-${i}`;
        div.onclick = () => selectHotbar(i);

        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const cx = c.getContext('2d');
        if (textures && textures[block]) cx.drawImage(textures[block], 0, 0, 32, 32);

        const count = document.createElement('div');
        count.className = 'count';
        count.id = `slot-count-${i}`;
        count.innerText = '0';

        div.appendChild(c);
        div.appendChild(count);
        container.appendChild(div);
    });

    // Set initial selection visually
    selectHotbar(selectedHotbarIndex);

    // Setup scroll indicators
    container.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);
    // Initial check after DOM is ready
    setTimeout(updateScrollIndicators, 0);
}

export function selectHotbar(index) {
    if (index < 0 || index >= HOTBAR_ITEMS.length) return;
    const slots = document.querySelectorAll('.slot');
    slots.forEach(s => s.classList.remove('active'));
    if (slots[index]) slots[index].classList.add('active');

    selectedHotbarIndex = index;
    sounds.playPop();
}
