/**
 * SERVICE WORKER - Imbriani Stefano Noleggio PWA v2.0
 * 
 * Features:
 * - Cache strategy (Network First, fallback Cache)
 * - Offline support
 * - Push notifications handler
 * - Background sync
 */

const CACHE_NAME = 'imbriani-pwa-v2';
const CACHE_VERSION = '2.0.0';

// Assets critici da cachare
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/area-personale.html',
  '/frontend/styles/styles.css',
  '/frontend/styles/admin-styles.css',
  '/frontend/scripts/config.js',
  '/frontend/pwa/manifest.json'
];

// Assets secondari (cache on demand)
const SECONDARY_ASSETS = [
  '/richiesta-preventivo.html',
  '/veicoli.html',
  '/frontend/scripts/admin-prenotazioni.js',
  '/frontend/scripts/admin-scripts.js'
];

// ==================================
// INSTALL EVENT
// ==================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ==================================
// ACTIVATE EVENT
// ==================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// ==================================
// FETCH EVENT - Network First Strategy
// ==================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Network First, fallback to Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response for cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to offline page
            return caches.match('/index.html');
          });
      })
  );
});

// ==================================
// PUSH NOTIFICATION EVENT
// ==================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Imbriani Noleggio',
    body: 'Hai un nuovo aggiornamento',
    icon: '/frontend/pwa/icons/android-icon-192x192.png',
    badge: '/frontend/pwa/icons/android-icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'imbriani-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'Visualizza'
      },
      {
        action: 'dismiss',
        title: 'Chiudi'
      }
    ]
  };

  // Parse push data
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        data: { url: data.url || '/' },
        tag: data.tag || 'imbriani-notification'
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// ==================================
// NOTIFICATION CLICK EVENT
// ==================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          const urlToOpen = event.notification.data?.url || '/';
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ==================================
// BACKGROUND SYNC EVENT
// ==================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-prenotazioni') {
    event.waitUntil(
      // Sync offline prenotazioni
      syncOfflineBookings()
    );
  }
});

// ==================================
// HELPER FUNCTIONS
// ==================================

async function syncOfflineBookings() {
  try {
    const cache = await caches.open('offline-bookings');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        await fetch(request.clone());
        await cache.delete(request);
      } catch (e) {
        console.error('[SW] Failed to sync booking:', e);
      }
    }
  } catch (e) {
    console.error('[SW] Sync failed:', e);
  }
}

console.log('[SW] Service Worker v' + CACHE_VERSION + ' loaded successfully');
