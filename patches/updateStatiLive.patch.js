/**
 * Patch updateStatiLive: handle 'Confermata' already ended -> 'Completata', and reorder checks
 */
function updateStatiLive(){
  try{
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    const shP=ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI); const valsP=shP.getDataRange().getValues();
    let changedP=0;
    for (let i=1;i<valsP.length;i++){
      const r=valsP[i];
      const stato=String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE-1]||'');
      if (stato==='Da confermare') continue;
      const di = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]);
      const df = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]);
      let next = stato;

      // 1) Completed first (including Confermata/Programmata già finite)
      if ((stato==='In corso' && today>df) || ((stato==='Confermata' || stato==='Programmata') && today>df)) {
        next = 'Completata';
      }
      // 2) Then in corso (covers Confermata/Programmata che iniziano oggi o sono in finestra)
      else if ((stato==='Programmata' || stato==='Confermata') && today>=di && today<=df) {
        next = 'In corso';
      }
      // 3) Infine, confermata prima dell'inizio diventa programmata
      else if (stato==='Confermata' && today < di) {
        next = 'Programmata';
      }

      if (next!==stato){ shP.getRange(i+1, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE, 1, 1).setValue(next); changedP++; }
    }

    const shM=ss.getSheetByName(CONFIG.SHEETS.MANUTENZIONI); const valsM=shM.getDataRange().getValues();
    let changedM=0;
    for (let i=1;i<valsM.length;i++){
      const r=valsM[i]; const stato=String(r[CONFIG.MANUTENZIONI_COLS.STATO-1]||'');
      const di = new Date(r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO-1]); const df = new Date(r[CONFIG.MANUTENZIONI_COLS.DATA_FINE-1]);
      let next = stato;
      if (today>df && stato==='In corso') next='Completata';
      else if (today>=di && today<=df && stato==='Programmata') next='In corso';
      if (next!==stato){ shM.getRange(i+1, CONFIG.MANUTENZIONI_COLS.STATO, 1, 1).setValue(next); changedM++; }
    }

    return createJsonResponse({success:true,message:`Stati aggiornati: prenotazioni ${changedP}, manutenzioni ${changedM}`});
  }catch(err){ return createJsonResponse({success:false,message:'Errore updateStatiLive: '+err.message},500); }
}
