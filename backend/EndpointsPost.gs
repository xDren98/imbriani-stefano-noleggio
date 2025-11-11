/**
 * GESTIONE ENDPOINT POST
 * 
 * Routing e gestione di tutte le richieste POST
 * Aggiornato per migliorare gestione errori e compatibilità frontend
 */

function handlePost(e) {
  try {
    var post = {};
    try {
      post = JSON.parse(e && e.postData ? (e.postData.contents || '{}') : '{}');
    } catch(parseError) {
      dbg(`[handlePost] Errore parsing JSON: ${parseError.message}`);
      return createJsonResponse({
        success: false,
        message: 'JSON invalido nel body della richiesta',
        errorCode: 'INVALID_JSON'
      }, 400);
    }
    
    dbg(`[handlePost] Payload ricevuto: ${JSON.stringify(post)}`);
    var action = post.action || 'login';
    var finalToken = getAuthHeader(e);
    
    // Log dettagliato per debugging
    dbg(`[handlePost] Action: ${action}, Token presente: ${!!finalToken}`);
    
    // Login non richiede token
    if (action === 'login') {
      dbg('[handlePost] Login richiesto - nessuna validazione token');
      return handleLogin(e); // Passa l'intera richiesta per compatibilità
    }
    
    // OCR ora richiede autenticazione (sessione cliente o admin)
    if (action === 'ocrDocument') {
      dbg('[handlePost] OCR richiesto - validazione token');
      if (!validateToken(finalToken, 'ocrDocument')) {
        return createJsonResponse({
          success: false,
          message: 'Token non valido o mancante',
          errorCode: 'INVALID_TOKEN'
        }, 401);
      }
      return ocrDocument(post);
    }
    
    // Aggiornamento autisti pubblico con token limitato
    if (action === 'aggiornaAutistiPubblico') {
      dbg('[handlePost] aggiornaAutistiPubblico richiesto - validazione token autisti');
      var idPub = post.idPrenotazione || (post.prenotazione && post.prenotazione.idPrenotazione) || null;
      // Preferisci 't' rispetto a 'token' per non interferire con AUTH_TOKEN globale
      var tokPub = post.t || post.token || null;
      if (!idPub || !tokPub) {
        return createJsonResponse({ success: false, message: 'Parametri mancanti', errorCode: 'MISSING_PARAMS' }, 400);
      }
      var isValidPub = validateDriverToken(String(idPub), String(tokPub));
      if (!isValidPub) {
        return createJsonResponse({ success: false, message: 'Token non valido o scaduto', errorCode: 'INVALID_PUBLIC_TOKEN' }, 401);
      }
      return aggiornaAutistiPubblico(post);
    }
    
    // Validazione token per altre azioni
    if (!validateToken(finalToken)) {
      dbg(`[handlePost] Token non valido: ${finalToken}`);
      return createJsonResponse({
        success: false,
        message: 'Token non valido o mancante',
        errorCode: 'INVALID_TOKEN',
        code: 401
      }, 401);
    }
    
    // Routing azioni protette
    dbg(`[handlePost] Routing azione: ${action}`);
    switch(action) {
      case 'getPrenotazioni':
        return getPrenotazioni();
      case 'getVeicoli':
        return getVeicoli();
      case 'getCliente':
        return getCliente(post);
      case 'creaPrenotazione':
        return creaPrenotazione(post);
      case 'importaPrenotazioniICS':
        return (typeof importaPrenotazioniICS === 'function')
          ? importaPrenotazioniICS(post)
          : createJsonResponse({ success: false, message: 'importaPrenotazioniICS non implementata', errorCode: 'NOT_IMPLEMENTED' }, 400);
      case 'importaPrenotazioniCSV':
        return (typeof importaPrenotazioniCSV === 'function')
          ? importaPrenotazioniCSV(post)
          : createJsonResponse({ success: false, message: 'importaPrenotazioniCSV non implementata', errorCode: 'NOT_IMPLEMENTED' }, 400);
      case 'aggiornaStato':
        return aggiornaStatoPrenotazione(post);
      case 'aggiornaPrenotazione':
        return aggiornaPrenotazioneCompleta(post);
      // ✅ Alias esplicito per compatibilità con frontend (admin)
      case 'aggiornaPrenotazioneCompleta':
        return aggiornaPrenotazioneCompleta(post);
      case 'generaTokenAutisti':
        var genTok = generateDriverToken(String(post.idPrenotazione || ''), Number(post.ttlHours || 168));
        return createJsonResponse({ success: !!genTok, token: genTok || null, message: genTok ? 'Token generato' : 'Impossibile generare token' }, genTok ? 200 : 400);
      case 'eliminaPrenotazione':
        return eliminaPrenotazione(post);
      case 'confermaPrenotazione':
        return confermaPrenotazione(post);
      case 'aggiornaCliente':
        return aggiornaCliente(post);
      case 'creaCliente':
        return creaCliente(post);
      case 'sincronizzaClienti':
        return sincronizzaClienti();
      case 'checkReminders':
        return checkReminderEmails();
      case 'assegnaId':
        return assegnaIdPrenotazioniEsistenti();
      case 'setManutenzione':
        return (typeof setManutenzione === 'function') 
          ? setManutenzione(post) 
          : createJsonResponse({
              success: false,
              message: 'setManutenzione non implementata',
              errorCode: 'NOT_IMPLEMENTED'
            }, 400);
      case 'setVeicolo':
        return (typeof setVeicolo === 'function')
          ? setVeicolo(post)
          : createJsonResponse({
              success: false,
              message: 'setVeicolo non implementata',
              errorCode: 'NOT_IMPLEMENTED'
            }, 400);
      case 'eliminaVeicolo':
        return (typeof eliminaVeicolo === 'function')
          ? eliminaVeicolo(post)
          : createJsonResponse({
              success: false,
              message: 'eliminaVeicolo non implementata',
              errorCode: 'NOT_IMPLEMENTED'
            }, 400);
      default:
        return createJsonResponse({
          success: false,
          message: 'Azione POST non supportata: ' + action,
          errorCode: 'INVALID_ACTION'
        }, 400);
    }
  } catch(err) {
    dbg(`[handlePost] Errore generale: ${err.message}`);
    dbg(`[handlePost] Stack trace: ${err.stack}`);
    return createJsonResponse({
      success: false,
      message: 'Errore server durante processing richiesta: ' + err.message,
      errorCode: 'SERVER_ERROR'
    }, 500);
  }
}
