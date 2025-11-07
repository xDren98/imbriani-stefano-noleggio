/**
 * GESTIONE ENDPOINT GET
 * 
 * Routing e gestione di tutte le richieste GET
 */

function handleGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = p.action || 'health';
  
  try {
    // Endpoint pubblici (no autenticazione)
    if (action === 'version') {
      return ContentService
        .createTextOutput(JSON.stringify(versionInfo()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'health') {
      return createJsonResponse({
        success: true,
        service: 'imbriani-backend',
        spreadsheet_id: CONFIG.SPREADSHEET_ID,
        sheets: ['PRENOTAZIONI', 'PULMINI', 'CLIENTI', 'MANUTENZIONI'],
        action: 'health_supported'
      });
    }
    
    // Validazione token per endpoint protetti
    var token = getAuthHeader(e);
    if (!validateToken(token)) {
      Logger.log('[handleGet] Token non valido');
      return createJsonResponse({
        success: false,
        message: 'Token non valido',
        code: 401
      }, 401);
    }
    
    // Routing endpoint protetti
    Logger.log('[handleGet] Action: ' + action);
    switch(action) {
      case 'getVeicoli':
        return getVeicoli();
      
      case 'getPrenotazioni':
        return getPrenotazioni();
      
      case 'checkDisponibilita':
        return checkDisponibilita(p);
      
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
          message: 'Azione non supportata: ' + action
        }, 400);
    }
  } catch(err) {
    Logger.log('[handleGet] Errore: ' + err.message);
    return createJsonResponse({
      success: false,
      message: 'Errore server: ' + err.message
    }, 500);
  }
}
