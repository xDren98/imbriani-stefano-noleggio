/**
 * AUTENTICAZIONE E VALIDAZIONE TOKEN
 * 
 * Gestisce autenticazione utenti e validazione token
 */

/**
 * Valida il token di autenticazione
 * @param {string} token - Token da validare
 * @return {boolean} True se token valido
 */
function validateToken(token) {
  return token === CONFIG.TOKEN;
}

/**
 * Estrae il token di autenticazione dalla richiesta
 * Supporta: query param, Authorization header, POST body
 * @param {Object} e - Evento richiesta
 * @return {string|null} Token estratto o null
 */
function getAuthHeader(e) {
  // Token da query parameter
  if (e && e.parameter && e.parameter.token) {
    return String(e.parameter.token);
  }
  
  // Token da Authorization header
  if (e && e.parameter && e.parameter.Authorization) {
    return e.parameter.Authorization.replace('Bearer ', '');
  }
  
  // Token da POST body
  try {
    if (e && e.postData && e.postData.contents) {
      const payload = JSON.parse(e.postData.contents || '{}');
      if (payload.token) return String(payload.token);
      if (payload.AUTH_TOKEN) return String(payload.AUTH_TOKEN);
    }
  } catch (_) {}
  
  return null;
}

/**
 * Gestisce il login cliente tramite codice fiscale
 * @param {Object} post - Dati POST contenenti codiceFiscale
 * @return {ContentService} Risposta JSON con dati utente
 */
function handleLogin(post) {
  try {
    var cf = post.codiceFiscale;
    
    if (!cf || cf.length !== 16) {
      return createJsonResponse({
        success: false,
        message: 'Codice fiscale non valido (16 caratteri)'
      }, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.CLIENTI);
    var data = sh.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1]).trim() === cf) {
        return createJsonResponse({
          success: true,
          message: 'Login effettuato',
          user: {
            nome: row[CONFIG.CLIENTI_COLS.NOME - 1],
            codiceFiscale: row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1],
            dataNascita: row[CONFIG.CLIENTI_COLS.DATA_NASCITA - 1],
            dataNascitaFormatted: formatDateToItalian(row[CONFIG.CLIENTI_COLS.DATA_NASCITA - 1]),
            luogoNascita: row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA - 1],
            comuneResidenza: row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA - 1],
            viaResidenza: row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA - 1],
            civicoResidenza: row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA - 1],
            numeroPatente: row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE - 1],
            inizioValiditaPatente: row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE - 1],
            inizioValiditaPatenteFormatted: formatDateToItalian(row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE - 1]),
            scadenzaPatente: row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE - 1],
            scadenzaPatenteFormatted: formatDateToItalian(row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE - 1]),
            cellulare: row[CONFIG.CLIENTI_COLS.CELLULARE - 1],
            email: row[CONFIG.CLIENTI_COLS.EMAIL - 1]
          }
        });
      }
    }
    
    return createJsonResponse({
      success: false,
      message: 'Codice fiscale non trovato',
      requiresRegistration: true
    }, 404);
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore login: ' + err.message
    }, 500);
  }
}
