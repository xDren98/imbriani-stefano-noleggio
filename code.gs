/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.3.7
 * - nuova funzione: sincronizzaClienti -> censisce clienti da PRENOTAZIONI in CLIENTI con upsert per CF
 * - endpoint GET: action=sincronizzaClienti
 */

const CONFIG = {
  VERSION: '8.3.7',
  SPREADSHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  TOKEN: 'imbriani_secret_2025',
  SHEETS: { PRENOTAZIONI: 'PRENOTAZIONI', PULMINI: 'PULMINI', CLIENTI: 'CLIENTI', MANUTENZIONI: 'MANUTENZIONI' },
  PRENOTAZIONI_COLS: { TIMESTAMP:1,NOME_AUTISTA_1:2,DATA_NASCITA_AUTISTA_1:3,LUOGO_NASCITA_AUTISTA_1:4,CODICE_FISCALE_AUTISTA_1:5,COMUNE_RESIDENZA_AUTISTA_1:6,VIA_RESIDENZA_AUTISTA_1:7,CIVICO_RESIDENZA_AUTISTA_1:8,NUMERO_PATENTE_AUTISTA_1:9,DATA_INIZIO_PATENTE_AUTISTA_1:10,SCADENZA_PATENTE_AUTISTA_1:11,TARGA:12,ORA_INIZIO:13,ORA_FINE:14,GIORNO_INIZIO:15,GIORNO_FINE:16,DESTINAZIONE:17,CELLULARE:18,DATA_CONTRATTO:19,NOME_AUTISTA_2:20,DATA_NASCITA_AUTISTA_2:21,LUOGO_NASCITA_AUTISTA_2:22,CODICE_FISCALE_AUTISTA_2:23,COMUNE_RESIDENZA_AUTISTA_2:24,VIA_RESIDENZA_AUTISTA_2:25,CIVICO_RESIDENZA_AUTISTA_2:26,NUMERO_PATENTE_AUTISTA_2:27,DATA_INIZIO_PATENTE_AUTISTA_2:28,SCADENZA_PATENTE_AUTISTA_2:29,NOME_AUTISTA_3:30,DATA_NASCITA_AUTISTA_3:31,LUOGO_NASCITA_AUTISTA_3:32,CODICE_FISCALE_AUTISTA_3:33,COMUNE_RESIDENZA_AUTISTA_3:34,VIA_RESIDENZA_AUTISTA_3:35,CIVICO_RESIDENZA_AUTISTA_3:36,NUMERO_PATENTE_AUTISTA_3:37,DATA_INIZIO_PATENTE_AUTISTA_3:38,SCADENZA_PATENTE_AUTISTA_3:39,ID_PRENOTAZIONE:40,STATO_PRENOTAZIONE:41,IMPORTO_PREVENTIVO:42,EMAIL:43,TEST:44 },
  CLIENTI_COLS: { NOME:1,DATA_NASCITA:2,LUOGO_NASCITA:3,CODICE_FISCALE:4,COMUNE_RESIDENZA:5,VIA_RESIDENZA:6,CIVICO_RESIDENZA:7,NUMERO_PATENTE:8,DATA_INIZIO_PATENTE:9,SCADENZA_PATENTE:10,CELLULARE:11,EMAIL:12 },
  PULMINI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,NOTE:6 },
  MANUTENZIONI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,DATA_INIZIO:6,DATA_FINE:7,COSTO:8,NOTE:9 }
};

function doGet(e){
  const p = e?.parameter || {}; const action = p.action || 'health'; const token = p.token || p.Authorization?.replace('Bearer ','');
  try{
    if (action==='health') return createJsonResponse({ success:true, service:'imbriani-backend', version:CONFIG.VERSION, timestamp:new Date().toISOString(), spreadsheet_id:CONFIG.SPREADSHEET_ID, sheets:Object.keys(CONFIG.SHEETS), action:'health_supported', columns_mapped:{ prenotazioni:Object.keys(CONFIG.PRENOTAZIONI_COLS).length, clienti:Object.keys(CONFIG.CLIENTI_COLS).length, pulmini:Object.keys(CONFIG.PULMINI_COLS).length, manutenzioni:Object.keys(CONFIG.MANUTENZIONI_COLS).length } });
    if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    switch(action){
      case 'getVeicoli': return getVeicoli();
      case 'getPrenotazioni': return getPrenotazioni();
      case 'checkDisponibilita': return checkDisponibilita(p);
      case 'updateStatiLive': return updateStatiLive();
      case 'getSheet': return getSheetGeneric(p);
      case 'sincronizzaClienti': return sincronizzaClienti();
      default: return createJsonResponse({success:false,message:'Azione non supportata: '+action},400);
    }
  }catch(err){ return createJsonResponse({success:false,message:'Errore server: '+err.message},500); }
}

// ... (il resto del file rimane invariato) ...

function sincronizzaClienti(){
  try{
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const shP = ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    const shC = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    if (!shP || !shC) return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI o CLIENTI non trovato'},500);

    const pVals = shP.getDataRange().getValues();
    const cVals = shC.getDataRange().getValues();

    // Indicizzazione CLIENTI per CF -> rowIndex
    const idxByCF = new Map();
    for (let i=1;i<cVals.length;i++){
      const cf = String(cVals[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]||'').trim();
      if (cf) idxByCF.set(cf, i+1); // 1-based row index
    }

    let created=0, updated=0, skipped=0;

    // Helper per upsert
    function upsertCliente(data, isPrimary){
      const cf = String(data.codiceFiscale||'').trim();
      if (!cf || cf.length!==16){ skipped++; return; }
      const rowIndex = idxByCF.get(cf);
      function setIf(row, colKey, val){ if (val!==undefined && val!==null && val!==''){ row[CONFIG.CLIENTI_COLS[colKey]-1] = val; } }

      if (!rowIndex){
        // crea nuova riga
        const row = new Array(Object.keys(CONFIG.CLIENTI_COLS).length).fill('');
        setIf(row,'NOME', data.nomeCompleto||data.nome||'');
        setIf(row,'DATA_NASCITA', data.dataNascita||'');
        setIf(row,'LUOGO_NASCITA', data.luogoNascita||'');
        setIf(row,'CODICE_FISCALE', cf);
        setIf(row,'COMUNE_RESIDENZA', data.comuneResidenza||'');
        setIf(row,'VIA_RESIDENZA', data.viaResidenza||'');
        setIf(row,'CIVICO_RESIDENZA', data.civicoResidenza||'');
        setIf(row,'NUMERO_PATENTE', data.numeroPatente||'');
        setIf(row,'DATA_INIZIO_PATENTE', data.inizioValiditaPatente||data.dataInizioPatente||'');
        setIf(row,'SCADENZA_PATENTE', data.scadenzaPatente||'');
        if (isPrimary){ setIf(row,'CELLULARE', data.cellulare||''); setIf(row,'EMAIL', data.email||''); }
        shC.appendRow(row);
        // aggiorna indice
        const last = shC.getLastRow(); idxByCF.set(cf,last);
        created++;
      } else {
        // aggiorna riga esistente sul foglio
        function updateCell(colKey, val){ if (val!==undefined && val!==null && val!==''){ shC.getRange(rowIndex, CONFIG.CLIENTI_COLS[colKey]).setValue(val); } }
        updateCell('NOME', data.nomeCompleto||data.nome||'');
        updateCell('DATA_NASCITA', data.dataNascita||'');
        updateCell('LUOGO_NASCITA', data.luogoNascita||'');
        updateCell('COMUNE_RESIDENZA', data.comuneResidenza||'');
        updateCell('VIA_RESIDENZA', data.viaResidenza||'');
        updateCell('CIVICO_RESIDENZA', data.civicoResidenza||'');
        updateCell('NUMERO_PATENTE', data.numeroPatente||'');
        updateCell('DATA_INIZIO_PATENTE', data.inizioValiditaPatente||data.dataInizioPatente||'');
        updateCell('SCADENZA_PATENTE', data.scadenzaPatente||'');
        if (isPrimary){ updateCell('CELLULARE', data.cellulare||''); updateCell('EMAIL', data.email||''); }
        updated++;
      }
    }

    // Scansione PRENOTAZIONI
    for (let i=1;i<pVals.length;i++){
      const r = pVals[i];
      const a1 = {
        nomeCompleto: r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1-1]||'',
        dataNascita: r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1-1]||'',
        luogoNascita: r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1-1]||'',
        codiceFiscale: r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]||'',
        numeroPatente: r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1-1]||'',
        inizioValiditaPatente: r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1-1]||'',
        scadenzaPatente: r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1-1]||'',
        cellulare: r[CONFIG.PRENOTAZIONI_COLS.CELLULARE-1]||'',
        email: r[CONFIG.PRENOTAZIONI_COLS.EMAIL-1]||''
      };
      const a2 = {
        nomeCompleto: r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2-1]||'',
        dataNascita: r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2-1]||'',
        luogoNascita: r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2-1]||'',
        codiceFiscale: r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2-1]||'',
        numeroPatente: r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2-1]||'',
        inizioValiditaPatente: r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2-1]||'',
        scadenzaPatente: r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2-1]||''
      };
      const a3 = {
        nomeCompleto: r[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3-1]||'',
        dataNascita: r[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3-1]||'',
        luogoNascita: r[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3-1]||'',
        codiceFiscale: r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3-1]||'',
        numeroPatente: r[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3-1]||'',
        inizioValiditaPatente: r[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3-1]||'',
        scadenzaPatente: r[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3-1]||''
      };

      if (a1.codiceFiscale) upsertCliente(a1, true);
      if (a2.codiceFiscale) upsertCliente(a2, false);
      if (a3.codiceFiscale) upsertCliente(a3, false);
    }

    return createJsonResponse({success:true,message:'Sincronizzazione CLIENTI completata',created,updated,skipped});
  }catch(err){ return createJsonResponse({success:false,message:'Errore sincronizzaClienti: '+err.message},500); }
}
