/**
 * HELPER GENERICI
 * 
 * Funzioni di utility generiche utilizzate in tutto il sistema
 */

/**
 * Sanitizza i valori per prevenire formula injection in Google Sheets
 * @param {string} value - Valore da sanitizzare
 * @return {string} Valore sanitizzato
 */
function sanitizeSheetValue(value) {
  if (value === null || value === undefined) return '';
  var str = String(value).trim();
  
  // Se il valore inizia con caratteri pericolosi per le formule, aggiungi uno spazio davanti
  var dangerousPrefixes = /^[=+\-@]/;
  if (dangerousPrefixes.test(str)) {
    return ' ' + str;
  }
  
  return str;
}

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
      return createJsonResponse({ success: false, message: 'Parametro name mancante' }, 400);
    }
    var fieldsRaw = String(p.fields || '').trim();
    var fields = fieldsRaw ? fieldsRaw.split(',').map(function(s){ return String(s).trim(); }).filter(function(s){ return s.length>0; }) : null;
    var limit = parseInt(p.limit, 10); if (isNaN(limit) || limit <= 0) limit = 0;
    var offset = parseInt(p.offset, 10); if (isNaN(offset) || offset < 0) offset = 0;
    var nocache = String(p.nocache || '').trim() === '1';
    var cacheKey = 'sheet:' + name + ':' + (fields ? fields.join('|') : '*') + ':' + limit + ':' + offset;
    var cache = CacheService.getScriptCache();
    if (!nocache) {
      var cached = cache.get(cacheKey);
      if (cached) {
        return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
      }
    }
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
    if (!sh) {
      return createJsonResponse({ success: false, message: 'Foglio non trovato: ' + name }, 404);
    }
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var idxMap = {};
    for (var c = 0; c < headers.length; c++) { idxMap[headers[c]] = c; }
    var selectedIdx = null;
    var outHeaders = headers;
    if (fields && fields.length) {
      selectedIdx = [];
      outHeaders = fields;
      for (var k = 0; k < fields.length; k++) {
        var h = fields[k];
        if (idxMap[h] !== undefined) selectedIdx.push(idxMap[h]);
      }
    }
    var rows = [];
    var dataStartRow = 2 + offset; // dati iniziano dalla riga 2
    var availableRows = Math.max(0, lastRow - (1 + offset));
    var takeRows = limit > 0 ? Math.min(availableRows, limit) : availableRows;
    var vals = takeRows > 0 ? sh.getRange(dataStartRow, 1, takeRows, lastCol).getValues() : [];
    for (var i = 0; i < vals.length; i++) {
      var obj = {};
      if (selectedIdx) {
        for (var s = 0; s < selectedIdx.length; s++) {
          var ci = selectedIdx[s];
          var key = outHeaders[s];
          var val = vals[i][ci];
          obj[key] = val;
          if (val instanceof Date && !isNaN(val.getTime())) { obj[key + 'Formatted'] = formatDateToItalian(val); }
        }
      } else {
        for (var j = 0; j < headers.length; j++) {
          var v = vals[i][j];
          obj[headers[j]] = v;
          if (v instanceof Date && !isNaN(v.getTime())) { obj[headers[j] + 'Formatted'] = formatDateToItalian(v); }
        }
      }
      rows.push(obj);
    }
    var respObj = { success: true, data: rows, count: rows.length };
    var respText = JSON.stringify(respObj);
    if (!nocache) { cache.put(cacheKey, respText, 60); }
    return ContentService.createTextOutput(respText).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return createJsonResponse({ success: false, message: 'Errore getSheet: ' + err.message }, 500);
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

/**
 * Cache helpers JSON
 */
function getCacheJson(key){ try{ var c=CacheService.getScriptCache(); var raw=c.get(key); return raw?JSON.parse(raw):null; }catch(_){ return null } }
function putCacheJson(key,obj,ttl){ try{ var c=CacheService.getScriptCache(); c.put(key, JSON.stringify(obj), ttl||300); }catch(_){ } }

/**
 * Indici per ricerche veloci su CLIENTI e PRENOTAZIONI
 */
function buildClientIndex(){
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
  if (!sh) return { rows:{}, updated: new Date().toISOString() };
  var vals = sh.getDataRange().getValues();
  var C = CONFIG.CLIENTI_COLS;
  var map = {};
  for (var i=1;i<vals.length;i++){ var cf = String(vals[i][C.CODICE_FISCALE-1]||'').trim().toUpperCase(); if (cf) map[cf] = i+1; }
  var idx = { rows: map, updated: new Date().toISOString(), lastRow: sh.getLastRow() };
  putCacheJson('IDX_CLIENTI_V1', idx, 600);
  return idx;
}
function clientRowIndexByCF(cf){ cf=String(cf||'').trim().toUpperCase(); if (!cf) return -1; var idx = getCacheJson('IDX_CLIENTI_V1'); if (!idx || !idx.rows || !idx.rows[cf]) { idx = buildClientIndex(); }
  return idx.rows[cf] ? idx.rows[cf] : -1;
}

function buildPrenIndexById(){
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
  if (!sh) return { rows:{}, updated: new Date().toISOString() };
  var vals = sh.getDataRange().getValues();
  var C = CONFIG.PRENOTAZIONI_COLS;
  var map = {};
  for (var i=1;i<vals.length;i++){ var id = String(vals[i][C.ID_PRENOTAZIONE-1]||'').trim(); if (id) map[id] = i+1; }
  var idx = { rows: map, updated: new Date().toISOString(), lastRow: sh.getLastRow() };
  putCacheJson('IDX_PREN_V1', idx, 600);
  return idx;
}
function prenRowIndexById(id){ id=String(id||'').trim(); if (!id) return -1; var idx = getCacheJson('IDX_PREN_V1'); if (!idx || !idx.rows || !idx.rows[id]) { idx = buildPrenIndexById(); }
  return idx.rows[id] ? idx.rows[id] : -1;
}

function invalidateIndex(kind){ try{ var c=CacheService.getScriptCache(); if (kind==='CLIENTI' || !kind) { c.remove('IDX_CLIENTI_V1'); c.remove('SNAP_CLIENTI_V1'); } if (kind==='PREN' || !kind) { c.remove('IDX_PREN_V1'); c.remove('SNAP_PREN_V1'); } }catch(_){ } }

function normalizeKey(s){ try{ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }catch(_){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); } }

function getClientsSnapshot(){
  var snap = getCacheJson('SNAP_CLIENTI_V1');
  if (snap && Array.isArray(snap.data)) return snap;
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
  if (!sh) return { data:[], count:0, updated:new Date().toISOString() };
  var vals = sh.getDataRange().getValues();
  var C = CONFIG.CLIENTI_COLS;
  var out = [];
  for (var i=1;i<vals.length;i++){
    var r = vals[i];
    out.push({
      nome: r[C.NOME-1]||'',
      cf: String(r[C.CODICE_FISCALE-1]||'').toUpperCase(),
      email: r[C.EMAIL-1]||'',
      cellulare: r[C.CELLULARE-1]||'',
      dataNascita: r[C.DATA_NASCITA-1]||'',
      scadenzaPatente: r[C.SCADENZA_PATENTE-1]||''
    });
  }
  var res = { data: out, count: out.length, updated: new Date().toISOString() };
  putCacheJson('SNAP_CLIENTI_V1', res, 120);
  return res;
}

function getPrenotazioniSnapshot(){
  var snap = getCacheJson('SNAP_PREN_V1');
  if (snap && Array.isArray(snap.data)) return snap;
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
  if (!sh) return { data:[], count:0, updated:new Date().toISOString() };
  var vals = sh.getDataRange().getValues();
  var C = CONFIG.PRENOTAZIONI_COLS;
  var out = [];
  for (var i=1;i<vals.length;i++){
    var r = vals[i];
    out.push({
      id: String(r[C.ID_PRENOTAZIONE-1]||''),
      targa: r[C.TARGA-1]||'',
      destinazione: r[C.DESTINAZIONE-1]||'',
      nome1: r[C.NOME_AUTISTA_1-1]||'',
      nome2: r[C.NOME_AUTISTA_2-1]||'',
      nome3: r[C.NOME_AUTISTA_3-1]||'',
      stato: r[C.STATO_PRENOTAZIONE-1]||'',
      giornoInizio: r[C.GIORNO_INIZIO-1]||'',
      giornoFine: r[C.GIORNO_FINE-1]||''
    });
  }
  var res = { data: out, count: out.length, updated: new Date().toISOString() };
  putCacheJson('SNAP_PREN_V1', res, 120);
  return res;
}

/**
 * Logging condizionale: scrive nei log solo se DEBUG_LOGS è true
 * @param {string} msg
 */
function dbg(msg){
  try {
    if (CONFIG && CONFIG.DEBUG_LOGS) Logger.log(msg);
  } catch (_) {}
}

function incFailedLogin(name){try{var k='FAILED_LOGIN:'+String(name||'').trim().toUpperCase();var p=getProps();var v=parseInt(p.getProperty(k)||'0',10);if(isNaN(v))v=0;p.setProperty(k,String(v+1));}catch(_){}}
function logAdminAction(token,action,data){try{var s=getSession(token);var who=s?(s.name||'admin'):'unknown';var k='ADMIN_LOG:'+new Date().toISOString()+':'+action;var payload={who:who,action:action,ts:new Date().toISOString()};var p=getProps();p.setProperty(k,JSON.stringify(payload));}catch(_){}}
function logSecurityEvent(type,data){try{var k='SEC_EVENT:'+new Date().toISOString()+':'+type;var p=getProps();p.setProperty(k,JSON.stringify({type:type,ts:new Date().toISOString()}));}catch(_){}}
function logAccess(method,action,ip){try{var k='ACCESS:'+new Date().toISOString()+':'+method+':'+(action||'');var p=getProps();p.setProperty(k,JSON.stringify({m:method,a:action,ip:ip,ts:new Date().toISOString()}));}catch(_){}}
