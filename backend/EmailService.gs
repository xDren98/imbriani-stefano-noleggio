/**
 * SERVIZIO INVIO EMAIL
 * 
 * Gestisce invio email (conferma, reminder, approvazione)
 */

/**
 * Invia email di conferma ricezione prenotazione al cliente
 * @param {Object} prenotazione - Dati prenotazione
 */
function inviaEmailConfermaCliente(prenotazione) {
  try {
    var html = UrlFetchApp.fetch('https://raw.githubusercontent.com/xDren98/imbriani-stefano-noleggio/main/email-template-conferma.html').getContentText();
    
    html = html.replace('{{ID_PRENOTAZIONE}}', prenotazione.idPrenotazione || 'N/A')
               .replace('{{TARGA}}', prenotazione.targa || 'N/A')
               .replace('{{MODELLO}}', prenotazione.modello || '')
               .replace('{{GIORNO_INIZIO}}', prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : '')
               .replace('{{GIORNO_FINE}}', prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : '')
               .replace('{{ORA_INIZIO}}', prenotazione.oraInizio || '')
               .replace('{{ORA_FINE}}', prenotazione.oraFine || '')
               .replace('{{DESTINAZIONE}}', prenotazione.destinazione || '---')
               .replace('{{AUTISTA_NOME}}', prenotazione.autista1 && prenotazione.autista1.nomeCompleto ? prenotazione.autista1.nomeCompleto : 'Cliente');
    
    MailApp.sendEmail({
      to: prenotazione.email,
      subject: 'Conferma Prenotazione - Imbriani Stefano Noleggio',
      htmlBody: html,
      name: CONFIG.EMAIL.FROM_NAME
    });
    
    Logger.log('[inviaEmailConfermaCliente] Email inviata a: ' + prenotazione.email);
  } catch (error) {
    Logger.log('[inviaEmailConfermaCliente] Errore: ' + error.message);
  }
}

/**
 * Invia email di approvazione preventivo al cliente
 * @param {Object} prenotazione - Dati prenotazione
 */
function inviaEmailConfermaPreventivo(prenotazione) {
  try {
    var html = UrlFetchApp.fetch('https://raw.githubusercontent.com/xDren98/imbriani-stefano-noleggio/main/email-template-approvazione.html').getContentText();
    
    html = html.replace('{{ID_PRENOTAZIONE}}', prenotazione.idPrenotazione || 'N/A')
               .replace('{{TARGA}}', prenotazione.targa || 'N/A')
               .replace('{{MODELLO}}', prenotazione.modello || '')
               .replace('{{GIORNO_INIZIO}}', prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : '')
               .replace('{{GIORNO_FINE}}', prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : '')
               .replace('{{ORA_INIZIO}}', prenotazione.oraInizio || '')
               .replace('{{ORA_FINE}}', prenotazione.oraFine || '')
               .replace('{{DESTINAZIONE}}', prenotazione.destinazione || '---')
               .replace('{{AUTISTA_NOME}}', prenotazione.autista1 && prenotazione.autista1.nomeCompleto ? prenotazione.autista1.nomeCompleto : 'Cliente');
    
    MailApp.sendEmail({
      to: prenotazione.email,
      subject: 'Prenotazione Confermata - Imbriani Stefano Noleggio',
      htmlBody: html,
      name: CONFIG.EMAIL.FROM_NAME
    });
    
    Logger.log('[inviaEmailConfermaPreventivo] Email inviata a: ' + prenotazione.email);
  } catch (error) {
    Logger.log('[inviaEmailConfermaPreventivo] Errore: ' + error.message);
  }
}

/**
 * Invia email reminder 3 giorni prima della partenza
 * @param {Object} prenotazione - Dati prenotazione
 */
function inviaEmailReminder(prenotazione) {
  try {
    var html = UrlFetchApp.fetch('https://raw.githubusercontent.com/xDren98/imbriani-stefano-noleggio/main/email-template-reminder.html').getContentText();
    
    html = html.replace('{{ID_PRENOTAZIONE}}', prenotazione.idPrenotazione || 'N/A')
               .replace('{{TARGA}}', prenotazione.targa || 'N/A')
               .replace('{{MODELLO}}', prenotazione.modello || '')
               .replace('{{GIORNO_INIZIO}}', prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : '')
               .replace('{{GIORNO_FINE}}', prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : '')
               .replace('{{ORA_INIZIO}}', prenotazione.oraInizio || '')
               .replace('{{ORA_FINE}}', prenotazione.oraFine || '')
               .replace('{{DESTINAZIONE}}', prenotazione.destinazione || '---')
               .replace('{{AUTISTA_NOME}}', prenotazione.autista1 && prenotazione.autista1.nomeCompleto ? prenotazione.autista1.nomeCompleto : 'Cliente');
    
    MailApp.sendEmail({
      to: prenotazione.email,
      subject: 'Promemoria Partenza - Imbriani Stefano Noleggio',
      htmlBody: html,
      name: CONFIG.EMAIL.FROM_NAME
    });
    
    Logger.log('[inviaEmailReminder] Email inviata a: ' + prenotazione.email);
  } catch (error) {
    Logger.log('[inviaEmailReminder] Errore: ' + error.message);
  }
}

/**
 * Controlla prenotazioni e invia reminder 3 giorni prima
 * @return {ContentService} Risposta JSON con numero email inviate
 */
function checkReminderEmails() {
  try {
    var oggi = new Date();
    var treGiorni = new Date(oggi.getTime() + (3 * 24 * 60 * 60 * 1000));
    var y = treGiorni.getFullYear();
    var m = String(treGiorni.getMonth() + 1).padStart(2, '0');
    var d = String(treGiorni.getDate()).padStart(2, '0');
    var treGiorniStr = y + '-' + m + '-' + d;
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var sent = 0;
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stato = String(row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '');
      var dataInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var email = row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1];
      
      if (stato === 'Confermata' && email && dataInizio) {
        var di = (dataInizio instanceof Date) ? dataInizio : parseItalianOrISO(dataInizio);
        var diStr = di.getFullYear() + '-' + String(di.getMonth() + 1).padStart(2, '0') + '-' + String(di.getDate()).padStart(2, '0');
        
        if (diStr === treGiorniStr) {
          var prenotazione = {
            idPrenotazione: row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1],
            targa: row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1],
            giornoInizio: dataInizio,
            giornoFine: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1],
            oraInizio: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1],
            oraFine: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1],
            destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1],
            email: email,
            autista1: { nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] }
          };
          
          try {
            inviaEmailReminder(prenotazione);
            sent++;
          } catch (e) {
            Logger.log('[checkReminderEmails] Errore invio email a ' + email + ': ' + e.message);
          }
        }
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'Check reminder completato',
      emailInviate: sent
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Errore check reminder: ' + err.message
    }, 500);
  }
}

/**
 * Test email conferma cliente
 * @param {string} email - Email destinatario test
 * @return {ContentService} Risposta JSON
 */
function testEmailConferma(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var prenotazioneDemo = {
    idPrenotazione: 'BOOK-2025-TEST',
    targa: 'EC787NM',
    modello: 'Mercedes Sprinter 9 Posti',
    giornoInizio: new Date(2025, 10, 15),
    giornoFine: new Date(2025, 10, 18),
    oraInizio: '09:00',
    oraFine: '18:00',
    destinazione: 'Roma - Tour Colosseo e Vaticano',
    email: destinatario,
    autista1: { nomeCompleto: 'Mario Rossi' }
  };
  
  try {
    inviaEmailConfermaCliente(prenotazioneDemo);
    return createJsonResponse({
      success: true,
      message: 'Email conferma test inviata a ' + destinatario
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore: ' + error.message
    }, 500);
  }
}

/**
 * Test email reminder
 * @param {string} email - Email destinatario test
 * @return {ContentService} Risposta JSON
 */
function testEmailReminder(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var prenotazioneDemo = {
    idPrenotazione: 'BOOK-2025-REMINDER',
    targa: 'FG123AB',
    modello: 'Fiat Ducato Passo Lungo',
    giornoInizio: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    giornoFine: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    oraInizio: '10:00',
    oraFine: '17:00',
    destinazione: 'Napoli - Matrimonio',
    email: destinatario,
    autista1: { nomeCompleto: 'Luigi Verdi' }
  };
  
  try {
    inviaEmailReminder(prenotazioneDemo);
    return createJsonResponse({
      success: true,
      message: 'Email reminder test inviata a ' + destinatario
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore: ' + error.message
    }, 500);
  }
}

/**
 * Test email conferma preventivo
 * @param {string} email - Email destinatario test
 * @return {ContentService} Risposta JSON
 */
function testEmailConfermaPreventivo(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var demo = {
    idPrenotazione: 'BOOK-2025-CONF',
    targa: 'BW123XY',
    modello: 'Opel Vivaro',
    giornoInizio: new Date(2025, 10, 22),
    giornoFine: new Date(2025, 10, 23),
    oraInizio: '08:00',
    oraFine: '19:00',
    destinazione: 'Firenze - Meeting',
    email: destinatario,
    autista1: { nomeCompleto: 'Antonio Bianchi' }
  };
  
  try {
    inviaEmailConfermaPreventivo(demo);
    return createJsonResponse({
      success: true,
      message: 'Email conferma preventivo test inviata a ' + destinatario
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore: ' + error.message
    }, 500);
  }
}

/**
 * Setup trigger giornaliero per reminder automatici
 * Esegue alle 09:00 ogni giorno
 */
function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  
  // Rimuovi trigger esistenti
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyReminderCheck') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Crea nuovo trigger
  ScriptApp.newTrigger('dailyReminderCheck')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  
  Logger.log('[setupDailyTrigger] Trigger giornaliero configurato per le 09:00');
}

/**
 * Funzione eseguita dal trigger giornaliero
 * Controlla reminder e aggiorna stati
 */
function dailyReminderCheck() {
  try {
    checkReminderEmails();
    updateStatiLive();
    Logger.log('[dailyReminderCheck] Check giornaliero completato: ' + new Date().toISOString());
  } catch (error) {
    Logger.log('[dailyReminderCheck] Errore nel check giornaliero: ' + error.message);
  }
}
