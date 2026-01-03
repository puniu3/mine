import { BLOCKS, BLOCK_PROPS, TILE_SIZE } from './constants.js';
import { sounds } from './audio.js';
import { inventory, updateInventoryUI } from './inventory.js';

const CRAFTING_RECIPES = [
    {
        id: BLOCKS.FIREWORK,
        name: 'Firework',
        cost: { [BLOCKS.WOOD]: 2 },
        count: 1
    },
    {
        id: BLOCKS.JUMP_PAD,
        name: 'Jump Pad',
        cost: { [BLOCKS.STONE]: 2, [BLOCKS.LEAVES]: 2 },
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

    // Since checkWorktableOverlap is called every frame, we need textures for UI if we open it.
    // However, update loop doesn't pass textures.
    // We can rely on `textures` being available or passed.
    // But `openCraftingUI` needs textures to draw icons.
    // I will export a setter or pass it in update?
    // Or I can assume textures are globally available? No, modules.
    // I will change checkWorktableOverlap to return a boolean request to open/close?
    // Or just pass textures to it?
    // Or `openCraftingUI` takes textures.
    // Let's modify `checkWorktableOverlap` to take `textures`.
    // Wait, `checkWorktableOverlap` is called in `update`. `textures` are generated in `init`.

    if (foundWorkbench) {
        if (!isCraftingOpen) {
            // We need to trigger open. But we need textures.
            // I'll make checkWorktableOverlap accept textures as the 3rd argument.
             // Wait, the plan says "checkWorktableOverlap" is in crafting.js.
             // main.js calls it. main.js has textures.
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

        // Icon
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        c.className = 'craft-icon';
        const cx = c.getContext('2d');
        if (textures && textures[recipe.id]) cx.drawImage(textures[recipe.id], 0, 0, 32, 32);

        // Text
        const details = document.createElement('div');
        details.className = 'craft-details';
        details.innerHTML = `<strong>${recipe.name}</strong>`;

        // Cost
        const costDiv = document.createElement('div');
        costDiv.className = 'craft-cost';
        let costText = 'Cost: ';
        for (let [blockId, amount] of Object.entries(recipe.cost)) {
            const blockName = BLOCK_PROPS[blockId].name;
            costText += `${blockName} x${amount} `;
        }
        costDiv.innerText = costText;
        details.appendChild(costDiv);

        div.appendChild(c);
        div.appendChild(details);
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
    showMessage(`Crafted ${recipe.name}!`);
}
