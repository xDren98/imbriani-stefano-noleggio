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
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.CLIENTI);
    var vals = sh.getDataRange().getValues();
    var idx = -1;
    
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1]).trim() === cf) {
        idx = i;
        break;
      }
    }
    
    if (idx === -1) {
      return createJsonResponse({
        success: false,
        message: 'Cliente non trovato'
      }, 404);
    }
    
    function setIf(colKey, val) {
      if (val !== undefined && val !== null) {
        sh.getRange(idx + 1, CONFIG.CLIENTI_COLS[colKey], 1, 1).setValue(val);
      }
    }
    
    setIf('NOME', post.nome || post.nomeCompleto);
    setIf('LUOGO_NASCITA', post.luogoNascita);
    setIf('COMUNE_RESIDENZA', post.comuneResidenza);
    setIf('VIA_RESIDENZA', post.viaResidenza);
    setIf('CIVICO_RESIDENZA', post.civicoResidenza);
    setIf('NUMERO_PATENTE', post.numeroPatente);
    setIf('DATA_INIZIO_PATENTE', post.inizioValiditaPatente || post.dataInizioPatente);
    setIf('SCADENZA_PATENTE', post.scadenzaPatente);
    setIf('CELLULARE', post.cellulare);
    setIf('EMAIL', post.email);
    
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
