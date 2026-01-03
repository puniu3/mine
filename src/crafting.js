import { BLOCKS, BLOCK_PROPS, TILE_SIZE } from './constants.js';
import { sounds } from './audio.js';
import { inventory, updateInventoryUI } from './inventory.js';

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
        cost: { [BLOCKS.COAL]: 4, [BLOCKS.WOOD]: 2 },
        count: 1
    }
];

export let isCraftingOpen = false;

function showMessage(msg) {
    const el = document.getElementById('message-log');
    if (el) {
        el.innerText = msg;
        el.style.opacity = 1;
        setTimeout(() => { el.style.opacity = 0; }, 2000);
    }
}

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
         if (!isCraftingOpen) openCraftingUI(textures);
     } else {
         if (isCraftingOpen) closeCraftingUI();
     }
}

export function openCraftingUI(textures) {
    isCraftingOpen = true;
    const modal = document.getElementById('crafting-modal');
    const list = document.getElementById('craft-list');
    list.innerHTML = '';

    CRAFTING_RECIPES.forEach(recipe => {
        const div = document.createElement('div');
        div.className = 'craft-item';
        div.onclick = () => craftItem(recipe);

        const outputIcon = createIconCanvas(recipe.id, 48, textures);
        outputIcon.classList.add('craft-icon-output');

        const arrow = document.createElement('div');
        arrow.className = 'craft-arrow';
        arrow.innerText = '➜';

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

        div.appendChild(outputIcon);
        div.appendChild(arrow);
        div.appendChild(costContainer);
        list.appendChild(div);
    });

    modal.style.display = 'block';
}

export function closeCraftingUI() {
    isCraftingOpen = false;
    document.getElementById('crafting-modal').style.display = 'none';
}

function craftItem(recipe) {
    // Check cost
    for (let [blockId, amount] of Object.entries(recipe.cost)) {
        if ((inventory[blockId] || 0) < amount) {
            showMessage("Not enough materials!");
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
    showMessage(`Crafted ${BLOCK_PROPS[recipe.id].name}!`);
}

function createIconCanvas(blockId, size, textures) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    if (textures && textures[blockId]) ctx.drawImage(textures[blockId], 0, 0, size, size);
    return c;
}
