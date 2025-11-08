/**
 * SERVICE WORKER - Imbriani Stefano Noleggio PWA
 * Cache strategy, offline support, push notifications handler
 */

const CACHE_NAME = 'imbriani-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  'pwa/manifest.json',
  'pwa/push-notifications.js'
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone request for fetch
        return fetch(event.request.clone())
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Clone response to cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            // Offline fallback
            return caches.match('./index.html');
          });
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
