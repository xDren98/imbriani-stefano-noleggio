/**
 * GESTIONE ENDPOINT GET
 * 
 * Routing e gestione di tutte le richieste GET
 * Aggiornato per migliorare gestione errori e compatibilità frontend
 */

function handleGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = p.action || 'health';
  
  try {
    // Log per debugging
    dbg(`[handleGet] Richiesta ricevuta - Action: ${action}, Params: ${JSON.stringify(p)}`);
    
    // Endpoint pubblici (no autenticazione)
    if (action === 'version') {
      return createJsonResponse(versionInfo());
    }
    
    if (action === 'health') {
      return createJsonResponse({
        success: true,
        service: 'imbriani-backend',
        version: '2.0',
        timestamp: Date.now(),
        spreadsheet_id: CONFIG.SPREADSHEET_ID,
        sheets: ['PRENOTAZIONI', 'PULMINI', 'CLIENTI', 'MANUTENZIONI'],
        action: 'health_supported',
        message: 'Backend operativo'
      });
    }

    // Endpoint di diagnostica: restituisce info mascherate sull'autenticazione
    // Uso: GET?action=debugAuth&debug=1
    if (action === 'debugAuth') {
      var tokenDebug = getAuthHeader(e);
      var preview = tokenDebug ? String(tokenDebug).substring(0, 8) + '…' : null;
      var allowedTokens = (CONFIG && CONFIG.TOKENS) ? CONFIG.TOKENS : [CONFIG.TOKEN];
      var isAllowed = tokenDebug ? (allowedTokens.indexOf(String(tokenDebug).trim()) !== -1) : false;
      var sessionInfo = tokenDebug ? validateSession(String(tokenDebug).trim(), e && e.parameter) : null;
      return createJsonResponse({
        success: true,
        action: 'debugAuth',
        tokenPreview: preview,
        tokenPresent: !!tokenDebug,
        isAllowedToken: isAllowed,
        allowedTokensCount: Array.isArray(allowedTokens) ? allowedTokens.length : 1,
        sessionValid: !!(sessionInfo && sessionInfo.valid),
        sessionRole: sessionInfo && sessionInfo.role || null,
        sensitiveAction: typeof isSensitiveAction === 'function' ? !!isSensitiveAction(p.targetAction || '') : false,
        message: 'Diagnostica autenticazione (token mascherato)'
      });
    }
    
    // Validazione token per endpoint protetti
    var token = getAuthHeader(e);
    if (!validateToken(token, action, e && e.parameter)) {
      dbg(`[handleGet] Autenticazione fallita per azione: ${action}`);
      return createJsonResponse({
        success: false,
        message: 'Token non valido o mancante',
        errorCode: 'INVALID_TOKEN',
        code: 401
      }, 401);
    }
    
    // Routing endpoint protetti
    dbg('[handleGet] Action: ' + action);
    switch(action) {
      case 'getVeicoli':
        return getVeicoli();
      
      case 'getPrenotazioni':
        return getPrenotazioni();
      
      case 'checkDisponibilita':
        return checkDisponibilita(p);
      
      case 'bulkCheckDisponibilita':
        return bulkCheckDisponibilita(p);
      
      case 'firstAvailableSlot':
        return firstAvailableSlot(p);
      
      case 'updateStatiLive':
        return updateStatiLive();
      
      case 'getSheet':
        return getSheetGeneric(p);
      
      case 'sincronizzaClienti':
        return sincronizzaClienti();
      
      case 'checkReminders':
        return checkReminderEmails();
      
      case 'assegnaId':
        return assegnaIdPrenotazioniEsistenti();
      
      case 'notifyTest':
        var demo = {
          targa: 'TEST123',
          giornoInizio: new Date().toISOString().slice(0, 10),
          giornoFine: new Date().toISOString().slice(0, 10),
          oraInizio: '09:00',
          oraFine: '12:00',
          destinazione: 'Test Destinazione',
          autista1: {
            nomeCompleto: 'Mario Test',
            codiceFiscale: 'TSTMRA85M01H501Z',
            cellulare: '3330000000'
          },
          email: 'test@example.com'
        };
        inviaNotificaTelegram(demo);
        return createJsonResponse({
          success: true,
          message: 'Notifica Telegram inviata (test)'
        });
      
      case 'testEmail':
      case 'testEmailConferma':
        return testEmailConferma(p.to || 'melloanto@icloud.com');
      
      case 'testEmailReminder':
        return testEmailReminder(p.to || 'melloanto@icloud.com');
      
      case 'testEmailConfermaPreventivo':
        return testEmailConfermaPreventivo(p.to || 'melloanto@icloud.com');
      
      case 'censisciPDF':
        return censisciPDFEsistenti();
      
      default:
        return createJsonResponse({
          success: false,
          message: 'Azione non supportata: ' + action,
          errorCode: 'INVALID_ACTION'
        }, 400);
    }
  } catch(err) {
    dbg('[handleGet] Errore: ' + err.message);
    dbg('[handleGet] Stack: ' + err.stack);
    return createJsonResponse({
      success: false,
      message: 'Errore server: ' + err.message,
      errorCode: 'SERVER_ERROR'
    }, 500);
  }
}
