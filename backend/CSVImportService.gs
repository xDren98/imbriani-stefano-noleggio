/**
 * Import CSV/Excel (rows già parsate) in PRENOTAZIONI
 * post = { rows: Array<{ targa, giornoInizio, giornoFine?, oraInizio?, oraFine?, destinazione?, nomeAutista? }> }
 * Crea prenotazioni Confermate e genera ID coerente.
 */
function importaPrenotazioniCSV(post){
  try {
    if (!post || !post.rows || !Array.isArray(post.rows) || !post.rows.length){
      return createJsonResponse({ success:false, message:'Nessuna riga valida in input' }, 400);
    }
    var shPren = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var dataEsistente = shPren.getDataRange().getValues();
    var dupSet = {};
    for (var r=1;r<dataEsistente.length;r++){
      var row = dataEsistente[r];
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

    var created=0, duplicates=0, skipped=0; var dettagli=[];
    var today = new Date(); today.setHours(0,0,0,0);

    for (var i=0;i<post.rows.length;i++){
      var it = post.rows[i]||{};
      var targa = String(it.targa||'').trim();
      var dStart = parseDateFlexibleGS(it.giornoInizio);
      var dEnd = parseDateFlexibleGS(it.giornoFine||it.giornoInizio);
      var oraStart = String(it.oraInizio||'08:00');
      var oraEnd = String(it.oraFine||'22:00');
      var destinazione = String(it.destinazione||'').trim();
      var nomeAutista = String(it.nomeAutista||'Import Excel').trim();

      // Estrai un numero di cellulare plausibile dal titolo/nomeAutista (es. dal campo Title)
      var cellulareEstratto = extractPhoneFromText(nomeAutista);

      if (!targa || !dStart){ skipped++; dettagli.push({ esito:'skip', motivo:'manca targa o data', i }); continue; }
      var startDay = new Date(dStart.getTime()); startDay.setHours(0,0,0,0);
      if (startDay < today){ skipped++; dettagli.push({ esito:'skip_past', targa, dStart }); continue; }
      var kNew = [targa, formatISODate(dStart, oraStart), formatISODate(dEnd, oraEnd)].join('|');
      if (dupSet[kNew]){ duplicates++; dettagli.push({ esito:'dup', targa, dStart }); continue; }

      var row = new Array(46).fill('');
      row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP-1] = new Date();
      row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1] = nomeAutista || 'Import Excel';
      row[CONFIG.PRENOTAZIONI_COLS.TARGA-1] = targa;
      row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO-1] = oraStart;
      row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE-1] = oraEnd;
      row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1] = dStart;
      row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1] = dEnd;
      row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE-1] = destinazione;
      if (cellulareEstratto) row[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1] = cellulareEstratto;
      row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1] = 'Legacy';
      row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE-1] = generaNuovoIdBooking();

      shPren.appendRow(row);
      created++; dupSet[kNew] = true;
      dettagli.push({ esito:'creato', targa, dStart, dEnd });
    }

    return createJsonResponse({ success:true, message:'Import CSV completato', created, duplicates, skipped, details:dettagli });
  } catch(err){
    Logger.log('[importaPrenotazioniCSV] Errore: '+err.message);
    return createJsonResponse({ success:false, message:'Errore import CSV: '+err.message }, 500);
  }
}

// Parsing date flessibile lato Apps Script
function parseDateFlexibleGS(val){
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  var s = String(val).trim();
  // dd/mm/yyyy
  var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m){ var d = new Date(m[3]+'-'+m[2]+'-'+m[1]); return isNaN(d.getTime())?null:d; }
  // yyyy-mm-dd
  var d2 = new Date(s); return isNaN(d2.getTime())?null:d2;
}

function formatISODate(d, hhmm){
  if (!(d instanceof Date)) d = new Date(d);
  var y = d.getFullYear();
  var m = String(d.getMonth()+1).padStart(2,'0');
  var day = String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day+'T'+(hhmm||'00:00');
}

// Estrazione robusta di numeri di telefono da testo libero
function extractPhoneFromText(text){
  if (!text) return '';
  var s = String(text).replace(/[^+0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  // Cerca pattern comuni: +39xxxxxxxxxx, 3xxxxxxxxx, 0xxxxxxxxx
  var m = s.match(/(?:\+39\s*)?(3\d[\d\s]{7,10}|0\d[\d\s]{7,10})/);
  if (!m) return '';
  var num = m[0].replace(/\s+/g,'');
  // Normalizza: aggiungi +39 se manca ed è un mobile (3xx...) o fisso (0xx...)
  if (!/^\+39/.test(num)) num = '+39' + num;
  return num;
}
