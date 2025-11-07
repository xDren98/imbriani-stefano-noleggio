/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.8
 * - FEAT: Generazione PDF automatica alla conferma
 * - FEAT: Modifica prenotazione con rigenerazione PDF
 * - FEAT: Elimina prenotazione con eliminazione PDF
 * - FEAT: Lookup automatico marca/modello da targa
 * - FEAT: Funzione aggiornaStatoPrenotazione con email automatica
 * - FEAT: Log avanzati per debug admin panel
 */

const CONFIG = {
  VERSION: '8.8',
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
    SCADENZA_PATENTE_AUTISTA_3:39,ID_PRENOTAZIONE:40,STATO_PRENOTAZIONE:41,IMPORTO_PREVENTIVO:42,EMAIL:43,TEST:44,PDF_URL:45
  },
  CLIENTI_COLS: { NOME:1,DATA_NASCITA:2,LUOGO_NASCITA:3,CODICE_FISCALE:4,COMUNE_RESIDENZA:5,VIA_RESIDENZA:6,CIVICO_RESIDENZA:7,NUMERO_PATENTE:8,DATA_INIZIO_PATENTE:9,SCADENZA_PATENTE:10,CELLULARE:11,EMAIL:12 },
  PULMINI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,NOTE:6 },
  MANUTENZIONI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,DATA_INIZIO:6,DATA_FINE:7,COSTO:8,NOTE:9 },
  TELEGRAM: { BOT_TOKEN: '8029941478:AAGR808kmlCeyw5j5joJn0T_MLKL25qwM0o', CHAT_ID: '203195623' },
  EMAIL: {
    FROM_NAME: 'Imbriani Stefano Noleggio',
    FROM_EMAIL: 'imbrianistefanonoleggio@gmail.com'
  },
  PDF: {
    TEMPLATE_DOC_ID: '1JEpqJZq9SnmmBWAucrRQ-CAzditSK3fL7HXKbWe-kcM',
    PDF_FOLDER_ID: '1bYLuvfydAUaKsZpZVrFq-H3uRT66oo98',
    TIMEZONE: 'Europe/Rome',
    VEICOLI: {
      'DN391FW': { marca: 'Fiat', modello: 'Ducato' },
      'EC787NM': { marca: 'Fiat', modello: 'Ducato' },
      'EZ841FA': { marca: 'Renault', modello: 'Trafic' }
    }
  }
};

function createJsonResponse(data,status){
  var s=status||200;
  var resp=data; resp.timestamp=new Date().toISOString(); resp.version=CONFIG.VERSION; resp.status=s;
  return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON);
}
function validateToken(t){ return t===CONFIG.TOKEN; }

function getAuthHeader(e) {
  if (e && e.parameter && e.parameter.Authorization) {
    return e.parameter.Authorization.replace('Bearer ', '');
  }
  if (e && e.parameter && e.parameter.token) {
    return String(e.parameter.token);
  }
  try {
    if (e && e.postData && e.postData.contents) {
      const payload = JSON.parse(e.postData.contents || '{}');
      if (payload.token) return String(payload.token);
      if (payload.AUTH_TOKEN) return String(payload.AUTH_TOKEN);
    }
  } catch (_) {}
  return null;
}

function generaNuovoIdBooking() {
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var annoCorrente = new Date().getFullYear();
    var prefisso = 'BOOK-' + annoCorrente + '-';
    var maxProgressivo = 0;
    for (var i = 1; i < data.length; i++) {
      var id = String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '');
      if (id.startsWith(prefisso)) {
        var numero = parseInt(id.replace(prefisso, ''), 10);
        if (!isNaN(numero) && numero > maxProgressivo) {
          maxProgressivo = numero;
        }
      }
    }
    var nuovoProgressivo = maxProgressivo + 1;
    return prefisso + String(nuovoProgressivo).padStart(3, '0');
  } catch (error) {
    var anno = new Date().getFullYear();
    return 'BOOK-' + anno + '-' + String(Date.now()).slice(-3);
  }
}

function versionInfo(){
  return {
    success: true,
    service: 'imbriani-backend',
    version: CONFIG.VERSION,
    features: [
      'pdf_generation','modifica_prenotazione','elimina_prenotazione',
      'aggiornaStatoPrenotazione','booking_id_dinamico_anno'
    ],
    time: new Date().toISOString()
  };
}

function doGet(e){
  Logger.log('[doGet] Chiamata ricevuta: ' + JSON.stringify(e.parameter));
  var p=(e&&e.parameter)?e.parameter:{}; 
  var action=p.action||'health';
  try{
    if (action==='version')
      return ContentService.createTextOutput(JSON.stringify(versionInfo())).setMimeType(ContentService.MimeType.JSON);
    if (action==='health')
      return createJsonResponse({ success:true, service:'imbriani-backend', spreadsheet_id:CONFIG.SPREADSHEET_ID, sheets:['PRENOTAZIONI','PULMINI','CLIENTI','MANUTENZIONI'], action:'health_supported' });

    var token = getAuthHeader(e);
    if (!validateToken(token)) {
      Logger.log('[doGet] Token non valido');
      return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    }

    Logger.log('[doGet] Action: ' + action);
    switch(action){
      case 'getVeicoli': return getVeicoli();
      case 'getPrenotazioni': return getPrenotazioni();
      case 'checkDisponibilita': return checkDisponibilita(p);
      case 'updateStatiLive': return updateStatiLive();
      case 'getSheet': return getSheetGeneric(p);
      case 'sincronizzaClienti': return sincronizzaClienti();
      case 'checkReminders': return checkReminderEmails();
      case 'assegnaId': return assegnaIdPrenotazioniEsistenti();
      case 'notifyTest': 
        var demo={ targa:'TEST123', giornoInizio:new Date().toISOString().slice(0,10), giornoFine:new Date().toISOString().slice(0,10), oraInizio:'09:00', oraFine:'12:00', destinazione:'Test Destinazione', autista1:{ nomeCompleto:'Mario Test', codiceFiscale:'TSTMRA85M01H501Z', cellulare:'3330000000' }, email:'test@example.com' };
        inviaNotificaTelegram(demo);
        return createJsonResponse({success:true,message:'Notifica Telegram inviata (test)'});
      case 'testEmail':
      case 'testEmailConferma':
        return testEmailConferma(p.to || 'melloanto@icloud.com');
      case 'testEmailReminder':
        return testEmailReminder(p.to || 'melloanto@icloud.com');
      case 'testEmailConfermaPreventivo':
        return testEmailConfermaPreventivo(p.to || 'melloanto@icloud.com');
      case 'censisciPDF': return censisciPDFEsistenti();  
      default: return createJsonResponse({success:false,message:'Azione non supportata: '+action},400);
    }
  }catch(err){
    Logger.log('[doGet] Errore: ' + err.message);
    return createJsonResponse({success:false,message:'Errore server: '+err.message},500);
  }
}

function doPost(e){
  Logger.log('[doPost] Chiamata ricevuta');
  try{
    var post={};
    try{ post=JSON.parse(e&&e.postData?(e.postData.contents||'{}'):'{}'); }
    catch(_){ return createJsonResponse({success:false,message:'Invalid JSON in request body'},400); }

    Logger.log('[doPost] Payload: ' + JSON.stringify(post));
    var action=post.action||'login';
    var finalToken = getAuthHeader(e);

    if (action==='login') return handleLogin(post, finalToken);
    if (!validateToken(finalToken)) {
      Logger.log('[doPost] Token non valido');
      return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    }

    Logger.log('[doPost] Action: ' + action);
    switch(action){
      case 'getPrenotazioni': return getPrenotazioni();
      case 'getVeicoli': return getVeicoli();
      case 'creaPrenotazione': return creaPrenotazione(post);
      case 'aggiornaStato': return aggiornaStatoPrenotazione(post);
      case 'aggiornaPrenotazione': return aggiornaPrenotazioneCompleta(post);
      case 'eliminaPrenotazione': return eliminaPrenotazione(post);
      case 'setManutenzione': return (typeof setManutenzione==='function')?setManutenzione(post):createJsonResponse({success:false,message:'setManutenzione non implementata'},400);
      case 'aggiornaCliente': return aggiornaCliente(post);
      case 'sincronizzaClienti': return sincronizzaClienti();
      case 'checkReminders': return checkReminderEmails();
      case 'assegnaId': return assegnaIdPrenotazioniEsistenti();
      case 'confermaPrenotazione': {
  Logger.log('[confermaPrenotazione] Richiesta ricevuta per ID: ' + post.idPrenotazione);
  
  const idPrenotazione = String(post.idPrenotazione).trim();
  
  if (!idPrenotazione) {
    Logger.log('[confermaPrenotazione] ERRORE: ID prenotazione mancante');
    return createJsonResponse({
      success: false,
      message: 'ID prenotazione mancante'
    }, 400);
  }
  
  try {
    // Leggi foglio PRENOTAZIONI
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    
    // Trova l'indice della colonna ID prenotazione (con spazio!)
    var idColIndex = -1;
    for (var h = 0; h < headers.length; h++) {
      var header = String(headers[h]).trim();
      // Cerca sia "ID prenotazione" che "idPrenotazione" o altre varianti
      if (header === 'ID prenotazione' || 
          header === 'idPrenotazione' || 
          header === 'IDPRENOTAZIONE' ||
          header.toLowerCase().replace(/\s+/g, '') === 'idprenotazione') {
        idColIndex = h;
        Logger.log('[confermaPrenotazione] Trovata colonna ID alla posizione ' + h + ': "' + header + '"');
        break;
      }
    }
    
    if (idColIndex === -1) {
      Logger.log('[confermaPrenotazione] ERRORE: Colonna ID prenotazione non trovata');
      Logger.log('[confermaPrenotazione] Headers disponibili: ' + headers.join(', '));
      return createJsonResponse({
        success: false,
        message: 'Colonna ID prenotazione non trovata nel foglio'
      }, 500);
    }
    
    Logger.log('[confermaPrenotazione] Cercando ID "' + idPrenotazione + '" nella colonna ' + idColIndex);
    
    // Trova la riga della prenotazione
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][idColIndex]).trim();
      
      if (rowId.toUpperCase() === idPrenotazione.toUpperCase()) {
        rowIndex = i + 1; // +1 perché le righe sono 1-based
        Logger.log('[confermaPrenotazione] ✅ Prenotazione trovata alla riga ' + rowIndex);
        break;
      }
    }
    
    if (rowIndex === -1) {
      Logger.log('[confermaPrenotazione] ❌ Prenotazione NON trovata con ID ' + idPrenotazione);
      return createJsonResponse({
        success: false,
        message: 'Prenotazione non trovata con ID: ' + idPrenotazione
      }, 404);
    }
    
    // Trova l'indice della colonna stato
    var statoColIndex = -1;
    for (var h = 0; h < headers.length; h++) {
      var header = String(headers[h]).trim();
      if (header === 'stato' || 
          header === 'statoPrenotazione' || 
          header === 'Stato prenotazione' ||
          header === 'STATOPRENOTAZIONE') {
        statoColIndex = h;
        Logger.log('[confermaPrenotazione] Trovata colonna stato alla posizione ' + h + ': "' + header + '"');
        break;
      }
    }
    
    if (statoColIndex === -1) {
      Logger.log('[confermaPrenotazione] ERRORE: Colonna stato non trovata');
      return createJsonResponse({
        success: false,
        message: 'Colonna stato non trovata nel foglio'
      }, 500);
    }
    
    // Aggiorna lo stato a "Confermata"
    sh.getRange(rowIndex, statoColIndex + 1).setValue('Confermata');
    Logger.log('[confermaPrenotazione] Stato aggiornato a "Confermata"');
    
    // Genera PDF (se funzione esiste)
    var pdfResult = null;
    try {
      Logger.log('[confermaPrenotazione] Tentativo generazione PDF...');
      if (typeof generaPDFContratto === 'function') {
        pdfResult = generaPDFContratto(idPrenotazione);
        if (pdfResult && pdfResult.success) {
          Logger.log('[confermaPrenotazione] PDF generato: ' + pdfResult.nomeFile);
        }
      }
    } catch (e) {
      Logger.log('[confermaPrenotazione] Errore generazione PDF: ' + e.message);
    }
    
    Logger.log('[confermaPrenotazione] ✅ Operazione completata con successo');
    
    return createJsonResponse({
      success: true,
      message: 'Prenotazione confermata con successo',
      data: {
        idPrenotazione: idPrenotazione,
        nuovoStato: 'Confermata',
        riga: rowIndex,
        pdfGenerato: pdfResult ? pdfResult.success : false
      }
    });
    
  } catch (error) {
    Logger.log('[confermaPrenotazione] ERRORE: ' + error.message);
    return createJsonResponse({
      success: false,
      message: 'Errore durante la conferma: ' + error.message
    }, 500);
  }
}
      default: return createJsonResponse({success:false,message:'Azione POST non supportata: '+action},400);
    }
  }catch(err){
    Logger.log('[doPost] Errore: ' + err.message);
    return createJsonResponse({success:false,message:'Errore POST: '+err.message},500);
  }
}

// ═══════════════════════════════════════════════════════════════
// PDF GENERATION
// ═══════════════════════════════════════════════════════════════

function generaPDFContratto(idPrenotazione) {
  Logger.log('[generaPDFContratto] ID: ' + idPrenotazione);
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var rowIndex = -1;
    var prenotazione = null;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        rowIndex = i + 1;
        prenotazione = data[i];
        break;
      }
    }
    
    if (!prenotazione) {
      throw new Error('Prenotazione non trovata: ' + idPrenotazione);
    }
    
    // Prepara mappa placeholder
    var mappa = {};
    
    // Formatta date
    function formatDate(val) {
      if (val instanceof Date && !isNaN(val.getTime())) {
        return Utilities.formatDate(val, CONFIG.PDF.TIMEZONE, 'dd/MM/yyyy');
      }
      return val || '______________________________';
    }
    
    // Dati autista 1
    mappa['<<Nome>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || '______________________________';
    mappa['<<Data di nascita>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1 - 1]);
    mappa['<<Luogo di nascita>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1 - 1] || '______________________________';
    mappa['<<Codice fiscale>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1] || '______________________________';
    mappa['<<Comune di residenza>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1 - 1] || '______________________________';
    mappa['<<Via di residenza>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1 - 1] || '______________________________';
    mappa['<<Civico di residenza>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1 - 1] || '';
    mappa['<<Numero di patente>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1 - 1] || '______________________________';
    mappa['<<Data inizio validità patente>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1 - 1]);
    mappa['<<Scadenza patente>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1 - 1]);
    
    // Dati autista 2
    mappa['<<Nome Autista 2>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2 - 1] || '______________________________';
    mappa['<<Data di nascita Autista 2>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2 - 1]);
    mappa['<<Luogo di nascita Autista 2>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2 - 1] || '______________________________';
    mappa['<<Codice fiscale Autista 2>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2 - 1] || '______________________________';
    mappa['<<Comune di residenza Autista 2>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2 - 1] || '______________________________';
    mappa['<<Via di residenza Autista 2>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2 - 1] || '______________________________';
    mappa['<<Civico di residenza Autista 2>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2 - 1] || '';
    mappa['<<Numero di patente Autista 2>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2 - 1] || '______________________________';
    mappa['<<Data inizio validità patente Autista 2>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2 - 1]);
    mappa['<<Scadenza patente Autista 2>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2 - 1]);
    
    // Dati autista 3
    mappa['<<Nome Autista 3>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3 - 1] || '______________________________';
    mappa['<<Data di nascita Autista 3>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3 - 1]);
    mappa['<<Luogo di nascita Autista 3>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3 - 1] || '______________________________';
    mappa['<<Codice fiscale Autista 3>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3 - 1] || '______________________________';
    mappa['<<Comune di residenza Autista 3>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3 - 1] || '______________________________';
    mappa['<<Via di residenza Autista 3>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3 - 1] || '______________________________';
    mappa['<<Civico di residenza Autista 3>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3 - 1] || '';
    mappa['<<Numero di patente Autista 3>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3 - 1] || '______________________________';
    mappa['<<Data inizio validità patente Autista 3>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3 - 1]);
    mappa['<<Scadenza patente Autista 3>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3 - 1]);
    
    // Dati noleggio
    var targa = String(prenotazione[CONFIG.PRENOTAZIONI_COLS.TARGA - 1] || '').trim().toUpperCase();
    var veicolo = CONFIG.PDF.VEICOLI[targa] || { marca: '______________________________', modello: '______________________________' };
    
    mappa['<<Targa>>'] = targa || '______________________________';
    mappa['<<marca>>'] = veicolo.marca;
    mappa['<<tipo>>'] = veicolo.modello;
    mappa['<<Giorno inizio noleggio>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1]);
    mappa['<<Giorno fine noleggio>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1]);
    mappa['<<Ora inizio noleggio>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] || '______________________________';
    mappa['<<Ora fine noleggio>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] || '______________________________';
    mappa['<<Destinazione>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1] || '______________________________';
    mappa['<<Cellulare>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.CELLULARE - 1] || '______________________________';
    mappa['<<Data contratto>>'] = formatDate(prenotazione[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1]);
    mappa['<<ID prenotazione>>'] = idPrenotazione;
    mappa['<<Importo preventivo>>'] = prenotazione[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1] || '0';
    
    Logger.log('[generaPDFContratto] Veicolo: ' + targa + ' -> ' + veicolo.marca + ' ' + veicolo.modello);
    
    // Crea copia template
    var template = DriveApp.getFileById(CONFIG.PDF.TEMPLATE_DOC_ID);
    var tempDoc = template.makeCopy();
    var doc = DocumentApp.openById(tempDoc.getId());
    var body = doc.getBody();
    
    // Sostituisci placeholder
    var sostituzioni = 0;
    for (var placeholder in mappa) {
      var value = String(mappa[placeholder] || '');
      var count = body.replaceText(placeholder, value);
      if (count > 0) sostituzioni++;
    }
    
    doc.saveAndClose();
    Logger.log('[generaPDFContratto] Sostituzioni: ' + sostituzioni);
    
    // Crea PDF
    var pdfBlob = DriveApp.getFileById(tempDoc.getId()).getAs(MimeType.PDF);
    var nomeCliente = String(mappa['<<Nome>>'] || 'Cliente').replace(/\s+/g, '_');
    var dataRitiro = String(mappa['<<Giorno inizio noleggio>>'] || '').replace(/\//g, '-');
    var dataArrivo = String(mappa['<<Giorno fine noleggio>>'] || '').replace(/\//g, '-');
    var nomePdf = nomeCliente + '_' + dataRitiro + '_' + dataArrivo + '.pdf';
    
    var folder = DriveApp.getFolderById(CONFIG.PDF.PDF_FOLDER_ID);
    var pdfFile = folder.createFile(pdfBlob).setName(nomePdf);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Elimina documento temporaneo
    DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
    
    // Salva URL PDF nella colonna
    sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.PDF_URL).setValue(pdfFile.getUrl());
    
    Logger.log('[generaPDFContratto] PDF creato: ' + nomePdf);
    Logger.log('[generaPDFContratto] URL: ' + pdfFile.getUrl());
    
    return {
      success: true,
      pdfUrl: pdfFile.getUrl(),
      pdfId: pdfFile.getId(),
      nomeFile: nomePdf
    };
    
  } catch (err) {
    Logger.log('[generaPDFContratto] Errore: ' + err.message);
    return { success: false, message: err.message };
  }
}

function eliminaPDFPrenotazione(idPrenotazione) {
  Logger.log('[eliminaPDFPrenotazione] ID: ' + idPrenotazione);
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var pdfUrl = '';
    
    // Trova URL PDF dalla prenotazione
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        pdfUrl = data[i][CONFIG.PRENOTAZIONI_COLS.PDF_URL - 1] || '';
        break;
      }
    }
    
    // Estrai ID del file dall'URL
    if (pdfUrl && pdfUrl.indexOf('/d/') > -1) {
      var pdfId = pdfUrl.split('/d/')[1].split('/')[0];
      try {
        var file = DriveApp.getFileById(pdfId);
        file.setTrashed(true);
        Logger.log('[eliminaPDFPrenotazione] PDF eliminato: ' + pdfId);
      } catch (e) {
        Logger.log('[eliminaPDFPrenotazione] PDF non trovato o già eliminato: ' + e.message);
      }
    }
  } catch (err) {
    Logger.log('[eliminaPDFPrenotazione] Errore: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// AGGIORNA STATO PRENOTAZIONE (con PDF)
// ═══════════════════════════════════════════════════════════════

function aggiornaStatoPrenotazione(post){
  Logger.log('[aggiornaStatoPrenotazione] Input: ' + JSON.stringify(post));
  try{
    var idPrenotazione = post.idPrenotazione;
    var nuovoStato = post.nuovoStato;
    var importo = post.importo;
    
    if (!idPrenotazione || !nuovoStato) {
      Logger.log('[aggiornaStatoPrenotazione] Parametri mancanti');
      return createJsonResponse({success:false, message:'ID prenotazione e nuovo stato richiesti'}, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        rowIndex = i + 1;
        Logger.log('[aggiornaStatoPrenotazione] Prenotazione trovata alla riga: ' + rowIndex);
        break;
      }
    }
    
    if (rowIndex === -1) {
      Logger.log('[aggiornaStatoPrenotazione] Prenotazione non trovata con ID: ' + idPrenotazione);
      return createJsonResponse({success:false, message:'Prenotazione non trovata con ID: ' + idPrenotazione}, 404);
    }
    
    sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE).setValue(nuovoStato);
    Logger.log('[aggiornaStatoPrenotazione] Stato aggiornato a: ' + nuovoStato);
    
    if (importo && nuovoStato === 'Confermata') {
      sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO).setValue(importo);
      Logger.log('[aggiornaStatoPrenotazione] Importo aggiornato a: ' + importo);
    }
    
    var pdfResult = null;
    
    // Genera PDF quando confermi
    if (nuovoStato === 'Confermata') {
      Logger.log('[aggiornaStatoPrenotazione] Generazione PDF...');
      try {
        pdfResult = generaPDFContratto(idPrenotazione);
        if (pdfResult.success) {
          Logger.log('[aggiornaStatoPrenotazione] PDF generato: ' + pdfResult.nomeFile);
        } else {
          Logger.log('[aggiornaStatoPrenotazione] Errore generazione PDF: ' + pdfResult.message);
        }
      } catch (e) {
        Logger.log('[aggiornaStatoPrenotazione] Errore generazione PDF: ' + e.message);
      }
      
      // Invia email conferma
      var row = data[rowIndex - 1];
      var email = row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1];
      
      if (email) {
        Logger.log('[aggiornaStatoPrenotazione] Invio email conferma a: ' + email);
        var prenotazione = {
          idPrenotazione: idPrenotazione,
          targa: row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1],
          giornoInizio: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1],
          giornoFine: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1],
          oraInizio: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1],
          oraFine: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1],
          destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1],
          email: email,
          autista1: { nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] }
        };
        
        try {
          inviaEmailConfermaPreventivo(prenotazione);
          Logger.log('[aggiornaStatoPrenotazione] Email conferma inviata');
        } catch(e) {
          Logger.log('[aggiornaStatoPrenotazione] Errore invio email: ' + e.message);
        }
      }
    }
    
    Logger.log('[aggiornaStatoPrenotazione] Operazione completata');
    return createJsonResponse({
      success: true, 
      message: 'Stato aggiornato con successo',
      nuovoStato: nuovoStato,
      idPrenotazione: idPrenotazione,
      pdfGenerato: pdfResult ? pdfResult.success : false,
      pdfUrl: pdfResult && pdfResult.success ? pdfResult.pdfUrl : null
    });
    
  } catch(err) {
    Logger.log('[aggiornaStatoPrenotazione] Errore: ' + err.message);
    return createJsonResponse({success:false, message:'Errore: ' + err.message}, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// MODIFICA PRENOTAZIONE COMPLETA
// ═══════════════════════════════════════════════════════════════

function aggiornaPrenotazioneCompleta(post) {
  Logger.log('[aggiornaPrenotazioneCompleta] Input: ' + JSON.stringify(post));
  
  try {
    var idPrenotazione = post.idPrenotazione;
    if (!idPrenotazione) {
      return createJsonResponse({success: false, message: 'ID prenotazione richiesto'}, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var rowIndex = -1;
    var statoAttuale = '';
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        rowIndex = i + 1;
        statoAttuale = data[i][CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1];
        break;
      }
    }
    
    if (rowIndex === -1) {
      return createJsonResponse({success: false, message: 'Prenotazione non trovata'}, 404);
    }
    
    Logger.log('[aggiornaPrenotazioneCompleta] Stato attuale: ' + statoAttuale);
    
    // Aggiorna campi se presenti
    if (post.targa) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.TARGA).setValue(post.targa);
    if (post.giornoInizio) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO).setValue(new Date(post.giornoInizio));
    if (post.giornoFine) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE).setValue(new Date(post.giornoFine));
    if (post.oraInizio) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO).setValue(post.oraInizio);
    if (post.oraFine) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.ORA_FINE).setValue(post.oraFine);
    if (post.destinazione) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE).setValue(post.destinazione);
    if (post.cellulare) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CELLULARE).setValue(post.cellulare);
    if (post.email) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.EMAIL).setValue(post.email);
    if (post.importo) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO).setValue(post.importo);
    
    // Autista 1
    if (post.autista1) {
      if (post.autista1.nomeCompleto) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1).setValue(post.autista1.nomeCompleto);
      if (post.autista1.dataNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1).setValue(post.autista1.dataNascita);
      if (post.autista1.luogoNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1).setValue(post.autista1.luogoNascita);
      if (post.autista1.codiceFiscale) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1).setValue(post.autista1.codiceFiscale);
      // ... altri campi autista 1
    }
    
    Logger.log('[aggiornaPrenotazioneCompleta] Campi aggiornati');
    
    // Se stato NON è "In attesa", rigenera PDF
    var pdfRigenerato = false;
    if (statoAttuale !== 'In attesa') {
      Logger.log('[aggiornaPrenotazioneCompleta] Rigenerazione PDF necessaria');
      
      // Elimina PDF esistente
      eliminaPDFPrenotazione(idPrenotazione);
      
      // Rigenera PDF
      var pdfResult = generaPDFContratto(idPrenotazione);
      pdfRigenerato = pdfResult.success;
      
      if (pdfResult.success) {
        Logger.log('[aggiornaPrenotazioneCompleta] PDF rigenerato: ' + pdfResult.nomeFile);
      } else {
        Logger.log('[aggiornaPrenotazioneCompleta] Errore rigenerazione PDF: ' + pdfResult.message);
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'Prenotazione aggiornata',
      pdfRigenerato: pdfRigenerato
    });
    
  } catch (err) {
    Logger.log('[aggiornaPrenotazioneCompleta] Errore: ' + err.message);
    return createJsonResponse({success: false, message: err.message}, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// ELIMINA PRENOTAZIONE
// ═══════════════════════════════════════════════════════════════

function eliminaPrenotazione(post) {
  Logger.log('[eliminaPrenotazione] ID: ' + post.idPrenotazione);
  
  try {
    var idPrenotazione = post.idPrenotazione;
    if (!idPrenotazione) {
      return createJsonResponse({success: false, message: 'ID prenotazione richiesto'}, 400);
    }
    
    // Elimina PDF associato
    eliminaPDFPrenotazione(idPrenotazione);
    
    // Elimina riga da PRENOTAZIONI
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        sh.deleteRow(i + 1);
        Logger.log('[eliminaPrenotazione] Riga eliminata: ' + (i + 1));
        break;
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'Prenotazione eliminata'
    });
    
  } catch (err) {
    Logger.log('[eliminaPrenotazione] Errore: ' + err.message);
    return createJsonResponse({success: false, message: err.message}, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// ALTRE FUNZIONI (invariate)
// ═══════════════════════════════════════════════════════════════

function getSheetGeneric(p){
  try{
    var name=p.name; if (!name) return createJsonResponse({success:false,message:'Parametro name mancante'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
    if (!sh) return createJsonResponse({success:false,message:'Foglio non trovato: '+name},404);
    var vals=sh.getDataRange().getValues();
    var headers=vals[0]; var rows=[];
    for (var i=1;i<vals.length;i++){ var obj={}; for (var c=0;c<headers.length;c++){ obj[headers[c]]=vals[i][c]; } rows.push(obj); }
    return createJsonResponse({success:true,data:rows,count:rows.length});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore getSheet: '+err.message},500);
  }
}

function handleLogin(post){
  try{
    var cf=post.codiceFiscale; if (!cf||cf.length!==16) return createJsonResponse({success:false,message:'Codice fiscale non valido (16 caratteri)'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    var data=sh.getDataRange().getValues();
    for (var i=1;i<data.length;i++){
      var row=data[i];
      if (String(row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){
        return createJsonResponse({
          success:true, message:'Login effettuato',
          user:{
            nome:row[CONFIG.CLIENTI_COLS.NOME-1],
            codiceFiscale:row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1],
            dataNascita:row[CONFIG.CLIENTI_COLS.DATA_NASCITA-1],
            luogoNascita:row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1],
            comuneResidenza:row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1],
            viaResidenza:row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1],
            civicoResidenza:row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1],
            numeroPatente:row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1],
            inizioValiditaPatente:row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1],
            scadenzaPatente:row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1],
            cellulare:row[CONFIG.CLIENTI_COLS.CELLULARE-1],
            email:row[CONFIG.CLIENTI_COLS.EMAIL-1]
          }
        });
      }
    }
    return createJsonResponse({success:false,message:'Codice fiscale non trovato',requiresRegistration:true},404);
  }catch(err){
    return createJsonResponse({success:false,message:'Errore login: '+err.message},500);
  }
}

function getVeicoli(){
  try{
    var sp=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP=sp.getSheetByName(CONFIG.SHEETS.PULMINI);
    var shM=sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (!shP) return createJsonResponse({success:false,message:'Foglio PULMINI non trovato'},500);
    var dataP=shP.getDataRange().getValues();
    if (dataP.length<=1) return createJsonResponse({success:true,message:'Nessun veicolo trovato',data:[]});

    var manut={};
    if (shM){
      var dataM=shM.getDataRange().getValues();
      for (var i=1;i<dataM.length;i++){
        var r=dataM[i]; var t=r[CONFIG.MANUTENZIONI_COLS.TARGA-1]; var st=r[CONFIG.MANUTENZIONI_COLS.STATO-1];
        if (t && st){ manut[t]={ stato:st, dataInizio:r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO-1], dataFine:r[CONFIG.MANUTENZIONI_COLS.DATA_FINE-1], note:r[CONFIG.MANUTENZIONI_COLS.NOTE-1] }; }
      }
    }

    var res=[];
    for (var j=1;j<dataP.length;j++){
      var rp=dataP[j]; var tp=rp[CONFIG.PULMINI_COLS.TARGA-1]; if (!tp) continue;
      var man=manut[tp]; var inMan = false;
      if (man && man.dataInizio && man.dataFine) {
        var oggi = new Date(); var di = new Date(man.dataInizio); var df = new Date(man.dataFine);
        if (oggi >= di && oggi <= df) { inMan = true; }
      }
      var base=rp[CONFIG.PULMINI_COLS.STATO-1]||'Disponibile';
      res.push({
        Targa:tp, Marca:rp[CONFIG.PULMINI_COLS.MARCA-1]||'', Modello:rp[CONFIG.PULMINI_COLS.MODELLO-1]||'',
        Posti:parseInt(rp[CONFIG.PULMINI_COLS.POSTI-1],10)||9,
        Disponibile:!inMan && (base==='Disponibile'||base==='Attivo'),
        Note:rp[CONFIG.PULMINI_COLS.NOTE-1]||'',
        PassoLungo:(tp==='EC787NM')||(rp[CONFIG.PULMINI_COLS.NOTE-1] && String(rp[CONFIG.PULMINI_COLS.NOTE-1]).toLowerCase().indexOf('passo lungo')>-1),
        StatoManutenzione:man?man.stato:'-',
        DisponibileDate:!inMan && (base==='Disponibile'||base==='Attivo')
      });
    }
    return createJsonResponse({success:true,message:'Trovati '+res.length+' veicoli',data:res,count:res.length});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore caricamento veicoli: '+err.message},500);
  }
}

function getPrenotazioni(){
  Logger.log('[getPrenotazioni] Chiamata ricevuta');
  try{
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('PRENOTAZIONI');
    if (!sh) {
      Logger.log('[getPrenotazioni] Foglio PRENOTAZIONI non trovato');
      return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI non trovato'},500);
    }
    var data=sh.getDataRange().getValues();
    if (data.length<=1) {
      Logger.log('[getPrenotazioni] Nessuna prenotazione trovata');
      return createJsonResponse({success:true,message:'Nessuna prenotazione trovata',data:[]});
    }
    var out=[];
    for (var i=1;i<data.length;i++){
      var r=data[i]; 
      var t=r[CONFIG.PRENOTAZIONI_COLS.TARGA-1]; 
      var cf=r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1];
      if (!t && !cf) continue;
      
      out.push({
        id:i, 
        targa:t||'',
        giornoInizio:r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]||'',
        giornoFine:r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]||'',
        oraInizio:r[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1]||'',
        oraFine:r[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1]||'',
        destinazione:r[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1]||'',
        
        // 👤 AUTISTA 1 - COMPLETO
        nomeAutista1:r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]||'',
        codiceFiscaleAutista1:cf||'',
        dataNascitaAutista1:r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]||'',
        luogoNascitaAutista1:r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]||'',
        comuneResidenzaAutista1:r[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1-1]||'',
        viaResidenzaAutista1:r[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1-1]||'',
        civicoResidenzaAutista1:r[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1-1]||'',
        numeroPatenteAutista1:r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]||'',
        dataInizioPatenteAutista1:r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]||'',
        scadenzaPatenteAutista1:r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]||'',
        
        // 👤 AUTISTA 2 - COMPLETO
        nomeAutista2:r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]||'',
        codiceFiscaleAutista2:r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]||'',
        dataNascitaAutista2:r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]||'',
        luogoNascitaAutista2:r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]||'',
        comuneResidenzaAutista2:r[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2-1]||'',
        viaResidenzaAutista2:r[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2-1]||'',
        civicoResidenzaAutista2:r[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2-1]||'',
        numeroPatenteAutista2:r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]||'',
        dataInizioPatenteAutista2:r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]||'',
        scadenzaPatenteAutista2:r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]||'',
        
        // 👤 AUTISTA 3 - COMPLETO
        nomeAutista3:r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]||'',
        codiceFiscaleAutista3:r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]||'',
        dataNascitaAutista3:r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]||'',
        luogoNascitaAutista3:r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]||'',
        comuneResidenzaAutista3:r[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3-1]||'',
        viaResidenzaAutista3:r[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3-1]||'',
        civicoResidenzaAutista3:r[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3-1]||'',
        numeroPatenteAutista3:r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]||'',
        dataInizioPatenteAutista3:r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]||'',
        scadenzaPatenteAutista3:r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]||'',
        
        // 📋 ALTRI DATI
        cellulare:r[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]||'',
        email:r[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]||'',
        stato:r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]||'In attesa',
        importo:r[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO-1]||'',
        importoPreventivo:r[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO-1]||'',
        dataContratto:r[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO-1]||'',
        idPrenotazione:r[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE-1]||'',
        timestamp:r[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP-1]||'',
        pdfUrl:r[CONFIG.PRENOTAZIONI_COLS.PDF_URL-1]||''
      });
    }
    Logger.log('[getPrenotazioni] Trovate ' + out.length + ' prenotazioni');
    return createJsonResponse({success:true,message:'Trovate '+out.length+' prenotazioni',data:out,count:out.length});
  }catch(err){
    Logger.log('[getPrenotazioni] Errore: ' + err.message);
    return createJsonResponse({success:false,message:'Errore caricamento prenotazioni: '+err.message},500);
  }
}


function checkDisponibilita(p){
  try{
    var t=p.targa, di=p.dataInizio, df=p.dataFine;
    if (!t||!di||!df) return createJsonResponse({success:false,message:'Parametri mancanti: targa, dataInizio, dataFine'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data=sh.getDataRange().getValues(); var disp=true; var confl=[];
    for (var i=1;i<data.length;i++){
      var r=data[i]; var tp=r[CONFIG.PRENOTAZIONI_COLS.TARGA-1]; var st=String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]||'');
      if (tp===t && ['Rifiutata','Completata'].indexOf(st)===-1){
        var ie=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]); var fe=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]);
        var ni=new Date(di); var nf=new Date(df);
        if (!(nf<ie || ni>fe)){ disp=false; confl.push({da:ie,a:fe,stato:st}); }
      }
    }
    var shM = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (shM) {
      var dataM = shM.getDataRange().getValues();
      for (var m = 1; m < dataM.length; m++) {
        var mRow = dataM[m];
        var targaMan = mRow[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var dataInizioMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dataFineMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        if (targaMan === t && dataInizioMan && dataFineMan) {
          var manInizio = new Date(dataInizioMan);
          var manFine = new Date(dataFineMan);
          var ni = new Date(di);
          var nf = new Date(df);
          if (!(nf < manInizio || ni > manFine)) {
            disp = false;
            confl.push({
              da: manInizio,
              a: manFine,
              stato: mRow[CONFIG.MANUTENZIONI_COLS.STATO - 1] || 'Manutenzione',
              tipo: 'manutenzione'
            });
          }
        }
      }
    }
    return createJsonResponse({success:true,disponibile:disp,conflitti:confl});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore controllo disponibilita: '+err.message},500);
  }
}

function updateStatiLive(){
  try{
    var now = new Date(); 
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP = ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var valsP = shP.getDataRange().getValues();
    
    var aggiornamenti = 0;
    
    for (var i = 1; i < valsP.length; i++) {
      var r = valsP[i]; 
      var stato = String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '').trim();
      var di = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1]); 
      var df = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1]); 
      
      // Normalizza date (solo anno/mese/giorno, ignora ore)
      var dataInizio = new Date(di.getFullYear(), di.getMonth(), di.getDate());
      var dataFine = new Date(df.getFullYear(), df.getMonth(), df.getDate());
      
      var nuovoStato = stato;
      
      // Skip stati finali o in attesa
      if (stato === 'In attesa' || stato === 'Rifiutata' || stato === 'Completata') {
        continue;
      }
      
      // 🔄 LOGICA CORRETTA DI TRANSIZIONE
      
      // 1️⃣ Se noleggio è CONCLUSO (data fine passata)
      if (today > dataFine) {
        nuovoStato = 'Completata';
      }
      // 2️⃣ Se noleggio è IN CORSO (tra data inizio e data fine, inclusi)
      else if (today >= dataInizio && today <= dataFine) {
        nuovoStato = 'In corso';
      }
      // 3️⃣ Se noleggio è FUTURO e confermato
      else if (today < dataInizio && stato === 'Confermata') {
        nuovoStato = 'Programmata';
      }
      
      // Aggiorna solo se cambiato
      if (nuovoStato !== stato) { 
        shP.getRange(i + 1, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE).setValue(nuovoStato);
        aggiornamenti++;
        Logger.log('[updateStatiLive] Riga ' + (i+1) + ': ' + stato + ' → ' + nuovoStato);
      }
    }
    
    // Gestione manutenzioni (invariata)
    var shM = ss.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (shM) {
      var valsM = shM.getDataRange().getValues();
      for (var j = 1; j < valsM.length; j++) {
        var m = valsM[j]; 
        var ms = String(m[CONFIG.MANUTENZIONI_COLS.STATO - 1] || '').trim();
        var mdi = new Date(m[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1]); 
        var mdf = new Date(m[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1]);
        
        var dataInizioMan = new Date(mdi.getFullYear(), mdi.getMonth(), mdi.getDate());
        var dataFineMan = new Date(mdf.getFullYear(), mdf.getMonth(), mdf.getDate());
        
        var mnext = ms;
        
        // Skip stati finali
        if (ms === 'Completata') continue;
        
        if (today > dataFineMan) {
          mnext = 'Completata';
        } else if (today >= dataInizioMan && today <= dataFineMan) {
          mnext = 'In corso';
        }
        
        if (mnext !== ms) { 
          shM.getRange(j + 1, CONFIG.MANUTENZIONI_COLS.STATO).setValue(mnext);
          aggiornamenti++;
        }
      }
    }
    
    Logger.log('[updateStatiLive] Completato: ' + aggiornamenti + ' stati aggiornati');
    return createJsonResponse({
      success: true, 
      message: 'Stati aggiornati',
      aggiornamenti: aggiornamenti
    });
    
  } catch(err) {
    Logger.log('[updateStatiLive] Errore: ' + err.message);
    return createJsonResponse({
      success: false, 
      message: 'Errore updateStatiLive: ' + err.message
    }, 500);
  }
}


function creaPrenotazione(post){
  try{
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var row=new Array(45); for (var i=0;i<45;i++){ row[i]=''; }
    row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP-1]=new Date();
    row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]=post.autista1&&post.autista1.nomeCompleto?post.autista1.nomeCompleto:(post.autista1&&post.autista1.nome?post.autista1.nome:'');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]=post.autista1&&post.autista1.dataNascita?post.autista1.dataNascita:'';
    row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]=post.autista1&&post.autista1.luogoNascita?post.autista1.luogoNascita:'';
    row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]=post.autista1&&post.autista1.codiceFiscale?post.autista1.codiceFiscale:'';
    row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.comuneResidenza?post.autista1.comuneResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.viaResidenza?post.autista1.viaResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.civicoResidenza?post.autista1.civicoResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]=post.autista1&&post.autista1.numeroPatente?post.autista1.numeroPatente:'';
    row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]=post.autista1&&(post.autista1.inizioValiditaPatente||post.autista1.dataInizioPatente)?(post.autista1.inizioValiditaPatente||post.autista1.dataInizioPatente):'';
    row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]=post.autista1&&post.autista1.scadenzaPatente?post.autista1.scadenzaPatente:'';
    row[CONFIG.PRENOTAZIONI_COLS.TARGA-1]=post.targa||'';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1]=post.oraInizio||'';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1]=post.oraFine||'';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]=post.giornoInizio?new Date(post.giornoInizio):'';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]=post.giornoFine?new Date(post.giornoFine):'';
    row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1]=post.destinazione||'';
    row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]=post.autista1&&post.autista1.cellulare?post.autista1.cellulare:(post.cellulare||'');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO-1]=post.giornoInizio?new Date(post.giornoInizio):'';
    row[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]=post.email||'';
    row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]='In attesa';
    row[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO-1]=post.importo||0;

    if (post.autista2){
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]=post.autista2.nomeCompleto||post.autista2.nome||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]=post.autista2.dataNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]=post.autista2.luogoNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]=post.autista2.codiceFiscale||'';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2-1]=post.autista2.comuneResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2-1]=post.autista2.viaResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2-1]=post.autista2.civicoResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]=post.autista2.numeroPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]=post.autista2.inizioValiditaPatente||post.autista2.dataInizioPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]=post.autista2.scadenzaPatente||'';
    }
    if (post.autista3){
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]=post.autista3.nomeCompleto||post.autista3.nome||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]=post.autista3.dataNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]=post.autista3.luogoNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]=post.autista3.codiceFiscale||'';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3-1]=post.autista3.comuneResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3-1]=post.autista3.viaResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3-1]=post.autista3.civicoResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]=post.autista3.numeroPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]=post.autista3.inizioValiditaPatente||post.autista3.dataInizioPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]=post.autista3.scadenzaPatente||'';
    }

    var id = generaNuovoIdBooking();
    row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE-1]=id;
    sh.appendRow(row);

    if (post.upsertClienti){
      try{
        if (post.autista1 && post.autista1.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista1, true);
        if (post.autista2 && post.autista2.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista2, false);
        if (post.autista3 && post.autista3.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista3, false);
      }catch(e){ console.error('Errore upsert clienti:', e); }
    }

    try{ inviaNotificaTelegram(post); }catch(e){ console.error('Errore invio Telegram:', e); }

    if (post.email){
      try{ inviaEmailConfermaCliente({...post, idPrenotazione:id}); }
      catch(e){ console.error('Errore email conferma cliente:', e); }
    }

    return createJsonResponse({success:true,message:'Prenotazione creata',idPrenotazione:id});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore creazione prenotazione: '+err.message},500);
  }
}

function assegnaIdPrenotazioniEsistenti(){
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: true, message: 'Nessuna prenotazione trovata', processate: 0 });
    }
    
    var prenotazioniPerAnno = {};
    var maxProgressiviPerAnno = {};
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var idEsistente = String(row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '').trim();
      
      var annoPrenotazione;
      var timestamp = row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1];
      var dataContratto = row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1];
      var giornoInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      
      if (timestamp && timestamp instanceof Date) {
        annoPrenotazione = timestamp.getFullYear();
      } else if (dataContratto && dataContratto instanceof Date) {
        annoPrenotazione = dataContratto.getFullYear();
      } else if (giornoInizio && giornoInizio instanceof Date) {
        annoPrenotazione = giornoInizio.getFullYear();
      } else {
        annoPrenotazione = new Date().getFullYear();
      }
      
      if (!prenotazioniPerAnno[annoPrenotazione]) {
        prenotazioniPerAnno[annoPrenotazione] = [];
        maxProgressiviPerAnno[annoPrenotazione] = 0;
      }
      
      prenotazioniPerAnno[annoPrenotazione].push({ riga: i + 1, row: row, idEsistente: idEsistente, anno: annoPrenotazione });
      
      var prefisso = 'BOOK-' + annoPrenotazione + '-';
      if (idEsistente.startsWith(prefisso)) {
        var numero = parseInt(idEsistente.replace(prefisso, ''), 10);
        if (!isNaN(numero) && numero > maxProgressiviPerAnno[annoPrenotazione]) {
          maxProgressiviPerAnno[annoPrenotazione] = numero;
        }
      }
    }
    
    var processate = 0;
    var aggiornate = 0;
    var dettagli = [];
    
    for (var anno in prenotazioniPerAnno) {
      var prossimoProgressivo = maxProgressiviPerAnno[anno] + 1;
      var prefisso = 'BOOK-' + anno + '-';
      
      for (var j = 0; j < prenotazioniPerAnno[anno].length; j++) {
        var prenotazione = prenotazioniPerAnno[anno][j];
        
        if (!prenotazione.idEsistente || prenotazione.idEsistente === '') {
          var nuovoId = prefisso + String(prossimoProgressivo).padStart(3, '0');
          sh.getRange(prenotazione.riga, CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE).setValue(nuovoId);
          dettagli.push({ riga: prenotazione.riga, anno: anno, nuovoId: nuovoId });
          prossimoProgressivo++;
          aggiornate++;
        }
        processate++;
      }
    }
    
    return createJsonResponse({ success: true, message: 'ID assegnati', processate: processate, aggiornate: aggiornate });
    
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

function upsertClienteInCreaPrenotazione(cliente, isPrimary){
  var ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var shC=ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
  var cf=String(cliente.codiceFiscale||'').trim();
  if (!cf||cf.length!==16) return;
  var vals=shC.getDataRange().getValues(); var idx=-1;
  for (var i=1;i<vals.length;i++){ if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){ idx=i; break; } }
  function setValue(colKey, val){ if (val!==undefined && val!==null && val!==''){ if (idx>0){ shC.getRange(idx+1, CONFIG.CLIENTI_COLS[colKey]).setValue(val); } else { return val; } } return ''; }
  if (idx===-1){
    var newRow=new Array(Object.keys(CONFIG.CLIENTI_COLS).length); for (var k=0;k<newRow.length;k++) newRow[k]='';
    newRow[CONFIG.CLIENTI_COLS.NOME-1]=cliente.nomeCompleto||cliente.nome||'';
    newRow[CONFIG.CLIENTI_COLS.DATA_NASCITA-1]=cliente.dataNascita||'';
    newRow[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1]=cliente.luogoNascita||'';
    newRow[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]=cf;
    newRow[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1]=cliente.comuneResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1]=cliente.viaResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1]=cliente.civicoResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1]=cliente.numeroPatente||'';
    newRow[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1]=cliente.inizioValiditaPatente||cliente.dataInizioPatente||'';
    newRow[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1]=cliente.scadenzaPatente||'';
    if (isPrimary){ newRow[CONFIG.CLIENTI_COLS.CELLULARE-1]=cliente.cellulare||''; newRow[CONFIG.CLIENTI_COLS.EMAIL-1]=cliente.email||''; }
    shC.appendRow(newRow);
  } else {
    setValue('NOME', cliente.nomeCompleto||cliente.nome);
    setValue('DATA_NASCITA', cliente.dataNascita);
    setValue('LUOGO_NASCITA', cliente.luogoNascita);
    setValue('COMUNE_RESIDENZA', cliente.comuneResidenza);
    setValue('VIA_RESIDENZA', cliente.viaResidenza);
    setValue('CIVICO_RESIDENZA', cliente.civicoResidenza);
    setValue('NUMERO_PATENTE', cliente.numeroPatente);
    setValue('DATA_INIZIO_PATENTE', cliente.inizioValiditaPatente||cliente.dataInizioPatente);
    setValue('SCADENZA_PATENTE', cliente.scadenzaPatente);
    if (isPrimary){ setValue('CELLULARE', cliente.cellulare); setValue('EMAIL', cliente.email); }
  }
}

function aggiornaCliente(post){
  try{
    var cf=(post.codiceFiscale||'').trim(); if (!cf||cf.length!==16) return createJsonResponse({success:false,message:'Codice fiscale non valido'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    var vals=sh.getDataRange().getValues(); var idx=-1;
    for (var i=1;i<vals.length;i++){ if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){ idx=i; break; } }
    if (idx===-1) return createJsonResponse({success:false,message:'Cliente non trovato'},404);
    function setIf(colKey,val){ if (val!==undefined && val!==null){ sh.getRange(idx+1, CONFIG.CLIENTI_COLS[colKey], 1, 1).setValue(val); } }
    setIf('NOME', post.nome||post.nomeCompleto);
    setIf('LUOGO_NASCITA', post.luogoNascita);
    setIf('COMUNE_RESIDENZA', post.comuneResidenza);
    setIf('VIA_RESIDENZA', post.viaResidenza);
    setIf('CIVICO_RESIDENZA', post.civicoResidenza);
    setIf('NUMERO_PATENTE', post.numeroPatente);
    setIf('DATA_INIZIO_PATENTE', post.inizioValiditaPatente||post.dataInizioPatente);
    setIf('SCADENZA_PATENTE', post.scadenzaPatente);
    setIf('CELLULARE', post.cellulare);
    setIf('EMAIL', post.email);
    return createJsonResponse({success:true,message:'Profilo aggiornato',codiceFiscale:cf});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore aggiornamento cliente: '+err.message},500);
  }
}

function sincronizzaClienti(){
  try{
    var ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP=ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var shC=ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    if (!shP||!shC) return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI o CLIENTI non trovato'},500);
    var pVals=shP.getDataRange().getValues(); var cVals=shC.getDataRange().getValues(); var idxByCF={};
    for (var i=1;i<cVals.length;i++){ var cf=String(cVals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]||'').trim(); if (cf) idxByCF[cf]=i+1; }
    var created=0, updated=0, skipped=0;

    function upsertCliente(data,isPrimary){
      var cf=String(data.codiceFiscale||'').trim();
      if (!cf||cf.length!==16){ skipped++; return; }
      var rowIndex=idxByCF[cf];

      function updateCell(colKey,val){ if (val!==undefined && val!==null && val!==''){ shC.getRange(rowIndex, CONFIG.CLIENTI_COLS[colKey]).setValue(val); } }

      if (!rowIndex){
        var row=new Array(Object.keys(CONFIG.CLIENTI_COLS).length); for (var k=0;k<row.length;k++) row[k]='';
        row[CONFIG.CLIENTI_COLS.NOME-1]=data.nomeCompleto||data.nome||'';
        row[CONFIG.CLIENTI_COLS.DATA_NASCITA-1]=data.dataNascita||'';
        row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1]=data.luogoNascita||'';
        row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]=cf;
        row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1]=data.comuneResidenza||'';
        row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1]=data.viaResidenza||'';
        row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1]=data.civicoResidenza||'';
        row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1]=data.numeroPatente||'';
        row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1]=data.inizioValiditaPatente||data.dataInizioPatente||'';
        row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1]=data.scadenzaPatente||'';
        if (isPrimary){ row[CONFIG.CLIENTI_COLS.CELLULARE-1]=data.cellulare||''; row[CONFIG.CLIENTI_COLS.EMAIL-1]=data.email||''; }
        shC.appendRow(row); var last=shC.getLastRow(); idxByCF[cf]=last; created++;
      } else {
        updateCell('NOME', data.nomeCompleto||data.nome||''); updateCell('DATA_NASCITA', data.dataNascita||''); updateCell('LUOGO_NASCITA', data.luogoNascita||'');
        updateCell('COMUNE_RESIDENZA', data.comuneResidenza||''); updateCell('VIA_RESIDENZA', data.viaResidenza||''); updateCell('CIVICO_RESIDENZA', data.civicoResidenza||'');
        updateCell('NUMERO_PATENTE', data.numeroPatente||''); updateCell('DATA_INIZIO_PATENTE', data.inizioValiditaPatente||data.dataInizioPatente||''); updateCell('SCADENZA_PATENTE', data.scadenzaPatente||'');
        if (isPrimary){ updateCell('CELLULARE', data.cellulare||''); updateCell('EMAIL', data.email||''); } updated++;
      }
    }

    for (var r=1;r<pVals.length;r++){
      var row=pVals[r];
      var a1={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]||'', cellulare:row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]||'', email:row[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]||'' };
      var a2={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]||'' };
      var a3={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]||'' };
      if (a1.codiceFiscale) upsertCliente(a1,true);
      if (a2.codiceFiscale) upsertCliente(a2,false);
      if (a3.codiceFiscale) upsertCliente(a3,false);
    }
    return createJsonResponse({success:true,message:'Sincronizzazione CLIENTI completata',created:created,updated:updated,skipped:skipped});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore sincronizzaClienti: '+err.message},500);
  }
}

function inviaNotificaTelegram(pren){
  try{
    var msg=['🚐 NUOVA PRENOTAZIONE IN ATTESA','','📋 Riepilogo:','🚗 Veicolo: '+(pren.targa||'-'),'📅 Dal: '+(pren.giornoInizio||'-')+' '+(pren.oraInizio||'-'),'📅 Al: '+(pren.giornoFine||'-')+' '+(pren.oraFine||'-'),'📍 Destinazione: '+(pren.destinazione||'Non specificata'),'','👤 Autista principale:','👨‍💼 '+(pren.autista1&&pren.autista1.nomeCompleto||'-'),'🆔 '+(pren.autista1&&pren.autista1.codiceFiscale||'-'),'📱 '+(pren.autista1&&pren.autista1.cellulare||'-'),'📧 '+(pren.email||'Non fornita'),'','⏰ Ricevuta: '+new Date().toLocaleString('it-IT'),'🔄 Stato: In attesa','','Accedi alla dashboard per confermare.'].join('\n');
    var url='https://api.telegram.org/bot'+CONFIG.TELEGRAM.BOT_TOKEN+'/sendMessage';
    var payload={ chat_id:CONFIG.TELEGRAM.CHAT_ID, text:msg, parse_mode:'Markdown' };
    UrlFetchApp.fetch(url,{method:'post', contentType:'application/json', payload:JSON.stringify(payload)});
  }catch(e){ Logger.log('Errore invio Telegram: '+(e&&e.message)); }
}

function inviaEmailConfermaCliente(prenotazione){
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
    MailApp.sendEmail({ to: prenotazione.email, subject: "Conferma Prenotazione - Imbriani Stefano Noleggio", htmlBody: html, name: CONFIG.EMAIL.FROM_NAME });
  } catch (error) {
    Logger.log('Errore invio email conferma cliente: ' + error.message);
  }
}

function inviaEmailConfermaPreventivo(prenotazione){
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
    MailApp.sendEmail({ to: prenotazione.email, subject: "Prenotazione Confermata - Imbriani Stefano Noleggio", htmlBody: html, name: CONFIG.EMAIL.FROM_NAME });
  } catch (error) {
    Logger.log('Errore invio email conferma preventivo: ' + error.message);
  }
}

function checkReminderEmails(){
  try {
    var oggi = new Date();
    var treGiorni = new Date(oggi.getTime() + (3 * 24 * 60 * 60 * 1000));
    var y = treGiorni.getFullYear(), m = String(treGiorni.getMonth() + 1).padStart(2, '0'), d = String(treGiorni.getDate()).padStart(2, '0');
    var treGiorniStr = y+'-'+m+'-'+d;
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var sent = 0;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stato = String(row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '');
      var dataInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var email = row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1];
      if (stato === 'Confermata' && email && dataInizio) {
        var di = new Date(dataInizio);
        var diStr = di.getFullYear()+'-'+String(di.getMonth()+1).padStart(2,'0')+'-'+String(di.getDate()).padStart(2,'0');
        if (diStr === treGiorniStr) {
          var prenotazione = { idPrenotazione: row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1], targa: row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1], giornoInizio: dataInizio, giornoFine: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1], oraInizio: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1], oraFine: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1], destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1], email: email, autista1: { nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] } };
          try { inviaEmailReminder(prenotazione); sent++; }
          catch (e) { console.error('Errore invio email reminder per '+email+':', e); }
        }
      }
    }
    return createJsonResponse({success: true, message: 'Check reminder completato', emailInviate: sent});
  } catch (err) {
    return createJsonResponse({success: false, message: 'Errore check reminder: ' + err.message}, 500);
  }
}

function inviaEmailReminder(prenotazione){
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
    MailApp.sendEmail({ to: prenotazione.email, subject: "Promemoria Partenza - Imbriani Stefano Noleggio", htmlBody: html, name: CONFIG.EMAIL.FROM_NAME });
  } catch (error) {
    Logger.log('Errore invio email reminder: ' + error.message);
  }
}

function setupDailyTrigger(){
  var triggers = ScriptApp.getProjectTriggers();
  for (var i=0;i<triggers.length;i++){
    if (triggers[i].getHandlerFunction()==='dailyReminderCheck'){ ScriptApp.deleteTrigger(triggers[i]); }
  }
  ScriptApp.newTrigger('dailyReminderCheck').timeBased().everyDays(1).atHour(9).create();
  Logger.log('Trigger giornaliero configurato per le 09:00');
}

function dailyReminderCheck(){
  try{ checkReminderEmails(); updateStatiLive(); Logger.log('Check giornaliero completato: '+new Date().toISOString()); }
  catch (error){ Logger.log('Errore nel check giornaliero: '+error.message); }
}

function testEmailConferma(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var prenotazioneDemo = { idPrenotazione: 'BOOK-2025-TEST', targa: 'EC787NM', modello: 'Mercedes Sprinter 9 Posti', giornoInizio: new Date(2025, 10, 15), giornoFine: new Date(2025, 10, 18), oraInizio: '09:00', oraFine: '18:00', destinazione: 'Roma - Tour Colosseo e Vaticano', email: destinatario, autista1: { nomeCompleto: 'Mario Rossi' } };
  try {
    inviaEmailConfermaCliente(prenotazioneDemo);
    return createJsonResponse({ success: true, message: 'Email conferma test inviata a ' + destinatario });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

function testEmailReminder(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var prenotazioneDemo = { idPrenotazione: 'BOOK-2025-REMINDER', targa: 'FG123AB', modello: 'Fiat Ducato Passo Lungo', giornoInizio: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), giornoFine: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), oraInizio: '10:00', oraFine: '17:00', destinazione: 'Napoli - Matrimonio', email: destinatario, autista1: { nomeCompleto: 'Luigi Verdi' } };
  try {
    inviaEmailReminder(prenotazioneDemo);
    return createJsonResponse({ success: true, message: 'Email reminder test inviata a ' + destinatario });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

function testEmailConfermaPreventivo(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var demo = { idPrenotazione: 'BOOK-2025-CONF', targa: 'BW123XY', modello: 'Opel Vivaro', giornoInizio: new Date(2025, 10, 22), giornoFine: new Date(2025, 10, 23), oraInizio: '08:00', oraFine: '19:00', destinazione: 'Firenze - Meeting', email: destinatario, autista1: { nomeCompleto: 'Antonio Bianchi' } };
  try {
    inviaEmailConfermaPreventivo(demo);
    return createJsonResponse({ success: true, message: 'Email conferma preventivo test inviata a ' + destinatario });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

/**
 * CENSIMENTO PDF ESISTENTI v2 - Con normalizzazione nome
 * Supporta sia "GiulioStefanizzi" che "Giulio_Stefanizzi"
 */
function censisciPDFEsistenti() {
  Logger.log('[censisciPDFEsistenti] Avvio censimento v2...');
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: false, message: 'Nessuna prenotazione trovata' });
    }
    
    // Ottieni tutti i PDF dalla cartella
    var folder = DriveApp.getFolderById(CONFIG.PDF.PDF_FOLDER_ID);
    var files = folder.getFiles();
    var pdfMap = {};
    
    Logger.log('[censisciPDFEsistenti] Scansione cartella PDF...');
    
    // Costruisci mappa PDF: nome file -> URL
    while (files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() === MimeType.PDF) {
        var nomePdf = file.getName();
        pdfMap[nomePdf] = file.getUrl();
        Logger.log('[censisciPDFEsistenti] PDF trovato: ' + nomePdf);
      }
    }
    
    Logger.log('[censisciPDFEsistenti] Trovati ' + Object.keys(pdfMap).length + ' PDF');
    
    var trovati = 0;
    var aggiornati = 0;
    var giàCollegati = 0;
    
    // Funzione helper per normalizzare nomi
    function normalizzaNome(nomeCompleto) {
      if (!nomeCompleto) return '';
      
      // Rimuovi spazi multipli e trim
      var nome = String(nomeCompleto).trim().replace(/\s+/g, ' ');
      
      // Genera 3 varianti:
      // 1. Con underscore: "Giulio_Stefanizzi"
      // 2. Senza spazi: "GiulioStefanizzi"
      // 3. CamelCase invertito: "StefanizziGiulio" (alcuni PDF potrebbero avere cognome prima)
      
      var conUnderscore = nome.replace(/\s+/g, '_');
      var senzaSpazi = nome.replace(/\s+/g, '');
      
      return {
        conUnderscore: conUnderscore,
        senzaSpazi: senzaSpazi,
        originale: nome
      };
    }
    
    // Formatta date come nel generatore PDF
    function formatDateForFilename(date) {
      if (date instanceof Date && !isNaN(date.getTime())) {
        var d = Utilities.formatDate(date, CONFIG.PDF.TIMEZONE, 'dd/MM/yyyy');
        return d.replace(/\//g, '-');
      }
      return '';
    }
    
    // Itera su prenotazioni
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowIndex = i + 1;
      
      var nomeClienteOriginale = String(row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || '');
      var giornoInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var giornoFine = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1];
      var pdfUrlEsistente = String(row[CONFIG.PRENOTAZIONI_COLS.PDF_URL - 1] || '').trim();
      
      // Salta se mancano dati
      if (!nomeClienteOriginale || !giornoInizio || !giornoFine) {
        continue;
      }
      
      var nomiVarianti = normalizzaNome(nomeClienteOriginale);
      var dataRitiro = formatDateForFilename(new Date(giornoInizio));
      var dataArrivo = formatDateForFilename(new Date(giornoFine));
      
      // Prova tutte le varianti di nome
      var varianti = [
        nomiVarianti.senzaSpazi + '_' + dataRitiro + '_' + dataArrivo + '.pdf',
        nomiVarianti.conUnderscore + '_' + dataRitiro + '_' + dataArrivo + '.pdf'
      ];
      
      Logger.log('[censisciPDFEsistenti] Riga ' + rowIndex + ': Varianti = ' + JSON.stringify(varianti));
      
      var pdfTrovato = null;
      
      // Cerca ogni variante
      for (var v = 0; v < varianti.length; v++) {
        if (pdfMap[varianti[v]]) {
          pdfTrovato = pdfMap[varianti[v]];
          Logger.log('[censisciPDFEsistenti] ✅ Match trovato: ' + varianti[v]);
          break;
        }
      }
      
      if (pdfTrovato) {
        trovati++;
        
        // Aggiorna solo se non c'è già un URL
        if (!pdfUrlEsistente) {
          sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.PDF_URL).setValue(pdfTrovato);
          aggiornati++;
          Logger.log('[censisciPDFEsistenti] ✅ Collegato PDF per riga ' + rowIndex);
        } else {
          giàCollegati++;
          Logger.log('[censisciPDFEsistenti] ⏭️ Già collegato per riga ' + rowIndex);
        }
      } else {
        Logger.log('[censisciPDFEsistenti] ❌ PDF non trovato per riga ' + rowIndex);
      }
    }
    
    Logger.log('[censisciPDFEsistenti] Censimento completato');
    Logger.log('[censisciPDFEsistenti] Trovati: ' + trovati + ' | Aggiornati: ' + aggiornati + ' | Già collegati: ' + giàCollegati);
    
    return createJsonResponse({
      success: true,
      message: 'Censimento completato',
      pdfTrovati: trovati,
      recordAggiornati: aggiornati,
      giàCollegati: giàCollegati,
      pdfNellaCartella: Object.keys(pdfMap).length
    });
    
  } catch (err) {
    Logger.log('[censisciPDFEsistenti] Errore: ' + err.message);
    return createJsonResponse({ success: false, message: 'Errore censimento: ' + err.message }, 500);
  }
}


function checkDisponibilita(p){
  try{
    var t=p.targa, di=p.dataInizio, df=p.dataFine;
    if (!t||!di||!df) return createJsonResponse({success:false,message:'Parametri mancanti: targa, dataInizio, dataFine'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data=sh.getDataRange().getValues(); var disp=true; var confl=[];
    for (var i=1;i<data.length;i++){
      var r=data[i]; var tp=r[CONFIG.PRENOTAZIONI_COLS.TARGA-1]; var st=String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]||'');
      if (tp===t && ['Rifiutata','Completata'].indexOf(st)===-1){
        var ie=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]); var fe=new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]);
        var ni=new Date(di); var nf=new Date(df);
        if (!(nf<ie || ni>fe)){ disp=false; confl.push({da:ie,a:fe,stato:st}); }
      }
    }
    var shM = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (shM) {
      var dataM = shM.getDataRange().getValues();
      for (var m = 1; m < dataM.length; m++) {
        var mRow = dataM[m];
        var targaMan = mRow[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var dataInizioMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dataFineMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        if (targaMan === t && dataInizioMan && dataFineMan) {
          var manInizio = new Date(dataInizioMan);
          var manFine = new Date(dataFineMan);
          var ni = new Date(di);
          var nf = new Date(df);
          if (!(nf < manInizio || ni > manFine)) {
            disp = false;
            confl.push({
              da: manInizio,
              a: manFine,
              stato: mRow[CONFIG.MANUTENZIONI_COLS.STATO - 1] || 'Manutenzione',
              tipo: 'manutenzione'
            });
          }
        }
      }
    }
    return createJsonResponse({success:true,disponibile:disp,conflitti:confl});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore controllo disponibilita: '+err.message},500);
  }
}

function updateStatiLive(){
  try{
    var now = new Date(); 
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP = ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var valsP = shP.getDataRange().getValues();
    
    var aggiornamenti = 0;
    
    for (var i = 1; i < valsP.length; i++) {
      var r = valsP[i]; 
      var stato = String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '').trim();
      var di = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1]); 
      var df = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1]); 
      
      // Normalizza date (solo anno/mese/giorno, ignora ore)
      var dataInizio = new Date(di.getFullYear(), di.getMonth(), di.getDate());
      var dataFine = new Date(df.getFullYear(), df.getMonth(), df.getDate());
      
      var nuovoStato = stato;
      
      // Skip stati finali o in attesa
      if (stato === 'In attesa' || stato === 'Rifiutata' || stato === 'Completata') {
        continue;
      }
      
      // 🔄 LOGICA CORRETTA DI TRANSIZIONE
      
      // 1️⃣ Se noleggio è CONCLUSO (data fine passata)
      if (today > dataFine) {
        nuovoStato = 'Completata';
      }
      // 2️⃣ Se noleggio è IN CORSO (tra data inizio e data fine, inclusi)
      else if (today >= dataInizio && today <= dataFine) {
        nuovoStato = 'In corso';
      }
      // 3️⃣ Se noleggio è FUTURO e confermato
      else if (today < dataInizio && stato === 'Confermata') {
        nuovoStato = 'Programmata';
      }
      
      // Aggiorna solo se cambiato
      if (nuovoStato !== stato) { 
        shP.getRange(i + 1, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE).setValue(nuovoStato);
        aggiornamenti++;
        Logger.log('[updateStatiLive] Riga ' + (i+1) + ': ' + stato + ' → ' + nuovoStato);
      }
    }
    
    // Gestione manutenzioni (invariata)
    var shM = ss.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (shM) {
      var valsM = shM.getDataRange().getValues();
      for (var j = 1; j < valsM.length; j++) {
        var m = valsM[j]; 
        var ms = String(m[CONFIG.MANUTENZIONI_COLS.STATO - 1] || '').trim();
        var mdi = new Date(m[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1]); 
        var mdf = new Date(m[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1]);
        
        var dataInizioMan = new Date(mdi.getFullYear(), mdi.getMonth(), mdi.getDate());
        var dataFineMan = new Date(mdf.getFullYear(), mdf.getMonth(), mdf.getDate());
        
        var mnext = ms;
        
        // Skip stati finali
        if (ms === 'Completata') continue;
        
        if (today > dataFineMan) {
          mnext = 'Completata';
        } else if (today >= dataInizioMan && today <= dataFineMan) {
          mnext = 'In corso';
        }
        
        if (mnext !== ms) { 
          shM.getRange(j + 1, CONFIG.MANUTENZIONI_COLS.STATO).setValue(mnext);
          aggiornamenti++;
        }
      }
    }
    
    Logger.log('[updateStatiLive] Completato: ' + aggiornamenti + ' stati aggiornati');
    return createJsonResponse({
      success: true, 
      message: 'Stati aggiornati',
      aggiornamenti: aggiornamenti
    });
    
  } catch(err) {
    Logger.log('[updateStatiLive] Errore: ' + err.message);
    return createJsonResponse({
      success: false, 
      message: 'Errore updateStatiLive: ' + err.message
    }, 500);
  }
}


function creaPrenotazione(post){
  try{
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var row=new Array(45); for (var i=0;i<45;i++){ row[i]=''; }
    row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP-1]=new Date();
    row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]=post.autista1&&post.autista1.nomeCompleto?post.autista1.nomeCompleto:(post.autista1&&post.autista1.nome?post.autista1.nome:'');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]=post.autista1&&post.autista1.dataNascita?post.autista1.dataNascita:'';
    row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]=post.autista1&&post.autista1.luogoNascita?post.autista1.luogoNascita:'';
    row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]=post.autista1&&post.autista1.codiceFiscale?post.autista1.codiceFiscale:'';
    row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.comuneResidenza?post.autista1.comuneResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.viaResidenza?post.autista1.viaResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1-1]=post.autista1&&post.autista1.civicoResidenza?post.autista1.civicoResidenza:'';
    row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]=post.autista1&&post.autista1.numeroPatente?post.autista1.numeroPatente:'';
    row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]=post.autista1&&(post.autista1.inizioValiditaPatente||post.autista1.dataInizioPatente)?(post.autista1.inizioValiditaPatente||post.autista1.dataInizioPatente):'';
    row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]=post.autista1&&post.autista1.scadenzaPatente?post.autista1.scadenzaPatente:'';
    row[CONFIG.PRENOTAZIONI_COLS.TARGA-1]=post.targa||'';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1]=post.oraInizio||'';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1]=post.oraFine||'';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]=post.giornoInizio?new Date(post.giornoInizio):'';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]=post.giornoFine?new Date(post.giornoFine):'';
    row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1]=post.destinazione||'';
    row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]=post.autista1&&post.autista1.cellulare?post.autista1.cellulare:(post.cellulare||'');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO-1]=post.giornoInizio?new Date(post.giornoInizio):'';
    row[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]=post.email||'';
    row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]='In attesa';
    row[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO-1]=post.importo||0;

    if (post.autista2){
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]=post.autista2.nomeCompleto||post.autista2.nome||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]=post.autista2.dataNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]=post.autista2.luogoNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]=post.autista2.codiceFiscale||'';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2-1]=post.autista2.comuneResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2-1]=post.autista2.viaResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2-1]=post.autista2.civicoResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]=post.autista2.numeroPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]=post.autista2.inizioValiditaPatente||post.autista2.dataInizioPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]=post.autista2.scadenzaPatente||'';
    }
    if (post.autista3){
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]=post.autista3.nomeCompleto||post.autista3.nome||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]=post.autista3.dataNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]=post.autista3.luogoNascita||'';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]=post.autista3.codiceFiscale||'';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3-1]=post.autista3.comuneResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3-1]=post.autista3.viaResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3-1]=post.autista3.civicoResidenza||'';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]=post.autista3.numeroPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]=post.autista3.inizioValiditaPatente||post.autista3.dataInizioPatente||'';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]=post.autista3.scadenzaPatente||'';
    }

    var id = generaNuovoIdBooking();
    row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE-1]=id;
    sh.appendRow(row);

    if (post.upsertClienti){
      try{
        if (post.autista1 && post.autista1.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista1, true);
        if (post.autista2 && post.autista2.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista2, false);
        if (post.autista3 && post.autista3.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista3, false);
      }catch(e){ console.error('Errore upsert clienti:', e); }
    }

    try{ inviaNotificaTelegram(post); }catch(e){ console.error('Errore invio Telegram:', e); }

    if (post.email){
      try{ inviaEmailConfermaCliente({...post, idPrenotazione:id}); }
      catch(e){ console.error('Errore email conferma cliente:', e); }
    }

    return createJsonResponse({success:true,message:'Prenotazione creata',idPrenotazione:id});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore creazione prenotazione: '+err.message},500);
  }
}

function assegnaIdPrenotazioniEsistenti(){
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: true, message: 'Nessuna prenotazione trovata', processate: 0 });
    }
    
    var prenotazioniPerAnno = {};
    var maxProgressiviPerAnno = {};
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var idEsistente = String(row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '').trim();
      
      var annoPrenotazione;
      var timestamp = row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1];
      var dataContratto = row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1];
      var giornoInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      
      if (timestamp && timestamp instanceof Date) {
        annoPrenotazione = timestamp.getFullYear();
      } else if (dataContratto && dataContratto instanceof Date) {
        annoPrenotazione = dataContratto.getFullYear();
      } else if (giornoInizio && giornoInizio instanceof Date) {
        annoPrenotazione = giornoInizio.getFullYear();
      } else {
        annoPrenotazione = new Date().getFullYear();
      }
      
      if (!prenotazioniPerAnno[annoPrenotazione]) {
        prenotazioniPerAnno[annoPrenotazione] = [];
        maxProgressiviPerAnno[annoPrenotazione] = 0;
      }
      
      prenotazioniPerAnno[annoPrenotazione].push({ riga: i + 1, row: row, idEsistente: idEsistente, anno: annoPrenotazione });
      
      var prefisso = 'BOOK-' + annoPrenotazione + '-';
      if (idEsistente.startsWith(prefisso)) {
        var numero = parseInt(idEsistente.replace(prefisso, ''), 10);
        if (!isNaN(numero) && numero > maxProgressiviPerAnno[annoPrenotazione]) {
          maxProgressiviPerAnno[annoPrenotazione] = numero;
        }
      }
    }
    
    var processate = 0;
    var aggiornate = 0;
    var dettagli = [];
    
    for (var anno in prenotazioniPerAnno) {
      var prossimoProgressivo = maxProgressiviPerAnno[anno] + 1;
      var prefisso = 'BOOK-' + anno + '-';
      
      for (var j = 0; j < prenotazioniPerAnno[anno].length; j++) {
        var prenotazione = prenotazioniPerAnno[anno][j];
        
        if (!prenotazione.idEsistente || prenotazione.idEsistente === '') {
          var nuovoId = prefisso + String(prossimoProgressivo).padStart(3, '0');
          sh.getRange(prenotazione.riga, CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE).setValue(nuovoId);
          dettagli.push({ riga: prenotazione.riga, anno: anno, nuovoId: nuovoId });
          prossimoProgressivo++;
          aggiornate++;
        }
        processate++;
      }
    }
    
    return createJsonResponse({ success: true, message: 'ID assegnati', processate: processate, aggiornate: aggiornate });
    
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

function upsertClienteInCreaPrenotazione(cliente, isPrimary){
  var ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var shC=ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
  var cf=String(cliente.codiceFiscale||'').trim();
  if (!cf||cf.length!==16) return;
  var vals=shC.getDataRange().getValues(); var idx=-1;
  for (var i=1;i<vals.length;i++){ if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){ idx=i; break; } }
  function setValue(colKey, val){ if (val!==undefined && val!==null && val!==''){ if (idx>0){ shC.getRange(idx+1, CONFIG.CLIENTI_COLS[colKey]).setValue(val); } else { return val; } } return ''; }
  if (idx===-1){
    var newRow=new Array(Object.keys(CONFIG.CLIENTI_COLS).length); for (var k=0;k<newRow.length;k++) newRow[k]='';
    newRow[CONFIG.CLIENTI_COLS.NOME-1]=cliente.nomeCompleto||cliente.nome||'';
    newRow[CONFIG.CLIENTI_COLS.DATA_NASCITA-1]=cliente.dataNascita||'';
    newRow[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1]=cliente.luogoNascita||'';
    newRow[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]=cf;
    newRow[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1]=cliente.comuneResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1]=cliente.viaResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1]=cliente.civicoResidenza||'';
    newRow[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1]=cliente.numeroPatente||'';
    newRow[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1]=cliente.inizioValiditaPatente||cliente.dataInizioPatente||'';
    newRow[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1]=cliente.scadenzaPatente||'';
    if (isPrimary){ newRow[CONFIG.CLIENTI_COLS.CELLULARE-1]=cliente.cellulare||''; newRow[CONFIG.CLIENTI_COLS.EMAIL-1]=cliente.email||''; }
    shC.appendRow(newRow);
  } else {
    setValue('NOME', cliente.nomeCompleto||cliente.nome);
    setValue('DATA_NASCITA', cliente.dataNascita);
    setValue('LUOGO_NASCITA', cliente.luogoNascita);
    setValue('COMUNE_RESIDENZA', cliente.comuneResidenza);
    setValue('VIA_RESIDENZA', cliente.viaResidenza);
    setValue('CIVICO_RESIDENZA', cliente.civicoResidenza);
    setValue('NUMERO_PATENTE', cliente.numeroPatente);
    setValue('DATA_INIZIO_PATENTE', cliente.inizioValiditaPatente||cliente.dataInizioPatente);
    setValue('SCADENZA_PATENTE', cliente.scadenzaPatente);
    if (isPrimary){ setValue('CELLULARE', cliente.cellulare); setValue('EMAIL', cliente.email); }
  }
}

function aggiornaCliente(post){
  try{
    var cf=(post.codiceFiscale||'').trim(); if (!cf||cf.length!==16) return createJsonResponse({success:false,message:'Codice fiscale non valido'},400);
    var sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    var vals=sh.getDataRange().getValues(); var idx=-1;
    for (var i=1;i<vals.length;i++){ if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){ idx=i; break; } }
    if (idx===-1) return createJsonResponse({success:false,message:'Cliente non trovato'},404);
    function setIf(colKey,val){ if (val!==undefined && val!==null){ sh.getRange(idx+1, CONFIG.CLIENTI_COLS[colKey], 1, 1).setValue(val); } }
    setIf('NOME', post.nome||post.nomeCompleto);
    setIf('LUOGO_NASCITA', post.luogoNascita);
    setIf('COMUNE_RESIDENZA', post.comuneResidenza);
    setIf('VIA_RESIDENZA', post.viaResidenza);
    setIf('CIVICO_RESIDENZA', post.civicoResidenza);
    setIf('NUMERO_PATENTE', post.numeroPatente);
    setIf('DATA_INIZIO_PATENTE', post.inizioValiditaPatente||post.dataInizioPatente);
    setIf('SCADENZA_PATENTE', post.scadenzaPatente);
    setIf('CELLULARE', post.cellulare);
    setIf('EMAIL', post.email);
    return createJsonResponse({success:true,message:'Profilo aggiornato',codiceFiscale:cf});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore aggiornamento cliente: '+err.message},500);
  }
}

function sincronizzaClienti(){
  try{
    var ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP=ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var shC=ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    if (!shP||!shC) return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI o CLIENTI non trovato'},500);
    var pVals=shP.getDataRange().getValues(); var cVals=shC.getDataRange().getValues(); var idxByCF={};
    for (var i=1;i<cVals.length;i++){ var cf=String(cVals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]||'').trim(); if (cf) idxByCF[cf]=i+1; }
    var created=0, updated=0, skipped=0;

    function upsertCliente(data,isPrimary){
      var cf=String(data.codiceFiscale||'').trim();
      if (!cf||cf.length!==16){ skipped++; return; }
      var rowIndex=idxByCF[cf];

      function updateCell(colKey,val){ if (val!==undefined && val!==null && val!==''){ shC.getRange(rowIndex, CONFIG.CLIENTI_COLS[colKey]).setValue(val); } }

      if (!rowIndex){
        var row=new Array(Object.keys(CONFIG.CLIENTI_COLS).length); for (var k=0;k<row.length;k++) row[k]='';
        row[CONFIG.CLIENTI_COLS.NOME-1]=data.nomeCompleto||data.nome||'';
        row[CONFIG.CLIENTI_COLS.DATA_NASCITA-1]=data.dataNascita||'';
        row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1]=data.luogoNascita||'';
        row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]=cf;
        row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1]=data.comuneResidenza||'';
        row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1]=data.viaResidenza||'';
        row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1]=data.civicoResidenza||'';
        row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1]=data.numeroPatente||'';
        row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1]=data.inizioValiditaPatente||data.dataInizioPatente||'';
        row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1]=data.scadenzaPatente||'';
        if (isPrimary){ row[CONFIG.CLIENTI_COLS.CELLULARE-1]=data.cellulare||''; row[CONFIG.CLIENTI_COLS.EMAIL-1]=data.email||''; }
        shC.appendRow(row); var last=shC.getLastRow(); idxByCF[cf]=last; created++;
      } else {
        updateCell('NOME', data.nomeCompleto||data.nome||''); updateCell('DATA_NASCITA', data.dataNascita||''); updateCell('LUOGO_NASCITA', data.luogoNascita||'');
        updateCell('COMUNE_RESIDENZA', data.comuneResidenza||''); updateCell('VIA_RESIDENZA', data.viaResidenza||''); updateCell('CIVICO_RESIDENZA', data.civicoResidenza||'');
        updateCell('NUMERO_PATENTE', data.numeroPatente||''); updateCell('DATA_INIZIO_PATENTE', data.inizioValiditaPatente||data.dataInizioPatente||''); updateCell('SCADENZA_PATENTE', data.scadenzaPatente||'');
        if (isPrimary){ updateCell('CELLULARE', data.cellulare||''); updateCell('EMAIL', data.email||''); } updated++;
      }
    }

    for (var r=1;r<pVals.length;r++){
      var row=pVals[r];
      var a1={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]||'', cellulare:row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]||'', email:row[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]||'' };
      var a2={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]||'' };
      var a3={ nomeCompleto:row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]||'', dataNascita:row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]||'', luogoNascita:row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]||'', codiceFiscale:row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]||'', comuneResidenza:row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3-1]||'', viaResidenza:row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3-1]||'', civicoResidenza:row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3-1]||'', numeroPatente:row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]||'', inizioValiditaPatente:row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]||'', scadenzaPatente:row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]||'' };
      if (a1.codiceFiscale) upsertCliente(a1,true);
      if (a2.codiceFiscale) upsertCliente(a2,false);
      if (a3.codiceFiscale) upsertCliente(a3,false);
    }
    return createJsonResponse({success:true,message:'Sincronizzazione CLIENTI completata',created:created,updated:updated,skipped:skipped});
  }catch(err){
    return createJsonResponse({success:false,message:'Errore sincronizzaClienti: '+err.message},500);
  }
}

function inviaNotificaTelegram(pren){
  try{
    var msg=['🚐 NUOVA PRENOTAZIONE IN ATTESA','','📋 Riepilogo:','🚗 Veicolo: '+(pren.targa||'-'),'📅 Dal: '+(pren.giornoInizio||'-')+' '+(pren.oraInizio||'-'),'📅 Al: '+(pren.giornoFine||'-')+' '+(pren.oraFine||'-'),'📍 Destinazione: '+(pren.destinazione||'Non specificata'),'','👤 Autista principale:','👨‍💼 '+(pren.autista1&&pren.autista1.nomeCompleto||'-'),'🆔 '+(pren.autista1&&pren.autista1.codiceFiscale||'-'),'📱 '+(pren.autista1&&pren.autista1.cellulare||'-'),'📧 '+(pren.email||'Non fornita'),'','⏰ Ricevuta: '+new Date().toLocaleString('it-IT'),'🔄 Stato: In attesa','','Accedi alla dashboard per confermare.'].join('\n');
    var url='https://api.telegram.org/bot'+CONFIG.TELEGRAM.BOT_TOKEN+'/sendMessage';
    var payload={ chat_id:CONFIG.TELEGRAM.CHAT_ID, text:msg, parse_mode:'Markdown' };
    UrlFetchApp.fetch(url,{method:'post', contentType:'application/json', payload:JSON.stringify(payload)});
  }catch(e){ Logger.log('Errore invio Telegram: '+(e&&e.message)); }
}

function inviaEmailConfermaCliente(prenotazione){
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
    MailApp.sendEmail({ to: prenotazione.email, subject: "Conferma Prenotazione - Imbriani Stefano Noleggio", htmlBody: html, name: CONFIG.EMAIL.FROM_NAME });
  } catch (error) {
    Logger.log('Errore invio email conferma cliente: ' + error.message);
  }
}

function inviaEmailConfermaPreventivo(prenotazione){
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
    MailApp.sendEmail({ to: prenotazione.email, subject: "Prenotazione Confermata - Imbriani Stefano Noleggio", htmlBody: html, name: CONFIG.EMAIL.FROM_NAME });
  } catch (error) {
    Logger.log('Errore invio email conferma preventivo: ' + error.message);
  }
}

function checkReminderEmails(){
  try {
    var oggi = new Date();
    var treGiorni = new Date(oggi.getTime() + (3 * 24 * 60 * 60 * 1000));
    var y = treGiorni.getFullYear(), m = String(treGiorni.getMonth() + 1).padStart(2, '0'), d = String(treGiorni.getDate()).padStart(2, '0');
    var treGiorniStr = y+'-'+m+'-'+d;
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var sent = 0;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var stato = String(row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '');
      var dataInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var email = row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1];
      if (stato === 'Confermata' && email && dataInizio) {
        var di = new Date(dataInizio);
        var diStr = di.getFullYear()+'-'+String(di.getMonth()+1).padStart(2,'0')+'-'+String(di.getDate()).padStart(2,'0');
        if (diStr === treGiorniStr) {
          var prenotazione = { idPrenotazione: row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1], targa: row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1], giornoInizio: dataInizio, giornoFine: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1], oraInizio: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1], oraFine: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1], destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1], email: email, autista1: { nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] } };
          try { inviaEmailReminder(prenotazione); sent++; }
          catch (e) { console.error('Errore invio email reminder per '+email+':', e); }
        }
      }
    }
    return createJsonResponse({success: true, message: 'Check reminder completato', emailInviate: sent});
  } catch (err) {
    return createJsonResponse({success: false, message: 'Errore check reminder: ' + err.message}, 500);
  }
}

function inviaEmailReminder(prenotazione){
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
    MailApp.sendEmail({ to: prenotazione.email, subject: "Promemoria Partenza - Imbriani Stefano Noleggio", htmlBody: html, name: CONFIG.EMAIL.FROM_NAME });
  } catch (error) {
    Logger.log('Errore invio email reminder: ' + error.message);
  }
}

function setupDailyTrigger(){
  var triggers = ScriptApp.getProjectTriggers();
  for (var i=0;i<triggers.length;i++){
    if (triggers[i].getHandlerFunction()==='dailyReminderCheck'){ ScriptApp.deleteTrigger(triggers[i]); }
  }
  ScriptApp.newTrigger('dailyReminderCheck').timeBased().everyDays(1).atHour(9).create();
  Logger.log('Trigger giornaliero configurato per le 09:00');
}

function dailyReminderCheck(){
  try{ checkReminderEmails(); updateStatiLive(); Logger.log('Check giornaliero completato: '+new Date().toISOString()); }
  catch (error){ Logger.log('Errore nel check giornaliero: '+error.message); }
}

function testEmailConferma(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var prenotazioneDemo = { idPrenotazione: 'BOOK-2025-TEST', targa: 'EC787NM', modello: 'Mercedes Sprinter 9 Posti', giornoInizio: new Date(2025, 10, 15), giornoFine: new Date(2025, 10, 18), oraInizio: '09:00', oraFine: '18:00', destinazione: 'Roma - Tour Colosseo e Vaticano', email: destinatario, autista1: { nomeCompleto: 'Mario Rossi' } };
  try {
    inviaEmailConfermaCliente(prenotazioneDemo);
    return createJsonResponse({ success: true, message: 'Email conferma test inviata a ' + destinatario });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

function testEmailReminder(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var prenotazioneDemo = { idPrenotazione: 'BOOK-2025-REMINDER', targa: 'FG123AB', modello: 'Fiat Ducato Passo Lungo', giornoInizio: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), giornoFine: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), oraInizio: '10:00', oraFine: '17:00', destinazione: 'Napoli - Matrimonio', email: destinatario, autista1: { nomeCompleto: 'Luigi Verdi' } };
  try {
    inviaEmailReminder(prenotazioneDemo);
    return createJsonResponse({ success: true, message: 'Email reminder test inviata a ' + destinatario });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

function testEmailConfermaPreventivo(email) {
  var destinatario = email || 'melloanto@icloud.com';
  var demo = { idPrenotazione: 'BOOK-2025-CONF', targa: 'BW123XY', modello: 'Opel Vivaro', giornoInizio: new Date(2025, 10, 22), giornoFine: new Date(2025, 10, 23), oraInizio: '08:00', oraFine: '19:00', destinazione: 'Firenze - Meeting', email: destinatario, autista1: { nomeCompleto: 'Antonio Bianchi' } };
  try {
    inviaEmailConfermaPreventivo(demo);
    return createJsonResponse({ success: true, message: 'Email conferma preventivo test inviata a ' + destinatario });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Errore: ' + error.message }, 500);
  }
}

/**
 * CENSIMENTO PDF ESISTENTI v2 - Con normalizzazione nome
 * Supporta sia "GiulioStefanizzi" che "Giulio_Stefanizzi"
 */
function censisciPDFEsistenti() {
  Logger.log('[censisciPDFEsistenti] Avvio censimento v2...');
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: false, message: 'Nessuna prenotazione trovata' });
    }
    
    // Ottieni tutti i PDF dalla cartella
    var folder = DriveApp.getFolderById(CONFIG.PDF.PDF_FOLDER_ID);
    var files = folder.getFiles();
    var pdfMap = {};
    
    Logger.log('[censisciPDFEsistenti] Scansione cartella PDF...');
    
    // Costruisci mappa PDF: nome file -> URL
    while (files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() === MimeType.PDF) {
        var nomePdf = file.getName();
        pdfMap[nomePdf] = file.getUrl();
        Logger.log('[censisciPDFEsistenti] PDF trovato: ' + nomePdf);
      }
    }
    
    Logger.log('[censisciPDFEsistenti] Trovati ' + Object.keys(pdfMap).length + ' PDF');
    
    var trovati = 0;
    var aggiornati = 0;
    var giàCollegati = 0;
    
    // Funzione helper per normalizzare nomi
    function normalizzaNome(nomeCompleto) {
      if (!nomeCompleto) return '';
      
      // Rimuovi spazi multipli e trim
      var nome = String(nomeCompleto).trim().replace(/\s+/g, ' ');
      
      // Genera 3 varianti:
      // 1. Con underscore: "Giulio_Stefanizzi"
      // 2. Senza spazi: "GiulioStefanizzi"
      // 3. CamelCase invertito: "StefanizziGiulio" (alcuni PDF potrebbero avere cognome prima)
      
      var conUnderscore = nome.replace(/\s+/g, '_');
      var senzaSpazi = nome.replace(/\s+/g, '');
      
      return {
        conUnderscore: conUnderscore,
        senzaSpazi: senzaSpazi,
        originale: nome
      };
    }
    
    // Formatta date come nel generatore PDF
    function formatDateForFilename(date) {
      if (date instanceof Date && !isNaN(date.getTime())) {
        var d = Utilities.formatDate(date, CONFIG.PDF.TIMEZONE, 'dd/MM/yyyy');
        return d.replace(/\//g, '-');
      }
      return '';
    }
    
    // Itera su prenotazioni
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowIndex = i + 1;
      
      var nomeClienteOriginale = String(row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || '');
      var giornoInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var giornoFine = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1];
      var pdfUrlEsistente = String(row[CONFIG.PRENOTAZIONI_COLS.PDF_URL - 1] || '').trim();
      
      // Salta se mancano dati
      if (!nomeClienteOriginale || !giornoInizio || !giornoFine) {
        continue;
      }
      
      var nomiVarianti = normalizzaNome(nomeClienteOriginale);
      var dataRitiro = formatDateForFilename(new Date(giornoInizio));
      var dataArrivo = formatDateForFilename(new Date(giornoFine));
      
      // Prova tutte le varianti di nome
      var varianti = [
        nomiVarianti.senzaSpazi + '_' + dataRitiro + '_' + dataArrivo + '.pdf',
        nomiVarianti.conUnderscore + '_' + dataRitiro + '_' + dataArrivo + '.pdf'
      ];
      
      Logger.log('[censisciPDFEsistenti] Riga ' + rowIndex + ': Varianti = ' + JSON.stringify(varianti));
      
      var pdfTrovato = null;
      
      // Cerca ogni variante
      for (var v = 0; v < varianti.length; v++) {
        if (pdfMap[varianti[v]]) {
          pdfTrovato = pdfMap[varianti[v]];
          Logger.log('[censisciPDFEsistenti] ✅ Match trovato: ' + varianti[v]);
          break;
        }
      }
      
      if (pdfTrovato) {
        trovati++;
        
        // Aggiorna solo se non c'è già un URL
        if (!pdfUrlEsistente) {
          sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.PDF_URL).setValue(pdfTrovato);
          aggiornati++;
          Logger.log('[censisciPDFEsistenti] ✅ Collegato PDF per riga ' + rowIndex);
        } else {
          giàCollegati++;
          Logger.log('[censisciPDFEsistenti] ⏭️ Già collegato per riga ' + rowIndex);
        }
      } else {
        Logger.log('[censisciPDFEsistenti] ❌ PDF non trovato per riga ' + rowIndex);
      }
    }
    
    Logger.log('[censisciPDFEsistenti] Censimento completato');
    Logger.log('[censisciPDFEsistenti] Trovati: ' + trovati + ' | Aggiornati: ' + aggiornati + ' | Già collegati: ' + giàCollegati);
    
    return createJsonResponse({
      success: true,
      message: 'Censimento completato',
      pdfTrovati: trovati,
      recordAggiornati: aggiornati,
      giàCollegati: giàCollegati,
      pdfNellaCartella: Object.keys(pdfMap).length
    });
    
  } catch (err) {
    Logger.log('[censisciPDFEsistenti] Errore: ' + err.message);
    return createJsonResponse({ success: false, message: 'Errore censimento: ' + err.message }, 500);
  }
}
