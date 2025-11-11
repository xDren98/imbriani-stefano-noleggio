/**
 * SERVIZIO GESTIONE VEICOLI
 * 
 * Gestisce veicoli, disponibilità e controllo sovrapposizioni con orari
 * Versione: 8.9.3 - Debug manutenzioni
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
  return null;
}

/**
 * Normalizza Date per confronto solo su anno/mese/giorno (ignora orari)
 * @param {Date|string} date - Data da normalizzare
 * @return {Date} Data normalizzata alle 00:00:00
 */
function normalizeDate(date) {
  if (!date) return null;
  
  var dateObj;
  
  // Se è stringa, converti in Date
  if (typeof date === 'string') {
    // Prova a parsare come YYYY-MM-DD
    if (date.includes('-')) {
      var dateParts = date.split('-');
      if (dateParts.length === 3) {
        var year = parseInt(dateParts[0], 10);
        var month = parseInt(dateParts[1], 10) - 1;
        var day = parseInt(dateParts[2], 10);
        dateObj = new Date(year, month, day);
      }
    }
    // Prova a parsare come DD/MM/YYYY
    else if (date.includes('/')) {
      var dateParts = date.split('/');
      if (dateParts.length === 3) {
        var day = parseInt(dateParts[0], 10);
        var month = parseInt(dateParts[1], 10) - 1;
        var year = parseInt(dateParts[2], 10);
        dateObj = new Date(year, month, day);
      }
    } else {
      // Prova il costruttore standard
      dateObj = new Date(date);
    }
  } else if (date instanceof Date) {
    dateObj = new Date(date);
  } else {
    // Prova a convertire in Date
    dateObj = new Date(date);
  }
  
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  
  var normalized = new Date(dateObj);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Funzione di debug per logging dettagliato delle date
 * @param {string} context - Contesto del logging
 * @param {Date|string} date - Data da analizzare
 * @param {string} label - Etichetta per identificare la data
 */
function logDateDebug(context, date, label) {
  // Disattiva logging pesante se DEBUG_LOGS è false
  if (!CONFIG || CONFIG.DEBUG_LOGS === false) { return; }
  try {
    if (!date) {
      Logger.log('[' + context + '] ' + label + ': NULL');
      return;
    }
    
    var dateObj = (date instanceof Date) ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      Logger.log('[' + context + '] ' + label + ': Data non valida - "' + date + '"');
      return;
    }
    
    Logger.log('[' + context + '] ' + label + ': ' + 
      'Raw="' + date + '" ' +
      'Parsed=' + dateObj.toISOString() + ' ' +
      'Locale=' + dateObj.toLocaleDateString('it-IT') + ' ' +
      'Time=' + dateObj.toLocaleTimeString('it-IT') + ' ' +
      'Timestamp=' + dateObj.getTime());
  } catch (e) {
    Logger.log('[' + context + '] ' + label + ': Errore parsing - "' + date + '" - ' + e.message);
  }
}

/**
 * Recupera lista veicoli con stato disponibilità
 * Controlla anche manutenzioni attive OGGI
 * @return {ContentService} Risposta JSON con lista veicoli
 */
function getVeicoli() {
  try {
    // Cache di breve durata per evitare letture ripetute dei fogli
    var cache = CacheService.getScriptCache();
    var cached = cache.get('GET_VEICOLI_V1');
    if (cached) {
      try {
        var payload = JSON.parse(cached);
        return createJsonResponse({
          success: true,
          message: 'Trovati ' + payload.count + ' veicoli (cache)',
          data: payload.data,
          count: payload.count
        });
      } catch (_) {
        // In caso di cache corrotta, prosegui con lettura da foglio
      }
    }
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
    
    // Mappa manutenzioni ATTIVE per targa
    var manut = {};
    var oggi = normalizeDate(new Date());
    dbg('[getVeicoli] Oggi normalizzato: ' + oggi);
    
    // Logging dettagliato data odierna
    logDateDebug('getVeicoli', new Date(), 'DataOdierna');
    logDateDebug('getVeicoli', oggi, 'OggiNormalizzato');
    
    if (shM) {
      var dataM = shM.getDataRange().getValues();
      dbg('[getVeicoli] Righe MANUTENZIONI: ' + (dataM.length - 1));
      
      for (var i = 1; i < dataM.length; i++) {
        var r = dataM[i];
        var t = r[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var st = r[CONFIG.MANUTENZIONI_COLS.STATO - 1];
        
        dbg('[getVeicoli] Riga ' + i + ' - Targa: ' + t + ' | Stato: "' + st + '"');
        
        // Skip manutenzioni completate
        if (!t) {
          dbg('[getVeicoli] Riga ' + i + ' - Skip: targa vuota');
          continue;
        }
        if (!st) {
          dbg('[getVeicoli] Riga ' + i + ' - Skip: stato vuoto');
          continue;
        }
        if (st === 'Completata') {
          dbg('[getVeicoli] Riga ' + i + ' - Skip: stato Completata');
          continue;
        }
        
        var dataInizioMan = r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dataFineMan = r[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        
        dbg('[getVeicoli] Riga ' + i + ' - Data Inizio: ' + dataInizioMan + ' | Data Fine: ' + dataFineMan);
        
        // Logging dettagliato date manutenzione
        logDateDebug('getVeicoli', dataInizioMan, 'DataInizioManutenzione_' + i);
        logDateDebug('getVeicoli', dataFineMan, 'DataFineManutenzione_' + i);
        
        if (!dataInizioMan || !dataFineMan) {
          Logger.log('[getVeicoli] Riga ' + i + ' - Skip: date mancanti');
          continue;
        }
        
        // Normalizza date manutenzione (solo giorno, no orari)
        var di = normalizeDate(new Date(dataInizioMan));
        var df = normalizeDate(new Date(dataFineMan));
        
        dbg('[getVeicoli] Riga ' + i + ' - Data Inizio normalizzata: ' + di);
        dbg('[getVeicoli] Riga ' + i + ' - Data Fine normalizzata: ' + df);
        
        // Logging dettagliato normalizzazione
        logDateDebug('getVeicoli', di, 'DataInizioManutenzioneNorm_' + i);
        logDateDebug('getVeicoli', df, 'DataFineManutenzioneNorm_' + i);
        
        dbg('[getVeicoli] Riga ' + i + ' - Confronto: oggi=' + oggi.getTime() + ' >= di=' + di.getTime() + ' && oggi=' + oggi.getTime() + ' <= df=' + df.getTime());
        
        // Verifica se manutenzione è attiva OGGI
        var inManutenzioneOggi = (oggi >= di && oggi <= df);
        
        dbg('[getVeicoli] Riga ' + i + ' - In manutenzione oggi: ' + inManutenzioneOggi);
        
        manut[t] = {
          stato: st,
          dataInizio: dataInizioMan,
          dataInizioFormatted: formatDateToItalian(dataInizioMan),
          dataFine: dataFineMan,
          dataFineFormatted: formatDateToItalian(dataFineMan),
          note: r[CONFIG.MANUTENZIONI_COLS.NOTE - 1] || '',
          attiva: inManutenzioneOggi
        };
      }
    }
    
    var res = [];
    for (var j = 1; j < dataP.length; j++) {
      var rp = dataP[j];
      var tp = rp[CONFIG.PULMINI_COLS.TARGA - 1];
      if (!tp) continue;
      
      var man = manut[tp];
      var inMan = man && man.attiva;
      
      dbg('[getVeicoli] Veicolo ' + tp + ' - Ha manutenzione: ' + (man ? 'SI' : 'NO') + ' - Attiva: ' + inMan);
      
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
        InManutenzioneOggi: inMan,
        DisponibileDate: !inMan && (base === 'Disponibile' || base === 'Attivo')
      });
    }
    
    dbg('[getVeicoli] Trovati ' + res.length + ' veicoli, controllate manutenzioni attive');
    // Aggiorna cache
    try {
      cache.put('GET_VEICOLI_V1', JSON.stringify({ data: res, count: res.length }), 300);
    } catch (_) {}
    return createJsonResponse({
      success: true,
      message: 'Trovati ' + res.length + ' veicoli',
      data: res,
      count: res.length
    });
  } catch(err) {
    dbg('[getVeicoli] Errore: ' + err.message);
    return createJsonResponse({
      success: false,
      message: 'Errore caricamento veicoli: ' + err.message
    }, 500);
  }
}

/**
 * Controlla disponibilità veicolo considerando DATE + ORARI (fasce 8-22 ogni 2h)
 * Un veicolo è disponibile dalla fascia oraria SUCCESSIVA alla riconsegna
 * Le MANUTENZIONI bloccano l'intero periodo (senza orari)
 * 
 * @param {Object} p - Parametri: targa, dataInizio, dataFine, oraInizio, oraFine
 * @return {ContentService} Risposta JSON con disponibilità e conflitti
 */
function checkDisponibilita(p) {
  Logger.log('[checkDisponibilita] Parametri: ' + JSON.stringify(p));
  
  try {
    var targa = p.targa;
    var targaKey = String(targa || '').replace(/\s+/g, '').toUpperCase();
    var dataInizioRichiesta = p.dataInizio;
    var dataFineRichiesta = p.dataFine;
    var oraInizioRichiesta = p.oraInizio || '08:00';
    var oraFineRichiesta = p.oraFine || '22:00';
    
    // Logging dettagliato delle date di input
    logDateDebug('checkDisponibilita', dataInizioRichiesta, 'DataInizioRichiesta');
    logDateDebug('checkDisponibilita', dataFineRichiesta, 'DataFineRichiesta');
    Logger.log('[checkDisponibilita] OraInizioRichiesta: ' + oraInizioRichiesta);
    Logger.log('[checkDisponibilita] OraFineRichiesta: ' + oraFineRichiesta);
    
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
    
    // Normalizza date richieste per confronto con manutenzioni (solo giorno)
    var dataInizioRichiestaNorm = normalizeDate(dtInizioRichiesta);
    var dataFineRichiestaNorm = normalizeDate(dtFineRichiesta);
    
    // Recupera prenotazioni esistenti
    var shPrenotazioni = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var dataPrenotazioni = shPrenotazioni.getDataRange().getValues();
    
    var conflitti = [];
    
    // 1️⃣ CONTROLLA SOVRAPPOSIZIONI CON PRENOTAZIONI (con orari)
    for (var i = 1; i < dataPrenotazioni.length; i++) {
      var r = dataPrenotazioni[i];
      var targaPrenotazione = r[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
      var targaPrenKey = String(targaPrenotazione || '').replace(/\s+/g, '').toUpperCase();
      var statoPrenotazione = r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1];
      
      // Skip se targa diversa o prenotazione non attiva
      if (targaPrenKey !== targaKey) continue;
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
      
      // Logging dettagliato date prenotazione
      logDateDebug('checkDisponibilita', dataInizioPrenotazione, 'DataInizioPrenotazione_' + i);
      logDateDebug('checkDisponibilita', dataFinePrenotazione, 'DataFinePrenotazione_' + i);
      Logger.log('[checkDisponibilita] Prenotazione riga ' + i + ' - OraInizio: ' + oraInizioPrenotazione + ' | OraFine: ' + oraFinePrenotazione);
      
      if (!dataInizioPrenotazione || !dataFinePrenotazione) continue;
      
      // Costruisci datetime completi per prenotazione esistente
      var dtInizioPrenotazione, dtFinePrenotazione;
      try {
        dtInizioPrenotazione = parseDateTimeFromValues(dataInizioPrenotazione, oraInizioPrenotazione);
        dtFinePrenotazione = parseDateTimeFromValues(dataFinePrenotazione, oraFinePrenotazione);
        
        // Logging dettagliato date parsegate
        logDateDebug('checkDisponibilita', dtInizioPrenotazione, 'DtInizioPrenotazioneParsed_' + i);
        logDateDebug('checkDisponibilita', dtFinePrenotazione, 'DtFinePrenotazioneParsed_' + i);
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
          tipo: 'prenotazione',
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
    
    // 2️⃣ CONTROLLA MANUTENZIONI (bloccano l'intero periodo, senza orari)
    var shManutenzioni = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    
    if (shManutenzioni) {
      var dataManutenzioni = shManutenzioni.getDataRange().getValues();
      Logger.log('[checkDisponibilita] Controllo ' + (dataManutenzioni.length - 1) + ' righe manutenzioni per targa ' + targa);
      
      for (var j = 1; j < dataManutenzioni.length; j++) {
        var m = dataManutenzioni[j];
        var targaManutenzione = m[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var targaManKey = String(targaManutenzione || '').replace(/\s+/g, '').toUpperCase();
        var statoManutenzione = String(m[CONFIG.MANUTENZIONI_COLS.STATO - 1] || '').trim();
        
        Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Targa: ' + targaManutenzione + ' | Stato: "' + statoManutenzione + '"');
        
        if (targaManKey !== targaKey) continue;
        if (!statoManutenzione || /^completata$/i.test(statoManutenzione)) {
          Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Skip: completata o senza stato');
          continue;
        }
        
        var dataInizioManutenzione = m[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dataFineManutenzione = m[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        
        Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Data Inizio: ' + dataInizioManutenzione + ' | Data Fine: ' + dataFineManutenzione);
        
        // Logging dettagliato date manutenzione
        logDateDebug('checkDisponibilita', dataInizioManutenzione, 'DataInizioManutenzione_' + j);
        logDateDebug('checkDisponibilita', dataFineManutenzione, 'DataFineManutenzione_' + j);
        
        if (!dataInizioManutenzione || !dataFineManutenzione) {
          Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Skip: date mancanti');
          continue;
        }
        
        // MANUTENZIONI: normalizza solo la data (senza orari)
        // Usa parsing robusto per formati italiani (gg/mm/aaaa) o ISO (yyyy-mm-dd)
        var dtInizioManParsed = parseItalianOrISO(dataInizioManutenzione);
        var dtFineManParsed = parseItalianOrISO(dataFineManutenzione);
        var dtInizioManNorm = dtInizioManParsed ? normalizeDate(dtInizioManParsed) : null;
        var dtFineManNorm = dtFineManParsed ? normalizeDate(dtFineManParsed) : null;
        
        Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Data Inizio norm: ' + dtInizioManNorm + ' | Data Fine norm: ' + dtFineManNorm);
        
        // Logging dettagliato normalizzazione manutenzioni
        logDateDebug('checkDisponibilita', dtInizioManNorm, 'DataInizioManutenzioneNorm_' + j);
        logDateDebug('checkDisponibilita', dtFineManNorm, 'DataFineManutenzioneNorm_' + j);
        
        Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Confronto: dataFineRich=' + dataFineRichiestaNorm.getTime() + ' < dtInizioMan=' + dtInizioManNorm.getTime() + ' || dataInizioRich=' + dataInizioRichiestaNorm.getTime() + ' > dtFineMan=' + dtFineManNorm.getTime());
        
        if (!dtInizioManNorm || !dtFineManNorm) {
          Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Skip: errore normalizzazione date');
          continue;
        }
        
        // Controlla sovrapposizione a livello di GIORNATE (non orari)
        // Se c'è anche solo UN giorno di sovrapposizione → conflitto
        var sovrappone = !(dataFineRichiestaNorm < dtInizioManNorm || dataInizioRichiestaNorm > dtFineManNorm);
        Logger.log('[checkDisponibilita] Manutenzione riga ' + j + ' - Sovrappone: ' + sovrappone);
        
        if (sovrappone) {
          Logger.log('[checkDisponibilita] Conflitto manutenzione trovato: ' + formatDateToItalian(dataInizioManutenzione) + ' - ' + formatDateToItalian(dataFineManutenzione));
          conflitti.push({
            tipo: 'manutenzione',
            dataInizio: formatDateToItalian(dataInizioManutenzione),
            dataFine: formatDateToItalian(dataFineManutenzione),
            stato: statoManutenzione,
            note: m[CONFIG.MANUTENZIONI_COLS.NOTE - 1] || '',
            descrizione: 'Veicolo in manutenzione per l\'intero periodo'
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
 * Verifica disponibilità per PIÙ targhe in un'unica chiamata.
 * Riduce tempi leggendo i fogli una sola volta e riutilizzando i dati.
 * Parametri: targhe (CSV), dataInizio, dataFine, oraInizio, oraFine
 */
function bulkCheckDisponibilita(p){
  try{
    var targheParam = p.targhe || '';
    var list = String(targheParam).split(',').map(function(t){ return String(t || '').trim(); }).filter(function(t){ return t.length > 0; });
    var dataInizio = p.dataInizio;
    var dataFine = p.dataFine;
    var oraInizio = p.oraInizio || '08:00';
    var oraFine = p.oraFine || '22:00';

    if (!list.length || !dataInizio || !dataFine){
      return createJsonResponse({ success:false, message:'Parametri mancanti: targhe, dataInizio, dataFine' }, 400);
    }
    if (!isValidFasciaOraria(oraInizio) || !isValidFasciaOraria(oraFine)){
      return createJsonResponse({ success:false, message:'Fasce orarie non valide. Ammesse: ' + FASCE_ORARIE.join(', ') }, 400);
    }

    // Parse periodo richiesto
    var dtInizio = parseDateTimeString(dataInizio, oraInizio);
    var dtFine = parseDateTimeString(dataFine, oraFine);
    if (dtFine <= dtInizio){
      return createJsonResponse({ success:false, message:'Data/ora fine deve essere successiva a data/ora inizio' }, 400);
    }
    var diNorm = normalizeDate(dtInizio);
    var dfNorm = normalizeDate(dtFine);

    // Carica dati una sola volta
    var sp = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP = sp.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var shM = sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    var dataPrenotazioni = shP ? shP.getDataRange().getValues() : [];
    var dataManutenzioni = shM ? shM.getDataRange().getValues() : [];

    // Funzione interna: verifica disponibilità per singola targa usando dataset pre-caricato
    function disponibilePerTarga(targa){
      var targaKey = String(targa || '').replace(/\s+/g, '').toUpperCase();
      var conflitto = false;

      // Prenotazioni con orari e fascia successiva
      for (var i = 1; i < dataPrenotazioni.length; i++){
        var r = dataPrenotazioni[i];
        var targaPren = r[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
        var tKey = String(targaPren || '').replace(/\s+/g, '').toUpperCase();
        if (tKey !== targaKey) continue;
        var stato = r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1];
        if (!stato || stato === 'Rifiutata' || stato === 'Completata' || stato === 'Annullata') continue;

        var dIn = r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
        var dFi = r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1];
        var oIn = r[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] || '08:00';
        var oFi = r[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] || '22:00';
        if (!dIn || !dFi) continue;

        var dtInPren = parseDateTimeFromValues(dIn, oIn);
        var dtFiPren = parseDateTimeFromValues(dFi, oFi);

        var fasciaDisp = fasciaSuccessiva(oFi);
        var dtDispEff = dtFiPren;
        if (fasciaDisp){
          dtDispEff = parseDateTimeFromValues(dFi, fasciaDisp);
        } else {
          var giornoSucc = new Date(dtFiPren);
          giornoSucc.setDate(giornoSucc.getDate() + 1);
          dtDispEff = parseDateTimeFromValues(giornoSucc, '08:00');
        }

        // Conflitto se la richiesta inizia prima della disponibilità effettiva e finisce dopo l'inizio prenotazione
        if (dtInizio < dtDispEff && dtFine > dtInPren){ conflitto = true; break; }
      }

      if (conflitto) return false;

      // Manutenzioni: bloccano a livello di giorni
      for (var j = 1; j < dataManutenzioni.length; j++){
        var m = dataManutenzioni[j];
        var tMan = m[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var tManKey = String(tMan || '').replace(/\s+/g, '').toUpperCase();
        if (tManKey !== targaKey) continue;
        var statoMan = String(m[CONFIG.MANUTENZIONI_COLS.STATO - 1] || '').trim();
        if (!statoMan || /^completata$/i.test(statoMan)) continue;
        var diMan = m[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dfMan = m[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        if (!diMan || !dfMan) continue;

        var diParsed = parseItalianOrISO(diMan);
        var dfParsed = parseItalianOrISO(dfMan);
        var diNormMan = diParsed ? normalizeDate(diParsed) : null;
        var dfNormMan = dfParsed ? normalizeDate(dfParsed) : null;
        if (!diNormMan || !dfNormMan) continue;
        var sovrapp = !(dfNorm < diNormMan || diNorm > dfNormMan);
        if (sovrapp) { conflitto = true; break; }
      }

      return !conflitto;
    }

    var results = list.map(function(t){ return { targa: t, disponibile: disponibilePerTarga(t) }; });
    return createJsonResponse({ success:true, results: results, count: results.length });
  }catch(err){
    Logger.log('[bulkCheckDisponibilita] Errore: ' + err.message);
    return createJsonResponse({ success:false, message:'Errore bulk check: ' + err.message }, 500);
  }
}

/**
 * Trova la prima fascia oraria utile (più vicina) in cui
 * ALMENO un veicolo è disponibile per l'intero intervallo richiesto.
 * Parametri:
 *  - dataInizio, oraInizio: inizio richiesto (punto di partenza per la ricerca)
 *  - dataFine, oraFine: fine richiesta (intervallo da rispettare)
 *  - targhe: opzionale CSV di targhe da considerare; se assente, usa tutti i veicoli
 *  - maxDays: numero di giorni da scandire (default 2: oggi + domani)
 */
function firstAvailableSlot(p){
  try{
    var dataInizio = p.dataInizio;
    var oraInizio = p.oraInizio || '08:00';
    var dataFine = p.dataFine || dataInizio;
    var oraFine = p.oraFine || '22:00';
    var maxDays = parseInt(p.maxDays || 2, 10);

    if (!dataInizio || !dataFine){
      return createJsonResponse({ success:false, message:'Parametri mancanti: dataInizio e dataFine sono richiesti' }, 400);
    }
    if (!isValidFasciaOraria(oraInizio) || !isValidFasciaOraria(oraFine)){
      return createJsonResponse({ success:false, message:'Fasce orarie non valide. Ammesse: ' + FASCE_ORARIE.join(', ') }, 400);
    }

    // Parse intervallo da rispettare
    var dtFine = parseDateTimeString(dataFine, oraFine);
    var dtStartBase = parseDateTimeString(dataInizio, oraInizio);
    if (dtFine <= dtStartBase){
      return createJsonResponse({ success:false, message:'Data/ora fine deve essere successiva a data/ora inizio' }, 400);
    }

    // Carica dataset una sola volta
    var sp = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var shP = sp.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    var shM = sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    var shV = sp.getSheetByName(CONFIG.SHEETS.PULMINI);
    var dataPrenotazioni = shP ? shP.getDataRange().getValues() : [];
    var dataManutenzioni = shM ? shM.getDataRange().getValues() : [];

    // Lista targhe da considerare
    var targhe = [];
    if (p.targhe){
      targhe = String(p.targhe).split(',').map(function(t){ return String(t || '').trim(); }).filter(function(t){ return t.length > 0; });
    } else if (shV){
      var dataV = shV.getDataRange().getValues();
      for (var i=1; i<dataV.length; i++){
        var t = dataV[i][CONFIG.PULMINI_COLS.TARGA - 1];
        if (t) targhe.push(String(t).trim());
      }
    }
    if (!targhe.length){
      return createJsonResponse({ success:false, message:'Nessuna targa da valutare' }, 400);
    }

    // Helper: verifica disponibilità per targa nel periodo [startSlot, dtFine]
    function disponibileNelPeriodo(targa, startSlot){
      var targaKey = String(targa || '').replace(/\s+/g, '').toUpperCase();

      // 1) Controlla prenotazioni attive con orari e fascia successiva
      for (var i = 1; i < dataPrenotazioni.length; i++){
        var r = dataPrenotazioni[i];
        var targaPren = r[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
        var tKey = String(targaPren || '').replace(/\s+/g, '').toUpperCase();
        if (tKey !== targaKey) continue;
        var stato = r[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1];
        if (!stato || stato === 'Rifiutata' || stato === 'Completata' || stato === 'Annullata') continue;

        var dIn = r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1];
        var dFi = r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1];
        var oIn = r[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] || '08:00';
        var oFi = r[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] || '22:00';
        if (!dIn || !dFi) continue;

        var dtInPren = parseDateTimeFromValues(dIn, oIn);
        var dtFiPren = parseDateTimeFromValues(dFi, oFi);

        // fascia successiva alla riconsegna
        var fasciaDisp = fasciaSuccessiva(oFi);
        var dtDispEff = dtFiPren;
        if (fasciaDisp){
          dtDispEff = parseDateTimeFromValues(dFi, fasciaDisp);
        } else {
          var giornoSucc = new Date(dtFiPren);
          giornoSucc.setDate(giornoSucc.getDate() + 1);
          dtDispEff = parseDateTimeFromValues(giornoSucc, '08:00');
        }

        // Conflitto se intervallo richiesto [startSlot, dtFine] interseca prenotazione e non rispetta disponibilità successiva
        var interseca = !(dtFiPren <= startSlot || dtInPren >= dtFine);
        if (interseca || dtDispEff > startSlot){
          return false;
        }
      }

      // 2) Controlla manutenzioni (bloccano intero giorno)
      var startNorm = normalizeDate(startSlot);
      var fineNorm = normalizeDate(dtFine);
      for (var j = 1; j < dataManutenzioni.length; j++){
        var m = dataManutenzioni[j];
        var tMan = m[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
        var tKeyMan = String(tMan || '').replace(/\s+/g, '').toUpperCase();
        if (tKeyMan !== targaKey) continue;
        var statoMan = m[CONFIG.MANUTENZIONI_COLS.STATO - 1];
        if (!statoMan || statoMan === 'Completata') continue;
        var dInMan = m[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1];
        var dFiMan = m[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1];
        if (!dInMan || !dFiMan) continue;
        var di = normalizeDate(new Date(dInMan));
        var df = normalizeDate(new Date(dFiMan));
        var sovrapp = !(df < startNorm || di > fineNorm);
        if (sovrapp){
          return false;
        }
      }
      return true;
    }

    // Scansione fasce: giorno corrente da oraInizio, poi giorni successivi interi
    for (var d = 0; d < maxDays; d++){
      var giorno = new Date(dtStartBase);
      giorno.setDate(giorno.getDate() + d);
      var times = FASCE_ORARIE.slice();
      if (d === 0){
        times = times.filter(function(t){ return t >= oraInizio; });
      }

      for (var k = 0; k < times.length; k++){
        var orario = times[k];
        var startSlot = parseDateTimeFromValues(giorno, orario);
        if (startSlot >= dtFine) continue; // non ha senso iniziare dopo la fine

        for (var x = 0; x < targhe.length; x++){
          if (disponibileNelPeriodo(targhe[x], startSlot)){
            dbg('[firstAvailableSlot] Slot trovato: ' + formatDateToItalian(startSlot) + ' ' + orario + ' - targa ' + targhe[x]);
            return createJsonResponse({ success:true, found:true, slot:{ data: formatDateToItalian(startSlot), ora: orario, targa: targhe[x] } });
          }
        }
      }
    }

    return createJsonResponse({ success:true, found:false, slot:null, message:'Nessuna fascia utile nei prossimi ' + maxDays + ' giorni' });
  }catch(err){
    dbg('[firstAvailableSlot] Errore: ' + err.message);
    return createJsonResponse({ success:false, message:'Errore firstAvailableSlot: ' + err.message }, 500);
  }
}

/**
 * Crea/Aggiorna veicolo nel foglio PULMINI.
 * Se esiste una riga con stessa targa, viene aggiornata; altrimenti aggiunta.
 * Payload: { targa, marca, modello, posti, stato, note }
 */
function setVeicolo(post) {
  try {
    var targa = (post && post.targa) ? String(post.targa).trim().toUpperCase() : '';
    var marca = (post && post.marca) ? String(post.marca).trim() : '';
    var modello = (post && post.modello) ? String(post.modello).trim() : '';
    var posti = (post && post.posti) ? parseInt(post.posti, 10) : 9;
    var stato = (post && post.stato) ? String(post.stato).trim() : 'Disponibile';
    var note = (post && post.note) ? String(post.note).trim() : '';
    var row = (post && post.row) ? parseInt(post.row, 10) : 0; // opzionale: forzare aggiornamento riga

    if (!targa) {
      return createJsonResponse({ success: false, message: 'Targa obbligatoria' }, 400);
    }

    var sp = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = sp.getSheetByName(CONFIG.SHEETS.PULMINI);
    if (!sh) {
      return createJsonResponse({ success: false, message: 'Foglio PULMINI non trovato' }, 500);
    }

    // Prepara i valori
    var values = [];
    values[CONFIG.PULMINI_COLS.TARGA - 1] = targa;
    values[CONFIG.PULMINI_COLS.MARCA - 1] = marca;
    values[CONFIG.PULMINI_COLS.MODELLO - 1] = modello;
    values[CONFIG.PULMINI_COLS.POSTI - 1] = posti || 9;
    values[CONFIG.PULMINI_COLS.STATO - 1] = stato || 'Disponibile';
    values[CONFIG.PULMINI_COLS.NOTE - 1] = note || '';

    var updatedRow = 0;
    var data = sh.getDataRange().getValues();
    if (row && row > 1) {
      // aggiornamento forzato a riga specificata
      updatedRow = row;
    } else {
      // cerca per targa
      for (var i = 1; i < data.length; i++) {
        var tp = data[i][CONFIG.PULMINI_COLS.TARGA - 1];
        if (tp && String(tp).toUpperCase().trim() === targa) { updatedRow = i + 1; break; }
      }
    }

    var lastCol = CONFIG.PULMINI_COLS.NOTE;
  if (updatedRow > 1) {
    sh.getRange(updatedRow, 1, 1, lastCol).setValues([values]);
    try { CacheService.getScriptCache().remove('GET_VEICOLI_V1'); } catch (_) {}
    return createJsonResponse({ success: true, message: 'Veicolo aggiornato', data: { row: updatedRow, targa: targa } });
  } else {
    sh.appendRow(values);
    var newRow = sh.getLastRow();
    try { CacheService.getScriptCache().remove('GET_VEICOLI_V1'); } catch (_) {}
    return createJsonResponse({ success: true, message: 'Veicolo aggiunto', data: { row: newRow, targa: targa } });
  }
  } catch (err) {
    Logger.log('[setVeicolo] Errore: ' + err.message);
    return createJsonResponse({ success: false, message: 'Errore salvataggio veicolo: ' + err.message }, 500);
  }
}

/**
 * Elimina veicolo dal foglio PULMINI per targa (o riga se fornita).
 * Payload: { targa } | { row }
 */
function eliminaVeicolo(post) {
  try {
    var targa = (post && post.targa) ? String(post.targa).trim().toUpperCase() : '';
    var row = (post && post.row) ? parseInt(post.row, 10) : 0;
    var sp = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = sp.getSheetByName(CONFIG.SHEETS.PULMINI);
    if (!sh) {
      return createJsonResponse({ success: false, message: 'Foglio PULMINI non trovato' }, 500);
    }

    var targetRow = 0;
    if (row && row > 1) {
      targetRow = row;
    } else if (targa) {
      var data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var tp = data[i][CONFIG.PULMINI_COLS.TARGA - 1];
        if (tp && String(tp).toUpperCase().trim() === targa) { targetRow = i + 1; break; }
      }
    }

    if (!targetRow || targetRow <= 1) {
      return createJsonResponse({ success: false, message: 'Veicolo non trovato per eliminazione' }, 404);
    }
  sh.deleteRow(targetRow);
  try { CacheService.getScriptCache().remove('GET_VEICOLI_V1'); } catch (_) {}
  return createJsonResponse({ success: true, message: 'Veicolo eliminato', data: { row: targetRow, targa: targa } });
  } catch (err) {
    Logger.log('[eliminaVeicolo] Errore: ' + err.message);
    return createJsonResponse({ success: false, message: 'Errore eliminazione veicolo: ' + err.message }, 500);
  }
}

/**
 * Parse stringa data + ora in oggetto Date
 * @param {string} dateStr - Data in formato YYYY-MM-DD o DD/MM/YYYY
 * @param {string} timeStr - Ora in formato HH:MM
 * @return {Date} Oggetto Date
 */
function parseDateTimeString(dateStr, timeStr) {
  if (!dateStr) throw new Error('Data mancante');
  if (!timeStr) timeStr = '08:00';
  
  // Rileva formato data (YYYY-MM-DD o DD/MM/YYYY)
  var year, month, day;
  
  // Prova formato YYYY-MM-DD
  if (dateStr.includes('-')) {
    var dateParts = dateStr.split('-');
    if (dateParts.length !== 3) throw new Error('Formato data non valido: ' + dateStr);
    year = parseInt(dateParts[0], 10);
    month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
    day = parseInt(dateParts[2], 10);
  }
  // Prova formato DD/MM/YYYY
  else if (dateStr.includes('/')) {
    var dateParts = dateStr.split('/');
    if (dateParts.length !== 3) throw new Error('Formato data non valido: ' + dateStr);
    day = parseInt(dateParts[0], 10);
    month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
    year = parseInt(dateParts[2], 10);
  } else {
    throw new Error('Formato data non riconosciuto: ' + dateStr);
  }
  
  // Validazione componenti data
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Componenti data non valide: ' + dateStr);
  }
  
  if (month < 0 || month > 11) {
    throw new Error('Mese non valido: ' + (month + 1));
  }
  
  if (day < 1 || day > 31) {
    throw new Error('Giorno non valido: ' + day);
  }
  
  // Parse ora HH:MM
  var timeParts = timeStr.split(':');
  if (timeParts.length !== 2) throw new Error('Formato ora non valido: ' + timeStr);
  
  var hours = parseInt(timeParts[0], 10);
  var minutes = parseInt(timeParts[1], 10);
  
  // Validazione componenti ora
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error('Componenti ora non valide: ' + timeStr);
  }
  
  if (hours < 0 || hours > 23) {
    throw new Error('Ora non valida: ' + hours);
  }
  
  if (minutes < 0 || minutes > 59) {
    throw new Error('Minuti non validi: ' + minutes);
  }
  
  // Crea data con timezone locale (evita problemi di conversione)
  var result = new Date(year, month, day, hours, minutes, 0, 0);
  
  // Verifica che la data creata sia valida
  if (isNaN(result.getTime())) {
    throw new Error('Data creata non valida: ' + dateStr + ' ' + timeStr);
  }
  
  // Verifica che i componenti corrispondano (per gestire casi limite come 31 febbraio)
  if (result.getFullYear() !== year || result.getMonth() !== month || result.getDate() !== day) {
    throw new Error('Data non valida (componenti non corrispondenti): ' + dateStr);
  }
  
  return result;
}

/**
 * Parse Date object + stringa ora in oggetto Date completo
 * @param {Date|string} dateObj - Oggetto Date o stringa data
 * @param {string} timeStr - Ora in formato HH:MM
 * @return {Date} Oggetto Date con ora
 */
function parseDateTimeFromValues(dateObj, timeStr) {
  if (!dateObj) throw new Error('Data mancante');
  
  var parsedDate;
  
  // Se è stringa, converti in Date con gestione multi-formato
  if (typeof dateObj === 'string') {
    // Prova a parsare come YYYY-MM-DD
    if (dateObj.includes('-')) {
      var dateParts = dateObj.split('-');
      if (dateParts.length === 3) {
        var year = parseInt(dateParts[0], 10);
        var month = parseInt(dateParts[1], 10) - 1;
        var day = parseInt(dateParts[2], 10);
        parsedDate = new Date(year, month, day);
      }
    }
    // Prova a parsare come DD/MM/YYYY
    else if (dateObj.includes('/')) {
      var dateParts = dateObj.split('/');
      if (dateParts.length === 3) {
        var day = parseInt(dateParts[0], 10);
        var month = parseInt(dateParts[1], 10) - 1;
        var year = parseInt(dateParts[2], 10);
        parsedDate = new Date(year, month, day);
      }
    }
    
    // Se non è riuscito a parsare, prova il costruttore standard
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      parsedDate = new Date(dateObj);
    }
  } else if (dateObj instanceof Date) {
    parsedDate = new Date(dateObj);
  } else {
    // Prova a convertire in Date
    parsedDate = new Date(dateObj);
  }
  
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    throw new Error('Data non valida: ' + dateObj);
  }
  
  if (!timeStr) timeStr = '08:00';
  
  // Parse ora HH:MM con validazione
  var timeParts = String(timeStr).split(':');
  if (timeParts.length !== 2) throw new Error('Formato ora non valido: ' + timeStr);
  
  var hours = parseInt(timeParts[0], 10);
  var minutes = parseInt(timeParts[1], 10);
  
  // Validazione componenti ora
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error('Componenti ora non valide: ' + timeStr);
  }
  
  if (hours < 0 || hours > 23) {
    throw new Error('Ora non valida: ' + hours);
  }
  
  if (minutes < 0 || minutes > 59) {
    throw new Error('Minuti non validi: ' + minutes);
  }
  
  // Crea nuovo Date con ora specificata
  var result = new Date(parsedDate);
  result.setHours(hours, minutes, 0, 0);
  
  // Verifica che la data finale sia valida
  if (isNaN(result.getTime())) {
    throw new Error('Data/ora finale non valida: ' + dateObj + ' ' + timeStr);
  }
  
  return result;
}
