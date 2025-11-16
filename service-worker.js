// Service Worker for Performance Optimization with Offline Support
importScripts('/scripts/cache-config.js');

const { CACHE_CONFIG } = self.CACHE_CONFIG || {
  STATIC_CACHE: 'imbriani-static-v1',
  IMAGE_CACHE: 'imbriani-images-v1',
  API_CACHE: 'imbriani-api-v1',
  DURATIONS: { STATIC: 2592000, IMAGES: 2592000, API: 300 }
};

// Critical assets to cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/styles-optimized.css',
  '/critical-bundle.js',
  '/scripts/perf-monitor.js',
  '/scripts/image-optimizer.js',
  '/scripts/cache-config.js',
  '/scripts/offline-manager.js',
  '/shared-utils.js',
  '/config.js'
];

// Offline page for when everything fails
const OFFLINE_PAGE = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Imbriani Stefano Noleggio</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      color: white;
    }
    .offline-container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .offline-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.8;
    }
    h1 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0 0 1.5rem 0;
      opacity: 0.9;
      line-height: 1.5;
    }
    .retry-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s ease;
    }
    .retry-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="offline-icon">📵</div>
    <h1>Sei offline</h1>
    <p>La connessione internet non è disponibile. Alcune funzionalità potrebbero essere limitate.</p>
    <button class="retry-btn" onclick="window.location.reload()">Riprova</button>
  </div>
</body>
</html>
`;
const CACHE_NAME = 'imbriani-v1';
const IMAGE_CACHE_NAME = 'imbriani-images-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/styles-optimized.css',
        '/critical-bundle.js',
        '/scripts/perf-monitor.js',
        '/scripts/image-optimizer.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function handleDefaultRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return cached version if available
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For HTML pages, return the offline page
    if (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html')) {
      return new Response(OFFLINE_PAGE, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    return new Response('Offline', { status: 503 });
  }
}