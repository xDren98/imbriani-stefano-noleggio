/**
 * SERVIZIO GESTIONE MANUTENZIONI
 * 
 * Gestisce manutenzioni veicoli e aggiornamento stati
 */

/**
 * Crea/Aggiorna una manutenzione nel foglio MANUTENZIONI.
 * Se viene passato post.row (>1) aggiorna la riga specificata,
 * altrimenti aggiunge una nuova manutenzione in coda.
 *
 * Payload atteso:
 * - targa (string) [obbligatorio]
 * - stato (string) es. "Programmata" | "In corso" | "Completata"
 * - dataInizio (string gg/mm/aaaa) [obbligatorio]
 * - dataFine (string gg/mm/aaaa) [obbligatorio]
 * - costo (number/string opzionale)
 * - note (string opzionale)
 * - marca, modello, posti (opzionali; se assenti si tenta lookup da PULMINI)
 * - row (number opzionale; se presente aggiorna quella riga)
 */
function setManutenzione(post) {
  try {
    var targa = (post && post.targa) ? String(post.targa).trim().toUpperCase() : '';
    var stato = (post && post.stato) ? String(post.stato).trim() : '';
    var dataInizioStr = (post && post.dataInizio) ? String(post.dataInizio).trim() : '';
    var dataFineStr = (post && post.dataFine) ? String(post.dataFine).trim() : '';
    var costo = (post && typeof post.costo !== 'undefined') ? post.costo : '';
    var note = (post && post.note) ? String(post.note).trim() : '';
    var marca = (post && post.marca) ? String(post.marca).trim() : '';
    var modello = (post && post.modello) ? String(post.modello).trim() : '';
    var posti = (post && post.posti) ? parseInt(post.posti, 10) : '';
    var row = (post && post.row) ? parseInt(post.row, 10) : 0;

    if (!targa || !dataInizioStr || !dataFineStr) {
      return createJsonResponse({
        success: false,
        message: 'Parametri obbligatori mancanti: targa, dataInizio, dataFine'
      }, 400);
    }

    // Converte "gg/mm/aaaa" in Date per scrittura corretta sullo Sheet
    function parseDateIT(s) {
      try {
        var parts = String(s).split('/');
        var gg = parseInt(parts[0], 10);
        var mm = parseInt(parts[1], 10) - 1;
        var aaaa = parseInt(parts[2], 10);
        return new Date(aaaa, mm, gg);
      } catch (e) {
        return new Date(s);
      }
    }

    var dataInizio = parseDateIT(dataInizioStr);
    var dataFine = parseDateIT(dataFineStr);

    var sp = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shM = sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (!shM) {
      return createJsonResponse({ success: false, message: 'Foglio MANUTENZIONI non trovato' }, 500);
    }

    // Se marca/modello/posti non sono forniti, prova a ricavarli da PULMINI
    if (!marca || !modello || !posti) {
      try {
        var shP = sp.getSheetByName(CONFIG.SHEETS.PULMINI);
        if (shP) {
          var dataP = shP.getDataRange().getValues();
          for (var i = 1; i < dataP.length; i++) {
            var rp = dataP[i];
            var tp = rp[CONFIG.PULMINI_COLS.TARGA - 1];
            if (tp && String(tp).toUpperCase().trim() === targa) {
              marca = marca || (rp[CONFIG.PULMINI_COLS.MARCA - 1] || '');
              modello = modello || (rp[CONFIG.PULMINI_COLS.MODELLO - 1] || '');
              posti = posti || (parseInt(rp[CONFIG.PULMINI_COLS.POSTI - 1], 10) || 9);
              break;
            }
          }
        }
      } catch (e) {
        // Ignora errori lookup, i campi restano vuoti
      }
    }

    var values = [];
    values[CONFIG.MANUTENZIONI_COLS.TARGA - 1] = sanitizeSheetValue(targa);
    values[CONFIG.MANUTENZIONI_COLS.MARCA - 1] = sanitizeSheetValue(marca);
    values[CONFIG.MANUTENZIONI_COLS.MODELLO - 1] = sanitizeSheetValue(modello);
    values[CONFIG.MANUTENZIONI_COLS.POSTI - 1] = posti || 9;
    values[CONFIG.MANUTENZIONI_COLS.STATO - 1] = sanitizeSheetValue(stato || 'Programmata');
    values[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1] = dataInizio;
    values[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1] = dataFine;
    values[CONFIG.MANUTENZIONI_COLS.COSTO - 1] = costo || '';
    values[CONFIG.MANUTENZIONI_COLS.NOTE - 1] = sanitizeSheetValue(note || '');

    if (row && row > 1) {
      // Aggiorna la riga esistente
      var lastCol = Math.max(
        CONFIG.MANUTENZIONI_COLS.NOTE,
        CONFIG.MANUTENZIONI_COLS.COSTO,
        CONFIG.MANUTENZIONI_COLS.DATA_FINE
      );
      shM.getRange(row, 1, 1, lastCol).setValues([values]);
      return createJsonResponse({ success: true, message: 'Manutenzione aggiornata', data: { row: row, targa: targa } });
    } else {
      // Tentativo di aggiornamento per match targa + periodo se fornito
      var matchInizioStr = (post && (post.matchDataInizio || post.matchInizio)) ? String(post.matchDataInizio || post.matchInizio) : '';
      var matchFineStr = (post && (post.matchDataFine || post.matchFine)) ? String(post.matchDataFine || post.matchFine) : '';
      if (matchInizioStr && matchFineStr) {
        var dataVals = shM.getDataRange().getValues();
        var foundRow = 0;
        for (var r = 1; r < dataVals.length; r++) {
          var rt = String(dataVals[r][CONFIG.MANUTENZIONI_COLS.TARGA - 1] || '').trim().toUpperCase();
          var rdi = dataVals[r][CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
          var rdf = dataVals[r][CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
          var rdiStr = (rdi instanceof Date) ? formatDateToItalian(rdi) : String(rdi || '');
          var rdfStr = (rdf instanceof Date) ? formatDateToItalian(rdf) : String(rdf || '');
          if (rt === targa && rdiStr === matchInizioStr && rdfStr === matchFineStr) { foundRow = r + 1; break; }
        }
        if (foundRow) {
          var lastC = Math.max(CONFIG.MANUTENZIONI_COLS.NOTE, CONFIG.MANUTENZIONI_COLS.COSTO, CONFIG.MANUTENZIONI_COLS.DATA_FINE);
          shM.getRange(foundRow, 1, 1, lastC).setValues([values]);
          return createJsonResponse({ success: true, message: 'Manutenzione aggiornata', data: { row: foundRow, targa: targa } });
        }
      }
      // Aggiungi nuova riga in coda
      shM.appendRow(values);
      var newRow = shM.getLastRow();
      return createJsonResponse({ success: true, message: 'Manutenzione aggiunta', data: { row: newRow, targa: targa } });
    }
  } catch (err) {
    Logger.log('[setManutenzione] Errore: ' + err.message);
    return createJsonResponse({ success: false, message: 'Errore salvataggio manutenzione: ' + err.message }, 500);
  }
}

/**
 * Elimina una manutenzione esistente dal foglio MANUTENZIONI.
 * Parametri accettati: { targa, dataInizio, dataFine } oppure { row }
 */
function eliminaManutenzione(post){
  try{
    var sp = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shM = sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (!shM) return createJsonResponse({ success:false, message:'Foglio MANUTENZIONI non trovato' }, 500);
    var row = (post && post.row) ? parseInt(post.row,10) : 0;
    if (row && row > 1){ shM.deleteRow(row); return createJsonResponse({ success:true, message:'Manutenzione eliminata', data:{ row: row } }); }
    var targa = (post && post.targa) ? String(post.targa).trim().toUpperCase() : '';
    var di = (post && (post.dataInizio||post.matchDataInizio)) ? String(post.dataInizio||post.matchDataInizio) : '';
    var df = (post && (post.dataFine||post.matchDataFine)) ? String(post.dataFine||post.matchDataFine) : '';
    if (!targa || !di || !df) return createJsonResponse({ success:false, message:'Parametri mancanti: targa, dataInizio, dataFine' }, 400);
    var dataVals = shM.getDataRange().getValues();
    var targetRow = 0;
    for (var r=1; r<dataVals.length; r++){
      var rt = String(dataVals[r][CONFIG.MANUTENZIONI_COLS.TARGA - 1] || '').trim().toUpperCase();
      var rdi = dataVals[r][CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
      var rdf = dataVals[r][CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
      var rdiStr = (rdi instanceof Date) ? formatDateToItalian(rdi) : String(rdi||'');
      var rdfStr = (rdf instanceof Date) ? formatDateToItalian(rdf) : String(rdf||'');
      if (rt===targa && rdiStr===di && rdfStr===df){ targetRow = r+1; break; }
    }
    if (!targetRow) return createJsonResponse({ success:false, message:'Voce manutenzione non trovata' }, 404);
    shM.deleteRow(targetRow);
    return createJsonResponse({ success:true, message:'Manutenzione eliminata', data:{ row: targetRow, targa: targa } });
  }catch(err){
    Logger.log('[eliminaManutenzione] Errore: '+err.message);
    return createJsonResponse({ success:false, message:'Errore eliminazione manutenzione: '+err.message }, 500);
  }
}
