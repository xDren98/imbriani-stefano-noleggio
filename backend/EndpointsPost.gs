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
    
    // Login cliente non richiede token
    if (action === 'login') {
      dbg('[handlePost] Login richiesto - nessuna validazione token');
      return handleLogin(e); // Passa l'intera richiesta per compatibilità
    }

    // Richiesta OTP admin non richiede token
    if (action === 'requestAdminOTP') {
      dbg('[handlePost] Admin OTP richiesta - nessuna validazione token');
      var otpRes;
      try {
        // Usa implementazione principale se disponibile
        if (typeof issueAdminOTP === 'function') {
          otpRes = issueAdminOTP();
        } else {
          // Fallback difensivo: genera OTP e invia via Telegram se configurato
          dbg('[handlePost] issueAdminOTP non presente — uso fallback inline');
          var code = String(Math.floor(100000 + Math.random() * 900000));
          var ttlMin = (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.OTP_TTL_MINUTES) ? Number(CONFIG.SECURITY.OTP_TTL_MINUTES) : 5;
          var exp = Date.now() + (ttlMin * 60000);
          try {
            PropertiesService.getScriptProperties().setProperty('ADMIN_OTP', JSON.stringify({ code: code, expiresAt: exp }));
          } catch (propErr) {
            dbg('[handlePost] Fallback OTP: errore salvataggio proprietà — ' + String(propErr && propErr.message || propErr));
          }

          var delivery = 'log';
          try {
            if (CONFIG && CONFIG.TELEGRAM && CONFIG.TELEGRAM.BOT_TOKEN && CONFIG.TELEGRAM.CHAT_ID) {
              var url = 'https://api.telegram.org/bot' + String(CONFIG.TELEGRAM.BOT_TOKEN) + '/sendMessage';
              var msg = 'OTP Admin: ' + code + ' (valido ' + ttlMin + ' min)';
              UrlFetchApp.fetch(url, { method: 'post', payload: { chat_id: String(CONFIG.TELEGRAM.CHAT_ID), text: msg } });
              delivery = 'telegram';
            }
          } catch (tgErr) {
            dbg('[handlePost] Fallback OTP: invio Telegram fallito — ' + String(tgErr && tgErr.message || tgErr));
          }

          otpRes = { success: true, delivery: delivery };
          try {
            if (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.DEBUG_OTP) {
              otpRes.debugOtp = code;
            }
          } catch(_) {}
        }
      } catch (errOTP) {
        dbg('[handlePost] Errore fallback OTP: ' + String(errOTP && errOTP.message || errOTP));
        otpRes = { success: false, error: 'Errore generazione OTP', errorCode: 'OTP_ISSUE_ERROR' };
      }
      return createJsonResponse(otpRes, otpRes && otpRes.success ? 200 : 500);
    }

    // Login admin via OTP non richiede token
    if (action === 'adminLogin') {
      dbg('[handlePost] Admin login via OTP - nessuna validazione token');
      try {
        if (typeof handleAdminLogin === 'function') {
          return handleAdminLogin(e);
        }
        // Fallback inline se la funzione non è disponibile nel deploy
        dbg('[handlePost] handleAdminLogin non presente — uso fallback inline');
        var name = String((post && post.name) || (e && e.parameter && e.parameter.name) || '').trim();
        var otp = String((post && post.otp) || (e && e.parameter && e.parameter.otp) || '').trim();
        if (!name || !otp) {
          return createJsonResponse({ success:false, error:'Dati mancanti', errorCode:'MISSING_DATA' }, 400);
        }

        var allowed = ['Antonio','Beatrice','Stefano'];
        var normName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        if (allowed.indexOf(normName) === -1) {
          try { appendAuditLog({ event:'admin_login', action:'adminLogin', ok:false, userId:normName, role:'admin', details:'NAME_NOT_ALLOWED' }); } catch(_) {}
          return createJsonResponse({ success:false, error:'Admin non autorizzato', errorCode:'NAME_NOT_ALLOWED' }, 403);
        }

        // Valida OTP: usa funzione se presente, altrimenti leggi da Script Properties
        var isOtpValid = false;
        try {
          if (typeof validateAdminOTP === 'function') {
            isOtpValid = !!validateAdminOTP(otp);
          } else {
            var raw = PropertiesService.getScriptProperties().getProperty('ADMIN_OTP');
            if (raw) {
              var payload = JSON.parse(raw);
              if (payload && payload.code && payload.expiresAt) {
                isOtpValid = (Date.now() <= Number(payload.expiresAt)) && (String(payload.code) === String(otp));
              }
            }
          }
        } catch(_) { isOtpValid = false; }

        if (!isOtpValid) {
          try { appendAuditLog({ event:'admin_login', action:'adminLogin', ok:false, userId:normName, role:'admin', details:'OTP_INVALID' }); } catch(_){ }
          return createJsonResponse({ success:false, error:'OTP non valido o scaduto', errorCode:'OTP_INVALID' }, 401);
        }

        // Emissione sessione admin
        var sessionToken;
        try { sessionToken = createSessionToken(normName.toLowerCase()); }
        catch(_) { sessionToken = Utilities.getUuid(); }
        var ttlMin = (CONFIG.SECURITY && CONFIG.SECURITY.SESSION_TTL_MINUTES) ? CONFIG.SECURITY.SESSION_TTL_MINUTES : 60;
        var expMs = Date.now() + (ttlMin*60000);
        var ipBind = (e && e.parameter && (e.parameter.cfip || e.parameter['cf-connecting-ip'])) || null;
        var uaBind = (e && e.parameter && (e.parameter.ua || e.parameter['User-Agent'])) || null;
        try { registerSession({ token: sessionToken, userId: normName, role: 'admin', ip: ipBind, ua: uaBind, expiresAt: expMs }); } catch(_){ }
        try { appendAuditLog({ event:'admin_login', action:'adminLogin', ok:true, userId:normName, role:'admin', ip: ipBind, ua: uaBind, details:'SESSION_ISSUED' }); } catch(_){ }

        return createJsonResponse({ success:true, token: sessionToken, role:'admin', name: normName, exp: new Date(expMs).toISOString() });
      } catch(errLogin) {
        dbg('[handlePost] Errore fallback adminLogin: ' + String(errLogin && errLogin.message || errLogin));
        return createJsonResponse({ success:false, error:'Errore durante admin login', errorCode:'GENERIC_ERROR' }, 500);
      }
    }

    // Logout / Revoca sessione
    if (action === 'revokeSession' || action === 'logout') {
      dbg('[handlePost] Revoca sessione richiesta');
      try {
        var tok = finalToken || (post && post.token) || null;
        var ok = false;
        if (tok) {
          ok = revokeSession(String(tok), 'user_logout') === true;
        }
        return createJsonResponse({ success: true, revoked: !!ok });
      } catch(errLogout) {
        dbg('[handlePost] Errore revokeSession: ' + String(errLogout && errLogout.message || errLogout));
        return createJsonResponse({ success: false, error: 'Errore durante logout', errorCode: 'LOGOUT_ERROR' }, 500);
      }
    }

    // OCR ora richiede autenticazione (sessione cliente o admin)
    if (action === 'ocrDocument') {
      dbg('[handlePost] OCR richiesto - validazione token');
      if (!validateToken(finalToken, 'ocrDocument', e && e.parameter)) {
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
    if (!validateToken(finalToken, action, e && e.parameter)) {
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
