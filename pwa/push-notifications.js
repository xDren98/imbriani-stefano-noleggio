/**
 * PUSH NOTIFICATIONS - Frontend Logic
 * Richiesta permessi, registrazione subscription, comunicazione con backend
 */

const VAPID_PUBLIC_KEY = 'TU_VAPID_PUBLIC_KEY_QUI'; // Da generare
const BACKEND_PUSH_ENDPOINT = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

/**
 * Converti VAPID key da base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
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
 * Richiedi permessi notifiche e registra subscription
 */
async function requestNotificationPermission() {
  console.log('[Push] Richiesta permessi notifiche...');
  
  // Verifica supporto
  if (!('Notification' in window)) {
    console.warn('[Push] Notifiche non supportate');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Worker non supportato');
    return false;
  }

  if (!('PushManager' in window)) {
    console.warn('[Push] Push Manager non supportato');
    return false;
  }

  try {
    // Richiedi permesso
    const permission = await Notification.requestPermission();
    console.log('[Push] Permesso notifiche:', permission);

    if (permission === 'granted') {
      // Registra subscription
      await subscribeToPushNotifications();
      return true;
    } else {
      console.log('[Push] Permesso negato dall\'utente');
      return false;
    }
  } catch (error) {
    console.error('[Push] Errore richiesta permessi:', error);
    return false;
  }
}

/**
 * Sottoscrivi l'utente alle notifiche push
 */
async function subscribeToPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker pronto');

    // Verifica subscription esistente
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('[Push] Creazione nuova subscription...');
      
      // Nota: VAPID_PUBLIC_KEY deve essere generata dal backend
      // Per ora uso placeholder - vedi istruzioni sotto
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      console.log('[Push] Subscription creata:', subscription);
    } else {
      console.log('[Push] Subscription esistente trovata');
    }

    // Invia subscription al backend
    await sendSubscriptionToBackend(subscription);
    
    return subscription;
  } catch (error) {
    console.error('[Push] Errore sottoscrizione:', error);
    throw error;
  }
}

/**
 * Invia subscription al backend per salvataggio
 */
async function sendSubscriptionToBackend(subscription) {
  try {
    console.log('[Push] Invio subscription al backend...');
    
    const response = await fetch(BACKEND_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'saveSubscription',
        subscription: subscription.toJSON(),
        // Aggiungi user ID o codice fiscale se disponibile
        userIdentifier: localStorage.getItem('userCF') || 'anonymous'
      })
    });

    const result = await response.json();
    console.log('[Push] Risposta backend:', result);
    
    if (result.success) {
      console.log('[Push] Subscription salvata con successo');
      localStorage.setItem('pushSubscribed', 'true');
    }
  } catch (error) {
    console.error('[Push] Errore invio subscription:', error);
  }
}

/**
 * Annulla subscription notifiche push
 */
async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed da notifiche');
      localStorage.removeItem('pushSubscribed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Push] Errore unsubscribe:', error);
    return false;
  }
}

/**
 * Verifica stato subscription
 */
async function checkSubscriptionStatus() {
  try {
    if (!('serviceWorker' in navigator)) return false;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return subscription !== null;
  } catch (error) {
    console.error('[Push] Errore check status:', error);
    return false;
  }
}

/**
 * Inizializza push notifications
 * Chiamare questa funzione dopo login/registrazione utente
 */
async function initPushNotifications() {
  console.log('[Push] Inizializzazione push notifications...');
  
  // Verifica se già sottoscritto
  const isSubscribed = await checkSubscriptionStatus();
  
  if (isSubscribed) {
    console.log('[Push] Utente già sottoscritto');
    return true;
  }
  
  // Altrimenti richiedi permessi
  return await requestNotificationPermission();
}

/**
 * Test: invia notifica locale
 */
function sendTestNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Test Imbriani Noleggio', {
      body: 'Questa è una notifica di test',
      icon: '/pwa/icons/icon-192x192.png',
      badge: '/pwa/icons/icon-192x192.png'
    });
  }
}

// Export functions
window.PushNotifications = {
  init: initPushNotifications,
  request: requestNotificationPermission,
  unsubscribe: unsubscribeFromPushNotifications,
  checkStatus: checkSubscriptionStatus,
  test: sendTestNotification
};

console.log('[Push] Push notifications module loaded');
