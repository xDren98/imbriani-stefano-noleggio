/**
 * SERVIZIO GESTIONE CLIENTI
 * 
 * Gestisce anagrafica clienti e sincronizzazione
 */

/**
 * Aggiorna dati cliente esistente
 * @param {Object} post - Dati cliente con codiceFiscale
 * @return {ContentService} Risposta JSON
 */
function aggiornaCliente(post) {
  try {
    var cf = (post.codiceFiscale || '').trim();
    
    if (!cf || cf.length !== 16) {
      return createJsonResponse({
        success: false,
        message: 'Codice fiscale non valido'
      }, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    var idxRow = clientRowIndexByCF(cf);
    
    if (idxRow === -1) {
      return createJsonResponse({
        success: false,
        message: 'Cliente non trovato'
      }, 404);
    }
    var lastCol = sh.getLastColumn();
    var row = sh.getRange(idxRow, 1, 1, lastCol).getValues()[0];
    var C = CONFIG.CLIENTI_COLS;
    function upd(key, val){ if (val !== undefined && val !== null) { row[C[key]-1] = val; } }
    upd('NOME', post.nome || post.nomeCompleto);
    upd('LUOGO_NASCITA', post.luogoNascita);
    upd('COMUNE_RESIDENZA', post.comuneResidenza);
    upd('VIA_RESIDENZA', post.viaResidenza);
    upd('CIVICO_RESIDENZA', post.civicoResidenza);
    upd('NUMERO_PATENTE', post.numeroPatente);
    upd('DATA_INIZIO_PATENTE', post.inizioValiditaPatente || post.dataInizioPatente);
    upd('SCADENZA_PATENTE', post.scadenzaPatente);
    upd('CELLULARE', post.cellulare);
    upd('EMAIL', post.email);
    sh.getRange(idxRow, 1, 1, lastCol).setValues([row]);
    invalidateIndex('CLIENTI');
    
    return createJsonResponse({
      success: true,
      message: 'Profilo aggiornato',
      codiceFiscale: cf
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore aggiornamento cliente: ' + err.message
    }, 500);
  }
}

/**
 * Sincronizza clienti da PRENOTAZIONI a CLIENTI
 * Crea o aggiorna clienti basandosi su autisti nelle prenotazioni
 * @return {ContentService} Risposta JSON con contatori
 */
function sincronizzaClienti() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP = ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var shC = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    
    if (!shP || !shC) {
      return createJsonResponse({
        success: false,
        message: 'Foglio PRENOTAZIONI o CLIENTI non trovato'
      }, 500);
    }
    
    var pVals = shP.getDataRange().getValues();
    var cVals = shC.getDataRange().getValues();
    var idxByCF = {};
    
    // Mappa clienti esistenti per CF
    for (var i = 1; i < cVals.length; i++) {
      var cf = String(cVals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1] || '').trim();
      if (cf) idxByCF[cf] = i + 1;
    }
    
    var created = 0;
    var updated = 0;
    var skipped = 0;
    
  function upsertCliente(data, isPrimary) {
      var cf = String(data.codiceFiscale || '').trim();
      if (!cf || cf.length !== 16) {
        skipped++;
        return;
      }
      
      var rowIndex = idxByCF[cf];
      
      function updateCell(colKey, val) {
        if (val !== undefined && val !== null && val !== '') {
          shC.getRange(rowIndex, CONFIG.CLIENTI_COLS[colKey]).setValue(val);
        }
      }
      
      if (!rowIndex) {
        // Crea nuovo cliente
        var row = new Array(Object.keys(CONFIG.CLIENTI_COLS).length);
        for (var k = 0; k < row.length; k++) row[k] = '';
        
        row[CONFIG.CLIENTI_COLS.NOME - 1] = data.nomeCompleto || data.nome || '';
        row[CONFIG.CLIENTI_COLS.DATA_NASCITA - 1] = data.dataNascita || '';
        row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA - 1] = data.luogoNascita || '';
        row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1] = cf;
        row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA - 1] = data.comuneResidenza || '';
        row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA - 1] = data.viaResidenza || '';
        row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA - 1] = data.civicoResidenza || '';
        row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE - 1] = data.numeroPatente || '';
        row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE - 1] = data.inizioValiditaPatente || data.dataInizioPatente || '';
        row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE - 1] = data.scadenzaPatente || '';
        
        if (isPrimary) {
          row[CONFIG.CLIENTI_COLS.CELLULARE - 1] = data.cellulare || '';
          row[CONFIG.CLIENTI_COLS.EMAIL - 1] = data.email || '';
        }
        
        shC.appendRow(row);
        var last = shC.getLastRow();
        idxByCF[cf] = last;
        created++;
      } else {
        // Aggiorna cliente esistente
        updateCell('NOME', data.nomeCompleto || data.nome || '');
        updateCell('DATA_NASCITA', data.dataNascita || '');
        updateCell('LUOGO_NASCITA', data.luogoNascita || '');
        updateCell('COMUNE_RESIDENZA', data.comuneResidenza || '');
        updateCell('VIA_RESIDENZA', data.viaResidenza || '');
        updateCell('CIVICO_RESIDENZA', data.civicoResidenza || '');
        updateCell('NUMERO_PATENTE', data.numeroPatente || '');
        updateCell('DATA_INIZIO_PATENTE', data.inizioValiditaPatente || data.dataInizioPatente || '');
        updateCell('SCADENZA_PATENTE', data.scadenzaPatente || '');
        
        if (isPrimary) {
          updateCell('CELLULARE', data.cellulare || '');
          updateCell('EMAIL', data.email || '');
        }
        updated++;
      }
    }
    
    // Processa tutte le prenotazioni
    for (var r = 1; r < pVals.length; r++) {
      var row = pVals[r];
      
      // Autista 1
      var a1 = {
        nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || '',
        dataNascita: row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1 - 1] || '',
        luogoNascita: row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1 - 1] || '',
        codiceFiscale: row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1] || '',
        comuneResidenza: row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1 - 1] || '',
        viaResidenza: row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1 - 1] || '',
        civicoResidenza: row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1 - 1] || '',
        numeroPatente: row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1 - 1] || '',
        inizioValiditaPatente: row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1 - 1] || '',
        scadenzaPatente: row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1 - 1] || '',
        cellulare: row[CONFIG.PRENOTAZIONI_COLS.CELLULARE - 1] || '',
        email: row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1] || ''
      };
      
      // Autista 2
      var a2 = {
        nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2 - 1] || '',
        dataNascita: row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2 - 1] || '',
        luogoNascita: row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2 - 1] || '',
        codiceFiscale: row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2 - 1] || '',
        comuneResidenza: row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2 - 1] || '',
        viaResidenza: row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2 - 1] || '',
        civicoResidenza: row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2 - 1] || '',
        numeroPatente: row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2 - 1] || '',
        inizioValiditaPatente: row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2 - 1] || '',
        scadenzaPatente: row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2 - 1] || ''
      };
      
      // Autista 3
      var a3 = {
        nomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3 - 1] || '',
        dataNascita: row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3 - 1] || '',
        luogoNascita: row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3 - 1] || '',
        codiceFiscale: row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3 - 1] || '',
        comuneResidenza: row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3 - 1] || '',
        viaResidenza: row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3 - 1] || '',
        civicoResidenza: row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3 - 1] || '',
        numeroPatente: row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3 - 1] || '',
        inizioValiditaPatente: row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3 - 1] || '',
        scadenzaPatente: row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3 - 1] || ''
      };
      
      if (a1.codiceFiscale) upsertCliente(a1, true);
      if (a2.codiceFiscale) upsertCliente(a2, false);
      if (a3.codiceFiscale) upsertCliente(a3, false);
    }
    
    invalidateIndex('CLIENTI');
    return createJsonResponse({
      success: true,
      message: 'Sincronizzazione CLIENTI completata',
      created: created,
      updated: updated,
      skipped: skipped
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore sincronizzaClienti: ' + err.message
    }, 500);
  }
}

/**
 * Upsert cliente durante creazione prenotazione
 * @param {Object} cliente - Dati cliente
 * @param {boolean} isPrimary - Se è autista principale (con email/cell)
 */
function upsertClienteInCreaPrenotazione(cliente, isPrimary) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var shC = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
  var cf = String(cliente.codiceFiscale || '').trim();
  
  if (!cf || cf.length !== 16) return;
  
  var vals = shC.getDataRange().getValues();
  var idx = -1;
  
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1]).trim() === cf) {
      idx = i;
      break;
    }
  }
  
  function setValue(colKey, val) {
    if (val !== undefined && val !== null && val !== '') {
      if (idx > 0) {
        shC.getRange(idx + 1, CONFIG.CLIENTI_COLS[colKey]).setValue(val);
      } else {
        return val;
      }
    }
    return '';
  }
  
  if (idx === -1) {
    // Crea nuovo
    var newRow = new Array(Object.keys(CONFIG.CLIENTI_COLS).length);
    for (var k = 0; k < newRow.length; k++) newRow[k] = '';
    
    newRow[CONFIG.CLIENTI_COLS.NOME - 1] = cliente.nomeCompleto || cliente.nome || '';
    newRow[CONFIG.CLIENTI_COLS.DATA_NASCITA - 1] = cliente.dataNascita || '';
    newRow[CONFIG.CLIENTI_COLS.LUOGO_NASCITA - 1] = cliente.luogoNascita || '';
    newRow[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1] = cf;
    newRow[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA - 1] = cliente.comuneResidenza || '';
    newRow[CONFIG.CLIENTI_COLS.VIA_RESIDENZA - 1] = cliente.viaResidenza || '';
    newRow[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA - 1] = cliente.civicoResidenza || '';
    newRow[CONFIG.CLIENTI_COLS.NUMERO_PATENTE - 1] = cliente.numeroPatente || '';
    newRow[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE - 1] = cliente.inizioValiditaPatente || cliente.dataInizioPatente || '';
    newRow[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE - 1] = cliente.scadenzaPatente || '';
    
    if (isPrimary) {
      newRow[CONFIG.CLIENTI_COLS.CELLULARE - 1] = cliente.cellulare || '';
      newRow[CONFIG.CLIENTI_COLS.EMAIL - 1] = cliente.email || '';
    }
    
    shC.appendRow(newRow);
    invalidateIndex('CLIENTI');
  } else {
    // Aggiorna esistente
    setValue('NOME', cliente.nomeCompleto || cliente.nome);
    setValue('DATA_NASCITA', cliente.dataNascita);
    setValue('LUOGO_NASCITA', cliente.luogoNascita);
    setValue('COMUNE_RESIDENZA', cliente.comuneResidenza);
    setValue('VIA_RESIDENZA', cliente.viaResidenza);
    setValue('CIVICO_RESIDENZA', cliente.civicoResidenza);
    setValue('NUMERO_PATENTE', cliente.numeroPatente);
    setValue('DATA_INIZIO_PATENTE', cliente.inizioValiditaPatente || cliente.dataInizioPatente);
    setValue('SCADENZA_PATENTE', cliente.scadenzaPatente);
    
    if (isPrimary) {
      setValue('CELLULARE', cliente.cellulare);
      setValue('EMAIL', cliente.email);
    }
  }
}

/**
 * Crea un nuovo cliente nel foglio CLIENTI
 * @param {Object} post - Dati cliente con codiceFiscale obbligatorio (16 caratteri)
 * @return {ContentService} Risposta JSON
 */
function creaCliente(post) {
  try {
    var cf = (post.codiceFiscale || '').trim();
    if (!cf || cf.length !== 16) {
      return createJsonResponse({
        success: false,
        message: 'Codice fiscale non valido'
      }, 400);
    }
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    if (!sh) {
      return createJsonResponse({ success: false, message: 'Foglio CLIENTI non trovato' }, 500);
    }
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1]).trim() === cf) {
        return createJsonResponse({
          success: false,
          message: 'Cliente già esistente',
          codiceFiscale: cf
        }, 409);
      }
    }

    var row = new Array(Object.keys(CONFIG.CLIENTI_COLS).length);
    for (var k = 0; k < row.length; k++) row[k] = '';

    row[CONFIG.CLIENTI_COLS.NOME - 1] = post.nomeCompleto || post.nome || '';
    row[CONFIG.CLIENTI_COLS.DATA_NASCITA - 1] = post.dataNascita || '';
    row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA - 1] = post.luogoNascita || '';
    row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1] = cf;
    row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA - 1] = post.comuneResidenza || '';
    row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA - 1] = post.viaResidenza || '';
    row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA - 1] = post.civicoResidenza || '';
    row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE - 1] = post.numeroPatente || '';
    row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE - 1] = post.inizioValiditaPatente || post.dataInizioPatente || '';
    row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE - 1] = post.scadenzaPatente || '';
    row[CONFIG.CLIENTI_COLS.CELLULARE - 1] = post.cellulare || '';
    row[CONFIG.CLIENTI_COLS.EMAIL - 1] = post.email || '';

    sh.appendRow(row);
    invalidateIndex('CLIENTI');

    return createJsonResponse({
      success: true,
      message: 'Cliente creato',
      codiceFiscale: cf
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore creazione cliente: ' + err.message
    }, 500);
  }
}

/**
 * Recupera i dettagli completi di un cliente dal foglio CLIENTI dato il CF.
 * @param {Object} post - { codiceFiscale }
 * @return {ContentService} Risposta JSON con data
 */
function getCliente(post) {
  try {
    var cf = (post && (post.codiceFiscale || post.cf || post.CODICE_FISCALE)) || '';
    cf = String(cf).trim().toUpperCase();
    if (!cf || cf.length < 6) {
      return createJsonResponse({ success: false, message: 'Codice fiscale mancante o non valido' }, 400);
    }

    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    if (!sheet) {
      return createJsonResponse({ success: false, message: 'Foglio CLIENTI non trovato' }, 500);
    }

    var C = CONFIG.CLIENTI_COLS;
    var idxRow = clientRowIndexByCF(cf);
    
    if (idxRow === -1) {
      return createJsonResponse({ success: false, message: 'Cliente non trovato per CF: ' + cf }, 404);
    }
    var lastCol = sheet.getLastColumn();
    var row = sheet.getRange(idxRow, 1, 1, lastCol).getValues()[0];
    function val(colKey) { return (C[colKey] ? row[C[colKey] - 1] : '') || ''; }
    function fmtDate(v) { try { return DateUtils.formatDateToItalian(v); } catch(e) { return ''; } }

    var nomeCell = String(val('NOME') || '').trim();
    var telefonoCell = String(val('CELLULARE') || val('TELEFONO') || '').trim();

    var dataNascitaRaw = val('DATA_NASCITA');
    var inizioPatenteRaw = val('DATA_INIZIO_PATENTE');
    var scadenzaPatenteRaw = val('SCADENZA_PATENTE');

    // Prova a leggere eventuale colonna opzionale 'INDIRIZZO' se presente come header
    var indirizzoFull = '';
    try {
      var headers = values[0];
      var idxIndirizzo = -1;
      for (var h = 0; h < headers.length; h++) {
        var name = String(headers[h]).trim().toUpperCase();
        if (name === 'INDIRIZZO') { idxIndirizzo = h; break; }
      }
      if (idxIndirizzo >= 0) indirizzoFull = String(row[idxIndirizzo] || '').trim();
    } catch(_){ }

    var resp = {
      codiceFiscale: cf,
      nome: nomeCell || '',
      cognome: '',
      nomeCompleto: nomeCell || '',
      email: String(val('EMAIL') || '').trim(),
      cellulare: telefonoCell || '',
      telefono: telefonoCell || '',
      indirizzo: indirizzoFull,
      comuneResidenza: String(val('COMUNE_RESIDENZA') || '').trim(),
      viaResidenza: String(val('VIA_RESIDENZA') || '').trim(),
      civicoResidenza: String(val('CIVICO_RESIDENZA') || '').trim(),
      dataNascita: dataNascitaRaw || '',
      dataNascitaFormatted: fmtDate(dataNascitaRaw),
      luogoNascita: String(val('LUOGO_NASCITA') || '').trim(),
      numeroPatente: String(val('NUMERO_PATENTE') || '').trim(),
      inizioValiditaPatente: inizioPatenteRaw || '',
      inizioValiditaPatenteFormatted: fmtDate(inizioPatenteRaw),
      scadenzaPatente: scadenzaPatenteRaw || '',
      scadenzaPatenteFormatted: fmtDate(scadenzaPatenteRaw)
    };

    return createJsonResponse({ success: true, data: resp });
  } catch(err) {
    return createJsonResponse({ success: false, message: 'Errore getCliente: ' + err.message }, 500);
  }
}

/**
 * Login utente tramite Codice Fiscale
 * @param {Object} post - { codiceFiscale }
 * @return {ContentService} Risposta JSON con user oppure errore
 */
function login(post){
  try{
    var cf = String((post && (post.codiceFiscale||post.cf)) || '').trim().toUpperCase();
    if (!post || (!post.codiceFiscale && !post.cf)){
      return createJsonResponse({ success:false, message:'Dati di login incompleti', errorCode:'MISSING_DATA' }, 400);
    }
    if (cf.length !== 16){
      return createJsonResponse({ success:false, message:'Formato codice fiscale non valido', errorCode:'INVALID_CF_FORMAT' }, 400);
    }
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    if (!sheet){
      return createJsonResponse({ success:false, message:'Foglio CLIENTI non trovato', errorCode:'DB_ERROR' }, 500);
    }
    var C = CONFIG.CLIENTI_COLS;
    var idx = clientRowIndexByCF(cf);
    if (idx === -1){
      return createJsonResponse({ success:false, message:'Codice fiscale non registrato', errorCode:'USER_NOT_FOUND', requiresRegistration:true, remainingAttempts:0 }, 404);
    }
    var lastCol = sheet.getLastColumn();
    var row = sheet.getRange(idx, 1, 1, lastCol).getValues()[0];
    function val(colKey){ return (C[colKey] ? row[C[colKey]-1] : '') || ''; }
    var user = {
      codiceFiscale: cf,
      nome: String(val('NOME')||'').trim(),
      email: String(val('EMAIL')||'').trim(),
      cellulare: String(val('CELLULARE')||'').trim(),
      comuneResidenza: String(val('COMUNE_RESIDENZA')||'').trim(),
      viaResidenza: String(val('VIA_RESIDENZA')||'').trim(),
      civicoResidenza: String(val('CIVICO_RESIDENZA')||'').trim(),
      numeroPatente: String(val('NUMERO_PATENTE')||'').trim(),
      dataNascita: val('DATA_NASCITA')||'',
      inizioValiditaPatente: val('DATA_INIZIO_PATENTE')||'',
      scadenzaPatente: val('SCADENZA_PATENTE')||''
    };
    return createJsonResponse({ success:true, user:user });
  }catch(err){
    return createJsonResponse({ success:false, message:'Errore login: ' + err.message, errorCode:'GENERIC_ERROR' }, 500);
  }
}
