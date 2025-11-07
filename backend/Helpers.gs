/**
 * HELPER GENERICI
 * 
 * Funzioni di utility generiche utilizzate in tutto il sistema
 */

/**
 * Crea una risposta JSON standardizzata
 * @param {Object} data - Dati da restituire
 * @param {number} status - Codice HTTP status (default 200)
 * @return {ContentService} Risposta JSON formattata
 */
function createJsonResponse(data, status) {
  var s = status || 200;
  var resp = data;
  resp.timestamp = new Date().toISOString();
  resp.version = CONFIG.VERSION;
  resp.status = s;
  
  return ContentService
    .createTextOutput(JSON.stringify(resp))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Recupera dati generici da un foglio Google Sheets
 * @param {Object} p - Parametri contenenti 'name' del foglio
 * @return {ContentService} Risposta JSON con dati del foglio
 */
function getSheetGeneric(p) {
  try {
    var name = p.name;
    if (!name) {
      return createJsonResponse({
        success: false,
        message: 'Parametro name mancante'
      }, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
    if (!sh) {
      return createJsonResponse({
        success: false,
        message: 'Foglio non trovato: ' + name
      }, 404);
    }
    
    var vals = sh.getDataRange().getValues();
    var headers = vals[0];
    var rows = [];
    
    for (var i = 1; i < vals.length; i++) {
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        var val = vals[i][c];
        obj[headers[c]] = val;
        
        // Se è una data, aggiungi anche versione formattata
        if (val instanceof Date && !isNaN(val.getTime())) {
          obj[headers[c] + 'Formatted'] = formatDateToItalian(val);
        }
      }
      rows.push(obj);
    }
    
    return createJsonResponse({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore getSheet: ' + err.message
    }, 500);
  }
}

/**
 * Normalizza un nome completo per utilizzo nei filename
 * @param {string} nomeCompleto - Nome da normalizzare
 * @return {Object} Oggetto con varianti del nome
 */
function normalizzaNome(nomeCompleto) {
  if (!nomeCompleto) return { conUnderscore: '', senzaSpazi: '', originale: '' };
  
  var nome = String(nomeCompleto).trim().replace(/\s+/g, ' ');
  var conUnderscore = nome.replace(/\s+/g, '_');
  var senzaSpazi = nome.replace(/\s+/g, '');
  
  return {
    conUnderscore: conUnderscore,
    senzaSpazi: senzaSpazi,
    originale: nome
  };
}

/**
 * Genera informazioni sulla versione del backend
 * @return {Object} Oggetto con info versione
 */
function versionInfo() {
  return {
    success: true,
    service: 'imbriani-backend',
    version: CONFIG.VERSION,
    features: [
      'pdf_generation',
      'modifica_prenotazione',
      'elimina_prenotazione',
      'aggiornaStatoPrenotazione',
      'booking_id_dinamico_anno',
      'date_format_italian',
      'modular_architecture'
    ],
    time: new Date().toISOString()
  };
}
