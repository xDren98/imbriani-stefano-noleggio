/**
 * CONFIGURAZIONE SICUREZZA
 * 
 * Impostazioni di sicurezza per l'applicazione
 */

/**
 * Configurazione sicurezza - da modificare in base alle esigenze
 */
const SECURITY_CONFIG = {
  // Lista IP autorizzati (separati da virgola)
  // Lasciare vuoto per disabilitare il controllo IP
  ALLOWED_IPS: '',
  
  // Lista domini autorizzati (separati da virgola) 
  // Es: 'imbriani.it, noleggi-imbriani.it'
  ALLOWED_DOMAINS: '',
  
  // Rate limiting - numero massimo di richieste per IP
  MAX_REQUESTS_PER_MINUTE: 60,
  
  // Session timeout in secondi (24 ore = 86400)
  SESSION_TIMEOUT: 86400,
  
  // CSRF token timeout in secondi (1 ora = 3600)
  CSRF_TOKEN_TIMEOUT: 3600,
  
  // Abilita/disabilita debug mode (mostra errori dettagliati)
  DEBUG_MODE: false,
  
  // Abilita/disabilita logging dettagliato
  ENABLE_LOGGING: true,
  
  // Password minima lunghezza
  MIN_PASSWORD_LENGTH: 8,
  
  // Numero massimo di tentativi di login falliti
  MAX_LOGIN_ATTEMPTS: 5,
  
  // Tempo di blocco dopo tentativi falliti (in secondi)
  LOCKOUT_DURATION: 900, // 15 minuti
};

/**
 * Inizializza la configurazione di sicurezza nelle ScriptProperties
 */
function initializeSecurityConfig() {
  var props = PropertiesService.getScriptProperties();
  
  // Imposta valori di default se non esistono
  for (var key in SECURITY_CONFIG) {
    var propKey = 'SECURITY_' + key;
    if (!props.getProperty(propKey)) {
      props.setProperty(propKey, String(SECURITY_CONFIG[key]));
    }
  }
  
  Logger.log('[SecurityConfig] Configurazione sicurezza inizializzata');
}

/**
 * Recupera configurazione di sicurezza
 */
function getSecurityConfig(key) {
  var props = PropertiesService.getScriptProperties();
  var propKey = 'SECURITY_' + key;
  var value = props.getProperty(propKey);
  
  if (value === null || value === undefined) {
    return SECURITY_CONFIG[key];
  }
  
  // Converte stringhe "true"/"false" in booleani
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Converte numeri
  if (!isNaN(value) && value !== '') {
    return Number(value);
  }
  
  return value;
}

/**
 * Aggiorna configurazione di sicurezza
 */
function setSecurityConfig(key, value) {
  var props = PropertiesService.getScriptProperties();
  var propKey = 'SECURITY_' + key;
  props.setProperty(propKey, String(value));
  Logger.log('[SecurityConfig] Aggiornato ' + key + ' = ' + value);
}

/**
 * Resetta configurazione di sicurezza ai valori di default
 */
function resetSecurityConfig() {
  var props = PropertiesService.getScriptProperties();
  
  for (var key in SECURITY_CONFIG) {
    var propKey = 'SECURITY_' + key;
    props.setProperty(propKey, String(SECURITY_CONFIG[key]));
  }
  
  Logger.log('[SecurityConfig] Configurazione resettata ai valori di default');
}