/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.3.2
 * Mappatura colonne corretta basata sui fogli Google Sheets reali
 * Aggiornato: dual token (header+body), health esteso
 */

// 🔧 CONFIGURAZIONE
const CONFIG = {
  VERSION: '8.3.2',
  SPREADSHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  TOKEN: 'imbriani_secret_2025',
  SHEETS: {
    PRENOTAZIONI: 'PRENOTAZIONI',
    PULMINI: 'PULMINI',
    CLIENTI: 'CLIENTI',
    MANUTENZIONI: 'MANUTENZIONI'
  },
  // 📋 PRENOTAZIONI (44 colonne)
  PRENOTAZIONI_COLS: {
    TIMESTAMP: 1,
    NOME_AUTISTA_1: 2,
    DATA_NASCITA_AUTISTA_1: 3,
    LUOGO_NASCITA_AUTISTA_1: 4,
    CODICE_FISCALE_AUTISTA_1: 5,
    COMUNE_RESIDENZA_AUTISTA_1: 6,
    VIA_RESIDENZA_AUTISTA_1: 7,
    CIVICO_RESIDENZA_AUTISTA_1: 8,
    NUMERO_PATENTE_AUTISTA_1: 9,
    DATA_INIZIO_PATENTE_AUTISTA_1: 10,
    SCADENZA_PATENTE_AUTISTA_1: 11,
    TARGA: 12,
    ORA_INIZIO: 13,
    ORA_FINE: 14,
    GIORNO_INIZIO: 15,
    GIORNO_FINE: 16,
    DESTINAZIONE: 17,
    CELLULARE: 18,
    DATA_CONTRATTO: 19,
    NOME_AUTISTA_2: 20,
    DATA_NASCITA_AUTISTA_2: 21,
    LUOGO_NASCITA_AUTISTA_2: 22,
    CODICE_FISCALE_AUTISTA_2: 23,
    COMUNE_RESIDENZA_AUTISTA_2: 24,
    VIA_RESIDENZA_AUTISTA_2: 25,
    CIVICO_RESIDENZA_AUTISTA_2: 26,
    NUMERO_PATENTE_AUTISTA_2: 27,
    DATA_INIZIO_PATENTE_AUTISTA_2: 28,
    SCADENZA_PATENTE_AUTISTA_2: 29,
    NOME_AUTISTA_3: 30,
    DATA_NASCITA_AUTISTA_3: 31,
    LUOGO_NASCITA_AUTISTA_3: 32,
    CODICE_FISCALE_AUTISTA_3: 33,
    COMUNE_RESIDENZA_AUTISTA_3: 34,
    VIA_RESIDENZA_AUTISTA_3: 35,
    CIVICO_RESIDENZA_AUTISTA_3: 36,
    NUMERO_PATENTE_AUTISTA_3: 37,
    DATA_INIZIO_PATENTE_AUTISTA_3: 38,
    SCADENZA_PATENTE_AUTISTA_3: 39,
    ID_PRENOTAZIONE: 40,
    STATO_PRENOTAZIONE: 41,
    IMPORTO_PREVENTIVO: 42,
    EMAIL: 43,
    TEST: 44
  },
  // 👤 CLIENTI (12 colonne)
  CLIENTI_COLS: {
    NOME: 1,
    DATA_NASCITA: 2,
    LUOGO_NASCITA: 3,
    CODICE_FISCALE: 4,
    COMUNE_RESIDENZA: 5,
    VIA_RESIDENZA: 6,
    CIVICO_RESIDENZA: 7,
    NUMERO_PATENTE: 8,
    DATA_INIZIO_PATENTE: 9,
    SCADENZA_PATENTE: 10,
    CELLULARE: 11,
    EMAIL: 12
  },
  // 🚗 PULMINI (6 colonne)
  PULMINI_COLS: {
    TARGA: 1,
    MARCA: 2,
    MODELLO: 3,
    POSTI: 4,
    STATO: 5,
    NOTE: 6
  },
  // 🔧 MANUTENZIONI (9 colonne)
  MANUTENZIONI_COLS: {
    TARGA: 1,
    MARCA: 2,
    MODELLO: 3,
    POSTI: 4,
    STATO: 5,
    DATA_INIZIO: 6,
    DATA_FINE: 7,
    COSTO: 8,
    NOTE: 9
  }
};

// 🔑 GET
function doGet(e){
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || 'health';
  const token = params.token || (params.Authorization ? params.Authorization.replace('Bearer ','') : null);
  try{
    if (action === 'health'){
      return createJsonResponse({
        success:true,
        service:'imbriani-backend',
        version:CONFIG.VERSION,
        timestamp:new Date().toISOString(),
        spreadsheet_id:CONFIG.SPREADSHEET_ID,
        sheets:Object.keys(CONFIG.SHEETS),
        action:'health_supported',
        columns_mapped:{
          prenotazioni:Object.keys(CONFIG.PRENOTAZIONI_COLS).length,
          clienti:Object.keys(CONFIG.CLIENTI_COLS).length,
          pulmini:Object.keys(CONFIG.PULMINI_COLS).length,
          manutenzioni:Object.keys(CONFIG.MANUTENZIONI_COLS).length
        }
      });
    }
    if (!validateToken(token)){
      return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    }
    switch(action){
      case 'getVeicoli': return getVeicoli();
      case 'getPrenotazioni': return getPrenotazioni();
      case 'checkDisponibilita': return checkDisponibilita(params);
      default: return createJsonResponse({success:false,message:'Azione non supportata: '+action,available_actions:['health','getVeicoli','getPrenotazioni','checkDisponibilita','login']},400);
    }
  }catch(error){
    return createJsonResponse({success:false,message:'Errore server: '+error.message,error:error.toString()},500);
  }
}

// 🔑 POST
function doPost(e){
  try{
    const tokenHeader = (e && e.parameter && e.parameter.token) ? e.parameter.token : getAuthHeader(e);
    let postData = {};
    try{ postData = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}'); }
    catch(parseError){ return createJsonResponse({success:false,message:'Invalid JSON in request body'},400); }

    const action = postData.action || 'login';
    const finalToken = tokenHeader || postData.token || postData.AUTH_TOKEN; // dual token

    if (action === 'login'){
      return handleLogin(postData, finalToken);
    }

    if (!validateToken(finalToken)){
      return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    }

    switch(action){
      case 'getPrenotazioni': return getPrenotazioni();
      case 'getVeicoli': return getVeicoli();
      case 'creaPrenotazione': return creaPrenotazione(postData);
      case 'aggiornaStato': return aggiornaStatoPrenotazione(postData);
      case 'setManutenzione': return setManutenzione(postData);
      default: return createJsonResponse({success:false,message:'Azione POST non supportata: '+action},400);
    }
  }catch(error){
    return createJsonResponse({success:false,message:'Errore POST: '+error.message},500);
  }
}

// 🔐 TOKEN
function validateToken(token){ return token === CONFIG.TOKEN; }

// 📤 JSON RESPONSE
function createJsonResponse(data, status){
  const s = status || 200;
  const response = { ...data, timestamp:new Date().toISOString(), version:CONFIG.VERSION, status:s };
  return ContentService.createTextOutput(JSON.stringify(response, null, 2)).setMimeType(ContentService.MimeType.JSON);
}

// 🔑 AUTH HEADER
function getAuthHeader(e){
  if (e && e.parameter && e.parameter.token) return e.parameter.token;
  if (e && e.parameter && e.parameter.Authorization) return e.parameter.Authorization.replace('Bearer ','');
  return null;
}

// 🔐 LOGIN
function handleLogin(postData, token){
  try{
    const codiceFiscale = postData.codiceFiscale;
    if (!codiceFiscale || codiceFiscale.length !== 16){
      return createJsonResponse({success:false,message:'Codice fiscale non valido (deve essere 16 caratteri)'},400);
    }
    const clientiSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    const data = clientiSheet.getDataRange().getValues();
    for (let i=1;i<data.length;i++){
      const row = data[i];
      if (row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1] === codiceFiscale){
        return createJsonResponse({
          success:true,
          message:'Login effettuato',
          user:{
            nome: row[CONFIG.CLIENTI_COLS.NOME - 1],
            codiceFiscale: row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1],
            dataNascita: row[CONFIG.CLIENTI_COLS.DATA_NASCITA - 1],
            luogoNascita: row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA - 1],
            comuneResidenza: row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA - 1],
            viaResidenza: row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA - 1],
            civicoResidenza: row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA - 1],
            numeroPatente: row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE - 1],
            inizioValiditaPatente: row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE - 1],
            scadenzaPatente: row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE - 1],
            cellulare: row[CONFIG.CLIENTI_COLS.CELLULARE - 1],
            email: row[CONFIG.CLIENTI_COLS.EMAIL - 1]
          }
        });
      }
    }
    return createJsonResponse({success:false,message:'Codice fiscale non trovato. Registrazione richiesta.',requiresRegistration:true},404);
  }catch(error){
    return createJsonResponse({success:false,message:'Errore login: '+error.message},500);
  }
}

// 🚗 VEICOLI
function getVeicoli(){
  try{
    const sheetPulmini = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PULMINI);
    const sheetManutenzioni = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if (!sheetPulmini){ return createJsonResponse({success:false,message:'Foglio PULMINI non trovato'},500); }
    const dataPulmini = sheetPulmini.getDataRange().getValues();
    if (dataPulmini.length <= 1){ return createJsonResponse({success:true,message:'Nessun veicolo trovato',data:[]}); }

    let manutenzioni = new Map();
    if (sheetManutenzioni){
      try{
        const dataManutenzioni = sheetManutenzioni.getDataRange().getValues();
        for (let i=1;i<dataManutenzioni.length;i++){
          const row = dataManutenzioni[i];
          const targa = row[CONFIG.MANUTENZIONI_COLS.TARGA - 1];
          const stato = row[CONFIG.MANUTENZIONI_COLS.STATO - 1];
          if (targa && stato){
            manutenzioni.set(targa, {
              stato,
              dataInizio: row[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO - 1],
              dataFine: row[CONFIG.MANUTENZIONI_COLS.DATA_FINE - 1],
              note: row[CONFIG.MANUTENZIONI_COLS.NOTE - 1]
            });
          }
        }
      }catch(manutError){ console.log('Avviso manutenzioni:', manutError.message); }
    }

    const veicoli = [];
    for (let i=1;i<dataPulmini.length;i++){
      const row = dataPulmini[i];
      const targa = row[CONFIG.PULMINI_COLS.TARGA - 1];
      if (!targa) continue;
      const manutenzione = manutenzioni.get(targa);
      const inManutenzione = manutenzione && (manutenzione.stato === 'In manutenzione' || manutenzione.stato === 'In corso');
      const statoBase = row[CONFIG.PULMINI_COLS.STATO - 1] || 'Disponibile';
      veicoli.push({
        Targa: targa,
        Marca: row[CONFIG.PULMINI_COLS.MARCA - 1] || '',
        Modello: row[CONFIG.PULMINI_COLS.MODELLO - 1] || '',
        Posti: parseInt(row[CONFIG.PULMINI_COLS.POSTI - 1]) || 9,
        Disponibile: !inManutenzione && (statoBase === 'Disponibile' || statoBase === 'Attivo'),
        Note: row[CONFIG.PULMINI_COLS.NOTE - 1] || '',
        PassoLungo: (targa === 'EC787NM') || (row[CONFIG.PULMINI_COLS.NOTE - 1] && String(row[CONFIG.PULMINI_COLS.NOTE - 1]).toLowerCase().includes('passo lungo')),
        StatoManutenzione: inManutenzione ? 'In manutenzione' : 'Operativo',
        DisponibileDate: !inManutenzione && (statoBase === 'Disponibile' || statoBase === 'Attivo')
      });
    }
    return createJsonResponse({success:true,message:`Trovati ${veicoli.length} veicoli`,data:veicoli,count:veicoli.length});
  }catch(error){ return createJsonResponse({success:false,message:'Errore caricamento veicoli: '+error.message},500); }
}

// 📝 PRENOTAZIONI
function getPrenotazioni(){
  try{
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if (!sheet){ return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI non trovato'},500); }
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1){ return createJsonResponse({success:true,message:'Nessuna prenotazione trovata',data:[]}); }
    const prenotazioni = [];
    for (let i=1;i<data.length;i++){
      const row = data[i];
      const targa = row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
      const cfAutista1 = row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1];
      if (!targa && !cfAutista1) continue;
      prenotazioni.push({
        id: i,
        targa: targa || '',
        giornoInizio: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1] || '',
        giornoFine: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1] || '',
        oraInizio: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] || '',
        oraFine: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] || '',
        destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1] || '',
        codiceFiscaleAutista1: cfAutista1 || '',
        nomeAutista1: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] || '',
        cellulare: row[CONFIG.PRENOTAZIONI_COLS.CELLULARE - 1] || '',
        codiceFiscaleAutista2: row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2 - 1] || '',
        nomeAutista2: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2 - 1] || '',
        codiceFiscaleAutista3: row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3 - 1] || '',
        nomeAutista3: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3 - 1] || '',
        stato: row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] || 'In attesa',
        importo: row[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1] || '',
        dataContratto: row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1] || '',
        email: row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1] || '',
        idPrenotazione: row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] || '',
        timestamp: row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1] || ''
      });
    }
    return createJsonResponse({success:true,message:`Trovate ${prenotazioni.length} prenotazioni`,data:prenotazioni,count:prenotazioni.length});
  }catch(error){ return createJsonResponse({success:false,message:'Errore caricamento prenotazioni: '+error.message},500); }
}

// 📅 CHECK DISPONIBILITA
function checkDisponibilita(params){
  try{
    const targa = params.targa; const dataInizio = params.dataInizio; const dataFine = params.dataFine;
    if (!targa || !dataInizio || !dataFine){ return createJsonResponse({success:false,message:'Parametri mancanti: targa, dataInizio, dataFine'},400); }
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    const data = sheet.getDataRange().getValues();
    let disponibile = true; const conflitti = [];
    for (let i=1;i<data.length;i++){
      const row = data[i];
      const targaP = row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
      const stato = row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1];
      if (targaP === targa && stato !== 'Rifiutata' && stato !== 'Completata'){
        const inizioEsistente = new Date(row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1]);
        const fineEsistente = new Date(row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1]);
        const nuovoInizio = new Date(dataInizio); const nuovaFine = new Date(dataFine);
        if (!(nuovaFine < inizioEsistente || nuovoInizio > fineEsistente)){
          disponibile = false; conflitti.push({da: inizioEsistente, a: fineEsistente, stato});
        }
      }
    }
    return createJsonResponse({success:true,disponibile,conflitti});
  }catch(error){ return createJsonResponse({success:false,message:'Errore controllo disponibilità: '+error.message},500); }
}

// 📝 CREA PRENOTAZIONE
function creaPrenotazione(postData){
  try{
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    const newRow = new Array(44).fill('');
    newRow[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1] = new Date();
    newRow[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1] = postData.autista1?.nome || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_1 - 1] = postData.autista1?.dataNascita || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_1 - 1] = postData.autista1?.luogoNascita || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1] = postData.autista1?.codiceFiscale || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_1 - 1] = postData.autista1?.comuneResidenza || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_1 - 1] = postData.autista1?.viaResidenza || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_1 - 1] = postData.autista1?.civicoResidenza || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_1 - 1] = postData.autista1?.numeroPatente || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_1 - 1] = postData.autista1?.dataInizioPatente || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_1 - 1] = postData.autista1?.scadenzaPatente || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.TARGA - 1] = postData.targa || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1] = postData.oraInizio || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1] = postData.oraFine || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1] = new Date(postData.giornoInizio);
    newRow[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1] = new Date(postData.giornoFine);
    newRow[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1] = postData.destinazione || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.CELLULARE - 1] = postData.cellulare || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO - 1] = new Date();
    newRow[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1] = postData.email || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1] = 'In attesa';
    newRow[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1] = postData.importo || 0;
    if (postData.autista2){
      newRow[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2 - 1] = postData.autista2.nome || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2 - 1] = postData.autista2.dataNascita || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_2 - 1] = postData.autista2.luogoNascita || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_2 - 1] = postData.autista2.codiceFiscale || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_2 - 1] = postData.autista2.comuneResidenza || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_2 - 1] = postData.autista2.viaResidenza || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_2 - 1] = postData.autista2.civicoResidenza || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_2 - 1] = postData.autista2.numeroPatente || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_2 - 1] = postData.autista2.dataInizioPatente || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2 - 1] = postData.autista2.scadenzaPatente || '';
    }
    if (postData.autista3){
      newRow[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3 - 1] = postData.autista3.nome || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3 - 1] = postData.autista3.dataNascita || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.LUOGO_NASCITA_AUTISTA_3 - 1] = postData.autista3.luogoNascita || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_3 - 1] = postData.autista3.codiceFiscale || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.COMUNE_RESIDENZA_AUTISTA_3 - 1] = postData.autista3.comuneResidenza || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.VIA_RESIDENZA_AUTISTA_3 - 1] = postData.autista3.viaResidenza || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.CIVICO_RESIDENZA_AUTISTA_3 - 1] = postData.autista3.civicoResidenza || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE_AUTISTA_3 - 1] = postData.autista3.numeroPatente || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.DATA_INIZIO_PATENTE_AUTISTA_3 - 1] = postData.autista3.dataInizioPatente || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3 - 1] = postData.autista3.scadenzaPatente || '';
    }
    const idPrenotazione = 'PRE-' + Date.now();
    newRow[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] = idPrenotazione;
    sheet.appendRow(newRow);
    return createJsonResponse({success:true,message:'Prenotazione creata con successo',idPrenotazione});
  }catch(error){ return createJsonResponse({success:false,message:'Errore creazione prenotazione: '+error.message},500); }
}
