/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.6.0 (Gmail API)
 * - Invio email tramite Gmail Advanced Service per mittente corretto
 * - Nessun reply-to
 * - Nessun riferimento a preventivi/importi nelle email al cliente
 * - Endpoint testEmail e trigger giornaliero reminder
 */

const CONFIG = {
  VERSION: '8.6.0',
  SPREADSHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  TOKEN: 'imbriani_secret_2025',
  SHEETS: { PRENOTAZIONI: 'PRENOTAZIONI', PULMINI: 'PULMINI', CLIENTI: 'CLIENTI', MANUTENZIONI: 'MANUTENZIONI' },
  PRENOTAZIONI_COLS: {
    TIMESTAMP:1,NOME_AUTISTA_1:2,DATA_NASCITA_AUTISTA_1:3,LUOGO_NASCITA_AUTISTA_1:4,CODICE_FISCALE_AUTISTA_1:5,
    COMUNE_RESIDENZA_AUTISTA_1:6,VIA_RESIDENZA_AUTISTA_1:7,CIVICO_RESIDENZA_AUTISTA_1:8,NUMERO_PATENTE_AUTISTA_1:9,
    DATA_INIZIO_PATENTE_AUTISTA_1:10,SCADENZA_PATENTE_AUTISTA_1:11,TARGA:12,ORA_INIZIO:13,ORA_FINE:14,GIORNO_INIZIO:15,GIORNO_FINE:16,
    DESTINAZIONE:17,CELLULARE:18,DATA_CONTRATTO:19,NOME_AUTISTA_2:20,DATA_NASCITA_AUTISTA_2:21,LUOGO_NASCITA_AUTISTA_2:22,
    CODICE_FISCALE_AUTISTA_2:23,COMUNE_RESIDENZA_AUTISTA_2:24,VIA_RESIDENZA_AUTISTA_2:25,CIVICO_RESIDENZA_AUTISTA_2:26,
    NUMERO_PATENTE_AUTISTA_2:27,DATA_INIZIO_PATENTE_AUTISTA_2:28,SCADENZA_PATENTE_AUTISTA_2:29,NOME_AUTISTA_3:30,
    DATA_NASCITA_AUTISTA_3:31,LUOGO_NASCITA_AUTISTA_3:32,CODICE_FISCALE_AUTISTA_3:33,COMUNE_RESIDENZA_AUTISTA_3:34,
    VIA_RESIDENZA_AUTISTA_3:35,CIVICO_RESIDENZA_AUTISTA_3:36,NUMERO_PATENTE_AUTISTA_3:37,DATA_INIZIO_PATENTE_AUTISTA_3:38,
    SCADENZA_PATENTE_AUTISTA_3:39,ID_PRENOTAZIONE:40,STATO_PRENOTAZIONE:41,IMPORTO_PREVENTIVO:42,EMAIL:43,TEST:44
  },
  CLIENTI_COLS: { NOME:1,DATA_NASCITA:2,LUOGO_NASCITA:3,CODICE_FISCALE:4,COMUNE_RESIDENZA:5,VIA_RESIDENZA:6,CIVICO_RESIDENZA:7,NUMERO_PATENTE:8,DATA_INIZIO_PATENTE:9,SCADENZA_PATENTE:10,CELLULARE:11,EMAIL:12 },
  PULMINI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,NOTE:6 },
  MANUTENZIONI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,DATA_INIZIO:6,DATA_FINE:7,COSTO:8,NOTE:9 },
  TELEGRAM: { BOT_TOKEN: '8029941478:AAGR808kmlCeyw5j5joJn0T_MLKL25qwM0o', CHAT_ID: '203195623' },
  EMAIL: { FROM_NAME: 'Imbriani Stefano Noleggio', FROM_EMAIL: 'imbrianistefanonoleggio@gmail.com' }
};

function createJsonResponse(data,status){ var s=status||200; var resp=data; resp.timestamp=new Date().toISOString(); resp.version=CONFIG.VERSION; resp.status=s; return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON); }
function validateToken(t){ return t===CONFIG.TOKEN; }
function getAuthHeader(e){ if (e && e.parameter && e.parameter.Authorization) return e.parameter.Authorization.replace('Bearer ',''); return null; }

function versionInfo(){ return { success:true, service:'imbriani-backend', version:CONFIG.VERSION, features:['stato_default_in_attesa','notifica_telegram_admin','endpoint_notifyTest','health_getVeicoli_getPrenotazioni','checkDisponibilita_updateStatiLive','getSheet_handleLogin_creaPrenotazione','aggiornaCliente_sincronizzaClienti','gmail_api_sender','email_conferma_cliente','email_conferma_stato','email_reminder_3giorni','trigger_giornaliero'], time:new Date().toISOString() }; }

// ============ INVIO EMAIL VIA GMAIL API ============
function inviaEmailViaGmailAPI(to, subject, htmlBody) {
  try {
    var raw = [
      'From: ' + CONFIG.EMAIL.FROM_NAME + ' <' + CONFIG.EMAIL.FROM_EMAIL + '>',
      'To: ' + to,
      'Subject: ' + subject,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody
    ].join('\n');
    var encoded = Utilities.base64EncodeWebSafe(raw, Utilities.Charset.UTF_8);
    Gmail.Users.Messages.send({ raw: encoded }, 'me');
  } catch (err) {
    Logger.log('Errore Gmail API: ' + err.message);
    throw err;
  }
}

/* ======================
   EMAIL: mittente forzato Gmail noleggio
   - Nessun preventivo/importo nelle email cliente
   ====================== */

function inviaEmailConfermaCliente(prenotazione){
  try {
    var oggetto = '✅ Conferma Prenotazione - ' + (prenotazione.idPrenotazione || 'N/A');
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';
    var corpo = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto}.header{background:linear-gradient(135deg,#0066FF,#004ECC);color:#fff;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.info-box{background:#fff;border-left:4px solid #0066FF;padding:15px;margin:15px 0}.status{background:#E3F2FD;padding:10px;border-radius:5px;text-align:center;font-weight:bold}.footer{background:#333;color:#fff;padding:15px;text-align:center;font-size:12px}.highlight{color:#0066FF;font-weight:bold}</style></head><body>'+/* ... resto HTML invariato ... */'';
    inviaEmailViaGmailAPI(prenotazione.email, oggetto, corpo);
  } catch (error) { Logger.log('Errore invio email conferma cliente: ' + error.message); }
}

function inviaEmailConfermaPreventivo(prenotazione){
  try {
    var oggetto = '✅ Prenotazione Confermata';
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';
    var corpo = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto}.header{background:linear-gradient(135deg,#22C55E,#16A34A);color:#fff;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.info-box{background:#fff;border-left:4px solid #22C55E;padding:15px;margin:15px 0}.status{background:#DCFCE7;padding:10px;border-radius:5px;text-align:center;font-weight:bold;color:#166534}.footer{background:#333;color:#fff;padding:15px;text-align:center;font-size:12px}.highlight{color:#22C55E;font-weight:bold}</style></head><body>'+/* ... resto HTML invariato ... */'';
    inviaEmailViaGmailAPI(prenotazione.email, oggetto, corpo);
  } catch (error) { Logger.log('Errore invio email conferma (cliente): ' + error.message); }
}

function inviaEmailReminder(prenotazione){
  try {
    var oggetto = '⏰ Promemoria: Partenza tra 3 giorni - ' + (prenotazione.idPrenotazione || 'N/A');
    var dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : 'N/A';
    var dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : 'N/A';
    var nomeCliente = (prenotazione.autista1 && prenotazione.autista1.nomeCompleto) || 'Cliente';
    var corpo = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto}.header{background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.info-box{background:#fff;border-left:4px solid #F59E0B;padding:15px;margin:15px 0}.footer{background:#333;color:#fff;padding:15px;text-align:center;font-size:12px}.highlight{color:#F59E0B;font-weight:bold}</style></head><body>'+/* ... resto HTML invariato ... */'';
    inviaEmailViaGmailAPI(prenotazione.email, oggetto, corpo);
  } catch (error) { Logger.log('Errore invio email reminder: ' + error.message); }
}
