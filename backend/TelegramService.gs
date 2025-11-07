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
