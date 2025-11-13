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
  dbg('[getPrenotazioni] Chiamata ricevuta');
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName('PRENOTAZIONI');
    
    if (!sh) {
      dbg('[getPrenotazioni] Foglio PRENOTAZIONI non trovato');
      return createJsonResponse({
        success: false,
        message: 'Foglio PRENOTAZIONI non trovato'
      }, 500);
    }
    
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      dbg('[getPrenotazioni] Nessuna prenotazione trovata');
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
      var statoRow = String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '').trim().toLowerCase();
      // Mostra sempre le prenotazioni Legacy anche se mancano targa e CF
      if (!t && !cf && statoRow !== 'legacy') continue;
      
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
    
    dbg('[getPrenotazioni] Trovate ' + out.length + ' prenotazioni');
    return createJsonResponse({
      success: true,
      message: 'Trovate ' + out.length + ' prenotazioni',
      data: out,
      count: out.length
    });
  } catch(err) {
    dbg('[getPrenotazioni] Errore: ' + err.message);
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
    // Normalizza le date autista 1 in oggetti Date per corretta formattazione nel foglio
    row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1 - 1] = post.autista1 && post.autista1.dataNascita ? parseItalianOrISO(post.autista1.dataNascita) : '';
    row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1 - 1] = post.autista1 && post.autista1.luogoNascita ? post.autista1.luogoNascita : '';
    row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1] = post.autista1 && post.autista1.codiceFiscale ? post.autista1.codiceFiscale : '';
    row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1 - 1] = post.autista1 && post.autista1.comuneResidenza ? post.autista1.comuneResidenza : '';
    row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1 - 1] = post.autista1 && post.autista1.viaResidenza ? post.autista1.viaResidenza : '';
    row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1 - 1] = post.autista1 && post.autista1.civicoResidenza ? post.autista1.civicoResidenza : '';
    row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1 - 1] = post.autista1 && post.autista1.numeroPatente ? post.autista1.numeroPatente : '';
    row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1 - 1] = post.autista1 && (post.autista1.inizioValiditaPatente || post.autista1.dataInizioPatente) ? parseItalianOrISO(post.autista1.inizioValiditaPatente || post.autista1.dataInizioPatente) : '';
    row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1 - 1] = post.autista1 && post.autista1.scadenzaPatente ? parseItalianOrISO(post.autista1.scadenzaPatente) : '';
    
    // Dati noleggio
    row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1] = post.targa || '';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] = post.oraInizio || '';
    row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] = post.oraFine || '';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1] = post.giornoInizio ? parseItalianOrISO(post.giornoInizio) : '';
    row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1] = post.giornoFine ? parseItalianOrISO(post.giornoFine) : '';
    row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1] = post.destinazione || '';
    // Accetta sia 'cellulare' che 'cell' dal payload autista1, con fallback a post.cellulare
    row[CONFIG.PRENOTAZIONI_COLS.CELLULARE - 1] = (post.autista1 && (post.autista1.cellulare || post.autista1.cell)) ? (post.autista1.cellulare || post.autista1.cell) : (post.cellulare || '');
    row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1] = post.giornoInizio ? parseItalianOrISO(post.giornoInizio) : '';
    row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1] = post.email || '';
    row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] = 'In attesa';
    row[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1] = post.importo || 0;
    
    // Autista 2 (opzionale)
    if (post.autista2) {
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2 - 1] = post.autista2.nomeCompleto || post.autista2.nome || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2 - 1] = post.autista2.dataNascita ? parseItalianOrISO(post.autista2.dataNascita) : '';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2 - 1] = post.autista2.luogoNascita || '';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2 - 1] = post.autista2.codiceFiscale || '';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2 - 1] = post.autista2.comuneResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2 - 1] = post.autista2.viaResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2 - 1] = post.autista2.civicoResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2 - 1] = post.autista2.numeroPatente || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2 - 1] = (post.autista2.inizioValiditaPatente || post.autista2.dataInizioPatente) ? parseItalianOrISO(post.autista2.inizioValiditaPatente || post.autista2.dataInizioPatente) : '';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2 - 1] = post.autista2.scadenzaPatente ? parseItalianOrISO(post.autista2.scadenzaPatente) : '';
    }
    
    // Autista 3 (opzionale)
    if (post.autista3) {
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3 - 1] = post.autista3.nomeCompleto || post.autista3.nome || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3 - 1] = post.autista3.dataNascita ? parseItalianOrISO(post.autista3.dataNascita) : '';
      row[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3 - 1] = post.autista3.luogoNascita || '';
      row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3 - 1] = post.autista3.codiceFiscale || '';
      row[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3 - 1] = post.autista3.comuneResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3 - 1] = post.autista3.viaResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3 - 1] = post.autista3.civicoResidenza || '';
      row[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3 - 1] = post.autista3.numeroPatente || '';
      row[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3 - 1] = (post.autista3.inizioValiditaPatente || post.autista3.dataInizioPatente) ? parseItalianOrISO(post.autista3.inizioValiditaPatente || post.autista3.dataInizioPatente) : '';
      row[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3 - 1] = post.autista3.scadenzaPatente ? parseItalianOrISO(post.autista3.scadenzaPatente) : '';
    }
    
    // Genera ID booking
    var id = generaNuovoIdBooking();
    row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] = id;
    
    // Salva prenotazione
    sh.appendRow(row);
    invalidateIndex('PREN');
    
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
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var rowIndex = prenRowIndexById(idPrenotazione);
    
    if (rowIndex === -1) {
      return createJsonResponse({
        success: false,
        message: 'Prenotazione non trovata con ID: ' + idPrenotazione
      }, 404);
    }
    
    var lastCol = sh.getLastColumn();
    var row = sh.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    var C = CONFIG.PRENOTAZIONI_COLS;
    row[C.STATO_PRENOTAZIONE-1] = nuovoStato;
    if (importo && nuovoStato === 'Confermata') { row[C.IMPORTO_PREVENTIVO-1] = importo; }
    sh.getRange(rowIndex, 1, 1, lastCol).setValues([row]);
    invalidateIndex('PREN');
    
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
    
    // Aggiorna stato prenotazione se presente nel payload
    var nuovoStato = post.stato || post.nuovoStato;
    if (nuovoStato) {
      sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE).setValue(nuovoStato);
    }

    // Aggiorna campi prenotazione (accetta sia nomi backend che nomi flat dell'admin)
    if (post.targa) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.TARGA).setValue(post.targa);
    if (post.giornoInizio) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO).setValue(parseItalianOrISO(post.giornoInizio));
    if (post.giornoFine) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE).setValue(parseItalianOrISO(post.giornoFine));
    if (post.oraInizio) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO).setValue(post.oraInizio);
    if (post.oraFine) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.ORA_FINE).setValue(post.oraFine);
    if (post.destinazione) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE).setValue(post.destinazione);
    var cellulareTop = post.cellulare || post.cell; // alias
    if (cellulareTop) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CELLULARE).setValue(cellulareTop);
    if (post.email) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.EMAIL).setValue(post.email);
    var importo = (post.importo !== undefined ? post.importo : post.importoPreventivo);
    if (importo) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO).setValue(importo);

    // Mapping Autista 1: accetta payload annidato o flat dell'admin
    var a1 = post.autista1 || {};
    var nomeA1 = post.nomeAutista1 || a1.nomeCompleto;
    var cfA1 = post.codiceFiscaleAutista1 || a1.codiceFiscale;
    var nascitaA1 = post.dataNascitaAutista1 || a1.dataNascita;
    var luogoNascitaA1 = post.luogoNascitaAutista1 || a1.luogoNascita;
    var patenteNumA1 = post.numeroPatenteAutista1 || a1.numeroPatente;
    var patenteInizioA1 = a1.inizioValiditaPatente || a1.dataInizioPatente; // campo non presente nel form
    var patenteScadenzaA1 = post.scadenzaPatenteAutista1 || a1.scadenzaPatente;
    var comuneResA1 = post.comuneResidenzaAutista1 || a1.comuneResidenza;
    var viaResA1 = post.viaResidenzaAutista1 || a1.viaResidenza;
    var civicoResA1 = post.civicoResidenzaAutista1 || a1.civicoResidenza;

    if (nomeA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1).setValue(nomeA1);
    if (cfA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1).setValue(cfA1);
    if (luogoNascitaA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1).setValue(luogoNascitaA1);
    if (comuneResA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1).setValue(comuneResA1);
    if (viaResA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1).setValue(viaResA1);
    if (civicoResA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1).setValue(civicoResA1);
    if (patenteNumA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1).setValue(patenteNumA1);

    // Date Autista 1 normalizzate
    if (nascitaA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1).setValue(parseItalianOrISO(nascitaA1));
    if (patenteInizioA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1).setValue(parseItalianOrISO(patenteInizioA1));
    if (patenteScadenzaA1) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1).setValue(parseItalianOrISO(patenteScadenzaA1));

    // Mapping Autista 2 (solo se presenti dati)
    var a2 = post.autista2 || {};
    var nomeA2 = post.nomeAutista2 || a2.nomeCompleto;
    var cfA2 = post.codiceFiscaleAutista2 || a2.codiceFiscale;
    var nascitaA2 = post.dataNascitaAutista2 || a2.dataNascita;
    var luogoNascitaA2 = post.luogoNascitaAutista2 || a2.luogoNascita;
    var patenteNumA2 = post.numeroPatenteAutista2 || a2.numeroPatente;
    var patenteInizioA2 = a2.inizioValiditaPatente || a2.dataInizioPatente;
    var patenteScadenzaA2 = post.scadenzaPatenteAutista2 || a2.scadenzaPatente;
    var comuneResA2 = post.comuneResidenzaAutista2 || a2.comuneResidenza;
    var viaResA2 = post.viaResidenzaAutista2 || a2.viaResidenza;
    var civicoResA2 = post.civicoResidenzaAutista2 || a2.civicoResidenza;

    if (nomeA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2).setValue(nomeA2);
    if (cfA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2).setValue(cfA2);
    if (luogoNascitaA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2).setValue(luogoNascitaA2);
    if (comuneResA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2).setValue(comuneResA2);
    if (viaResA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2).setValue(viaResA2);
    if (civicoResA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2).setValue(civicoResA2);
    if (patenteNumA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2).setValue(patenteNumA2);
    if (nascitaA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2).setValue(parseItalianOrISO(nascitaA2));
    if (patenteInizioA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2).setValue(parseItalianOrISO(patenteInizioA2));
    if (patenteScadenzaA2) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2).setValue(parseItalianOrISO(patenteScadenzaA2));

    // Mapping Autista 3 (solo se presenti dati)
    var a3 = post.autista3 || {};
    var nomeA3 = post.nomeAutista3 || a3.nomeCompleto;
    var cfA3 = post.codiceFiscaleAutista3 || a3.codiceFiscale;
    var nascitaA3 = post.dataNascitaAutista3 || a3.dataNascita;
    var luogoNascitaA3 = post.luogoNascitaAutista3 || a3.luogoNascita;
    var patenteNumA3 = post.numeroPatenteAutista3 || a3.numeroPatente;
    var patenteInizioA3 = a3.inizioValiditaPatente || a3.dataInizioPatente;
    var patenteScadenzaA3 = post.scadenzaPatenteAutista3 || a3.scadenzaPatente;
    var comuneResA3 = post.comuneResidenzaAutista3 || a3.comuneResidenza;
    var viaResA3 = post.viaResidenzaAutista3 || a3.viaResidenza;
    var civicoResA3 = post.civicoResidenzaAutista3 || a3.civicoResidenza;

    if (nomeA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3).setValue(nomeA3);
    if (cfA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3).setValue(cfA3);
    if (luogoNascitaA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3).setValue(luogoNascitaA3);
    if (comuneResA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3).setValue(comuneResA3);
    if (viaResA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3).setValue(viaResA3);
    if (civicoResA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3).setValue(civicoResA3);
    if (patenteNumA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3).setValue(patenteNumA3);
    if (nascitaA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3).setValue(parseItalianOrISO(nascitaA3));
    if (patenteInizioA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3).setValue(parseItalianOrISO(patenteInizioA3));
    if (patenteScadenzaA3) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3).setValue(parseItalianOrISO(patenteScadenzaA3));
    
    // Rigenera PDF se già confermata
    var pdfRigenerato = false;
    if (statoAttuale !== 'In attesa' || nuovoStato === 'Confermata') {
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
 * Aggiorna SOLO i dati degli autisti (endpoint pubblico con token autisti)
 * Non modifica stato, veicolo, importi, PDF.
 * @param {Object} post - { idPrenotazione, autista1?, autista2?, autista3?, cellulare? }
 * @return {ContentService} Risposta JSON
 */
function aggiornaAutistiPubblico(post) {
  Logger.log('[aggiornaAutistiPubblico] Input: ' + JSON.stringify(post));
  try {
    var idPrenotazione = post.idPrenotazione;
    if (!idPrenotazione) {
      return createJsonResponse({ success: false, message: 'ID prenotazione richiesto' }, 400);
    }

    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var rowIndex = -1;
    var statoAttuale = '';
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        rowIndex = i + 1;
        statoAttuale = String(data[i][CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '').trim();
        break;
      }
    }
    if (rowIndex === -1) {
      return createJsonResponse({ success: false, message: 'Prenotazione non trovata' }, 404);
    }

    // Consenti aggiornamento cellulare di contatto
    var cellPublic = post.cellulare || post.cell;
    if (cellPublic) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CELLULARE).setValue(cellPublic);

    // Autista 1
    var a1 = post.autista1 || {};
    if (post.nomeAutista1 || a1.nomeCompleto) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1).setValue(post.nomeAutista1 || a1.nomeCompleto);
    if (post.codiceFiscaleAutista1 || a1.codiceFiscale) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1).setValue(post.codiceFiscaleAutista1 || a1.codiceFiscale);
    if (post.luogoNascitaAutista1 || a1.luogoNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1).setValue(post.luogoNascitaAutista1 || a1.luogoNascita);
    if (post.comuneResidenzaAutista1 || a1.comuneResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1).setValue(post.comuneResidenzaAutista1 || a1.comuneResidenza);
    if (post.viaResidenzaAutista1 || a1.viaResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1).setValue(post.viaResidenzaAutista1 || a1.viaResidenza);
    if (post.civicoResidenzaAutista1 || a1.civicoResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1).setValue(post.civicoResidenzaAutista1 || a1.civicoResidenza);
    if (post.numeroPatenteAutista1 || a1.numeroPatente) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1).setValue(post.numeroPatenteAutista1 || a1.numeroPatente);
    if (post.dataNascitaAutista1 || a1.dataNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1).setValue(parseItalianOrISO(post.dataNascitaAutista1 || a1.dataNascita));
    var a1Start = a1.inizioValiditaPatente || a1.dataInizioPatente;
    if (a1Start) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1).setValue(parseItalianOrISO(a1Start));
    if (post.scadenzaPatenteAutista1 || a1.scadenzaPatente) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1).setValue(parseItalianOrISO(post.scadenzaPatenteAutista1 || a1.scadenzaPatente));

    // Autista 2
    var a2 = post.autista2 || {};
    if (post.nomeAutista2 || a2.nomeCompleto) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2).setValue(post.nomeAutista2 || a2.nomeCompleto);
    if (post.codiceFiscaleAutista2 || a2.codiceFiscale) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2).setValue(post.codiceFiscaleAutista2 || a2.codiceFiscale);
    if (post.luogoNascitaAutista2 || a2.luogoNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2).setValue(post.luogoNascitaAutista2 || a2.luogoNascita);
    if (post.comuneResidenzaAutista2 || a2.comuneResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2).setValue(post.comuneResidenzaAutista2 || a2.comuneResidenza);
    if (post.viaResidenzaAutista2 || a2.viaResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2).setValue(post.viaResidenzaAutista2 || a2.viaResidenza);
    if (post.civicoResidenzaAutista2 || a2.civicoResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2).setValue(post.civicoResidenzaAutista2 || a2.civicoResidenza);
    if (post.numeroPatenteAutista2 || a2.numeroPatente) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2).setValue(post.numeroPatenteAutista2 || a2.numeroPatente);
    if (post.dataNascitaAutista2 || a2.dataNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2).setValue(parseItalianOrISO(post.dataNascitaAutista2 || a2.dataNascita));
    var a2Start = a2.inizioValiditaPatente || a2.dataInizioPatente;
    if (a2Start) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2).setValue(parseItalianOrISO(a2Start));
    if (post.scadenzaPatenteAutista2 || a2.scadenzaPatente) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2).setValue(parseItalianOrISO(post.scadenzaPatenteAutista2 || a2.scadenzaPatente));

    // Autista 3
    var a3 = post.autista3 || {};
    if (post.nomeAutista3 || a3.nomeCompleto) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3).setValue(post.nomeAutista3 || a3.nomeCompleto);
    if (post.codiceFiscaleAutista3 || a3.codiceFiscale) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3).setValue(post.codiceFiscaleAutista3 || a3.codiceFiscale);
    if (post.luogoNascitaAutista3 || a3.luogoNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3).setValue(post.luogoNascitaAutista3 || a3.luogoNascita);
    if (post.comuneResidenzaAutista3 || a3.comuneResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3).setValue(post.comuneResidenzaAutista3 || a3.comuneResidenza);
    if (post.viaResidenzaAutista3 || a3.viaResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3).setValue(post.viaResidenzaAutista3 || a3.viaResidenza);
    if (post.civicoResidenzaAutista3 || a3.civicoResidenza) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3).setValue(post.civicoResidenzaAutista3 || a3.civicoResidenza);
    if (post.numeroPatenteAutista3 || a3.numeroPatente) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3).setValue(post.numeroPatenteAutista3 || a3.numeroPatente);
    if (post.dataNascitaAutista3 || a3.dataNascita) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3).setValue(parseItalianOrISO(post.dataNascitaAutista3 || a3.dataNascita));
    var a3Start = a3.inizioValiditaPatente || a3.dataInizioPatente;
    if (a3Start) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3).setValue(parseItalianOrISO(a3Start));
    if (post.scadenzaPatenteAutista3 || a3.scadenzaPatente) sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3).setValue(parseItalianOrISO(post.scadenzaPatenteAutista3 || a3.scadenzaPatente));

    // Se la prenotazione è stata importata come Legacy, portala in "In attesa" dopo l'invio dei dati autisti
    if (statoAttuale && /^legacy$/i.test(statoAttuale)) {
      try {
        sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE).setValue('In attesa');
        Logger.log('[aggiornaAutistiPubblico] Stato aggiornato: Legacy → In attesa');
      } catch (e) {
        Logger.log('[aggiornaAutistiPubblico] Errore aggiornamento stato Legacy→In attesa: ' + e.message);
      }
    }

    return createJsonResponse({ success: true, message: 'Dati autisti aggiornati' });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.message }, 500);
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
      
      // Skip stati finali o non gestiti automaticamente
      if (stato === 'In attesa' || stato === 'Rifiutata' || stato === 'Completata' || stato === 'Legacy') {
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
