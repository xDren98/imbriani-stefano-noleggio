/**
 * Utility di mapping stato: Futura, In corso, Completato, Da Confermare
 * Esegue il ricalcolo per tutte le prenotazioni in base a date/ore
 */
function handleRicalcolaStati() {
  try {
    const sh = ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if (!sh) return respond(false, {}, 'Foglio prenotazioni non trovato', 500);

    const data = sh.getDataRange().getValues();
    const H = CONFIG.PREN_COLS;
    const now = new Date();
    let updated = 0;

    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      // ID se mancante
      if (!r[H.ID_PREN]) {
        r[H.ID_PREN] = generaIdPrenotazione();
        updated++;
      }
      // Stato calcolato solo se non Annullata
      const statoAttuale = (r[H.STATO_PRENOTAZIONE] || '').toString().toLowerCase();
      if (statoAttuale === 'annullata') continue;

      // Orari mancanti → 00:00 e 23:59
      const oraIn = r[H.ORA_INIZIO] || '00:00';
      const oraFi = r[H.ORA_FINE] || '23:59';

      const start = mergeDateTime(r[H.GIORNO_INIZIO], oraIn);
      const end = mergeDateTime(r[H.GIORNO_FINE], oraFi);

      let nuovo = 'Da Confermare';
      if (isValidDate(start) && isValidDate(end)) {
        if (now < start) nuovo = 'Futura';
        else if (now >= start && now < end) nuovo = 'In corso';
        else if (now >= end) nuovo = 'Completato';
      }

      if ((r[H.STATO_PRENOTAZIONE] || '') !== nuovo) {
        r[H.STATO_PRENOTAZIONE] = nuovo;
        updated++;
      }
      data[i] = r;
    }

    sh.getRange(1, 1, data.length, data[0].length).setValues(data);
    return respond(true, { updated }, `Ricalcolati ${updated} stati`);
  } catch (e) {
    return respond(false, {}, 'Errore ricalcolo stati: ' + e.message, 500);
  }
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}
