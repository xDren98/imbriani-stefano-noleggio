/**
 * SERVIZIO GENERAZIONE PDF CONTRATTI
 * 
 * Gestisce creazione, eliminazione e censimento PDF
 */

/**
 * Genera PDF contratto da prenotazione
 * @param {string} idPrenotazione - ID prenotazione
 * @return {Object} Oggetto con risultato generazione
 */
function generaPDFContratto(idPrenotazione) {
  Logger.log('[generaPDFContratto] ID: ' + idPrenotazione);
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
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
    
    var mappa = {};
    
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
    
    // Dati veicolo
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
    
    // Converti in PDF
    var pdfBlob = DriveApp.getFileById(tempDoc.getId()).getAs(MimeType.PDF);
    var nomeCliente = String(mappa['<<Nome>>'] || 'Cliente').replace(/\s+/g, '_');
    var dataRitiro = String(mappa['<<Giorno inizio noleggio>>'] || '').replace(/\//g, '-');
    var dataArrivo = String(mappa['<<Giorno fine noleggio>>'] || '').replace(/\//g, '-');
    var nomePdf = nomeCliente + '_' + dataRitiro + '_' + dataArrivo + '.pdf';
    
    // Salva in cartella
    var folder = DriveApp.getFolderById(CONFIG.PDF.PDF_FOLDER_ID);
    var pdfFile = folder.createFile(pdfBlob).setName(nomePdf);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Elimina documento temporaneo
    DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
    
    // Aggiorna URL in foglio
    sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.PDF_URL).setValue(pdfFile.getUrl());
    
    Logger.log('[generaPDFContratto] PDF creato: ' + nomePdf);
    
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

/**
 * Elimina PDF associato a prenotazione
 * @param {string} idPrenotazione - ID prenotazione
 */
function eliminaPDFPrenotazione(idPrenotazione) {
  Logger.log('[eliminaPDFPrenotazione] ID: ' + idPrenotazione);
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var pdfUrl = '';
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1]) === String(idPrenotazione)) {
        pdfUrl = data[i][CONFIG.PRENOTAZIONI_COLS.PDF_URL - 1] || '';
        break;
      }
    }
    
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

/**
 * Censisce PDF esistenti e collega a prenotazioni
 * @return {ContentService} Risposta JSON con statistiche
 */
function censisciPDFEsistenti() {
  Logger.log('[censisciPDFEsistenti] Avvio censimento...');
  
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({
        success: false,
        message: 'Nessuna prenotazione trovata'
      });
    }
    
    var folder = DriveApp.getFolderById(CONFIG.PDF.PDF_FOLDER_ID);
    var files = folder.getFiles();
    var pdfMap = {};
    
    // Mappa tutti i PDF nella cartella
    while (files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() === MimeType.PDF) {
        var nomePdf = file.getName();
        pdfMap[nomePdf] = file.getUrl();
      }
    }
    
    var trovati = 0;
    var aggiornati = 0;
    var giàCollegati = 0;
    
    // Cerca PDF per ogni prenotazione
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowIndex = i + 1;
      
      var nomeClienteOriginale = String(row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || '');
      var giornoInizio = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var giornoFine = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1];
      var pdfUrlEsistente = String(row[CONFIG.PRENOTAZIONI_COLS.PDF_URL - 1] || '').trim();
      
      if (!nomeClienteOriginale || !giornoInizio || !giornoFine) {
        continue;
      }
      
      var nomiVarianti = normalizzaNome(nomeClienteOriginale);
      var dataRitiro = formatDateForFilename(parseItalianOrISO(giornoInizio));
      var dataArrivo = formatDateForFilename(parseItalianOrISO(giornoFine));
      
      var varianti = [
        nomiVarianti.senzaSpazi + '_' + dataRitiro + '_' + dataArrivo + '.pdf',
        nomiVarianti.conUnderscore + '_' + dataRitiro + '_' + dataArrivo + '.pdf'
      ];
      
      var pdfTrovato = null;
      
      for (var v = 0; v < varianti.length; v++) {
        if (pdfMap[varianti[v]]) {
          pdfTrovato = pdfMap[varianti[v]];
          break;
        }
      }
      
      if (pdfTrovato) {
        trovati++;
        if (!pdfUrlEsistente) {
          sh.getRange(rowIndex, CONFIG.PRENOTAZIONI_COLS.PDF_URL).setValue(pdfTrovato);
          aggiornati++;
        } else {
          giàCollegati++;
        }
      }
    }
    
    return createJsonResponse({
      success: true,
      message: 'Censimento completato',
      pdfTrovati: trovati,
      recordAggiornati: aggiornati,
      giàCollegati: giàCollegati,
      pdfNellaCartella: Object.keys(pdfMap).length
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Errore censimento: ' + err.message
    }, 500);
  }
}

/**
 * Helper per formattare date nei nomi file
 * @param {Date} date - Data da formattare
 * @return {string} Data formattata gg-mm-aaaa
 */
function formatDateForFilename(date) {
  if (date instanceof Date && !isNaN(date.getTime())) {
    var d = Utilities.formatDate(date, CONFIG.PDF.TIMEZONE, 'dd/MM/yyyy');
    return d.replace(/\//g, '-');
  }
  return '';
}
