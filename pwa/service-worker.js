/**
 * SERVICE WORKER - Imbriani Stefano Noleggio PWA
 * Cache strategy, offline support, push notifications handler
 */

const CACHE_NAME = 'imbriani-pwa-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  'pwa/manifest.json',
  'pwa/push-notifications.js',
  './veicoli.html',
  './richiesta-preventivo.html'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const acceptHeader = req.headers.get('accept') || '';

  // Network-first per le pagine HTML per evitare contenuti obsoleti
  if (req.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkResp) => {
          // Cache copia per fallback offline
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          return networkResp;
        })
        .catch(() => {
          // Fallback: pagina dalla cache o index
          return caches.match(req).then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // Cache-first per asset statici
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((networkResp) => {
          if (!networkResp || networkResp.status !== 200 || networkResp.type !== 'basic') {
            return networkResp;
          }
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          return networkResp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Imbriani Noleggio',
    body: 'Hai un nuovo aggiornamento',
    icon: 'icons/android-icon-192x192.png',
    badge: 'icons/android-icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'imbriani-notification',
    requireInteraction: false
  };

  // Parse data if provided
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.url ? { url: data.url } : undefined,
        vibrate: [200, 100, 200],
        tag: data.tag || 'imbriani-notification',
        requireInteraction: data.requireInteraction || false
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  // Open app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.endsWith('./') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not open
        if (clients.openWindow) {
          const urlToOpen = event.notification.data?.url || './';
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-prenotazioni') {
    event.waitUntil(
      // Sync logic here
      Promise.resolve()
    );
  }
});

console.log('[SW] Service Worker loaded successfully');
