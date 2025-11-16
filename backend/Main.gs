/**
 * ENTRY POINT PRINCIPALE
 * 
 * Punto di ingresso per tutte le richieste HTTP
 * Delega la gestione agli endpoint specifici
 */

/**
 * Gestisce richieste GET
 * @param {Object e - Evento richiesta HTTP
 * @return {ContentService} Risposta JSON
 */
function doGet(e) {
  Logger.log('[doGet] Chiamata ricevuta: ' + JSON.stringify(e.parameter));
  // Verifica autorizzazione
  if (!isRequestAuthorized(e)) {
    Logger.log('[doGet] Accesso negato da IP/domino non autorizzato');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Accesso negato'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  try{ logAccess('GET', String(e&&e.parameter&&e.parameter.action||''), String(e&&e.parameter&&e.parameter.cfip||'')); }catch(_){ }
  return handleGet(e);
}

/**
 * Gestisce richieste POST
 * @param {Object} e - Evento richiesta HTTP con postData
 * @return {ContentService} Risposta JSON
 */
function doPost(e) {
  Logger.log('[doPost] Chiamata ricevuta');
  // Verifica autorizzazione
  if (!isRequestAuthorized(e)) {
    Logger.log('[doPost] Accesso negato da IP/domino non autorizzato');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Accesso negato'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  try{ logAccess('POST', String(e&&e.parameter&&e.parameter.action||''), String(e&&e.parameter&&e.parameter.cfip||'')); }catch(_){ }
  return handlePost(e);
}

/**
 * Verifica se la richiesta proviene da un IP/domino autorizzato
 * @param {Object} e - Evento richiesta HTTP
 * @return {boolean} true se la richiesta è autorizzata
 */
function isRequestAuthorized(e) {
  try {
    // Inizializza configurazione sicurezza se necessario
    initializeSecurityConfig();
    
    // Recupera configurazione di sicurezza
    var allowedIPs = getSecurityConfig('ALLOWED_IPS') || getProps().getProperty('ALLOWED_IPS');
    var allowedDomains = getSecurityConfig('ALLOWED_DOMAINS') || getProps().getProperty('ALLOWED_DOMAINS');
    
    // Se non sono configurati restrizioni, permetti tutto (default behavior)
    if (!allowedIPs && !allowedDomains) {
      return true;
    }
    
    // Recupera IP del client e referrer
    var userIP = e?.parameter?.userIp || '';
    var referrer = e?.parameter?.referrer || '';
    
    // Log per debug se abilitato
    if (getSecurityConfig('ENABLE_LOGGING')) {
      Logger.log('[isRequestAuthorized] Verifica accesso - IP: ' + userIP + ', Referrer: ' + referrer);
    }
    
    // Verifica IP autorizzati
    if (allowedIPs) {
      var ipList = allowedIPs.split(',').map(function(ip) { return ip.trim(); });
      if (ipList.indexOf(userIP) !== -1) {
        if (getSecurityConfig('ENABLE_LOGGING')) {
          Logger.log('[isRequestAuthorized] Accesso consentito per IP: ' + userIP);
        }
        return true;
      }
    }
    
    // Verifica domini autorizzati nel referrer
    if (allowedDomains && referrer) {
      var domainList = allowedDomains.split(',').map(function(domain) { return domain.trim(); });
      for (var i = 0; i < domainList.length; i++) {
        if (referrer.indexOf(domainList[i]) !== -1) {
          if (getSecurityConfig('ENABLE_LOGGING')) {
            Logger.log('[isRequestAuthorized] Accesso consentito per dominio: ' + domainList[i]);
          }
          return true;
        }
      }
    }
    
    if (getSecurityConfig('ENABLE_LOGGING')) {
      Logger.log('[isRequestAuthorized] Accesso negato - IP/domino non autorizzato');
    }
    return false;
  } catch (error) {
    Logger.log('[isRequestAuthorized] Errore nel controllo accesso: ' + error.message);
    return false;
  }
}
