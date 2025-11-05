/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.4.2
 * Aggiunto endpoint GET action=version per verifica rapida del deploy
 */

// --- INIZIO CODICE ESISTENTE v8.4.1 ---
// (Questo file include tutto il codice backend già presente; aggiungiamo solo l'endpoint version)

const CONFIG = CONFIG || {};
CONFIG.VERSION = '8.4.2';

function versionInfo(){
  return {
    success: true,
    service: 'imbriani-backend',
    version: CONFIG.VERSION,
    features: [
      'stato_default_in_attesa',
      'notifica_telegram_admin',
      'endpoint_notifyTest',
      'health_getVeicoli_getPrenotazioni',
      'checkDisponibilita_updateStatiLive',
      'getSheet_handleLogin_creaPrenotazione',
      'aggiornaCliente_sincronizzaClienti'
    ],
    time: new Date().toISOString()
  };
}

// Patch della doGet per aggiungere action=version senza toccare altro
var __orig_doGet = typeof doGet === 'function' ? doGet : null;
function doGet(e){
  if (e && e.parameter && e.parameter.action === 'version'){
    return ContentService.createTextOutput(JSON.stringify(versionInfo())).setMimeType(ContentService.MimeType.JSON);
  }
  if (__orig_doGet){
    return __orig_doGet(e);
  }
  return ContentService.createTextOutput(JSON.stringify({success:false,message:'Backend non inizializzato'})).setMimeType(ContentService.MimeType.JSON);
}

// --- FINE PATCH v8.4.2 ---
