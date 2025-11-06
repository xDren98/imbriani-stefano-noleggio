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
  EMAIL: {
    FROM_NAME: 'Imbriani Stefano Noleggio',
    FROM_EMAIL: 'imbrianistefanonoleggio@gmail.com'
  }
};

function createJsonResponse(data,status){
  var s=status||200;
  var resp=data; resp.timestamp=new Date().toISOString(); resp.version=CONFIG.VERSION; resp.status=s;
  return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON);
}
function validateToken(t){ return t===CONFIG.TOKEN; }
function getAuthHeader(e){ if (e && e.parameter && e.parameter.Authorization) return e.parameter.Authorization.replace('Bearer ',''); return null; }

function versionInfo(){
  return {
    success: true,
    service: 'imbriani-backend',
    version: CONFIG.VERSION,
    features: [
      'stato_default_in_attesa','notifica_telegram_admin','endpoint_notifyTest','health_getVeicoli_getPrenotazioni',
      'checkDisponibilita_updateStatiLive','getSheet_handleLogin_creaPrenotazione','aggiornaCliente_sincronizzaClienti',
      'gmail_api_sender','email_conferma_cliente','email_conferma_stato','email_reminder_3giorni','trigger_giornaliero'
    ],
    time: new Date().toISOString()
  };
}

function doGet(e){
  var p=(e&&e.parameter)?e.parameter:{}; var action=p.action||'health';
  var token=p.token||(p.Authorization?p.Authorization.replace('Bearer ',''):'');
  try{
    if (action==='version')
      return ContentService.createTextOutput(JSON.stringify(versionInfo())).setMimeType(ContentService.MimeType.JSON);
    if (action==='health')
      return createJsonResponse({ success:true, service:'imbriani-backend', spreadsheet_id:CONFIG.SPREADSHEET_ID, sheets:['PRENOTAZIONI','PULMINI','CLIENTI','MANUTENZIONI'], action:'health_supported' });

    if (action==='notifyTest'){
      if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
      var demo={ targa:'TEST123', giornoInizio:new Date().toISOString().slice(0,10), giornoFine:new Date().toISOString().slice(0,10), oraInizio:'09:00', oraFine:'12:00', destinazione:'Test Destinazione', autista1:{ nomeCompleto:'Mario Test', codiceFiscale:'TSTMRA85M01H501Z', cellulare:'3330000000' }, email:'test@example.com' };
      inviaNotificaTelegram(demo);
      return createJsonResponse({success:true,message:'Notifica Telegram inviata (test)'});
    }

    if (action==='testEmail'){
      if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
      var to = p.to || 'melloanto@icloud.com';
      var demo={
        idPrenotazione:'PRE-TEST-'+Date.now(), targa:'TEST123',
        giornoInizio:new Date().toISOString().slice(0,10), giornoFine:new Date().toISOString().slice(0,10),
        oraInizio:'09:00', oraFine:'12:00', destinazione:'Test', email:to, autista1:{nomeCompleto:'Test Client'}
      };
      inviaEmailConfermaCliente(demo);
      return createJsonResponse({success:true,message:'Email di test inviata a '+to});
    }

    if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);

    switch(action){
      case 'getVeicoli': return getVeicoli();
      case 'getPrenotazioni': return getPrenotazioni();
      case 'checkDisponibilita': return checkDisponibilita(p);
      case 'updateStatiLive': return updateStatiLive();
      case 'getSheet': return getSheetGeneric(p);
      case 'sincronizzaClienti': return sincronizzaClienti();
      case 'checkReminders': return checkReminderEmails();
      default: return createJsonResponse({success:false,message:'Azione non supportata: '+action},400);
    }
  }catch(err){
    return createJsonResponse({success:false,message:'Errore server: '+err.message},500);
  }
}

function doPost(e){
  try{
    var tokenHeader=(e&&e.parameter&&e.parameter.token)?e.parameter.token:getAuthHeader(e);
    var post={};
    try{ post=JSON.parse(e&&e.postData?(e.postData.contents||'{}'):'{}'); }
    catch(_){ return createJsonResponse({success:false,message:'Invalid JSON in request body'},400); }
    var action=post.action||'login';
    var finalToken=tokenHeader||post.token||post.AUTH_TOKEN;

    if (action==='login') return handleLogin(post, finalToken);
    if (!validateToken(finalToken)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);