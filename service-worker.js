const CACHE_NAME = 'pictoco-v6';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/style.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Main JS
  './src/main.js',
  './src/input.js',
  './src/renderer.js',
  './src/accelerator.js',
  './src/sky.js',
  './src/inventory.js',
  './src/actions.js',
  './src/i18n.js',
  './src/block_particles.js',
  './src/audio.js',
  './src/save.js',
  './src/fireworks.js',
  './src/sapling_manager.js',
  './src/constants.js',
  './src/texture_gen.js',
  './src/jackpot.js',
  './src/utils.js',
  './src/crafting.js',
  './src/ui_manager.js',
  './src/world_share.js',
  './src/tnt.js',
  './src/camera.js',
  // Painters
  './src/painters/index.js',
  './src/painters/core.js',
  './src/painters/structures.js',
  './src/painters/clouds.js',
  './src/painters/vegetation.js',
  // World
  './src/world/index.js',
  './src/world/generate.js',
  './src/world/terrain.js',
  './src/world/biomes.js',
  './src/world/caves.js',
  './src/world/clouds.js',
  './src/world/erosion.js',
  './src/world/features.js',
  './src/world/vegetation.js',
  './src/world/water.js',
  // Player
  './src/player/index.js',
  './src/player/physics.js',
  './src/player/render.js',
  './src/player/collision.js',
  './src/player/movement.js',
  './src/player/fixed_point.js',
  // Fonts
  './fonts/fredoka-one-latin-400-normal.woff2',
  './fonts/fredoka-one-latin-400-normal.woff',
  './fonts/Nunito-Bold.ttf',
  './fonts/Nunito-Regular.ttf',
  './fonts/Jua-Regular.ttf',
  './fonts/ZCOOLKuaiLe-Regular.ttf',
  './fonts/ZenMaruGothic-Regular.ttf',
  './fonts/ZenMaruGothic-Bold.ttf',
  './fonts/MochiyPopOne-Regular.ttf'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses or non-GET requests
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }
            // Clone and cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});
