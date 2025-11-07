/**
 * GESTIONE ENDPOINT POST
 * 
 * Routing e gestione di tutte le richieste POST
 */

function handlePost(e) {
  try {
    var post = {};
    try {
      post = JSON.parse(e && e.postData ? (e.postData.contents || '{}') : '{}');
    } catch(_) {
      return createJsonResponse({
        success: false,
        message: 'Invalid JSON in request body'
      }, 400);
    }
    
    Logger.log('[handlePost] Payload: ' + JSON.stringify(post));
    var action = post.action || 'login';
    var finalToken = getAuthHeader(e);
    
    // Login non richiede token
    if (action === 'login') {
      return handleLogin(post, finalToken);
    }
    
    // Validazione token per altre azioni
    if (!validateToken(finalToken)) {
      Logger.log('[handlePost] Token non valido');
      return createJsonResponse({
        success: false,
        message: 'Token non valido',
        code: 401
      }, 401);
    }
    
    // Routing azioni protette
    Logger.log('[handlePost] Action: ' + action);
    switch(action) {
      case 'getPrenotazioni':
        return getPrenotazioni();
      
      case 'getVeicoli':
        return getVeicoli();
      
      case 'creaPrenotazione':
        return creaPrenotazione(post);
      
      case 'aggiornaStato':
        return aggiornaStatoPrenotazione(post);
      
      case 'aggiornaPrenotazione':
        return aggiornaPrenotazioneCompleta(post);
      
      case 'eliminaPrenotazione':
        return eliminaPrenotazione(post);
      
      case 'confermaPrenotazione':
        return confermaPrenotazione(post);
      
      case 'aggiornaCliente':
        return aggiornaCliente(post);
      
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
              message: 'setManutenzione non implementata'
            }, 400);
      
      default:
        return createJsonResponse({
          success: false,
          message: 'Azione POST non supportata: ' + action
        }, 400);
    }
  } catch(err) {
    Logger.log('[handlePost] Errore: ' + err.message);
    return createJsonResponse({
      success: false,
      message: 'Errore POST: ' + err.message
    }, 500);
  }
}
