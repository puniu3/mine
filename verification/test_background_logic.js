
import { drawBackground } from '../src/background.js';

// Mock Canvas and Context
class MockContext {
    constructor() {
        this.calls = [];
    }
    drawImage(...args) {
        this.calls.push(['drawImage', args]);
    }
    // Add other necessary methods if background.js calls them (it creates internal canvas)
    // background.js creates DOM elements using document.createElement('canvas')
    // In node, 'document' is undefined.
}

// We need to mock 'document' and 'window' for background.js to work in Node
// because it creates off-screen canvases using document.createElement.

const mockCanvas = {
    width: 0,
    height: 0,
    getContext: () => ({
        fillStyle: '',
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        fill: () => {},
        drawImage: () => {}
    })
};

global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') return { ...mockCanvas };
        return {};
    }
};

global.window = {};

// Test execution
try {
    console.log("Testing drawBackground...");

    const ctx = new MockContext();
    const params = {
        cameraX: 100,
        cameraY: 200,
        logicalWidth: 800,
        logicalHeight: 600,
        worldWidth: 100, // blocks
        skyColors: { top: '#000', bottom: '#fff' }
    };

    drawBackground(ctx, params);

    // Check if drawImage was called (it might not be if init fails or layers empty)
    // But init should happen automatically now.

    // Since we mocked document.createElement, initBackground should succeed in creating "layers".
    // And drawBackground should iterate them and call ctx.drawImage.

    if (ctx.calls.length > 0) {
        console.log("SUCCESS: drawBackground made canvas calls.");
        console.log(`Calls made: ${ctx.calls.length}`);
    } else {
        console.error("FAILURE: drawBackground made no calls.");
        process.exit(1);
    }

} catch (e) {
    console.error("CRASHED:", e);
    process.exit(1);
}
