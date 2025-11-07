/**
 * SERVIZIO GESTIONE VEICOLI
 * 
 * Gestisce veicoli, disponibilità e manutenzioni
 */

/**
 * Recupera lista veicoli con stato disponibilità
 * Controlla anche manutenzioni attive
 * @return {ContentService} Risposta JSON con lista veicoli
 */
function getVeicoli() {
  try {
    var sp = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP = sp.getSheetByName(CONFIG.SHEETS.PULMINI);
    var shM = sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    
    if (!shP) {
      return createJsonResponse({
        success: false,
        message: 'Foglio PULMINI non trovato'
      }, 500);
    }
    
    var dataP = shP.getDataRange().getValues();
    if (dataP.length <= 1) {
      return createJsonResponse({
        success: true,
        message: 'Nessun veicolo trovato',
        data: []
      });
    }
    
    // Mappa manutenzioni per targa
    var manut = {};
    if (shM) {
      var dataM = shM.getDataRange().getValues();
      for (var i = 1; i < dataM.length; i++) {
        var r = dataM[i];
        var t = r[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var st = r[CONFIG.MANUTENZIONI_COLS.STATO - 1];
        
        if (t && st) {
          manut[t] = {
            stato: st,
            dataInizio: r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1],
            dataInizioFormatted: formatDateToItalian(r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1]),
            dataFine: r[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1],
            dataFineFormatted: formatDateToItalian(r[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1]),
            note: r[CONFIG.MANUTENZIONI_COLS.NOTE - 1]
          };
        }
      }
    }
    
    var res = [];
    for (var j = 1; j < dataP.length; j++) {
      var rp = dataP[j];
      var tp = rp[CONFIG.PULMINI_COLS.TARGA - 1];
      if (!tp) continue;
      
      var man = manut[tp];
      var inMan = false;
      
      // Verifica se veicolo è in manutenzione oggi
      if (man && man.dataInizio && man.dataFine) {
        var oggi = new Date();
        var di = new Date(man.dataInizio);
        var df = new Date(man.dataFine);
        if (oggi >= di && oggi <= df) {
          inMan = true;
        }
      }
      
      var base = rp[CONFIG.PULMINI_COLS.STATO - 1] || 'Disponibile';
      var note = rp[CONFIG.PULMINI_COLS.NOTE - 1] || '';
      
      res.push({
        Targa: tp,
        Marca: rp[CONFIG.PULMINI_COLS.MARCA - 1] || '',
        Modello: rp[CONFIG.PULMINI_COLS.MODELLO - 1] || '',
        Posti: parseInt(rp[CONFIG.PULMINI_COLS.POSTI - 1], 10) || 9,
        Disponibile: !inMan && (base === 'Disponibile' || base === 'Attivo'),
        Note: note,
        PassoLungo: (tp === 'EC787NM') || (note && String(note).toLowerCase().indexOf('passo lungo') > -1),
        StatoManutenzione: man ? man.stato : '-',
        DataInizioManutenzione: man && man.dataInizio ? man.dataInizio : '',
        DataInizioManutenzioneFormatted: man && man.dataInizioFormatted ? man.dataInizioFormatted : '',
        DataFineManutenzione: man && man.dataFine ? man.dataFine : '',
        DataFineManutenzioneFormatted: man && man.dataFineFormatted ? man.dataFineFormatted : '',
        DisponibileDate: !inMan && (base === 'Disponibile' || base === 'Attivo')
      });
    }
    
    return createJsonResponse({
      success: true,
      message: 'Trovati ' + res.length + ' veicoli',
      data: res,
      count: res.length
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore caricamento veicoli: ' + err.message
    }, 500);
  }
}

/**
 * Controlla disponibilità veicolo per periodo specifico
 * Verifica conflitti con prenotazioni e manutenzioni
 * @param {Object} p - Parametri: targa, dataInizio, dataFine
 * @return {ContentService} Risposta JSON con disponibilità e conflitti
 */
function checkDisponibilita(p) {
  try {
    var t = p.targa;
    var di = p.dataInizio;
    var df = p.dataFine;
    
    if (!t || !di || !df) {
      return createJsonResponse({
        success: false,
        message: 'Parametri mancanti: targa, dataInizio, dataFine'
      }, 400);
    }
    
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var data = sh.getDataRange().getValues();
    var disp = true;
    var confl = [];
    
    // Controlla conflitti con prenotazioni
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var tp = r[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
      var st = String(r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || '');
      
      if (tp === t && ['Rifiutata', 'Completata'].indexOf(st) === -1) {
        var ie = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1]);
        var fe = new Date(r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1]);
        var ni = new Date(di);
        var nf = new Date(df);
        
        // Controlla sovrapposizione date
        if (!(nf < ie || ni > fe)) {
          disp = false;
          confl.push({
            da: ie,
            daFormatted: formatDateToItalian(ie),
            a: fe,
            aFormatted: formatDateToItalian(fe),
            stato: st
          });
        }
      }
    }
    
    // Controlla conflitti con manutenzioni
    var shM = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    
    if (shM) {
      var dataM = shM.getDataRange().getValues();
      for (var m = 1; m < dataM.length; m++) {
        var mRow = dataM[m];
        var targaMan = mRow[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var dataInizioMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dataFineMan = mRow[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        
        if (targaMan === t && dataInizioMan && dataFineMan) {
          var manInizio = new Date(dataInizioMan);
          var manFine = new Date(dataFineMan);
          var ni = new Date(di);
          var nf = new Date(df);
          
          if (!(nf < manInizio || ni > manFine)) {
            disp = false;
            confl.push({
              da: manInizio,
              daFormatted: formatDateToItalian(manInizio),
              a: manFine,
              aFormatted: formatDateToItalian(manFine),
              stato: mRow[CONFIG.MANUTENZIONI_COLS.STATO - 1] || 'Manutenzione',
              tipo: 'manutenzione'
            });
          }
        }
      }
    }
    
    return createJsonResponse({
      success: true,
      disponibile: disp,
      conflitti: confl
    });
  } catch(err) {
    return createJsonResponse({
      success: false,
      message: 'Errore controllo disponibilita: ' + err.message
    }, 500);
  }
}
