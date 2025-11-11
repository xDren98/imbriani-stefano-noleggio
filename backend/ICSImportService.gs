/**
 * Importa prenotazioni da un file ICS (iCal)
 * Supporta sia URL pubblico ICS sia testo ICS incollato
 * Crea prenotazioni "Confermata" per bloccare correttamente la disponibilità dei veicoli
 *
 * post = {
 *   icsUrl?: string,
 *   icsText?: string,
 *   defaultTarga?: string,
 *   defaultOraInizio?: string, // es. "08:00"
 *   defaultOraFine?: string    // es. "22:00"
 * }
 */
function importaPrenotazioniICS(post){
  try {
    var shPren = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var shPulmini = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PULMINI);
    var rowsPulmini = shPulmini.getDataRange().getValues();
    var targhe = [];
    for (var i=1;i<rowsPulmini.length;i++){
      var t = String(rowsPulmini[i][CONFIG.PULMINI_COLS.TARGA-1]||'').trim();
      if (t) targhe.push(t);
    }

    var icsText = String(post.icsText||'').trim();
    var icsUrl = String(post.icsUrl||'').trim();
    if (!icsText && icsUrl){
      try {
        var resp = UrlFetchApp.fetch(icsUrl, { muteHttpExceptions: true });
        if (resp && resp.getResponseCode() >= 200 && resp.getResponseCode() < 300){
          icsText = resp.getContentText();
        }
      } catch(fetchErr){
        Logger.log('[ICS] Errore fetch ICS: '+fetchErr.message);
      }
    }
    if (!icsText){
      return createJsonResponse({ success:false, message:'Nessun ICS fornito (URL o testo)' }, 400);
    }

    var events = parseICS(icsText);
    var today = new Date(); today.setHours(0,0,0,0);
    var defaultTarga = String(post.defaultTarga||'').trim();
    var defaultOraInizio = String(post.defaultOraInizio||'08:00');
    var defaultOraFine = String(post.defaultOraFine||'22:00');

    // Costruisci set duplicati esistenti (chiave: targa|startISO|endISO)
    var esistenti = shPren.getDataRange().getValues();
    var dupSet = {};
    for (var r=1;r<esistenti.length;r++){
      var row = esistenti[r];
      var t = String(row[CONFIG.PRENOTAZIONI_COLS.TARGA-1]||'').trim();
      var gi = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1];
      var gf = row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1];
      var oi = String(row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1]||'').trim();
      var of = String(row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1]||'').trim();
      if (t && gi){
        var k = [t, formatISODate(gi, oi||'00:00'), gf?formatISODate(gf, of||'23:59'):''].join('|');
        dupSet[k] = true;
      }
    }

    var created = 0, skippedNoTarga = 0, skippedPast = 0, duplicates = 0;
    var dettagli = [];

    for (var eIdx=0;eIdx<events.length;eIdx++){
      var ev = events[eIdx];
      var start = ev.start; var end = ev.end||ev.start;
      if (!start){ continue; }
      var startDay = new Date(start.getTime()); startDay.setHours(0,0,0,0);
      if (startDay < today){ skippedPast++; continue; }

      var contentBlob = [ev.summary||'', ev.location||'', ev.description||''].join(' ').toUpperCase();
      var foundTarga = findTarga(contentBlob, targhe) || defaultTarga;
      if (!foundTarga){ skippedNoTarga++; dettagli.push({ esito:'skip_no_targa', summary: ev.summary||'', start: start }); continue; }

      // Orari
      var oraInizio = ev.hourStart || defaultOraInizio;
      var oraFine = ev.hourEnd || defaultOraFine;

      var kNew = [foundTarga, formatISODate(start, oraInizio), formatISODate(end, oraFine)].join('|');
      if (dupSet[kNew]){ duplicates++; dettagli.push({ esito:'dup', targa: foundTarga, start:start }); continue; }

      // Costruisci riga prenotazione Legacy
      var row = new Array(46).fill('');
      row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP-1] = new Date();
      // Usa il SUMMARY (Title) come nome completo grezzo
      var titolo = String(ev.summary||'').trim();
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1] = titolo || 'Import Legacy';
      row[CONFIG.PRENOTAZIONI_COLS.TARGA-1] = foundTarga;
      row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1] = oraInizio;
      row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1] = oraFine;
      row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1] = start;
      row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1] = end;
      row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1] = (ev.location||ev.summary||'').trim();
      // Se nel titolo è presente un numero di telefono, estrailo e salva
      var cellulareEstratto = extractPhoneFromText(titolo);
      if (cellulareEstratto) row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1] = cellulareEstratto;
      row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1] = 'Legacy';
      row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE-1] = generaNuovoIdBooking();

      shPren.appendRow(row);
      created++;
      dupSet[kNew] = true;
      dettagli.push({ esito:'creato', targa: foundTarga, start:start, end:end, destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1] });
    }

    return createJsonResponse({
      success:true,
      message:'Import ICS completato',
      created: created,
      duplicates: duplicates,
      skippedPast: skippedPast,
      skippedNoTarga: skippedNoTarga,
      details: dettagli
    });
  } catch(err){
    Logger.log('[importaPrenotazioniICS] Errore: '+err.message);
    return createJsonResponse({ success:false, message:'Errore import ICS: '+err.message }, 500);
  }
}

/**
 * Parser minimale ICS: estrae DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION
 */
function parseICS(text){
  var lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  var events = []; var current = null;
  for (var i=0;i<lines.length;i++){
    var line = lines[i];
    if (line.startsWith('BEGIN:VEVENT')){ current = {}; continue; }
    if (!current) continue;
    if (line.startsWith('END:VEVENT')){ events.push(current); current = null; continue; }
    if (line.startsWith('DTSTART')){
      var val = line.split(':').pop();
      var d = parseICSDate(val);
      current.start = d.date;
      current.hourStart = d.hour;
    } else if (line.startsWith('DTEND')){
      var val2 = line.split(':').pop();
      var d2 = parseICSDate(val2);
      current.end = d2.date;
      current.hourEnd = d2.hour;
    } else if (line.startsWith('SUMMARY:')){
      current.summary = line.replace('SUMMARY:','');
    } else if (line.startsWith('LOCATION:')){
      current.location = line.replace('LOCATION:','');
    } else if (line.startsWith('DESCRIPTION:')){
      current.description = line.replace('DESCRIPTION:','');
    }
  }
  return events;
}

/**
 * Converte valori ICS (YYYYMMDD[THHMMSS][Z]) in Date e orario HH:MM
 */
function parseICSDate(val){
  var v = String(val||'').trim();
  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(v)){
    var y = parseInt(v.slice(0,4),10);
    var m = parseInt(v.slice(4,6),10)-1;
    var d = parseInt(v.slice(6,8),10);
    var dt = new Date(y,m,d);
    return { date: dt, hour: '08:00' };
  }
  // Date-time: YYYYMMDDTHHMMSS(Z?)
  var match = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (match){
    var y = parseInt(match[1],10);
    var m = parseInt(match[2],10)-1;
    var d = parseInt(match[3],10);
    var hh = parseInt(match[4],10);
    var mm = parseInt(match[5],10);
    var ss = parseInt(match[6],10);
    var isUTC = !!match[7];
    var dt = isUTC ? new Date(Date.UTC(y,m,d,hh,mm,ss)) : new Date(y,m,d,hh,mm,ss);
    // Converte in timezone locale se era UTC
    if (isUTC){
      var tz = Session.getScriptTimeZone() || CONFIG.PDF.TIMEZONE || 'Europe/Rome';
      // Apps Script usa automaticamente fuso del progetto; manteniamo l’ora locale
      dt = new Date(dt.getTime());
    }
    var hourStr = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
    return { date: dt, hour: hourStr };
  }
  // Fallback
  return { date: new Date(), hour: '08:00' };
}

// Estrazione robusta di numeri di telefono da testo libero
function extractPhoneFromText(text){
  if (!text) return '';
  var s = String(text).replace(/[^+0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  // Cerca pattern comuni: +39xxxxxxxxxx, 3xxxxxxxxx, 0xxxxxxxxx
  var m = s.match(/(?:\+39\s*)?(3\d[\d\s]{7,10}|0\d[\d\s]{7,10})/);
  if (!m) return '';
  var num = m[0].replace(/\s+/g,'');
  if (!/^\+39/.test(num)) num = '+39' + num;
  return num;
}

/**
 * Trova la targa all’interno di un testo in base all’elenco targhe esistenti
 */
function findTarga(contentUpper, targhe){
  for (var i=0;i<targhe.length;i++){
    var t = targhe[i].toUpperCase();
    if (contentUpper.indexOf(t) >= 0){ return targhe[i]; }
  }
  return '';
}

/**
 * Restituisce ISO data+ora (YYYY-MM-DDTHH:MM) per chiave duplicati
 */
function formatISODate(d, hhmm){
  if (!(d instanceof Date)) d = new Date(d);
  var y = d.getFullYear();
  var m = String(d.getMonth()+1).padStart(2,'0');
  var day = String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day+'T'+(hhmm||'00:00');
}
