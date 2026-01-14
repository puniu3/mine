const CACHE_NAME = 'pictoco-v23';

// Core assets - always cached
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/style.css',
  './app.js'
];

// PWA icons
const PWA_ICONS = [
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Western fonts - used for all environments
const WESTERN_FONTS = [
  './fonts/fredoka-one-latin-400-normal.woff2',
  './fonts/fredoka-one-latin-400-normal.woff',
  './fonts/Nunito-Bold.woff2',
  './fonts/Nunito-Regular.woff2'
];

// Asian fonts - loaded on-demand per language
const ASIAN_FONTS = {
  ja: [
    './fonts/ZenMaruGothic-Regular.woff2',
    './fonts/ZenMaruGothic-Bold.woff2',
    './fonts/MochiyPopOne-Regular.woff2'
  ],
  ko: [
    './fonts/Jua-Regular.woff2'
  ],
  zh: [
    './fonts/ZCOOLKuaiLe-Regular.woff2'
  ],
  'zh-TW': [
    './fonts/ZCOOLKuaiLe-Regular.woff2'
  ]
};

// Assets to cache on install (core + PWA icons + western fonts)
const ASSETS_TO_CACHE = [
  ...CORE_ASSETS,
  ...PWA_ICONS,
  ...WESTERN_FONTS
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

// Message handler - cache Asian fonts on language change
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_LANGUAGE_FONTS') {
    const lang = event.data.lang;
    const fonts = ASIAN_FONTS[lang];
    if (fonts && fonts.length > 0) {
      caches.open(CACHE_NAME).then((cache) => {
        cache.addAll(fonts);
      });
    }
  }
});
