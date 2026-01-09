/**
 * 2D Minecraft Clone - Painters
 * "Dumb" drawing functions that only know how to place blocks based on coordinates.
 * No biome logic or probability decisions here.
 */

import { BLOCKS } from './constants.js';

// --- Helper Functions ---

/**
 * Accessor interface:
 * {
 * get: (x, y) => blockId,
 * set: (x, y, blockId) => void,
 * width: number,
 * height: number
 * }
 */

export function drawBlob(accessor, cx, cy, blockType, radius) {
    const rSq = radius * radius;
    const ceilR = Math.ceil(radius);

    for (let dx = -ceilR; dx <= ceilR; dx++) {
        for (let dy = -ceilR; dy <= ceilR; dy++) {
            if (dx * dx + dy * dy <= rSq) {
                const x = cx + dx;
                const y = cy + dy;
                // Only replace stone or dirt (simple context check allowed for painting)
                const current = accessor.get(x, y);
                if (current === BLOCKS.STONE || current === BLOCKS.DIRT) {
                    accessor.set(x, y, blockType);
                }
            }
        }
    }
}

export function drawPond(accessor, cx, cy, radius) {
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = 0; dy <= radius / 2; dy++) {
            if (dx * dx + dy * dy * 4 <= radius * radius) { // flattened circle
                accessor.set(cx + dx, cy + dy, BLOCKS.WATER);
            }
        }
    }
}

export function drawCavePocket(accessor, cx, cy) {
    const radius = 2 + Math.floor(Math.random() * 3);
    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            if (x * x + y * y <= radius * radius) {
                const worldX = cx + x;
                const worldY = cy + y;
                if (worldY < accessor.height - 1) {
                    accessor.set(worldX, worldY, BLOCKS.AIR);
                }
            }
        }
    }
}

// --- Vegetation Painters ---

export function drawTreeOak(accessor, x, y) {
    const height = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < height; i++) accessor.set(x, y - i, BLOCKS.WOOD);
    for (let lx = x - 2; lx <= x + 2; lx++) {
        for (let ly = y - height - 2; ly <= y - height; ly++) {
            if (Math.abs(lx - x) === 2 && Math.abs(ly - (y - height)) === 2) continue;
            if (accessor.get(lx, ly) === BLOCKS.AIR) accessor.set(lx, ly, BLOCKS.LEAVES);
        }
    }
}

export function drawTreePine(accessor, x, y) {
    const height = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
    }

    let radius = 1;
    for (let dy = height; dy > 1; dy--) {
        const worldY = y - dy;
        
        if ((height - dy) % 2 === 0) radius = Math.min(3, radius + 1);
        if (dy === height) radius = 1;

        for (let lx = x - radius; lx <= x + radius; lx++) {
            if (lx === x && dy !== height) continue;
            
            if (accessor.get(lx, worldY) === BLOCKS.AIR) {
                accessor.set(lx, worldY, BLOCKS.LEAVES);
            }
        }
    }
    accessor.set(x, y - height, BLOCKS.LEAVES);
}

export function drawCactus(accessor, x, y) {
    const height = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.LEAVES);
    }

    if (height >= 3 && Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const armHeight = 1 + Math.floor(Math.random() * (height - 2));
        
        if (accessor.get(x + side, y - armHeight) === BLOCKS.AIR) {
            accessor.set(x + side, y - armHeight, BLOCKS.LEAVES);
            if (accessor.get(x + side, y - armHeight - 1) === BLOCKS.AIR) {
                accessor.set(x + side, y - armHeight - 1, BLOCKS.LEAVES);
            }
        }
    }
}

export function drawTreeDead(accessor, x, y) {
    const height = 3 + Math.floor(Math.random() * 3);
    
    let cx = x;
    for (let i = 0; i < height; i++) {
        accessor.set(cx, y - i, BLOCKS.WOOD);
        
        if (i > 1 && Math.random() < 0.3) {
            cx += (Math.random() < 0.5 ? -1 : 1);
        }
    }

    if (Math.random() < 0.5) {
            const branchY = y - Math.floor(height / 2);
            const dir = Math.random() < 0.5 ? -1 : 1;
            if (accessor.get(cx + dir, branchY) === BLOCKS.AIR) {
                accessor.set(cx + dir, branchY, BLOCKS.WOOD);
            }
    }
}

export function drawTreeJungle(accessor, x, y) {
    const height = 8 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
        if (Math.random() < 0.3) {
                const side = Math.random() < 0.5 ? -1 : 1;
                if (accessor.get(x + side, y - i) === BLOCKS.AIR) {
                    accessor.set(x + side, y - i, BLOCKS.LEAVES);
                }
        }
    }

    const radius = 3;
    for (let dy = 0; dy < 3; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) + dy < 4) {
                accessor.set(x + dx, y - height + 1 - dy, BLOCKS.LEAVES);
            }
        }
    }
}

export function drawTreeAcacia(accessor, x, y) {
    const height = 4 + Math.floor(Math.random() * 2);
    let cx = x;
    
    for (let i = 0; i < Math.floor(height / 2); i++) {
        accessor.set(cx, y - i, BLOCKS.WOOD);
    }
    
    const direction = Math.random() < 0.5 ? 1 : -1;
    for (let i = Math.floor(height / 2); i < height; i++) {
        cx += direction;
        accessor.set(cx, y - i, BLOCKS.WOOD);
    }

    for (let dx = -2; dx <= 2; dx++) {
        accessor.set(cx + dx, y - height, BLOCKS.LEAVES);
    }
    for (let dx = -1; dx <= 1; dx++) {
        accessor.set(cx + dx, y - height - 1, BLOCKS.LEAVES);
    }
}

export function drawBush(accessor, x, y) {
    accessor.set(x, y, BLOCKS.LEAVES);
    if (Math.random() < 0.5 && accessor.get(x + 1, y) === BLOCKS.AIR) {
        accessor.set(x + 1, y, BLOCKS.LEAVES);
    }
    if (Math.random() < 0.3 && accessor.get(x, y - 1) === BLOCKS.AIR) {
        accessor.set(x, y - 1, BLOCKS.LEAVES);
    }
}

export function drawBoulder(accessor, x, y) {
    accessor.set(x, y, BLOCKS.STONE);
    if (Math.random() < 0.7) accessor.set(x + 1, y, BLOCKS.STONE);
    if (Math.random() < 0.5) accessor.set(x, y - 1, BLOCKS.STONE);
}

// --- Structure Painters ---

export function drawOasis(accessor, cx, cy) {
    const waterRadius = 3 + Math.floor(Math.random() * 2);
    const grassRadius = waterRadius + 2;

    // 1. Draw Grass Bed (replaces Sand to create lush area)
    for (let dx = -grassRadius; dx <= grassRadius; dx++) {
        const dist = Math.abs(dx);
        for (let dy = -1; dy <= 3; dy++) {
            const x = cx + dx;
            const y = cy + dy;
            
            // Create a "bowl" for the water
            if (dist <= waterRadius) {
                 if (dy > 0) accessor.set(x, y, BLOCKS.SAND); // Bed of the pool
            } else {
                // The rim
                if (dy === 0) accessor.set(x, y, BLOCKS.GRASS);
                else if (dy > 0) accessor.set(x, y, BLOCKS.DIRT);
            }
        }
    }

    // 2. Fill Water
    for (let dx = -waterRadius; dx <= waterRadius; dx++) {
        // Flatten the water surface logic a bit for aesthetic
        const depth = (Math.abs(dx) < waterRadius - 1) ? 1 : 0;
        for (let dy = 0; dy <= depth; dy++) {
            accessor.set(cx + dx, cy + dy, BLOCKS.WATER);
        }
        // Clear air above water
        accessor.set(cx + dx, cy - 1, BLOCKS.AIR);
        accessor.set(cx + dx, cy - 2, BLOCKS.AIR);
    }

    // 3. Add Vegetation (Palm Trees using Jungle Tree logic)
    const treeCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < treeCount; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const tx = cx + (side * (waterRadius + 1));
        // Ensure we plant on the grass rim
        if (accessor.get(tx, cy) === BLOCKS.GRASS) {
            drawTreeJungle(accessor, tx, cy - 1);
        }
    }
    
    // 4. Add a bush or two
    if (Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const bx = cx + (side * (grassRadius - 1));
         if (accessor.get(bx, cy) === BLOCKS.GRASS) {
            drawBush(accessor, bx, cy - 1);
        }
    }
}

export function drawMonolith(accessor, x, y) {
    const height = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.BEDROCK);
        accessor.set(x + 1, y - i, BLOCKS.BEDROCK);
    }
    // Top reward
    accessor.set(x, y - height, BLOCKS.GOLD);
    accessor.set(x + 1, y - height, BLOCKS.GOLD);
    
    // Base decoration
    accessor.set(x - 1, y, BLOCKS.STONE);
    accessor.set(x + 2, y, BLOCKS.STONE);
}

export function drawBuriedBunker(accessor, cx, cy) {
    const width = 6;
    const height = 5;
    const x = cx - Math.floor(width / 2);
    const y = cy;

    for (let dx = -1; dx <= width; dx++) {
        for (let dy = -1; dy <= height; dy++) {
            const bx = x + dx;
            const by = y + dy;
            
            if (dx === -1 || dx === width || dy === -1 || dy === height) {
                accessor.set(bx, by, BLOCKS.STONE);
            } else {
                accessor.set(bx, by, BLOCKS.AIR);
            }
        }
    }

    // Loot
    accessor.set(x + 1, y + height - 1, BLOCKS.JACKPOT);
    accessor.set(x + width - 2, y + height - 1, BLOCKS.TNT);
    accessor.set(x + Math.floor(width/2), y + height - 1, BLOCKS.WORKBENCH);
}

export function drawWorldTree(accessor, x, y) {
    const height = 15 + Math.floor(Math.random() * 10);
    
    // Trunk
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
        accessor.set(x + 1, y - i, BLOCKS.WOOD);
        // Roots
        if (i < 3) {
            accessor.set(x - 1, y - i + 1, BLOCKS.WOOD);
            accessor.set(x + 2, y - i + 1, BLOCKS.WOOD);
        }
    }

    // Crown
    const radius = 6;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius + 1; dx++) {
            if (dx * dx + dy * dy <= radius * radius + Math.random() * 5) {
                const by = y - height + dy;
                if (accessor.get(x + dx, by) === BLOCKS.AIR) {
                    accessor.set(x + dx, by, BLOCKS.LEAVES);
                }
            }
        }
    }
    
    // Hidden reward inside leaves
    accessor.set(x, y - height - 2, BLOCKS.GOLD);
}

export function drawFloatingIsland(accessor, cx, cy) {
    const radius = 3 + Math.floor(Math.random() * 3);
    for (let dy = 0; dy <= radius * 1.5; dy++) {
        const currentRadius = Math.max(0, radius - (dy * 0.7));
        for (let dx = -Math.ceil(currentRadius); dx <= Math.ceil(currentRadius); dx++) {
            const x = cx + dx;
            const y = cy + dy;
            
            if (dy === 0) {
                accessor.set(x, y, BLOCKS.GRASS);
                if (dx === 0 && Math.random() < 0.3) {
                    drawTreeOak(accessor, x, y - 1);
                }
            } else if (dy < 2) {
                accessor.set(x, y, BLOCKS.DIRT);
            } else {
                if (Math.random() < 0.4 || (dx === 0 && dy > 2)) {
                    accessor.set(x, y, BLOCKS.GOLD);
                } else {
                    accessor.set(x, y, BLOCKS.STONE);
                }
            }
        }
    }
}

export function drawOceanIsland(accessor, cx, seaLevel) {
    const width = 4 + Math.floor(Math.random() * 5); // Radius
    const height = 4 + Math.floor(Math.random() * 3); // Height above water
    
    for (let dx = -width; dx <= width; dx++) {
        const dist = Math.abs(dx) / width;
        const h = Math.floor(height * (1 - dist * dist)); 
        
        const topY = seaLevel - h;
        const bottomY = seaLevel + 4 + Math.floor(Math.random() * 3);

        for (let y = topY; y <= bottomY; y++) {
            if (y < seaLevel) {
                accessor.set(cx + dx, y, BLOCKS.SAND);
                if (y === topY && Math.random() > 0.2) {
                    accessor.set(cx + dx, y, BLOCKS.GRASS);
                }
            } else {
                accessor.set(cx + dx, y, BLOCKS.SAND);
            }
        }
    }

    if (Math.random() > 0.3) {
        drawTreeOak(accessor, cx, seaLevel - height - 1);
    }
}

export function drawDesertRuin(accessor, x, y) {
    const type = Math.floor(Math.random() * 4);
    
    if (type === 0) {
        const height = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < height; i++) {
            accessor.set(x, y - 1 - i, BLOCKS.STONE);
        }
        if (Math.random() < 0.5) accessor.set(x, y - 1 - height, BLOCKS.STONE);
        if (Math.random() < 0.4) accessor.set(x + 1, y - 1, BLOCKS.STONE);
    } else if (type === 1) {
        const size = 3 + Math.floor(Math.random() * 2);
        for (let dy = 0; dy < size; dy++) {
            const width = size - dy - 1;
            for (let dx = -width; dx <= width; dx++) {
                if (Math.random() > 0.1) {
                    accessor.set(x + dx, y - 1 - dy, BLOCKS.STONE);
                }
            }
        }
    } else if (type === 2) {
        const height = 4;
        const width = 3;
        for (let dx = -1; dx <= 1; dx++) {
            accessor.set(x + dx, y - height, BLOCKS.STONE);
        }
        for (let i = 1; i < height; i++) {
            accessor.set(x - 1, y - i, BLOCKS.STONE);
            accessor.set(x + 1, y - i, BLOCKS.STONE);
        }
    } else if (type === 3) {
        const length = 4 + Math.floor(Math.random() * 3);
        for (let dx = 0; dx < length; dx++) {
            const h = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < h; i++) {
                accessor.set(x + dx, y - 1 - i, BLOCKS.STONE);
            }
        }
    }
}

export function drawMineshaft(accessor, startX, startY) {
    const length = 10 + Math.floor(Math.random() * 15);
    let x = startX;
    let y = startY;
    
    for (let i = 0; i < length; i++) {
        if (x >= accessor.width - 2) break;
        
        accessor.set(x, y, BLOCKS.AIR);
        accessor.set(x, y - 1, BLOCKS.AIR);
        accessor.set(x, y - 2, BLOCKS.AIR);

        accessor.set(x, y + 1, BLOCKS.WOOD);

        if (i % 4 === 0) {
            if (accessor.get(x, y + 1) !== BLOCKS.AIR) accessor.set(x, y, BLOCKS.WOOD);
            if (accessor.get(x, y - 2) !== BLOCKS.AIR) accessor.set(x, y - 1, BLOCKS.WOOD);
            
            accessor.set(x, y - 2, BLOCKS.WOOD);
        }

        x++;
        if (Math.random() < 0.1) y += (Math.random() < 0.5 ? -1 : 1);
        
        if (y > accessor.height - 5) y = accessor.height - 5;
        if (y < 50) y = 50;
    }
}

// --- Cloud Painters ---

export function drawCloudPuffy(accessor, x, y, width, height) {
    for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
            const centerX = width / 2;
            const centerY = height / 2;
            const distX = Math.abs(dx - centerX) / centerX;
            const distY = Math.abs(dy - centerY) / centerY;

            const threshold = 0.7 + Math.random() * 0.3;
            if (distX + distY < threshold) {
                accessor.set(x + dx, y + dy, BLOCKS.CLOUD);
            }
        }
    }
    const puffCount = Math.floor(width / 3);
    for (let i = 0; i < puffCount; i++) {
        const puffX = x + 1 + Math.floor(Math.random() * (width - 2));
        if (Math.random() > 0.4) {
            accessor.set(puffX, y - 1, BLOCKS.CLOUD);
        }
    }
}

export function drawCloudLong(accessor, x, y, length, thickness) {
    for (let dx = 0; dx < length; dx++) {
        for (let dy = 0; dy < thickness; dy++) {
            if ((dx < 2 || dx >= length - 2) && dy > 0) {
                if (Math.random() > 0.5) continue;
            }
            accessor.set(x + dx, y + dy, BLOCKS.CLOUD);
        }
        if (Math.random() > 0.7 && dx > 0 && dx < length - 1) {
            accessor.set(x + dx, y - 1, BLOCKS.CLOUD);
        }
    }
}

export function drawCloudLayered(accessor, x, y) {
    for (let dx = 2; dx < 8; dx++) {
        if (Math.random() > 0.3) {
            accessor.set(x + dx, y, BLOCKS.CLOUD);
        }
    }
    for (let dx = 0; dx < 12; dx++) {
        accessor.set(x + dx, y + 1, BLOCKS.CLOUD);
    }
    for (let dx = 1; dx < 10; dx++) {
        if (Math.random() > 0.2) {
            accessor.set(x + dx, y + 2, BLOCKS.CLOUD);
        }
    }
}

export function drawCloudCluster(accessor, x, y) {
    const clusterCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clusterCount; i++) {
        const offsetX = Math.floor(Math.random() * 15);
        const offsetY = Math.floor(Math.random() * 4);
        const size = 2 + Math.floor(Math.random() * 3);

        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < Math.ceil(size / 2); dy++) {
                if (Math.random() > 0.3) {
                    accessor.set(x + offsetX + dx, y + offsetY + dy, BLOCKS.CLOUD);
                }
            }
        }
    }
}

export function drawCloudByShapeId(accessor, x, y, shapeType) {
    switch (shapeType) {
        case 0:
            drawCloudPuffy(accessor, x, y, 4, 2);
            break;
        case 1:
            drawCloudLong(accessor, x, y, 12, 1);
            break;
        case 2:
            drawCloudPuffy(accessor, x, y, 8, 3);
            break;
        case 3:
            drawCloudLayered(accessor, x, y);
            break;
        case 4:
            drawCloudCluster(accessor, x, y);
            break;
    }
}

export function drawTreeSwamp(accessor, x, y) {
    const height = 6 + Math.floor(Math.random() * 4);

    // Trunk
    for (let i = 0; i < height; i++) {
        accessor.set(x, y - i, BLOCKS.WOOD);
    }

    // Drooping leaves (Willow style)
    const radius = 3;
    for (let dy = 0; dy <= 2; dy++) { // Canopy height
        for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) + dy < 5) {
                const leafY = y - height + 1 - dy;
                if (accessor.get(x + dx, leafY) === BLOCKS.AIR) {
                    accessor.set(x + dx, leafY, BLOCKS.LEAVES);
                }

                // Vines/Drooping leaves
                if (Math.abs(dx) >= 2 && Math.random() < 0.6) {
                    const vineLength = 1 + Math.floor(Math.random() * 3);
                    for (let v = 1; v <= vineLength; v++) {
                         if (accessor.get(x + dx, leafY + v) === BLOCKS.AIR) {
                            accessor.set(x + dx, leafY + v, BLOCKS.LEAVES);
                        }
                    }
                }
            }
        }
    }
}

export function drawAncientRuins(accessor, cx, floorY) {
    // Randomize shape and size
    const caveRadiusX = 20 + Math.floor(Math.random() * 10); // 20 - 29
    const caveRadiusY = 16 + Math.floor(Math.random() * 5);  // 16 - 20
    
    // 1. Excavate the Great Void (Oval Cave)
    // We iterate over the bounding box
    for (let dy = -caveRadiusY; dy <= 2; dy++) { // Go a bit below 0 to ensure flat floor
        for (let dx = -caveRadiusX; dx <= caveRadiusX; dx++) {
            // Ellipse equation check for cave shape
            if ((dx * dx) / (caveRadiusX * caveRadiusX) + (dy * dy) / (caveRadiusY * caveRadiusY) <= 1.0) {
                const tx = cx + dx;
                const ty = floorY + dy - Math.floor(caveRadiusY * 0.6); // Shift cave up slightly so floorY is bottom
                if (ty > 0 && ty < accessor.height - 1) {
                    accessor.set(tx, ty, BLOCKS.AIR);
                }
            }
        }
    }

    // 2. The Artificial Sun (Floating Gold Sphere)
    const sunX = cx;
    const sunY = floorY - caveRadiusY - 2; // Floating near top of void
    const sunRad = 3;
    
    for (let dx = -sunRad; dx <= sunRad; dx++) {
        for (let dy = -sunRad; dy <= sunRad; dy++) {
            if (dx * dx + dy * dy <= sunRad * sunRad) {
                accessor.set(sunX + dx, sunY + dy, BLOCKS.GOLD);
            }
        }
    }
    // The Core of the Sun
    accessor.set(sunX, sunY, BLOCKS.JACKPOT); 

    // 3. The Pyramid (Sandstone style)
    const pyrBase = 16 + Math.floor(Math.random() * 8); // 16 - 23
    const pyrHeight = Math.ceil(pyrBase / 2);
    
    for (let h = 0; h < pyrHeight; h++) {
        const width = pyrBase - (h * 2);
        const py = floorY - h;
        
        const startX = cx - Math.floor(width / 2);
        for (let w = 0; w < width; w++) {
            accessor.set(startX + w, py, BLOCKS.SAND);
        }
    }
    
    // Pyramid Capstone (Updated to SAND)
    accessor.set(cx, floorY - pyrHeight, BLOCKS.SAND);
    
    // Hidden Treasure inside Pyramid
    accessor.set(cx, floorY - 1, BLOCKS.JACKPOT);
    accessor.set(cx - 1, floorY - 1, BLOCKS.GOLD);
    accessor.set(cx + 1, floorY - 1, BLOCKS.GOLD);
}
