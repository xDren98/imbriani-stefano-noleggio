/**
 * PUSH NOTIFICATIONS MANAGER
 * Imbriani Stefano Noleggio PWA
 * 
 * Gestisce registrazione, permessi e invio notifiche push
 */

class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = null; // Da configurare
    this.subscription = null;
  }

  /**
   * Inizializza push notifications
   */
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service Worker non supportato');
      return false;
    }

    if (!('PushManager' in window)) {
      console.warn('[Push] Push API non supportata');
      return false;
    }

    try {
      // Registra service worker
      const registration = await navigator.serviceWorker.register('/frontend/pwa/service-worker.js');
      console.log('[Push] Service Worker registrato');

      // Attendi che sia pronto
      await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker pronto');

      return true;
    } catch (error) {
      console.error('[Push] Errore inizializzazione:', error);
      return false;
    }
  }

  /**
   * Richiede permesso notifiche
   */
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      console.log('[Push] Permesso notifiche:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('[Push] Errore richiesta permesso:', error);
      return false;
    }
  }

  /**
   * Sottoscrivi a push notifications
   */
  async subscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Verifica subscription esistente
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Crea nuova subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
        console.log('[Push] Nuova subscription creata');
      } else {
        console.log('[Push] Subscription esistente trovata');
      }

      this.subscription = subscription;

      // Invia subscription al backend
      await this.sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      console.error('[Push] Errore subscription:', error);
      return null;
    }
  }

  /**
   * Annulla subscription
   */
  async unsubscribe() {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        console.log('[Push] Subscription rimossa');
        this.subscription = null;
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Push] Errore rimozione subscription:', error);
      return false;
    }
  }

  /**
   * Invia subscription al backend
   */
  async sendSubscriptionToBackend(subscription) {
    try {
      const response = await fetch(CONFIG.API_URL + '?action=registerPush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'registerPush',
          token: CONFIG.TOKEN,
          subscription: subscription.toJSON()
        })
      });

      const data = await response.json();
      console.log('[Push] Subscription salvata sul backend:', data);
      return data.success;
    } catch (error) {
      console.error('[Push] Errore invio subscription:', error);
      return false;
    }
  }

  /**
   * Testa notifica locale
   */
  async testNotification() {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Imbriani Noleggio', {
        body: 'Test notifica PWA funzionante! ✅',
        icon: '/frontend/pwa/icons/android-icon-192x192.png',
        badge: '/frontend/pwa/icons/android-icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: false
      });
      console.log('[Push] Test notifica inviata');
      return true;
    } catch (error) {
      console.error('[Push] Errore test notifica:', error);
      return false;
    }
  }

  /**
   * Converti VAPID key da base64 a Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Verifica supporto notifiche
   */
  isSupported() {
    return ('serviceWorker' in navigator) && 
           ('PushManager' in window) && 
           ('Notification' in window);
  }

  /**
   * Ottieni stato permesso corrente
   */
  getPermissionState() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

// Esporta istanza singleton
const pushManager = new PushNotificationManager();

// Auto-init se DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pushManager.init();
  });
} else {
  pushManager.init();
}

// Esponi globalmente
window.PushManager = pushManager;
