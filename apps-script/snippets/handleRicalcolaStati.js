// Patch: ricalcolo stati - "Da Confermare" SOLO se già impostato come tale; se mancano dati minimi NON toccare
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
      const statoAttuale = (r[H.STATO_PRENOTAZIONE] || '').toString();
      const statoLower = statoAttuale.toLowerCase();
      if (statoLower === 'annullata') continue; // non toccare

      // Dati minimi per calcolare lo stato: date inizio/fine
      const hasDates = !!r[H.GIORNO_INIZIO] && !!r[H.GIORNO_FINE];
      if (!hasDates) continue; // lascia stare se mancano i dati minimi

      // Orari: se mancanti, tratta come giornata intera
      const oraIn = r[H.ORA_INIZIO] || '00:00';
      const oraFi = r[H.ORA_FINE] || '23:59';
      const start = mergeDateTime(r[H.GIORNO_INIZIO], oraIn);
      const end = mergeDateTime(r[H.GIORNO_FINE], oraFi);

      if (!(start instanceof Date) || isNaN(start.getTime()) || !(end instanceof Date) || isNaN(end.getTime())) continue;

      let nuovo = statoAttuale; // default: non cambiare
      if (statoLower !== 'confermata') { // "Da Confermare" solo se NON confermata
        if (now < start) nuovo = 'Futura';
        else if (now >= start && now < end) nuovo = 'In corso';
        else if (now >= end) nuovo = 'Completato';
        // Se era "Da Confermare" resta tale solo se non rientra nelle tre categorie temporali
        if (statoLower === 'da confermare' && (now < start || (now >= start && now < end) || now >= end)) {
          // sovrascrivi con lo stato temporale calcolato
        }
      } else {
        // Confermata: mappatura temporale comunque utile ma non forzare a "Da Confermare"
        if (now < start) nuovo = 'Futura';
        else if (now >= start && now < end) nuovo = 'In corso';
        else if (now >= end) nuovo = 'Completato';
      }

      if (nuovo !== statoAttuale) {
        r[H.STATO_PRENOTAZIONE] = nuovo;
        data[i] = r;
        updated++;
      }
    }

    sh.getRange(1, 1, data.length, data[0].length).setValues(data);
    return respond(true, { updated }, `Ricalcolati ${updated} stati`);
  } catch (e) {
    return respond(false, {}, 'Errore ricalcolo stati: ' + e.message, 500);
  }
}
