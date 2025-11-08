/**
 * SERVIZIO GESTIONE VEICOLI
 * 
 * Gestisce veicoli, disponibilità e controllo sovrapposizioni con orari
 * Versione: 8.9.1 - Fix disponibilità orari
 */

// Fasce orarie ammesse: dalle 8:00 alle 22:00 ogni 2 ore
const FASCE_ORARIE = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

/**
 * Verifica se un orario è una fascia valida
 * @param {string} orario - Orario in formato HH:MM
 * @return {boolean} True se valido
 */
function isValidFasciaOraria(orario) {
  if (!orario) return false;
  return FASCE_ORARIE.indexOf(orario) !== -1;
}

/**
 * Ottiene la fascia oraria successiva
 * @param {string} orario - Orario corrente
 * @return {string|null} Fascia successiva o null se ultima
 */
function fasciaSuccessiva(orario) {
  var idx = FASCE_ORARIE.indexOf(orario);
  if (idx !== -1 && idx < FASCE_ORARIE.length - 1) {
    return FASCE_ORARIE[idx + 1];
  }
  return null; // Se è 22:00, non c'è fascia successiva lo stesso giorno
}

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
 * Controlla disponibilità veicolo considerando DATE + ORARI (fasce 8-22 ogni 2h)
 * Un veicolo è disponibile dalla fascia oraria SUCCESSIVA alla riconsegna
 * 
 * @param {Object} p - Parametri: targa, dataInizio, dataFine, oraInizio, oraFine
 * @return {ContentService} Risposta JSON con disponibilità e conflitti
 */
function checkDisponibilita(p) {
  Logger.log('[checkDisponibilita] Parametri: ' + JSON.stringify(p));
  
  try {
    var targa = p.targa;
    var dataInizioRichiesta = p.dataInizio;
    var dataFineRichiesta = p.dataFine;
    var oraInizioRichiesta = p.oraInizio || '08:00';
    var oraFineRichiesta = p.oraFine || '22:00';
    
    if (!targa || !dataInizioRichiesta || !dataFineRichiesta) {
      return createJsonResponse({
        success: false,
        message: 'Parametri mancanti: targa, dataInizio, dataFine richiesti'
      }, 400);
    }
    
    // Validazione fasce orarie
    if (!isValidFasciaOraria(oraInizioRichiesta)) {
      return createJsonResponse({
        success: false,
        message: 'Ora inizio non valida. Fasce ammesse: ' + FASCE_ORARIE.join(', ')
      }, 400);
    }
    
    if (!isValidFasciaOraria(oraFineRichiesta)) {
      return createJsonResponse({
        success: false,
        message: 'Ora fine non valida. Fasce ammesse: ' + FASCE_ORARIE.join(', ')
      }, 400);
    }
    
    // Converti date richieste
    var dtInizioRichiesta, dtFineRichiesta;
    try {
      dtInizioRichiesta = parseDateTimeString(dataInizioRichiesta, oraInizioRichiesta);
      dtFineRichiesta = parseDateTimeString(dataFineRichiesta, oraFineRichiesta);
    } catch(e) {
      return createJsonResponse({
        success: false,
        message: 'Formato date non valido: ' + e.message
      }, 400);
    }
    
    // Validazione logica: data fine >= data inizio
    if (dtFineRichiesta <= dtInizioRichiesta) {
      return createJsonResponse({
        success: false,
        message: 'Data/ora fine deve essere successiva a data/ora inizio'
      }, 400);
    }
    
    // Recupera prenotazioni esistenti
    var shPrenotazioni = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var dataPrenotazioni = shPrenotazioni.getDataRange().getValues();
    
    var conflitti = [];
    
    // Controlla sovrapposizioni con prenotazioni esistenti
    for (var i = 1; i < dataPrenotazioni.length; i++) {
      var r = dataPrenotazioni[i];
      var targaPrenotazione = r[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
      var statoPrenotazione = r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1];
      
      // Skip se targa diversa o prenotazione non attiva
      if (targaPrenotazione !== targa) continue;
      if (!statoPrenotazione || 
          statoPrenotazione === 'Rifiutata' || 
          statoPrenotazione === 'Completata' ||
          statoPrenotazione === 'Annullata') {
        continue;
      }
      
      var dataInizioPrenotazione = r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
      var dataFinePrenotazione = r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1];
      var oraInizioPrenotazione = r[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] || '08:00';
      var oraFinePrenotazione = r[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] || '22:00';
      
      if (!dataInizioPrenotazione || !dataFinePrenotazione) continue;
      
      // Costruisci datetime completi per prenotazione esistente
      var dtInizioPrenotazione, dtFinePrenotazione;
      try {
        dtInizioPrenotazione = parseDateTimeFromValues(dataInizioPrenotazione, oraInizioPrenotazione);
        dtFinePrenotazione = parseDateTimeFromValues(dataFinePrenotazione, oraFinePrenotazione);
      } catch(e) {
        Logger.log('[checkDisponibilita] Errore parsing date prenotazione riga ' + (i+1) + ': ' + e.message);
        continue;
      }
      
      // LOGICA FASCIA SUCCESSIVA:
      // Il veicolo diventa disponibile dalla fascia SUCCESSIVA alla riconsegna
      var fasciaDisponibilita = fasciaSuccessiva(oraFinePrenotazione);
      var dtDisponibilitaEffettiva = dtFinePrenotazione;
      
      if (fasciaDisponibilita) {
        // Aggiorna l'orario di disponibilità alla fascia successiva
        dtDisponibilitaEffettiva = parseDateTimeFromValues(dataFinePrenotazione, fasciaDisponibilita);
      } else {
        // Se riconsegna è alle 22:00, disponibile dal giorno dopo alle 08:00
        var giornoSuccessivo = new Date(dtFinePrenotazione);
        giornoSuccessivo.setDate(giornoSuccessivo.getDate() + 1);
        dtDisponibilitaEffettiva = parseDateTimeFromValues(giornoSuccessivo, '08:00');
      }
      
      // Controlla sovrapposizione: la nuova richiesta deve iniziare DOPO la disponibilità effettiva
      if (dtInizioRichiesta < dtDisponibilitaEffettiva && dtFineRichiesta > dtInizioPrenotazione) {
        conflitti.push({
          idPrenotazione: r[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '',
          dataInizio: formatDateToItalian(dataInizioPrenotazione),
          dataFine: formatDateToItalian(dataFinePrenotazione),
          oraInizio: oraInizioPrenotazione,
          oraFine: oraFinePrenotazione,
          fasciaDisponibilita: fasciaDisponibilita || '08:00 (giorno successivo)',
          stato: statoPrenotazione,
          cliente: r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || ''
        });
      }
    }
    
    // Controlla manutenzioni (occupano l'intera giornata)
    var shManutenzioni = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    
    if (shManutenzioni) {
      var dataManutenzioni = shManutenzioni.getDataRange().getValues();
      
      for (var j = 1; j < dataManutenzioni.length; j++) {
        var m = dataManutenzioni[j];
        var targaManutenzione = m[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var statoManutenzione = m[CONFIG.MANUTENZIONI_COLS.STATO - 1];
        
        if (targaManutenzione !== targa) continue;
        if (!statoManutenzione || statoManutenzione === 'Completata') continue;
        
        var dataInizioManutenzione = m[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dataFineManutenzione = m[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        
        if (!dataInizioManutenzione || !dataFineManutenzione) continue;
        
        // Per manutenzioni, consideriamo l'intera giornata (08:00 - 22:00)
        var dtInizioManutenzione, dtFineManutenzione;
        try {
          dtInizioManutenzione = parseDateTimeFromValues(dataInizioManutenzione, '08:00');
          dtFineManutenzione = parseDateTimeFromValues(dataFineManutenzione, '22:00');
        } catch(e) {
          Logger.log('[checkDisponibilita] Errore parsing date manutenzione: ' + e.message);
          continue;
        }
        
        if (dtInizioRichiesta < dtFineManutenzione && dtFineRichiesta > dtInizioManutenzione) {
          conflitti.push({
            tipo: 'manutenzione',
            dataInizio: formatDateToItalian(dataInizioManutenzione),
            dataFine: formatDateToItalian(dataFineManutenzione),
            stato: statoManutenzione,
            note: m[CONFIG.MANUTENZIONI_COLS.NOTE - 1] || ''
          });
        }
      }
    }
    
    var disponibile = conflitti.length === 0;
    
    Logger.log('[checkDisponibilita] Targa ' + targa + ' - Disponibile: ' + disponibile + ' - Conflitti: ' + conflitti.length);
    
    return createJsonResponse({
      success: true,
      disponibile: disponibile,
      targa: targa,
      periodoRichiesto: {
        dataInizio: dataInizioRichiesta,
        dataFine: dataFineRichiesta,
        oraInizio: oraInizioRichiesta,
        oraFine: oraFineRichiesta
      },
      fasceOrarie: FASCE_ORARIE,
      conflitti: conflitti,
      message: disponibile 
        ? 'Veicolo disponibile per il periodo richiesto' 
        : 'Veicolo non disponibile - ' + conflitti.length + ' conflitto/i trovato/i'
    });
  } catch(err) {
    Logger.log('[checkDisponibilita] Errore: ' + err.message);
    return createJsonResponse({
      success: false,
      message: 'Errore verifica disponibilità: ' + err.message
    }, 500);
  }
}

/**
 * Parse stringa data + ora in oggetto Date
 * @param {string} dateStr - Data in formato YYYY-MM-DD
 * @param {string} timeStr - Ora in formato HH:MM
 * @return {Date} Oggetto Date
 */
function parseDateTimeString(dateStr, timeStr) {
  if (!dateStr) throw new Error('Data mancante');
  if (!timeStr) timeStr = '08:00';
  
  // Parse data YYYY-MM-DD
  var dateParts = dateStr.split('-');
  if (dateParts.length !== 3) throw new Error('Formato data non valido: ' + dateStr);
  
  var year = parseInt(dateParts[0], 10);
  var month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
  var day = parseInt(dateParts[2], 10);
  
  // Parse ora HH:MM
  var timeParts = timeStr.split(':');
  if (timeParts.length !== 2) throw new Error('Formato ora non valido: ' + timeStr);
  
  var hours = parseInt(timeParts[0], 10);
  var minutes = parseInt(timeParts[1], 10);
  
  return new Date(year, month, day, hours, minutes, 0, 0);
}

/**
 * Parse Date object + stringa ora in oggetto Date completo
 * @param {Date|string} dateObj - Oggetto Date o stringa data
 * @param {string} timeStr - Ora in formato HH:MM
 * @return {Date} Oggetto Date con ora
 */
function parseDateTimeFromValues(dateObj, timeStr) {
  if (!dateObj) throw new Error('Data mancante');
  
  // Se è stringa, converti in Date
  if (typeof dateObj === 'string') {
    dateObj = new Date(dateObj);
  }
  
  if (!(dateObj instanceof Date)) {
    dateObj = new Date(dateObj);
    if (isNaN(dateObj.getTime())) throw new Error('Data non valida');
  }
  
  if (!timeStr) timeStr = '08:00';
  
  // Parse ora HH:MM
  var timeParts = String(timeStr).split(':');
  if (timeParts.length !== 2) throw new Error('Formato ora non valido: ' + timeStr);
  
  var hours = parseInt(timeParts[0], 10);
  var minutes = parseInt(timeParts[1], 10);
  
  // Crea nuovo Date con ora specificata
  var result = new Date(dateObj);
  result.setHours(hours, minutes, 0, 0);
  
  return result;
}
