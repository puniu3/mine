import { BLOCKS, BLOCK_PROPS, TILE_SIZE, CRAFTING_RAPID_FIRE_THRESHOLD_TICKS, CRAFTING_RAPID_FIRE_INTERVAL_TICKS } from './constants.js';
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
        cost: { [BLOCKS.GOLD]: 1, [BLOCKS.SAND]: 1 },
        count: 1
    },
    {
        id: BLOCKS.ACCELERATOR_RIGHT,
        cost: { [BLOCKS.GOLD]: 1, [BLOCKS.SAND]: 1 },
        count: 1
    }
];

export let isCraftingOpen = false;

// Gamepad navigation state for crafting UI
let selectedRecipeIndex = 0;
let gamepadNavEnabled = false;
let prevDpadUp = false;
let prevDpadDown = false;
let prevAButton = false;
let prevBButton = false;
let aButtonHoldTicks = 0; // Track how long A button is held for rapid-fire

// Flag to track if crafting was manually closed with B button
// Prevents reopening until player leaves and re-enters workbench
let manuallyClosed = false;

// Gamepad button indices
const GP_A = 0;
const GP_B = 1;
const GP_DPAD_UP = 12;
const GP_DPAD_DOWN = 13;

/**
 * Poll gamepad for crafting UI navigation
 * Should be called when crafting UI is open
 */
export function pollCraftingGamepad() {
    if (!isCraftingOpen) return;

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

    // D-PAD Up - move selection up
    const dpadUp = buttons[GP_DPAD_UP] && buttons[GP_DPAD_UP].pressed;
    if (dpadUp && !prevDpadUp) {
        selectedRecipeIndex = Math.max(0, selectedRecipeIndex - 1);
        updateCraftingSelection();
    }
    prevDpadUp = dpadUp;

    // D-PAD Down - move selection down
    const dpadDown = buttons[GP_DPAD_DOWN] && buttons[GP_DPAD_DOWN].pressed;
    if (dpadDown && !prevDpadDown) {
        selectedRecipeIndex = Math.min(CRAFTING_RECIPES.length - 1, selectedRecipeIndex + 1);
        updateCraftingSelection();
    }
    prevDpadDown = dpadDown;

    // A Button - craft selected item (with rapid-fire support)
    const aButton = buttons[GP_A] && buttons[GP_A].pressed;
    if (aButton) {
        // Button is pressed
        if (!prevAButton) {
            // Just pressed - craft immediately
            const recipe = CRAFTING_RECIPES[selectedRecipeIndex];
            if (recipe) craftItem(recipe);
        }
        aButtonHoldTicks++;

        // Rapid-fire: after holding 1 second, craft 4 times per second
        if (aButtonHoldTicks >= CRAFTING_RAPID_FIRE_THRESHOLD_TICKS) {
            const ticksSinceThreshold = aButtonHoldTicks - CRAFTING_RAPID_FIRE_THRESHOLD_TICKS;
            if (ticksSinceThreshold % CRAFTING_RAPID_FIRE_INTERVAL_TICKS === 0) {
                const recipe = CRAFTING_RECIPES[selectedRecipeIndex];
                if (recipe) craftItem(recipe);
            }
        }
    } else {
        // Button released - reset counter
        aButtonHoldTicks = 0;
    }
    prevAButton = aButton;

    // B Button - close crafting UI
    const bButton = buttons[GP_B] && buttons[GP_B].pressed;
    if (bButton && !prevBButton) {
        closeCraftingUI(true); // true = manually closed
    }
    prevBButton = bButton;
}

function updateCraftingSelection() {
    const list = document.getElementById('craft-list');
    if (!list) return;

    const items = list.querySelectorAll('.craft-item');
    items.forEach((item, index) => {
        if (index === selectedRecipeIndex) {
            item.classList.add('gamepad-selected');
            // Scroll into view if needed
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('gamepad-selected');
        }
    });
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
         // Only open if not already open AND not manually closed
         if (!isCraftingOpen && !manuallyClosed) openCraftingUI(textures);
     } else {
         // Player left workbench - close UI and reset manuallyClosed flag
         if (isCraftingOpen) closeCraftingUI(false);
         manuallyClosed = false; // Reset flag when leaving workbench
     }
}

export function openCraftingUI(textures) {
    isCraftingOpen = true;
    selectedRecipeIndex = 0; // Reset selection when opening
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

    modal.style.display = 'block';

    // Initialize gamepad selection visual (first item selected)
    updateCraftingSelection();
}

export function closeCraftingUI(isManual = false) {
    isCraftingOpen = false;
    document.getElementById('crafting-modal').style.display = 'none';
    if (isManual) {
        manuallyClosed = true;
    }
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
