
import { generate } from '../src/world/generate.js';
import { WORLD_WIDTH, WORLD_HEIGHT, BLOCKS } from '../src/constants.js';

// Mock World object
class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.blocks = new Uint8Array(width * height);
    }

    setBlock(x, y, type) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.blocks[y * this.width + x] = type;
        }
    }

    getBlock(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.blocks[y * this.width + x];
        }
        return BLOCKS.AIR;
    }

    getAccessor() {
        return {
            set: (x, y, type) => this.setBlock(x, y, type),
            get: (x, y) => this.getBlock(x, y),
            width: this.width,
            height: this.height
        };
    }
}

// Block Name Map for visualization
const BLOCK_NAMES = Object.keys(BLOCKS).reduce((acc, key) => {
    acc[BLOCKS[key]] = key.substring(0, 1); // 1st char
    return acc;
}, {});

function printBottomSlice(world, startX, width) {
    console.log(`\nBottom slice from X=${startX} to ${startX + width}:`);
    console.log("   " + Array.from({length: width}, (_, i) => (startX + i) % 10).join(""));

    for (let y = WORLD_HEIGHT - 20; y < WORLD_HEIGHT; y++) {
        let row = `${y}`.padStart(3, ' ') + " ";
        for (let x = startX; x < startX + width; x++) {
            const block = world.getBlock(x, y);
            const char = block === BLOCKS.AIR ? "." :
                         block === BLOCKS.STONE ? "#" :
                         block === BLOCKS.BEDROCK ? "B" : "?";
            row += char;
        }
        console.log(row);
    }
}

console.log("Generating world...");
const world = new World(WORLD_WIDTH, WORLD_HEIGHT);
generate(world);

console.log("World generated.");
printBottomSlice(world, 100, 50);
printBottomSlice(world, 500, 50);
