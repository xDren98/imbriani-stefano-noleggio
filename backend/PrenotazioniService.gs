/**
 * SERVIZIO GESTIONE PRENOTAZIONI
 * 
 * Gestisce CRUD prenotazioni, stati, ID booking
 */

/**
 * Recupera tutte le prenotazioni con dati completi e date formattate
 * @return {ContentService} Risposta JSON con lista prenotazioni
 */
function getPrenotazioni() {
  Logger.log('[getPrenotazioni] Chiamata ricevuta');
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName('PRENOTAZIONI');
    
    if (!sh) {
      Logger.log('[getPrenotazioni] Foglio PRENOTAZIONI non trovato');
      return createJsonResponse({
        success: false,
        message: 'Foglio PRENOTAZIONI non trovato'
      }, 500);
    }
    
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('[getPrenotazioni] Nessuna prenotazione trovata');
      return createJsonResponse({
        success: true,
        message: 'Nessuna prenotazione trovata',
        data: []
      });
    }
    
    var out = [];
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var t = r[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
      var cf = r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1];
      if (!t && !cf) continue;
      
      out.push({
        id: i,
        targa: t || '',
        
        // 📅 DATE NOLEGGIO
        giornoInizio: r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1] || '',
        giornoInizioFormatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1]),
        giornoFine: r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1] || '',
        giornoFineFormatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1]),
        oraInizio: r[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] || '',
        oraFine: r[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] || '',
        destinazione: r[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1] || '',
        dataContratto: r[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1] || '',
        dataContrattoFormatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1]),
        
        // 👤 AUTISTA 1 - COMPLETO
        nomeAutista1: r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || '',
        codiceFiscaleAutista1: cf || '',
        dataNascitaAutista1: r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1 - 1] || '',
        dataNascitaAutista1Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1 - 1]),
        luogoNascitaAutista1: r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1 - 1] || '',
        comuneResidenzaAutista1: r[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1 - 1] || '',
        viaResidenzaAutista1: r[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1 - 1] || '',
        civicoResidenzaAutista1: r[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1 - 1] || '',
        numeroPatenteAutista1: r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1 - 1] || '',
        dataInizioPatenteAutista1: r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1 - 1] || '',
        dataInizioPatenteAutista1Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1 - 1]),
        scadenzaPatenteAutista1: r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1 - 1] || '',
        scadenzaPatenteAutista1Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1 - 1]),
        
        // 👤 AUTISTA 2 - COMPLETO
        nomeAutista2: r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2 - 1] || '',
        codiceFiscaleAutista2: r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2 - 1] || '',
        dataNascitaAutista2: r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2 - 1] || '',
        dataNascitaAutista2Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2 - 1]),
        luogoNascitaAutista2: r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2 - 1] || '',
        comuneResidenzaAutista2: r[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2 - 1] || '',
        viaResidenzaAutista2: r[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2 - 1] || '',
        civicoResidenzaAutista2: r[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2 - 1] || '',
        numeroPatenteAutista2: r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2 - 1] || '',
        dataInizioPatenteAutista2: r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2 - 1] || '',
        dataInizioPatenteAutista2Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2 - 1]),
        scadenzaPatenteAutista2: r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2 - 1] || '',
        scadenzaPatenteAutista2Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2 - 1]),
        
        // 👤 AUTISTA 3 - COMPLETO
        nomeAutista3: r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3 - 1] || '',
        codiceFiscaleAutista3: r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3 - 1] || '',
        dataNascitaAutista3: r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3 - 1] || '',
        dataNascitaAutista3Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3 - 1]),
        luogoNascitaAutista3: r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3 - 1] || '',
        comuneResidenzaAutista3: r[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3 - 1] || '',
        viaResidenzaAutista3: r[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3 - 1] || '',
        civicoResidenzaAutista3: r[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3 - 1] || '',
        numeroPatenteAutista3: r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3 - 1] || '',
        dataInizioPatenteAutista3: r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3 - 1] || '',
        dataInizioPatenteAutista3Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3 - 1]),
        scadenzaPatenteAutista3: r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3 - 1] || '',
        scadenzaPatenteAutista3Formatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3 - 1]),
        
        // 📋 ALTRI DATI
        cellulare: r[CONFIG.PRENOTAZIONI_COLS.CELLULARE - 1] || '',
        email: r[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1] || '',
        stato: r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || 'In attesa',
        importo: r[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1] || '',
        importoPreventivo: r[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1] || '',
        idPrenotazione: r[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '',
        timestamp: r[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1] || '',
        timestampFormatted: formatDateToItalian(r[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1]),
        pdfUrl: r[CONFIG.PRENOTAZIONI_COLS.PDF_URL - 1] || ''
      });
    }
    
    Logger.log('[getPrenotazioni] Trovate ' + out.length + ' prenotazioni');
    return createJsonResponse({
      success: true,
      message: 'Trovate ' + out.length + ' prenotazioni',
      data: out,
      count: out.length
    });
  } catch(err) {
    Logger.log('[getPrenotazioni] Errore: ' + err.message);
    return createJsonResponse({
      success: false,
      message: 'Errore caricamento prenotazioni: ' + err.message
    }, 500);
  }
}

/**
 * Crea nuova prenotazione
 * @param {Object} post - Dati prenotazione
 * @return {ContentService} Risposta JSON con ID generato
 */
function creaPrenotazione(post) {
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    
    var row = new Array(45);
    for (var i = 0; i < 45; i++) {
      row[i] = '';
    }
    
    // Timestamp
    row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1] = new Date();
    
    // Autista 1
    row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] = post.autista1 && post.autista1.nomeCompleto ? post.autista1.nomeCompleto : (post.autista1 && post.autista1.nome ? post.autista1.nome : '');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1 - 1] = post.autista1 && post.autista1.dataNascita ? post.autista1.dataNascita : '';
    row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1 - 1] = post.autista1 && post.autista1.luogoNascita ? post.autista1.luogoNascita : '';
    row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1] = post.autista1 && post.autista1.codiceFiscale ? post.autista1.codiceFiscale : '';
    row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1 - 1] = post.autista1 && post.autista1.comuneResidenza ? post.autista1.comuneResidenza : '';
    row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1 - 1] = post.autista1 && post.autista1.viaResidenza ? post.autista1.viaResidenza : '';
    row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1 - 1] = post.autista1 && post.autista1.civicoResidenza ? post.autista1.civicoResidenza : '';
    row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1 - 1] = post.autista1 && post.autista1.numeroPatente ? post.autista1.numeroPatente : '';
    row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1 - 1] = post.autista1 && (post.autista1.inizioValiditaPatente || post.autista1.dataInizioPatente) ? (post.autista1.inizioValiditaPatente || post.autista1.dataInizioPatente) : '';
    row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1 - 1] = post.autista1 && post.autista1.scadenzaPatente ? post.autista1.scadenzaPatente : '';
    
    // Dati noleggio
    row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1] = post.targa || '';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] = post.oraInizio || '';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] = post.oraFine || '';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1] = post.giornoInizio ? new Date(post.giornoInizio) : '';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1] = post.giornoFine ? new Date(post.giornoFine) : '';
    row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1] = post.destinazione || '';
    row[CONFIG.PRENOTAZIONI_COLS.CELLULARE - 1] = post.autista1 && post.autista1.cellulare ? post.autista1.cellulare : (post.cellulare || '');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1] = post.giornoInizio ? new Date(post.giornoInizio) : '';
    row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1] = post.email || '';
    row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] = 'In attesa';
    row[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1] = post.importo || 0;
    
    // Autista 2 (opzionale)
    if (post.autista2) {
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2 - 1] = post.autista2.nomeCompleto || post.autista2.nome || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2 - 1] = post.autista2.dataNascita || '';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2 - 1] = post.autista2.luogoNascita || '';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2 - 1] = post.autista2.codiceFiscale || '';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2 - 1] = post.autista2.comuneResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2 - 1] = post.autista2.viaResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2 - 1] = post.autista2.civicoResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2 - 1] = post.autista2.numeroPatente || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2 - 1] = post.autista2.inizioValiditaPatente || post.autista2.dataInizioPatente || '';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2 - 1] = post.autista2.scadenzaPatente || '';
    }
    
    // Autista 3 (opzionale)
    if (post.autista3) {
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3 - 1] = post.autista3.nomeCompleto || post.autista3.nome || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3 - 1] = post.autista3.dataNascita || '';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3 - 1] = post.autista3.luogoNascita || '';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3 - 1] = post.autista3.codiceFiscale || '';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3 - 1] = post.autista3.comuneResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3 - 1] = post.autista3.viaResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3 - 1] = post.autista3.civicoResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3 - 1] = post.autista3.numeroPatente || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3 - 1] = post.autista3.inizioValiditaPatente || post.autista3.dataInizioPatente || '';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3 - 1] = post.autista3.scadenzaPatente || '';
    }
    
    // Genera ID booking
    var id = generaNuovoIdBooking();
    row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] = id;
    
    // Salva prenotazione
    sh.appendRow(row);
    
    // Upsert clienti se richiesto
    if (post.upsertClienti) {
      try {
        if (post.autista1 && post.autista1.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista1, true);
        if (post.autista2 && post.autista2.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista2, false);
        if (post.autista3 && post.autista3.codiceFiscale) upsertClienteInCreaPrenotazione(post.autista3, false);
      } catch(e) {
        Logger.log('Errore upsert clienti: ' + e.message);
      }
    }
    
    // Notifiche
    try {
      inviaNotificaTelegram(post);
    } catch(e) {
      Logger.log('Errore invio Telegram: ' + e.message);
    }
    
    if (post.email) {
      try {
        inviaEmailConfermaCliente({...post, idPrenotazione: id});
      } catch(e) {
        Logger.log('Errore email conferma cliente: ' + e.message);
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'Prenotazione creata',
      idPrenotazione: id
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore creazione prenotazione: ' + err.message
    }, 500);
  }
}

/**
 * Aggiorna stato prenotazione e gestisce conseguenze (PDF, email)
 * @param {Object} post - idPrenotazione, nuovoStato, importo (opzionale)
 * @return {ContentService} Risposta JSON
 */
function aggiornaStatoPrenotazione(post) {
  Logger.log('[aggiornaStatoPrenotazione] Input: ' + JSON.stringify(post));
  
  try {
    var idPrenotazione = post.idPrenotazione;
    var nuovoStato = post.nuovoStato;
    var importo = post.importo;
    
    if (!idPrenotazione || !nuovoStato) {
      return createJsonResponse({
        success: false,
        message: 'ID prenotazione e nuovo stato richiesti'
      }, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return createJsonResponse({
        success: false,
        message: 'Prenotazione non trovata con ID: ' + idPrenotazione
      }, 404);
    }
    
    // Aggiorna stato
    sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE).setValue(nuovoStato);
    
    // Aggiorna importo se confermata
    if (importo && nuovoStato === 'Confermata') {
      sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO).setValue(importo);
    }
    
    var pdfResult = null;
    
    // Genera PDF se confermata
    if (nuovoStato === 'Confermata') {
      try {
        pdfResult = generaPDFContratto(idPrenotazione);
      } catch (e) {
        Logger.log('[aggiornaStatoPrenotazione] Errore generazione PDF: ' + e.message);
      }
      
      // Invia email conferma preventivo
      var row = data[rowIndex - 1];
      var email = row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1];
      
      if (email) {
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
        } catch(e) {
          Logger.log('[aggiornaStatoPrenotazione] Errore invio email: ' + e.message);
        }
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'Stato aggiornato con successo',
      nuovoStato: nuovoStato,
      idPrenotazione: idPrenotazione,
      pdfGenerato: pdfResult ? pdfResult.success : false,
      pdfUrl: pdfResult && pdfResult.success ? pdfResult.pdfUrl : null
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore: ' + err.message
    }, 500);
  }
}

/**
 * Aggiorna dati completi prenotazione
 * @param {Object} post - Tutti i campi modificabili
 * @return {ContentService} Risposta JSON
 */
function aggiornaPrenotazioneCompleta(post) {
  Logger.log('[aggiornaPrenotazioneCompleta] Input: ' + JSON.stringify(post));
  
  try {
    var idPrenotazione = post.idPrenotazione;
    if (!idPrenotazione) {
      return createJsonResponse({
        success: false,
        message: 'ID prenotazione richiesto'
      }, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
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
      return createJsonResponse({
        success: false,
        message: 'Prenotazione non trovata'
      }, 404);
    }
    
    // Aggiorna campi
    if (post.targa) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.TARGA).setValue(post.targa);
    if (post.giornoInizio) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO).setValue(new Date(post.giornoInizio));
    if (post.giornoFine) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE).setValue(new Date(post.giornoFine));
    if (post.oraInizio) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO).setValue(post.oraInizio);
    if (post.oraFine) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.ORA_FINE).setValue(post.oraFine);
    if (post.destinazione) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE).setValue(post.destinazione);
    if (post.cellulare) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CELLULARE).setValue(post.cellulare);
    if (post.email) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.EMAIL).setValue(post.email);
    if (post.importo) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO).setValue(post.importo);
    
    if (post.autista1) {
      if (post.autista1.nomeCompleto) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1).setValue(post.autista1.nomeCompleto);
      if (post.autista1.dataNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1).setValue(post.autista1.dataNascita);
      if (post.autista1.luogoNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1).setValue(post.autista1.luogoNascita);
      if (post.autista1.codiceFiscale) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1).setValue(post.autista1.codiceFiscale);
    }
    
    // Rigenera PDF se già confermata
    var pdfRigenerato = false;
    if (statoAttuale !== 'In attesa') {
      eliminaPDFPrenotazione(idPrenotazione);
      var pdfResult = generaPDFContratto(idPrenotazione);
      pdfRigenerato = pdfResult.success;
    }
    
    return createJsonResponse({
      success: true,
      message: 'Prenotazione aggiornata',
      pdfRigenerato: pdfRigenerato
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: err.message
    }, 500);
  }
}

/**
 * Elimina prenotazione e relativo PDF
 * @param {Object} post - idPrenotazione
 * @return {ContentService} Risposta JSON
 */
function eliminaPrenotazione(post) {
  Logger.log('[eliminaPrenotazione] ID: ' + post.idPrenotazione);
  
  try {
    var idPrenotazione = post.idPrenotazione;
    if (!idPrenotazione) {
      return createJsonResponse({
        success: false,
        message: 'ID prenotazione richiesto'
      }, 400);
    }
    
    // Elimina PDF
    eliminaPDFPrenotazione(idPrenotazione);
    
    // Elimina riga
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
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
    return createJsonResponse({
      success: false,
      message: err.message
    }, 500);
  }
}

/**
 * Conferma prenotazione (shortcut per aggiornaStato)
 * @param {Object} post - idPrenotazione
 * @return {ContentService} Risposta JSON
 */
function confermaPrenotazione(post) {
  Logger.log('[confermaPrenotazione] Richiesta ricevuta per ID: ' + post.idPrenotazione);
  
  const idPrenotazione = String(post.idPrenotazione).trim();
  
  if (!idPrenotazione) {
    return createJsonResponse({
      success: false,
      message: 'ID prenotazione mancante'
    }, 400);
  }
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    
    // Trova colonna ID
    var idColIndex = -1;
    for (var h = 0; h < headers.length; h++) {
      var header = String(headers[h]).trim();
      if (header === 'ID prenotazione' ||
          header === 'idPrenotazione' ||
          header === 'IDPRENOTAZIONE' ||
          header.toLowerCase().replace(/\s+/g, '') === 'idprenotazione') {
        idColIndex = h;
        break;
      }
    }
    
    if (idColIndex === -1) {
      return createJsonResponse({
        success: false,
        message: 'Colonna ID prenotazione non trovata nel foglio'
      }, 500);
    }
    
    // Trova riga
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][idColIndex]).trim();
      if (rowId.toUpperCase() === idPrenotazione.toUpperCase()) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return createJsonResponse({
        success: false,
        message: 'Prenotazione non trovata con ID: ' + idPrenotazione
      }, 404);
    }
    
    // Trova colonna stato
    var statoColIndex = -1;
    for (var h = 0; h < headers.length; h++) {
      var header = String(headers[h]).trim();
      if (header === 'stato' ||
          header === 'statoPrenotazione' ||
          header === 'Stato prenotazione' ||
          header === 'STATOPRENOTAZIONE') {
        statoColIndex = h;
        break;
      }
    }
    
    if (statoColIndex === -1) {
      return createJsonResponse({
        success: false,
        message: 'Colonna stato non trovata nel foglio'
      }, 500);
    }
    
    // Aggiorna stato
    sh.getRange(rowIndex, statoColIndex + 1).setValue('Confermata');
    
    // Genera PDF
    var pdfResult = null;
    try {
      if (typeof generaPDFContratto === 'function') {
        pdfResult = generaPDFContratto(idPrenotazione);
      }
    } catch (e) {
      Logger.log('[confermaPrenotazione] Errore generazione PDF: ' + e.message);
    }
    
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
    return createJsonResponse({
      success: false,
      message: 'Errore durante la conferma: ' + error.message
    }, 500);
  }
}

/**
 * Aggiorna automaticamente stati prenotazioni in base alle date
 * Stati: In attesa -> Programmata -> In corso -> Completata
 * @return {ContentService} Risposta JSON con numero aggiornamenti
 */
function updateStatiLive() {
  try {
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
        Logger.log('[updateStatiLive] Riga ' + (i + 1) + ': ' + stato + ' → ' + nuovoStato);
      }
    }
    
    // Gestione manutenzioni
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

/**
 * Genera nuovo ID booking univoco per anno
 * Formato: BOOK-2025-001
 * @return {string} ID prenotazione generato
 */
function generaNuovoIdBooking() {
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
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

/**
 * Assegna ID a prenotazioni esistenti che non ne hanno
 * @return {ContentService} Risposta JSON con contatori
 */
function assegnaIdPrenotazioniEsistenti() {
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({
        success: true,
        message: 'Nessuna prenotazione trovata',
        processate: 0
      });
    }
    
    var prenotazioniPerAnno = {};
    var maxProgressiviPerAnno = {};
    
    // Prima passata: raccogli prenotazioni per anno
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var idEsistente = String(row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '').trim();
      
      // Determina anno
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
      
      prenotazioniPerAnno[annoPrenotazione].push({
        riga: i + 1,
        row: row,
        idEsistente: idEsistente,
        anno: annoPrenotazione
      });
      
      // Trova massimo progressivo
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
    
    // Seconda passata: assegna ID mancanti
    for (var anno in prenotazioniPerAnno) {
      var prossimoProgressivo = maxProgressiviPerAnno[anno] + 1;
      var prefisso = 'BOOK-' + anno + '-';
      
      for (var j = 0; j < prenotazioniPerAnno[anno].length; j++) {
        var prenotazione = prenotazioniPerAnno[anno][j];
        
        if (!prenotazione.idEsistente || prenotazione.idEsistente === '') {
          var nuovoId = prefisso + String(prossimoProgressivo).padStart(3, '0');
          sh.getRange(prenotazione.riga, CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE).setValue(nuovoId);
          prossimoProgressivo++;
          aggiornate++;
        }
        processate++;
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'ID assegnati',
      processate: processate,
      aggiornate: aggiornate
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore: ' + error.message
    }, 500);
  }
}
