/**
 * 2D Minecraft Clone Script (Inventory + Auto-Climb Edition)
 *
 * Architecture:
 * - Constants: Block definitions, Physics settings.
 * - Inventory: Manages item counts.
 * - TextureGen: Procedural texture generation.
 * - Game Engine: Loop, Physics, Collision, Input.
 *
 * Dependencies: utils.js, audio.js, constants.js, texture_gen.js
 */

import {
    clamp, lerp, distance, worldToTile, tileToWorld, coordToIndex, screenToWorld,
    rectsIntersect, pointInRect, isWithinReach,
    isBlockSolid, isBlockTransparent, isBlockBreakable, getBlockDrop, getBlockMaterialType,
    generateTerrainHeights,
    smoothCamera, clampCamera,
    calculateVisibleTileRange,
    hasAdjacentBlock
} from './utils.js';
import { sounds } from './audio.js';
import {
    TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, GRAVITY, JUMP_FORCE, REACH, CAMERA_SMOOTHING,
    BLOCKS, BLOCK_PROPS, HOTBAR_ITEMS
} from './constants.js';
import { generateTextures } from './texture_gen.js';

// --- Inventory System ---
const inventory = {};

// Initialize Inventory
HOTBAR_ITEMS.forEach(id => inventory[id] = 0);
// Give a small starter kit
inventory[BLOCKS.DIRT] = 10;

function updateInventoryUI() {
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

function addToInventory(blockType) {
    if (blockType === BLOCKS.AIR) return;
    const drop = getBlockDrop(blockType, BLOCK_PROPS);
    if (inventory[drop] !== undefined) {
        inventory[drop]++;
        updateInventoryUI();
    }
}

function consumeFromInventory(blockType) {
    if (inventory[blockType] > 0) {
        inventory[blockType]--;
        updateInventoryUI();
        return true;
    }
    return false;
}

// --- Texture Generator ---
let textures = {};

// --- Game Classes ---
class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.map = new Array(width * height).fill(BLOCKS.AIR);
        this.generate();
    }

    getIndex(x, y) {
        return coordToIndex(x, y, this.width, this.height);
    }

    getBlock(x, y) {
        const idx = this.getIndex(x, y);
        if (idx === -1) return BLOCKS.BEDROCK;
        return this.map[idx];
    }

    setBlock(x, y, type) {
        const idx = this.getIndex(x, y);
        if (idx !== -1) this.map[idx] = type;
    }

    checkAreaFree(px, py, w, h) {
        const startX = Math.floor(px / TILE_SIZE);
        const endX = Math.floor((px + w) / TILE_SIZE);
        const startY = Math.floor(py / TILE_SIZE);
        const endY = Math.floor((py + h) / TILE_SIZE);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (isBlockSolid(this.getBlock(x, y), BLOCK_PROPS)) {
                    return false;
                }
            }
        }
        return true;
    }

    generate() {
        const heights = generateTerrainHeights(this.width, this.height / 2);

        for (let x = 0; x < this.width; x++) {
            const h = heights[x];
            for (let y = 0; y < this.height; y++) {
                if (y === this.height - 1) {
                    this.setBlock(x, y, BLOCKS.BEDROCK);
                } else if (y > h) {
                    if (y > h + 5) {
                        const r = Math.random();
                        if (r > 0.96) this.setBlock(x, y, BLOCKS.COAL);
                        else if (r > 0.985 && y > h + 15) this.setBlock(x, y, BLOCKS.GOLD);
                        else if (Math.random() > 0.95) this.setBlock(x, y, BLOCKS.DIRT);
                        else this.setBlock(x, y, BLOCKS.STONE);
                    } else {
                        this.setBlock(x, y, BLOCKS.DIRT);
                    }
                } else if (y === h) {
                    this.setBlock(x, y, BLOCKS.GRASS);
                    if (x > 5 && x < this.width - 5 && Math.random() < 0.05) {
                        this.generateTree(x, y - 1);
                    }
                }
            }
        }

        // Scatter Workbenches on the surface
        for (let x = 10; x < this.width - 10; x += 50 + Math.floor(Math.random() * 20)) {
            const h = heights[x];
            // Ensure space above is clear
            if (this.getBlock(x, h - 1) === BLOCKS.AIR) {
                this.setBlock(x, h - 1, BLOCKS.WORKBENCH);
            }
        }
    }

    generateTree(x, y) {
        const height = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < height; i++) this.setBlock(x, y - i, BLOCKS.WOOD);
        for (let lx = x - 2; lx <= x + 2; lx++) {
            for (let ly = y - height - 2; ly <= y - height; ly++) {
                if (Math.abs(lx - x) === 2 && Math.abs(ly - (y - height)) === 2) continue;
                if (this.getBlock(lx, ly) === BLOCKS.AIR) this.setBlock(lx, ly, BLOCKS.LEAVES);
            }
        }
    }
}

class Player {
    constructor(world) {
        this.world = world;
        this.width = 0.6 * TILE_SIZE;
        this.height = 1.8 * TILE_SIZE;
        this.x = (world.width / 2) * TILE_SIZE;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.facingRight = true;
        this.animTimer = 0;

        this.findSpawnPoint();
    }

    findSpawnPoint() {
        const sx = Math.floor(this.x / TILE_SIZE);
        for (let y = 0; y < this.world.height; y++) {
            if (this.world.getBlock(sx, y) !== BLOCKS.AIR) {
                this.y = (y - 2) * TILE_SIZE;
                break;
            }
        }
    }

    getCenterX() {
        return this.x + this.width / 2;
    }

    getCenterY() {
        return this.y + this.height / 2;
    }

    getRect() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }

    update(input, dt) {
        if (input.keys.left) {
            this.vx = -5;
            this.facingRight = false;
        } else if (input.keys.right) {
            this.vx = 5;
            this.facingRight = true;
        } else {
            this.vx *= 0.8;
        }

        if (input.keys.jump && this.grounded) {
            this.vy = -JUMP_FORCE;
            this.grounded = false;
            sounds.playJump();
        }

        // Jump Pad Check
        // Check block directly under feet center
        const feetX = Math.floor(this.getCenterX() / TILE_SIZE);
        const feetY = Math.floor((this.y + this.height + 0.1) / TILE_SIZE);
        if (this.world.getBlock(feetX, feetY) === BLOCKS.JUMP_PAD) {
             this.vy = -JUMP_FORCE * 1.8;
             this.grounded = false;
             sounds.playJump(); // Maybe add a different sound later
        }

        this.vy += GRAVITY;
        this.x += this.vx;
        this.handleCollisions(true);
        this.y += this.vy;
        this.handleCollisions(false);

        // Clamp position
        this.x = clamp(this.x, 0, this.world.width * TILE_SIZE - this.width);

        // Respawn if fallen off
        if (this.y > this.world.height * TILE_SIZE) {
            this.respawn();
        }

        if (Math.abs(this.vx) > 0.1) this.animTimer += dt;
    }

    respawn() {
        this.y = 0;
        this.vy = 0;
        this.x = (this.world.width / 2) * TILE_SIZE;
        this.findSpawnPoint();
    }

    handleCollisions(horizontal) {
        const startX = Math.floor(this.x / TILE_SIZE);
        const endX = Math.floor((this.x + this.width) / TILE_SIZE);
        const startY = Math.floor(this.y / TILE_SIZE);
        const endY = Math.floor((this.y + this.height) / TILE_SIZE);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (isBlockSolid(this.world.getBlock(x, y), BLOCK_PROPS)) {
                    if (horizontal) {
                        if (this.vx > 0) this.x = x * TILE_SIZE - this.width - 0.01;
                        else if (this.vx < 0) this.x = (x + 1) * TILE_SIZE + 0.01;
                        this.vx = 0;
                    } else {
                        if (this.vy > 0) {
                            this.y = y * TILE_SIZE - this.height - 0.01;
                            this.grounded = true;
                            this.vy = 0;
                        } else if (this.vy < 0) {
                            this.y = (y + 1) * TILE_SIZE + 0.01;
                            this.vy = 0;
                        }
                    }
                    return;
                }
            }
        }
        if (!horizontal) this.grounded = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
        const swing = Math.sin(this.animTimer * 0.01) * 5;
        ctx.fillStyle = '#f8b090';
        ctx.fillRect(4, 0, 12, 12); // Head
        ctx.fillStyle = '#00bcd4';
        ctx.fillRect(4, 12, 12, 18); // Body
        ctx.fillStyle = '#3f51b5'; // Legs
        ctx.fillRect(4, 30, 5, 18 + (Math.abs(this.vx) > 0.1 ? swing : 0));
        ctx.fillRect(11, 30, 5, 18 - (Math.abs(this.vx) > 0.1 ? swing : 0));
        ctx.fillStyle = '#f8b090'; // Arms
        if (this.facingRight) ctx.fillRect(10, 12, 6, 18 + swing);
        else ctx.fillRect(4, 12, -6, 18 + swing);
        ctx.restore();
    }
}

// --- Main Loop ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let world, player;
let lastTime = 0;
let cameraX = 0, cameraY = 0;

const input = {
    keys: { left: false, right: false, jump: false, down: false },
    mouse: { x: 0, y: 0, leftDown: false },
    hotbarIdx: 1
};
let bridgeCooldown = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
    if (window.innerWidth <= 768) {
        document.getElementById('mobile-controls').style.display = 'block';
    }
}
window.addEventListener('resize', resize);

function init() {
    world = new World(WORLD_WIDTH, WORLD_HEIGHT);
    player = new Player(world);
    textures = generateTextures(); // Initialize textures here
    initHotbarUI();
    updateInventoryUI();
    resize();
    requestAnimationFrame(loop);
}

function initHotbarUI() {
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
        if (textures[block]) cx.drawImage(textures[block], 0, 0, 32, 32);

        const count = document.createElement('div');
        count.className = 'count';
        count.id = `slot-count-${i}`;
        count.innerText = '0';

        div.appendChild(c);
        div.appendChild(count);
        container.appendChild(div);
    });
}

function selectHotbar(index) {
    const slots = document.querySelectorAll('.slot');
    slots.forEach(s => s.classList.remove('active'));
    slots[index].classList.add('active');
    input.hotbarIdx = HOTBAR_ITEMS[index];
    sounds.playPop();
}

function update(dt) {
    if (!player) return;
    player.update(input, dt);

    // Camera with smooth following
    const targetCamX = player.getCenterX() - canvas.width / 2;
    const targetCamY = player.getCenterY() - canvas.height / 2;
    cameraX = smoothCamera(cameraX, targetCamX, CAMERA_SMOOTHING);
    cameraY = smoothCamera(cameraY, targetCamY, CAMERA_SMOOTHING);
    cameraX = clampCamera(cameraX, 0, world.width * TILE_SIZE, canvas.width);
    cameraY = clampCamera(cameraY, -500, world.height * TILE_SIZE, canvas.height);

    // Interaction
    if (input.mouse.leftDown) {
        handleInteraction(input.mouse.x, input.mouse.y);
        input.mouse.leftDown = false;
    }

    // Bridge Builder (S Key)
    if (input.keys.down) {
        if (bridgeCooldown <= 0) {
            handleBridgeBuilding();
            bridgeCooldown = 200;
        }
    }
    if (bridgeCooldown > 0) bridgeCooldown -= dt;

    // --- New Logic: Worktable Check ---
    checkWorktableOverlap();
    // --- New Logic: Fireworks ---
    updateFireworks(dt);
}

// --- Fireworks System ---
const fireworkParticles = [];

function updateFireworks(dt) {
    // 1. Scan/Emit
    // In a large world, scanning all blocks every frame is bad.
    // Optimization: Only scan blocks near the player?
    // Or just scan randomly?
    // Let's use a timer.
    if (!world.fireworkTimer) world.fireworkTimer = 0;
    world.fireworkTimer += dt;
    if (world.fireworkTimer > 5000) { // 5 seconds
        world.fireworkTimer = 0;
        // Find visible fireworks or all fireworks?
        // Let's just scan the visible range + padding for now to keep performance ok.
        const range = calculateVisibleTileRange(cameraX, cameraY, canvas.width, canvas.height, TILE_SIZE);
        for (let y = range.startY - 10; y < range.endY + 10; y++) {
            for (let x = range.startX - 10; x < range.endX + 10; x++) {
                if (world.getBlock(x, y) === BLOCKS.FIREWORK) {
                    spawnFireworkParticles(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
                }
            }
        }
    }

    // 2. Update Particles
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
        const p = fireworkParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
        p.vy += 0.05; // Gravity
        if (p.life <= 0) {
            fireworkParticles.splice(i, 1);
        }
    }
}

function spawnFireworkParticles(x, y) {
    // Launch sound
    // sounds.playPop();

    // Create explosion
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 2;
        fireworkParticles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 5, // Upward bias
            life: 1000 + Math.random() * 500,
            color: color
        });
    }
}

// --- Crafting System ---
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

let isCraftingOpen = false;

function checkWorktableOverlap() {
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

    if (foundWorkbench) {
        if (!isCraftingOpen) openCraftingUI();
    } else {
        if (isCraftingOpen) closeCraftingUI();
    }
}

function openCraftingUI() {
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
        if (textures[recipe.id]) cx.drawImage(textures[recipe.id], 0, 0, 32, 32);

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

function closeCraftingUI() {
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


function handleBridgeBuilding() {
    const feetY = player.y + player.height;
    const centerX = player.getCenterX();
    const { tx: bx, ty: by } = worldToTile(centerX, feetY + 1, TILE_SIZE);
    const targetBlock = world.getBlock(bx, by);

    if (targetBlock === BLOCKS.AIR || isBlockTransparent(targetBlock, BLOCK_PROPS)) {
        const blockRect = { x: bx * TILE_SIZE, y: by * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
        const playerRect = player.getRect();

        if (!rectsIntersect(playerRect, blockRect)) {
            if (consumeFromInventory(input.hotbarIdx)) {
                world.setBlock(bx, by, input.hotbarIdx);
                sounds.playDig('dirt');
            }
        }
    }
}

function handleInteraction(screenX, screenY) {
    const worldPos = screenToWorld(screenX, screenY, cameraX, cameraY);
    // Use 'let' for by because we might modify it (target shifting)
    let { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

    // Check reach
    if (!isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
        return;
    }

    const currentBlock = world.getBlock(bx, by);

    // Break
    if (currentBlock !== BLOCKS.AIR && isBlockBreakable(currentBlock, BLOCK_PROPS)) {
        addToInventory(currentBlock);
        sounds.playDig(getBlockMaterialType(currentBlock, BLOCK_PROPS));
        world.setBlock(bx, by, BLOCKS.AIR);
        return;
    }

    // Place
    if (currentBlock === BLOCKS.AIR || isBlockTransparent(currentBlock, BLOCK_PROPS)) {
        const playerRect = player.getRect();
        const blockRect = { x: bx * TILE_SIZE, y: by * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };

        const isIntersecting = rectsIntersect(playerRect, blockRect);

        let canPlace = false;
        let shouldClimb = false;

        if (!isIntersecting) {
            canPlace = true;
        } else {
            // Logic modification: Specific body part handling
            const playerHeadTileY = Math.floor(player.y / TILE_SIZE);
            // Use -0.01 to ensure we get the tile the feet are actually inside/on
            const playerFeetTileY = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

            if (by === playerHeadTileY) {
                // Case: User tapped the upper body (Head)
                // Action: Shift placement target to feet and trigger climb
                by = playerFeetTileY; 
                
                // Calculate where the player needs to move (on top of the new block)
                const targetPlayerY = (by * TILE_SIZE) - player.height;

                // Check if the area above the new block position is free
                if (world.checkAreaFree(player.x, targetPlayerY, player.width, player.height)) {
                    canPlace = true;
                    shouldClimb = true;
                }
            } else if (by === playerFeetTileY) {
                // Case: User tapped the lower body (Feet)
                // Action: Prevent placement
                canPlace = false;
            } else {
                // Case: Intersecting but distinct from head/feet logic (fallback)
                // Try standard auto-climb check just in case
                const targetY = blockRect.y - player.height;
                if (world.checkAreaFree(player.x, targetY, player.width, player.height)) {
                    canPlace = true;
                    shouldClimb = true;
                }
            }
        }

        if (canPlace) {
            // Check neighbors (allow placement if climbing OR has neighbor)
            const hasNeighbor = shouldClimb || hasAdjacentBlock(bx, by, (x, y) => world.getBlock(x, y), BLOCKS.AIR);

            if (hasNeighbor) {
                if (consumeFromInventory(input.hotbarIdx)) {
                    world.setBlock(bx, by, input.hotbarIdx);
                    sounds.playDig('dirt');
                    if (shouldClimb) {
                        // Move player on top of the newly placed block
                        player.y = (by * TILE_SIZE) - player.height - 0.1;
                        player.vy = 0;
                        player.grounded = true;
                    }
                } else {
                    showMessage("ブロックが足りません！");
                }
            }
        }
    }
}

function showMessage(msg) {
    const el = document.getElementById('message-log');
    el.innerText = msg;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2000);
}

function draw() {
    if (!world) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#E0F7FA");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

    const { startX, endX, startY, endY } = calculateVisibleTileRange(
        cameraX, cameraY, canvas.width, canvas.height, TILE_SIZE
    );

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const block = world.getBlock(x, y);
            if (block !== BLOCKS.AIR && textures[block]) {
                ctx.drawImage(textures[block], x * TILE_SIZE, y * TILE_SIZE);
                // Shadow
                const neighborAbove = world.getBlock(x, y - 1);
                if (neighborAbove !== BLOCKS.AIR && !isBlockTransparent(neighborAbove, BLOCK_PROPS)) {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    player.draw(ctx);

    // Particles
    fireworkParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });

    // Highlight
    const worldPos = screenToWorld(input.mouse.x, input.mouse.y, cameraX, cameraY);
    const { tx: bx, ty: by } = worldToTile(worldPos.x, worldPos.y, TILE_SIZE);
    if (isWithinReach(worldPos.x, worldPos.y, player.getCenterX(), player.getCenterY(), REACH)) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    ctx.restore();

    document.getElementById('debug-info').innerText = `X: ${Math.floor(player.x / TILE_SIZE)} Y: ${Math.floor(player.y / TILE_SIZE)}`;
}

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

// --- Event Listeners ---
window.addEventListener('keydown', e => {
    switch (e.code) {
        case 'KeyA': case 'ArrowLeft': input.keys.left = true; break;
        case 'KeyD': case 'ArrowRight': input.keys.right = true; break;
        case 'KeyW': case 'ArrowUp': case 'Space': input.keys.jump = true; break;
        case 'KeyS': case 'ArrowDown': input.keys.down = true; break;
        case 'Digit1': selectHotbar(0); break;
        case 'Digit2': selectHotbar(1); break;
        case 'Digit3': selectHotbar(2); break;
        case 'Digit4': selectHotbar(3); break;
        case 'Digit5': selectHotbar(4); break;
        case 'Digit6': selectHotbar(5); break;
    }
});

window.addEventListener('keyup', e => {
    switch (e.code) {
        case 'KeyA': case 'ArrowLeft': input.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': input.keys.right = false; break;
        case 'KeyW': case 'ArrowUp': case 'Space': input.keys.jump = false; break;
        case 'KeyS': case 'ArrowDown': input.keys.down = false; break;
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
setupTouch('btn-down', 'down');

canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    handleInteraction(t.clientX - rect.left, t.clientY - rect.top);
}, { passive: false });

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    sounds.init();
    init();
});
