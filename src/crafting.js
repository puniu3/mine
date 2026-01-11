import { BLOCKS, BLOCK_PROPS, TILE_SIZE } from './constants.js';
import { sounds } from './audio.js';
import { inventory, updateInventoryUI } from './inventory.js';
import { strings } from './i18n.js';

const CRAFTING_RECIPES = [
    {
        id: BLOCKS.FIREWORK,
        cost: { [BLOCKS.WOOD]: 2 },
        count: 1
    },
    {
        id: BLOCKS.JUMP_PAD,
        cost: { [BLOCKS.STONE]: 2, [BLOCKS.LEAVES]: 2 },
        count: 1
    },
    {
        id: BLOCKS.TNT,
        cost: { [BLOCKS.COAL]: 3, [BLOCKS.WOOD]: 2 },
        count: 1
    },
    {
        id: BLOCKS.SAPLING,
        cost: { [BLOCKS.WOOD]: 1, [BLOCKS.LEAVES]: 1 },
        count: 1
    },
    {
        id: BLOCKS.JACKPOT,
        cost: { [BLOCKS.GOLD]: 3 },
        count: 1
    },
    {
        id: BLOCKS.ACCELERATOR_LEFT,
        cost: { [BLOCKS.GOLD]: 2, [BLOCKS.SAND]: 2 },
        count: 1
    },
    {
        id: BLOCKS.ACCELERATOR_RIGHT,
        cost: { [BLOCKS.GOLD]: 2, [BLOCKS.SNOW]: 2 },
        count: 1
    }
];

export let isCraftingOpen = false;
let selectedCraftIndex = 0;
let manualCloseUntilExit = false;

export function checkWorktableOverlap(player, world) {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    // Check overlap with workbench
    // Workbench is solid: false, so we can overlap it.
    // Check tiles player covers
    const startX = Math.floor(px / TILE_SIZE);
    const endX = Math.floor((px + pw) / TILE_SIZE);
    const startY = Math.floor(py / TILE_SIZE);
    const endY = Math.floor((py + ph) / TILE_SIZE);

    let foundWorkbench = false;
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (world.getBlock(x, y) === BLOCKS.WORKBENCH) {
                foundWorkbench = true;
                break;
            }
        }
    }

    return foundWorkbench;
}

export function updateCrafting(player, world, textures) {
     const found = checkWorktableOverlap(player, world);
     if (found) {
         if (!isCraftingOpen && !manualCloseUntilExit) openCraftingUI(textures);
     } else {
         if (isCraftingOpen) closeCraftingUI();
         manualCloseUntilExit = false;
     }
}

export function openCraftingUI(textures) {
    isCraftingOpen = true;
    const modal = document.getElementById('crafting-modal');
    const list = document.getElementById('craft-list');
    const status = document.getElementById('crafting-status');
    if (status) status.innerText = '';
    list.innerHTML = '';

    CRAFTING_RECIPES.forEach(recipe => {
        const div = document.createElement('div');
        div.className = 'craft-item';
        div.onclick = () => craftItem(recipe);

        // Left: Inputs
        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'craft-inputs';

        const costContainer = document.createElement('div');
        costContainer.className = 'craft-cost-icons';
        for (let [blockId, amount] of Object.entries(recipe.cost)) {
            const costItem = document.createElement('div');
            costItem.className = 'craft-cost-item';

            const icon = createIconCanvas(blockId, 32, textures);
            icon.classList.add('craft-icon');

            const count = document.createElement('span');
            count.className = 'craft-cost-count';
            count.innerText = `×${amount}`;

            costItem.appendChild(icon);
            costItem.appendChild(count);
            costContainer.appendChild(costItem);
        }
        inputsDiv.appendChild(costContainer);

        // Right: Arrow + Output
        const outputsDiv = document.createElement('div');
        outputsDiv.className = 'craft-outputs';

        const arrow = document.createElement('div');
        arrow.className = 'craft-arrow';
        arrow.innerText = '➜';

        const outputIcon = createIconCanvas(recipe.id, 48, textures);
        outputIcon.classList.add('craft-icon-output');

        outputsDiv.appendChild(arrow);
        outputsDiv.appendChild(outputIcon);

        div.appendChild(inputsDiv);
        div.appendChild(outputsDiv);
        list.appendChild(div);
    });

    selectedCraftIndex = 0;
    updateCraftingFocus();
    modal.style.display = 'block';
}

export function closeCraftingUI() {
    isCraftingOpen = false;
    document.getElementById('crafting-modal').style.display = 'none';
}

export function handleCraftingGamepad(input) {
    if (!isCraftingOpen || !input || !input.gamepad) return;

    const items = Array.from(document.querySelectorAll('.craft-item'));
    if (!items.length) return;

    if (input.gamepad.ui.upPressed) {
        selectedCraftIndex = Math.max(0, selectedCraftIndex - 1);
        updateCraftingFocus();
    }
    if (input.gamepad.ui.downPressed) {
        selectedCraftIndex = Math.min(items.length - 1, selectedCraftIndex + 1);
        updateCraftingFocus();
    }
    if (input.gamepad.ui.confirmPressed) {
        items[selectedCraftIndex]?.click();
    }
    if (input.gamepad.ui.cancelPressed) {
        manualCloseUntilExit = true;
        closeCraftingUI();
    }
}

function updateCraftingFocus() {
    const items = Array.from(document.querySelectorAll('.craft-item'));
    items.forEach((item, index) => {
        if (index === selectedCraftIndex) {
            item.classList.add('gamepad-focus');
        } else {
            item.classList.remove('gamepad-focus');
        }
    });
}

function craftItem(recipe) {
    // Check cost
    for (let [blockId, amount] of Object.entries(recipe.cost)) {
        if ((inventory[blockId] || 0) < amount) {
            const status = document.getElementById('crafting-status');
            if (status) status.innerText = strings.craft_missing;
            return;
        }
    }

    // Deduct
    for (let [blockId, amount] of Object.entries(recipe.cost)) {
        inventory[blockId] -= amount;
    }

    // Add
    if (!inventory[recipe.id]) inventory[recipe.id] = 0;
    inventory[recipe.id] += recipe.count;

    updateInventoryUI();
    sounds.playPop(); // Craft sound
    const status = document.getElementById('crafting-status');
    if (status) status.innerText = strings.craft_done;
}

function createIconCanvas(blockId, size, textures) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    if (textures && textures[blockId]) ctx.drawImage(textures[blockId], 0, 0, size, size);
    return c;
}
