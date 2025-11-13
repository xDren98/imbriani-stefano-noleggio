/**
 * SERVIZIO NOTIFICHE TELEGRAM
 * 
 * Invia notifiche Telegram per nuove prenotazioni
 */

/**
 * Invia notifica Telegram per nuova prenotazione
 * @param {Object} pren - Dati prenotazione
 */
function inviaNotificaTelegram(pren) {
  try {
    var msg = [
      '🚐 NUOVA PRENOTAZIONE IN ATTESA',
      '',
      '📋 Riepilogo:',
      '🚗 Veicolo: ' + (pren.targa || '-'),
      '📅 Dal: ' + (pren.giornoInizio || '-') + ' ' + (pren.oraInizio || '-'),
      '📅 Al: ' + (pren.giornoFine || '-') + ' ' + (pren.oraFine || '-'),
      '📍 Destinazione: ' + (pren.destinazione || 'Non specificata'),
      '',
      '👤 Autista principale:',
      '👨‍💼 ' + (pren.autista1 && pren.autista1.nomeCompleto || '-'),
      '🆔 ' + (pren.autista1 && pren.autista1.codiceFiscale || '-'),
      '📱 ' + (pren.autista1 && pren.autista1.cellulare || '-'),
      '📧 ' + (pren.email || 'Non fornita'),
      '',
      '⏰ Ricevuta: ' + new Date().toLocaleString('it-IT'),
      '🔄 Stato: In attesa',
      '',
      'Accedi alla dashboard per confermare.'
    ].join('\n');
    
    var url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM.BOT_TOKEN + '/sendMessage';
    var payload = {
      chat_id: CONFIG.TELEGRAM.CHAT_ID,
      text: msg,
      parse_mode: 'Markdown'
    };
    
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
    
    Logger.log('[inviaNotificaTelegram] Notifica inviata per: ' + (pren.autista1 && pren.autista1.nomeCompleto));
  } catch(e) {
    Logger.log('[inviaNotificaTelegram] Errore: ' + (e && e.message));
  }
}

/**
 * Invia OTP admin via Telegram
 * @param {string} name - Nome admin
 * @param {string} code - Codice OTP
 */
function inviaOTPAdmin(name, code){
  try{
    var ttlMin = CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.OTP_TTL_MINUTES ? CONFIG.SECURITY.OTP_TTL_MINUTES : 5;
    var msg = [
      '🔐 OTP Admin — Imbriani Noleggio',
      '👤 ' + (name || 'Admin'),
      '🔢 OTP: ' + code,
      '⏳ Valido per ' + ttlMin + ' minuti'
    ].join('\n');
    var url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM.BOT_TOKEN + '/sendMessage';
    var payload = { chat_id: CONFIG.TELEGRAM.CHAT_ID, text: msg };
    var resp = UrlFetchApp.fetch(url, { method:'post', contentType:'application/json', payload: JSON.stringify(payload), muteHttpExceptions:true });
    var txt = resp.getContentText();
    try{
      var obj = JSON.parse(txt);
      if (obj && obj.ok && obj.result && obj.result.message_id){
        var chatId = obj.result.chat && obj.result.chat.id ? obj.result.chat.id : CONFIG.TELEGRAM.CHAT_ID;
        var key = 'OTPMSG:'+name;
        var existing = PropertiesService.getScriptProperties().getProperty(key);
        var data = null;
        try{ data = existing ? JSON.parse(existing) : null; }catch(_){ data = null; }
        if (data && data.chat_id && Array.isArray(data.message_ids)){
          data.message_ids.push(obj.result.message_id);
        } else {
          data = { chat_id: chatId, message_ids: [obj.result.message_id] };
        }
        PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(data));
      }
    }catch(_){ }
  }catch(e){ Logger.log('[inviaOTPAdmin] Errore: ' + (e && e.message)); }
}

function deleteTelegramMessage(chatId, messageId){
  try{
    var url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM.BOT_TOKEN + '/deleteMessage';
    var payload = { chat_id: chatId, message_id: messageId };
    UrlFetchApp.fetch(url, { method:'post', contentType:'application/json', payload: JSON.stringify(payload), muteHttpExceptions:true });
  }catch(e){ Logger.log('[deleteTelegramMessage] Errore: ' + (e && e.message)); }
}
