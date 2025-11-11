/**
 * AUTENTICAZIONE E VALIDAZIONE TOKEN
 * 
 * Gestisce autenticazione utenti e validazione token con logging dettagliato
 * e gestione degli errori avanzata
 */

/**
 * Valida il token di autenticazione con logging dettagliato
 * @param {string} token - Token da validare
 * @param {string} action - Azione richiesta (per logging)
 * @return {boolean} True se token valido
 */
function validateToken(token, action = 'unknown') {
  if (!token) {
    Logger.log(`[AUTH] Token mancante per azione: ${action}`);
    return false;
  }
  
  if (token === CONFIG.TOKEN) {
    Logger.log(`[AUTH] Token valido per azione: ${action}`);
    return true;
  }
  
  Logger.log(`[AUTH] Token non valido per azione: ${action}. Token ricevuto: ${token.substring(0, 10)}...`);
  return false;
}

/**
 * Estrae il token di autenticazione dalla richiesta con gestione errori avanzata
 * Supporta: query param, Authorization header, POST body
 * @param {Object} e - Evento richiesta
 * @return {string|null} Token estratto o null
 */
function getAuthHeader(e) {
  try {
    if (!e) {
      Logger.log('[AUTH] Evento richiesta non valido');
      return null;
    }
    
    // Token da query parameter
    if (e.parameter && e.parameter.token) {
      const token = String(e.parameter.token).trim();
      Logger.log(`[AUTH] Token trovato in query parameter: ${token.substring(0, 10)}...`);
      return token;
    }
    
    // Token da Authorization header (nel parameter per Google Apps Script)
    if (e.parameter && e.parameter.Authorization) {
      const authHeader = String(e.parameter.Authorization);
      const token = authHeader.replace('Bearer ', '').trim();
      Logger.log(`[AUTH] Token trovato in Authorization header: ${token.substring(0, 10)}...`);
      return token;
    }
    
    // Token da POST body
    if (e.postData && e.postData.contents) {
      try {
        const payload = JSON.parse(e.postData.contents || '{}');
        if (payload.token) {
          const token = String(payload.token).trim();
          Logger.log(`[AUTH] Token trovato in POST body (token): ${token.substring(0, 10)}...`);
          return token;
        }
        if (payload.AUTH_TOKEN) {
          const token = String(payload.AUTH_TOKEN).trim();
          Logger.log(`[AUTH] Token trovato in POST body (AUTH_TOKEN): ${token.substring(0, 10)}...`);
          return token;
        }
      } catch (parseError) {
        Logger.log(`[AUTH] Errore parsing JSON POST body: ${parseError.message}`);
      }
    }
    
    Logger.log('[AUTH] Nessun token trovato nella richiesta');
    return null;
  } catch (error) {
    Logger.log(`[AUTH] Errore generico estrazione token: ${error.message}`);
    return null;
  }
}

/**
 * Gestione avanzata della sessione utente
 */

/**
 * Crea un token di sessione sicuro
 * @param {string} userId - ID utente
 * @return {string} Token di sessione
 */
function createSessionToken(userId) {
  var timestamp = new Date().getTime();
  var random = Math.random().toString(36).substring(2, 15);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 
    `${userId}_${timestamp}_${random}_${CONFIG.TOKEN}`)
    .map(function(byte) {
      return (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0');
    }).join('');
}

/**
 * Valida la sessione utente (placeholder per futura implementazione)
 * @param {string} sessionToken - Token di sessione
 * @return {Object|null} Dati sessione o null
 */
function validateSession(sessionToken) {
  // Placeholder per futura implementazione con PropertiesService o Database
  // Per ora usa il token statico per compatibilità
  if (sessionToken === CONFIG.TOKEN) {
    return { valid: true, userId: 'admin' };
  }
  return null;
}

/**
 * Registra tentativi di login falliti per rate limiting
 * @param {string} identifier - Identificativo (CF o IP)
 * @param {boolean} success - Esito del tentativo
 * @param {string} error - Dettagli errore (opzionale)
 */
function logLoginAttempt(identifier, success, error = null) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp: timestamp,
      identifier: identifier,
      success: success,
      error: error,
      ip: 'unknown' // In Google Apps Script non è facile ottenere l'IP reale
    };
    
    console.log(`[LOGIN_ATTEMPT] ${success ? 'SUCCESS' : 'FAILED'} - ${identifier} - ${error || 'OK'}`);
    
    // Se il tentativo è fallito, aggiorna il contatore
    if (!success) {
      const propertyKey = `rate_limit_${identifier}`;
      const now = Date.now();
      
      // Ottieni tentativi precedenti
      const attemptsData = PropertiesService.getScriptProperties().getProperty(propertyKey);
      let attempts = [];
      
      if (attemptsData) {
        attempts = JSON.parse(attemptsData);
      }
      
      // Aggiungi nuovo tentativo fallito
      attempts.push(now);
      
      // Mantieni solo gli ultimi 10 tentativi per non riempire la memoria
      if (attempts.length > 10) {
        attempts = attempts.slice(-10);
      }
      
      // Salva aggiornamento
      PropertiesService.getScriptProperties().setProperty(propertyKey, JSON.stringify(attempts));
      
      console.log(`[LOGIN_ATTEMPT] Tentativo fallito registrato per ${identifier}. Totale: ${attempts.length}`);
    }
    
  } catch (logError) {
    console.error('[LOGIN_ATTEMPT] Errore nel logging:', logError);
  }
}

/**
 * Controlla se l'utente è bloccato per troppi tentativi falliti
 * @param {string} identifier - Identificativo utente (IP o CF)
 * @return {Object} Stato del blocco
 */
function checkRateLimit(identifier) {
  try {
    const maxAttempts = 5; // Max 5 tentativi
    const timeWindow = 15 * 60 * 1000; // 15 minuti
    const blockDuration = 30 * 60 * 1000; // 30 minuti di blocco
    
    const now = Date.now();
    const propertyKey = `rate_limit_${identifier}`;
    const blockKey = `blocked_${identifier}`;
    
    // Controlla se l'utente è attualmente bloccato
    const blockedUntil = PropertiesService.getScriptProperties().getProperty(blockKey);
    if (blockedUntil && parseInt(blockedUntil) > now) {
      Logger.log(`[RATE_LIMIT] Utente ${identifier} ancora bloccato fino a ${new Date(parseInt(blockedUntil)).toISOString()}`);
      return { blocked: true, attempts: maxAttempts, maxAttempts: maxAttempts, remainingAttempts: 0 };
    }
    
    // Se era bloccato ma il blocco è scaduto, pulisci
    if (blockedUntil && parseInt(blockedUntil) <= now) {
      PropertiesService.getScriptProperties().deleteProperty(blockKey);
      PropertiesService.getScriptProperties().deleteProperty(propertyKey);
    }
    
    // Ottieni storico tentativi
    const attemptsData = PropertiesService.getScriptProperties().getProperty(propertyKey);
    if (!attemptsData) {
      return { blocked: false, attempts: 0, maxAttempts: maxAttempts, remainingAttempts: maxAttempts };
    }
    
    const attempts = JSON.parse(attemptsData);
    const recentAttempts = attempts.filter(timestamp => now - timestamp < timeWindow);
    
    if (recentAttempts.length >= maxAttempts) {
      // Blocca l'utente
      const blockUntil = now + blockDuration;
      PropertiesService.getScriptProperties().setProperty(blockKey, blockUntil.toString());
      
      Logger.log(`[RATE_LIMIT] Utente ${identifier} bloccato per ${blockDuration/60000} minuti. Tentativi: ${recentAttempts.length}`);
      return { blocked: true, attempts: recentAttempts.length, maxAttempts: maxAttempts, remainingAttempts: 0 };
    }
    
    return { blocked: false, attempts: recentAttempts.length, maxAttempts: maxAttempts, remainingAttempts: maxAttempts - recentAttempts.length };
  } catch (error) {
    Logger.log(`[RATE_LIMIT] Errore nel controllo rate limit: ${error.message}`);
    return { blocked: false, attempts: 0, maxAttempts: 5, remainingAttempts: 5 };
  }
}

/**
 * � Resetta i tentativi falliti per un utente (dopo login riuscito)
 * @param {string} identifier - Identificativo utente (IP o CF)
 */
function resetFailedAttempts(identifier) {
  try {
    const propertyKey = `rate_limit_${identifier}`;
    const blockKey = `blocked_${identifier}`;
    
    PropertiesService.getScriptProperties().deleteProperty(propertyKey);
    PropertiesService.getScriptProperties().deleteProperty(blockKey);
    
    Logger.log(`[RATE_LIMIT] Tentativi resettati per utente: ${identifier}`);
  } catch (error) {
    Logger.log(`[RATE_LIMIT] Errore nel reset tentativi: ${error.message}`);
  }
}

/**
 * �� Gestisce il login del client con rate limiting
 * @param {Object} request - Richiesta HTTP
 * @returns {TextOutput} Risposta JSON
 */
function handleLogin(request) {
  console.log('[LOGIN] Nuovo tentativo di login');
  
  try {
    // Supporta JSON body e fallback ai parametri di query
    let postData = null;
    try {
      postData = (request && request.postData && request.postData.contents)
        ? JSON.parse(request.postData.contents)
        : null;
    } catch(parseError) {
      // Logga ma continua: il login può arrivare anche via parametri
      Logger.log(`[LOGIN] Errore parsing JSON nel body: ${parseError.message}`);
      postData = null;
    }

    const cfRaw = (postData && (postData.cf || postData.codiceFiscale))
      || (request && request.parameter && (request.parameter.cf || request.parameter.codiceFiscale));
    
    if (!cfRaw) {
      console.warn('[LOGIN] Dati mancanti (cf/codiceFiscale non presente)');
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Dati mancanti', errorCode: 'MISSING_DATA' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const cf = String(cfRaw).toUpperCase().trim();
    console.log(`[LOGIN] Tentativo login per CF: ${cf}`);
    
    // Controlla rate limiting (usa CF come identificatore)
    const rateLimitStatus = checkRateLimit(cf);
    if (rateLimitStatus.blocked) {
      console.warn(`[LOGIN] Rate limit superato per CF: ${cf}`);
      return ContentService.createTextOutput(
        JSON.stringify({ 
          success: false, 
          error: `Troppi tentativi falliti. Riprova tra ${30} minuti.`, 
          errorCode: 'RATE_LIMIT_EXCEEDED',
          remainingAttempts: 0,
          blockedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Valida formato CF
    if (cf.length !== 16) {
      console.warn(`[LOGIN] CF non valido (lunghezza errata): ${cf}`);
      logLoginAttempt(cf, false, 'CF lunghezza errata');
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Codice fiscale non valido', errorCode: 'INVALID_CF_FORMAT' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Regex per CF italiano valido
    const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    if (!cfRegex.test(cf)) {
      console.warn(`[LOGIN] CF non valido (formato errato): ${cf}`);
      logLoginAttempt(cf, false, 'CF formato errato');
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Codice fiscale non valido', errorCode: 'INVALID_CF_FORMAT' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Trova utente nel database
    // Usa openById per garantire l'accesso al file corretto anche come Web App
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('CLIENTI');
    if (!sheet) {
      console.error('[LOGIN] Foglio CLIENTI non trovato');
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Errore database', errorCode: 'DB_ERROR' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    // Ricerca robusta della colonna CF: considera varianti e normalizza
    const normalize = function(h) { return String(h || '').trim().toUpperCase().replace(/\s+/g,'').replace(/_/g,''); };
    let cfIndex = headers.indexOf('CODICE FISCALE');
    if (cfIndex === -1) {
      // Fallback su varianti comuni
      for (let i = 0; i < headers.length; i++) {
        const nh = normalize(headers[i]);
        if (nh === 'CODICEFISCALE' || nh === 'CF') {
          cfIndex = i;
          break;
        }
      }
    }
    
    if (cfIndex === -1) {
      console.error('[LOGIN] Colonna CODICE FISCALE non trovata');
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Errore database', errorCode: 'DB_ERROR' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    let userFound = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][cfIndex] === cf) {
        userFound = data[i];
        break;
      }
    }

    if (!userFound) {
      console.warn(`[LOGIN] Utente non trovato: ${cf}`);
      logLoginAttempt(cf, false, 'Utente non trovato');
      return ContentService.createTextOutput(
        JSON.stringify({ 
          success: false, 
          error: 'Utente non trovato', 
          errorCode: 'USER_NOT_FOUND',
          remainingAttempts: rateLimitStatus.remainingAttempts
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Crea sessione
    // Crea i dati utente - CORRETTO: usa 'codiceFiscale' invece di 'cf'
    const idxNome = (function(){
      const direct = headers.indexOf('NOME');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'NOME') return i;
      return -1;
    })();
    const idxCognome = (function(){
      const direct = headers.indexOf('COGNOME');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'COGNOME') return i;
      return -1;
    })();
    const idxEmail = (function(){
      const direct = headers.indexOf('EMAIL');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'EMAIL') return i;
      return -1;
    })();
    const idxTelefono = (function(){
      const direct = headers.indexOf('TELEFONO');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'TELEFONO') return i;
      return -1;
    })();
    const idxIndirizzo = (function(){
      const direct = headers.indexOf('INDIRIZZO');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'INDIRIZZO') return i;
      return -1;
    })();

    // Campi aggiuntivi profilo cliente
    const idxCellulare = (function(){
      const direct = headers.indexOf('CELLULARE');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) {
        const nh = normalize(headers[i]);
        if (nh === 'CELLULARE' || nh === 'TELEFONO') return i;
      }
      return -1;
    })();
    const idxDataNascita = (function(){
      const direct = headers.indexOf('DATA NASCITA');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) {
        const nh = normalize(headers[i]);
        if (nh === 'DATANASCITA') return i;
      }
      return -1;
    })();
    const idxLuogoNascita = (function(){
      const direct = headers.indexOf('LUOGO NASCITA');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'LUOGONASCITA') return i;
      return -1;
    })();
    const idxComuneResidenza = (function(){
      const direct = headers.indexOf('COMUNE RESIDENZA');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'COMUNERESIDENZA') return i;
      return -1;
    })();
    const idxViaResidenza = (function(){
      const direct = headers.indexOf('VIA RESIDENZA');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'VIARESIDENZA') return i;
      return -1;
    })();
    const idxCivicoResidenza = (function(){
      const direct = headers.indexOf('CIVICO RESIDENZA');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'CIVICORESIDENZA') return i;
      return -1;
    })();
    const idxNumeroPatente = (function(){
      const direct = headers.indexOf('NUMERO PATENTE');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'NUMEROPATENTE') return i;
      return -1;
    })();
    const idxInizioPatente = (function(){
      const direct = headers.indexOf('DATA INIZIO PATENTE');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) {
        const nh = normalize(headers[i]);
        if (nh === 'DATAINIZIOPATENTE' || nh === 'INIZIOVALIDITAPATENTE' || nh === 'INIZIOPATENTE') return i;
      }
      return -1;
    })();
    const idxScadenzaPatente = (function(){
      const direct = headers.indexOf('SCADENZA PATENTE');
      if (direct !== -1) return direct;
      for (let i = 0; i < headers.length; i++) if (normalize(headers[i]) === 'SCADENZAPATENTE') return i;
      return -1;
    })();

    const nomeVal = idxNome !== -1 ? userFound[idxNome] : '';
    const cognomeVal = idxCognome !== -1 ? userFound[idxCognome] : '';
    const dataNascVal = idxDataNascita !== -1 ? userFound[idxDataNascita] : '';
    const inizioPatVal = idxInizioPatente !== -1 ? userFound[idxInizioPatente] : '';
    const scadenzaPatVal = idxScadenzaPatente !== -1 ? userFound[idxScadenzaPatente] : '';

    const userData = {
      codiceFiscale: cf,
      nome: nomeVal,
      cognome: cognomeVal,
      nomeCompleto: String((nomeVal || '') + ' ' + (cognomeVal || '')).trim(),
      email: idxEmail !== -1 ? userFound[idxEmail] : '',
      telefono: idxTelefono !== -1 ? userFound[idxTelefono] : '',
      cellulare: idxCellulare !== -1 ? userFound[idxCellulare] : (idxTelefono !== -1 ? userFound[idxTelefono] : ''),
      indirizzo: idxIndirizzo !== -1 ? userFound[idxIndirizzo] : '',
      dataNascita: dataNascVal || '',
      dataNascitaFormatted: dataNascVal ? formatDateToItalian(dataNascVal) : '',
      luogoNascita: idxLuogoNascita !== -1 ? userFound[idxLuogoNascita] : '',
      comuneResidenza: idxComuneResidenza !== -1 ? userFound[idxComuneResidenza] : '',
      viaResidenza: idxViaResidenza !== -1 ? userFound[idxViaResidenza] : '',
      civicoResidenza: idxCivicoResidenza !== -1 ? userFound[idxCivicoResidenza] : '',
      numeroPatente: idxNumeroPatente !== -1 ? userFound[idxNumeroPatente] : '',
      inizioValiditaPatente: inizioPatVal || '',
      inizioValiditaPatenteFormatted: inizioPatVal ? formatDateToItalian(inizioPatVal) : '',
      scadenzaPatente: scadenzaPatVal || '',
      scadenzaPatenteFormatted: scadenzaPatVal ? formatDateToItalian(scadenzaPatVal) : ''
    };

    console.log(`[LOGIN] Login riuscito per CF: ${cf}`);
    
    // Log tentativo riuscito e resetta contatore tentativi falliti
    logLoginAttempt(cf, true, null);
    resetFailedAttempts(cf);

    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: true, 
        user: userData,
        token: createSessionToken(cf)
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('[LOGIN] Errore durante il login:', error);
    
    // Log tentativo fallito
    if (postData && postData.cf) {
      logLoginAttempt(postData.cf, false, error.message);
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Errore durante il login', errorCode: 'GENERIC_ERROR' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Genera token pubblico per compilazione autisti.
 * Token include scadenza ed è firmato con HMAC-SHA256 usando CONFIG.TOKEN.
 * @param {string} idPrenotazione
 * @param {number} ttlHours - durata in ore (default 168 = 7 giorni)
 * @return {string} token nel formato "expMs.hexSignature"
 */
function generateDriverToken(idPrenotazione, ttlHours) {
  try {
    if (!idPrenotazione) throw new Error('ID prenotazione mancante');
    var hours = (ttlHours && ttlHours > 0) ? ttlHours : 168;
    var exp = Date.now() + (hours * 60 * 60 * 1000);
    var message = idPrenotazione + '|' + exp;
    var signature = Utilities.computeHmacSha256Signature(message, CONFIG.TOKEN);
    var hex = signature.map(function(b){ return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join('');
    return exp + '.' + hex;
  } catch(err) {
    Logger.log('[generateDriverToken] Errore: ' + err.message);
    return null;
  }
}

/**
 * Valida token pubblico per compilazione autisti.
 * Verifica scadenza e firma HMAC basata su CONFIG.TOKEN.
 * @param {string} idPrenotazione
 * @param {string} token - formato "expMs.hexSignature"
 * @return {boolean} true se valido
 */
function validateDriverToken(idPrenotazione, token) {
  try {
    if (!idPrenotazione || !token) return false;
    var parts = String(token).split('.');
    if (parts.length !== 2) return false;
    var exp = Number(parts[0]);
    var sig = String(parts[1]);
    if (!exp || !sig) return false;
    if (Date.now() > exp) {
      Logger.log('[validateDriverToken] Token scaduto');
      return false;
    }
    var message = idPrenotazione + '|' + exp;
    var expected = Utilities.computeHmacSha256Signature(message, CONFIG.TOKEN)
      .map(function(b){ return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join('');
    return expected === sig;
  } catch(err) {
    Logger.log('[validateDriverToken] Errore: ' + err.message);
    return false;
  }
}
