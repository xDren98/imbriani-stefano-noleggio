/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.2
 * Mappatura colonne corretta basata sui fogli Google Sheets reali
 */

// 🔧 CONFIGURAZIONE AGGIORNATA CON COLONNE REALI
const CONFIG = {
  VERSION: '8.2.0',
  SPREADSHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  TOKEN: 'imbriani_secret_2025',
  
  SHEETS: {
    PRENOTAZIONI: 'Risposte del modulo 1',
    PULMINI: 'Gestione Pulmini',
    CLIENTI: 'Clienti',
    MANUTENZIONI: 'Gestione manutenzioni'
  },
  
  // 📋 RISPOSTE DEL MODULO 1 (44 colonne)
  PRENOTAZIONI_COLS: {
    TIMESTAMP: 1,                           // A - Informazioni cronologiche
    NOME_AUTISTA_1: 2,                     // B - Nome
    DATA_NASCITA_AUTISTA_1: 3,             // C - Data di nascita
    LUOGO_NASCITA_AUTISTA_1: 4,            // D - Luogo di nascita
    CODICE_FISCALE_AUTISTA_1: 5,           // E - Codice fiscale
    COMUNE_RESIDENZA_AUTISTA_1: 6,         // F - Comune di residenza
    VIA_RESIDENZA_AUTISTA_1: 7,            // G - Via di residenza
    CIVICO_RESIDENZA_AUTISTA_1: 8,         // H - Civico di residenza
    NUMERO_PATENTE_AUTISTA_1: 9,           // I - Numero di patente
    DATA_INIZIO_PATENTE_AUTISTA_1: 10,     // J - Data inizio validità patente
    SCADENZA_PATENTE_AUTISTA_1: 11,        // K - Scadenza patente
    TARGA: 12,                             // L - Targa
    ORA_INIZIO: 13,                        // M - Ora inizio noleggio
    ORA_FINE: 14,                          // N - Ora fine noleggio
    GIORNO_INIZIO: 15,                     // O - Giorno inizio noleggio
    GIORNO_FINE: 16,                       // P - Giorno fine noleggio
    DESTINAZIONE: 17,                      // Q - Destinazione
    CELLULARE: 18,                         // R - Cellulare
    DATA_CONTRATTO: 19,                    // S - Data contratto
    NOME_AUTISTA_2: 20,                    // T - Nome Autista 2
    DATA_NASCITA_AUTISTA_2: 21,            // U - Data di nascita Autista 2
    LUOGO_NASCITA_AUTISTA_2: 22,           // V - Luogo di nascita Autista 2
    CODICE_FISCALE_AUTISTA_2: 23,          // W - Codice fiscale Autista 2
    COMUNE_RESIDENZA_AUTISTA_2: 24,        // X - Comune di residenza Autista 2
    VIA_RESIDENZA_AUTISTA_2: 25,           // Y - Via di residenza Autista 2
    CIVICO_RESIDENZA_AUTISTA_2: 26,        // Z - Civico di residenza Autista 2
    NUMERO_PATENTE_AUTISTA_2: 27,          // AA - Numero di patente Autista 2
    DATA_INIZIO_PATENTE_AUTISTA_2: 28,     // AB - Data inizio validità patente Autista 2
    SCADENZA_PATENTE_AUTISTA_2: 29,        // AC - Scadenza patente Autista 2
    NOME_AUTISTA_3: 30,                    // AD - Nome Autista 3
    DATA_NASCITA_AUTISTA_3: 31,            // AE - Data di nascita Autista 3
    LUOGO_NASCITA_AUTISTA_3: 32,           // AF - Luogo di nascita Autista 3
    CODICE_FISCALE_AUTISTA_3: 33,          // AG - Codice fiscale Autista 3
    COMUNE_RESIDENZA_AUTISTA_3: 34,        // AH - Comune di residenza Autista 3
    VIA_RESIDENZA_AUTISTA_3: 35,           // AI - Via di residenza Autista 3
    CIVICO_RESIDENZA_AUTISTA_3: 36,        // AJ - Civico di residenza Autista 3
    NUMERO_PATENTE_AUTISTA_3: 37,          // AK - Numero di patente Autista 3
    DATA_INIZIO_PATENTE_AUTISTA_3: 38,     // AL - Data inizio validità patente Autista 3
    SCADENZA_PATENTE_AUTISTA_3: 39,        // AM - Scadenza patente Autista 3
    ID_PRENOTAZIONE: 40,                   // AN - ID prenotazione
    STATO_PRENOTAZIONE: 41,                // AO - Stato prenotazione
    IMPORTO_PREVENTIVO: 42,                // AP - Importo preventivo
    EMAIL: 43,                             // AQ - Email  
    TEST: 44                               // AR - test
  },
  
  // 👤 CLIENTI (12 colonne)
  CLIENTI_COLS: {
    NOME: 1,                               // A - Nome
    DATA_NASCITA: 2,                       // B - Data di nascita
    LUOGO_NASCITA: 3,                      // C - Luogo di nascita
    CODICE_FISCALE: 4,                     // D - Codice fiscale
    COMUNE_RESIDENZA: 5,                   // E - Comune di residenza
    VIA_RESIDENZA: 6,                      // F - Via di residenza
    CIVICO_RESIDENZA: 7,                   // G - Civico di residenza
    NUMERO_PATENTE: 8,                     // H - Numero di patente
    DATA_INIZIO_PATENTE: 9,                // I - Data inizio validità patente
    SCADENZA_PATENTE: 10,                  // J - Scadenza patente
    CELLULARE: 11,                         // K - Cellulare
    EMAIL: 12                              // L - Email
  },
  
  // 🚗 GESTIONE PULMINI (6 colonne)
  PULMINI_COLS: {
    TARGA: 1,                              // A - Targa
    MARCA: 2,                              // B - Marca
    MODELLO: 3,                            // C - Modello
    POSTI: 4,                              // D - Posti
    STATO: 5,                              // E - Stato
    NOTE: 6                                // F - Note
  },
  
  // 🔧 GESTIONE MANUTENZIONI (9 colonne)
  MANUTENZIONI_COLS: {
    TARGA: 1,                              // A - Targa
    MARCA: 2,                              // B - Marca
    MODELLO: 3,                            // C - Modello
    POSTI: 4,                              // D - Posti
    STATO: 5,                              // E - Stato
    DATA_INIZIO: 6,                        // F - Data Inizio Manutenzione
    DATA_FINE: 7,                          // G - Data Fine Manutenzione
    COSTO: 8,                              // H - Costo manutenzione
    NOTE: 9                                // I - Note
  }
};

// 🔑 FUNZIONE PRINCIPALE GET
function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || 'health';
  const token = params.token || e.parameter.Authorization?.replace('Bearer ', '');
  
  try {
    if (action === 'health') {
      return createJsonResponse({
        success: true,
        service: 'imbriani-backend',
        version: CONFIG.VERSION,
        timestamp: new Date().toISOString(),
        spreadsheet_id: CONFIG.SPREADSHEET_ID,
        sheets: Object.keys(CONFIG.SHEETS),
        action: 'health_supported',
        columns_mapped: {
          prenotazioni: Object.keys(CONFIG.PRENOTAZIONI_COLS).length,
          clienti: Object.keys(CONFIG.CLIENTI_COLS).length,
          pulmini: Object.keys(CONFIG.PULMINI_COLS).length,
          manutenzioni: Object.keys(CONFIG.MANUTENZIONI_COLS).length
        }
      });
    }
    
    if (!validateToken(token)) {
      return createJsonResponse({
        success: false,
        message: 'Token non valido',
        code: 401
      }, 401);
    }
    
    switch (action) {
      case 'getVeicoli':
        return getVeicoli();
      case 'getPrenotazioni':
        return getPrenotazioni();
      case 'checkDisponibilita':
        return checkDisponibilita(params);
      default:
        return createJsonResponse({
          success: false,
          message: 'Azione non supportata: ' + action,
          available_actions: ['health', 'getVeicoli', 'getPrenotazioni', 'checkDisponibilita', 'login']
        }, 400);
    }
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore server: ' + error.message,
      error: error.toString()
    }, 500);
  }
}

// 🔑 FUNZIONE PRINCIPALE POST
function doPost(e) {
  try {
    const token = e.parameter.token || getAuthHeader(e);
    
    let postData = {};
    try {
      postData = JSON.parse(e.postData.contents || '{}');
    } catch (parseError) {
      return createJsonResponse({
        success: false,
        message: 'Invalid JSON in request body'
      }, 400);
    }
    
    const action = postData.action || 'login';
    
    if (action === 'login') {
      return handleLogin(postData, token);
    }
    
    if (!validateToken(token)) {
      return createJsonResponse({
        success: false,
        message: 'Token non valido',
        code: 401
      }, 401);
    }
    
    switch (action) {
      case 'creaPrenotazione':
        return creaPrenotazione(postData);
      case 'aggiornaStato':
        return aggiornaStatoPrenotazione(postData);
      case 'setManutenzione':
        return setManutenzione(postData);
      default:
        return createJsonResponse({
          success: false,
          message: 'Azione POST non supportata: ' + action
        }, 400);
    }
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore POST: ' + error.message
    }, 500);
  }
}

// 🔐 VALIDAZIONE TOKEN
function validateToken(token) {
  return token === CONFIG.TOKEN;
}

// 📤 HELPER RISPOSTA JSON
function createJsonResponse(data, status = 200) {
  const response = {
    ...data,
    timestamp: new Date().toISOString(),
    version: CONFIG.VERSION
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response, null, 2))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
}

// 🔑 GET AUTH HEADER
function getAuthHeader(e) {
  if (e.parameter.token) return e.parameter.token;
  if (e.parameter.Authorization) return e.parameter.Authorization.replace('Bearer ', '');
  return null;
}

// 🚗 GET VEICOLI DISPONIBILI
function getVeicoli() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PULMINI);
    const data = sheet.getDataRange().getValues();
    
    const veicoli = [];
    for (let i = 1; i < data.length; i++) { // Skip header
      const row = data[i];
      const stato = row[CONFIG.PULMINI_COLS.STATO - 1];
      if (stato && (stato.toLowerCase().includes('disponibile') || stato.toLowerCase() === 'attivo')) {
        veicoli.push({
          targa: row[CONFIG.PULMINI_COLS.TARGA - 1],
          marca: row[CONFIG.PULMINI_COLS.MARCA - 1],
          modello: row[CONFIG.PULMINI_COLS.MODELLO - 1],
          posti: row[CONFIG.PULMINI_COLS.POSTI - 1] || 9,
          stato: stato,
          note: row[CONFIG.PULMINI_COLS.NOTE - 1] || ''
        });
      }
    }
    
    return createJsonResponse({
      success: true,
      data: veicoli,
      count: veicoli.length
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore caricamento veicoli: ' + error.message
    }, 500);
  }
}

// 🔐 HANDLE LOGIN
function handleLogin(postData, token) {
  try {
    const codiceFiscale = postData.codiceFiscale;
    
    if (!codiceFiscale || codiceFiscale.length !== 16) {
      return createJsonResponse({
        success: false,
        message: 'Codice fiscale non valido (deve essere 16 caratteri)'
      }, 400);
    }
    
    const clientiSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI);
    const data = clientiSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1] === codiceFiscale) {
        return createJsonResponse({
          success: true,
          message: 'Login effettuato',
          user: {
            nome: row[CONFIG.CLIENTI_COLS.NOME - 1],
            codiceFiscale: row[CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1],
            dataNascita: row[CONFIG.CLIENTI_COLS.DATA_NASCITA - 1],
            luogoNascita: row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA - 1],
            comuneResidenza: row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA - 1],
            viaResidenza: row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA - 1],
            civicoResidenza: row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA - 1],
            numeroPatente: row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE - 1],
            scadenzaPatente: row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE - 1],
            cellulare: row[CONFIG.CLIENTI_COLS.CELLULARE - 1],
            email: row[CONFIG.CLIENTI_COLS.EMAIL - 1]
          }
        });
      }
    }
    
    return createJsonResponse({
      success: false,
      message: 'Codice fiscale non trovato. Registrazione richiesta.',
      requiresRegistration: true
    }, 404);
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore login: ' + error.message
    }, 500);
  }
}

// 📝 GET PRENOTAZIONI
function getPrenotazioni() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    const data = sheet.getDataRange().getValues();
    
    const prenotazioni = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      prenotazioni.push({
        timestamp: row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP - 1],
        nomeAutista1: row[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_1 - 1],
        codiceFiscaleAutista1: row[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1 - 1],
        targa: row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1],
        giornoInizio: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1],
        giornoFine: row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1],
        oraInizio: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO - 1],
        oraFine: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE - 1],
        destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE - 1],
        stato: row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1],
        importo: row[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO - 1],
        email: row[CONFIG.PRENOTAZIONI_COLS.EMAIL - 1]
      });
    }
    
    return createJsonResponse({
      success: true,
      data: prenotazioni,
      count: prenotazioni.length
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore caricamento prenotazioni: ' + error.message
    }, 500);
  }
}

// 📅 CHECK DISPONIBILITA
function checkDisponibilita(params) {
  try {
    const targa = params.targa;
    const dataInizio = params.dataInizio;
    const dataFine = params.dataFine;
    
    if (!targa || !dataInizio || !dataFine) {
      return createJsonResponse({
        success: false,
        message: 'Parametri mancanti: targa, dataInizio, dataFine'
      }, 400);
    }
    
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    const data = sheet.getDataRange().getValues();
    
    let disponibile = true;
    const conflitti = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const targaPrenotazione = row[CONFIG.PRENOTAZIONI_COLS.TARGA - 1];
      const statoPrenotazione = row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE - 1];
      
      if (targaPrenotazione === targa && statoPrenotazione !== 'Rifiutata' && statoPrenotazione !== 'Completata') {
        const inizioEsistente = new Date(row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO - 1]);
        const fineEsistente = new Date(row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE - 1]);
        const nuovoInizio = new Date(dataInizio);
        const nuovaFine = new Date(dataFine);
        
        if (!(nuovaFine < inizioEsistente || nuovoInizio > fineEsistente)) {
          disponibile = false;
          conflitti.push({
            da: inizioEsistente,
            a: fineEsistente,
            stato: statoPrenotazione
          });
        }
      }
    }
    
    return createJsonResponse({
      success: true,
      disponibile: disponibile,
      conflitti: conflitti
    });
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore controllo disponibilità: ' + error.message
    }, 500);
  }
}

// 📝 CREA PRENOTAZIONE
function creaPrenotazione(postData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    
    // Costruisci riga con tutte le 44 colonne
    const newRow = new Array(44).fill('');
    
    // Popola le colonne principali
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
    
    // Autista 2 (se presente)
    if (postData.autista2) {
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
    
    // Autista 3 (se presente)
    if (postData.autista3) {
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
    
    // Genera ID prenotazione unico
    const idPrenotazione = 'PRE-' + Date.now();
    newRow[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] = idPrenotazione;
    
    sheet.appendRow(newRow);
    
    return createJsonResponse({
      success: true,
      message: 'Prenotazione creata con successo',
      idPrenotazione: idPrenotazione
    });
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore creazione prenotazione: ' + error.message
    }, 500);
  }
}

// 📝 AGGIORNA STATO PRENOTAZIONE
function aggiornaStatoPrenotazione(postData) {
  try {
    const idPrenotazione = postData.idPrenotazione;
    const nuovoStato = postData.stato;
    
    if (!idPrenotazione || !nuovoStato) {
      return createJsonResponse({
        success: false,
        message: 'Parametri mancanti: idPrenotazione, stato'
      }, 400);
    }
    
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE - 1] === idPrenotazione) {
        sheet.getRange(i + 1, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE).setValue(nuovoStato);
        
        return createJsonResponse({
          success: true,
          message: 'Stato prenotazione aggiornato',
          idPrenotazione: idPrenotazione,
          nuovoStato: nuovoStato
        });
      }
    }
    
    return createJsonResponse({
      success: false,
      message: 'Prenotazione non trovata'
    }, 404);
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore aggiornamento stato: ' + error.message
    }, 500);
  }
}

// 🔧 SET MANUTENZIONE
function setManutenzione(postData) {
  try {
    const targa = postData.targa;
    const dataInizio = postData.dataInizio;
    const dataFine = postData.dataFine;
    const costo = postData.costo || 0;
    const note = postData.note || '';
    
    if (!targa || !dataInizio || !dataFine) {
      return createJsonResponse({
        success: false,
        message: 'Parametri mancanti: targa, dataInizio, dataFine'
      }, 400);
    }
    
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    
    // Trova info veicolo dal foglio Pulmini
    const pulminiSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PULMINI);
    const pulminiData = pulminiSheet.getDataRange().getValues();
    
    let veicoloInfo = {};
    for (let i = 1; i < pulminiData.length; i++) {
      if (pulminiData[i][CONFIG.PULMINI_COLS.TARGA - 1] === targa) {
        veicoloInfo = {
          targa: targa,
          marca: pulminiData[i][CONFIG.PULMINI_COLS.MARCA - 1],
          modello: pulminiData[i][CONFIG.PULMINI_COLS.MODELLO - 1],
          posti: pulminiData[i][CONFIG.PULMINI_COLS.POSTI - 1]
        };
        break;
      }
    }
    
    const newRow = [
      veicoloInfo.targa || targa,
      veicoloInfo.marca || '',
      veicoloInfo.modello || '',
      veicoloInfo.posti || 9,
      'In manutenzione',
      new Date(dataInizio),
      new Date(dataFine),
      costo,
      note
    ];
    
    sheet.appendRow(newRow);
    
    return createJsonResponse({
      success: true,
      message: 'Manutenzione programmata',
      targa: targa
    });
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      message: 'Errore programmazione manutenzione: ' + error.message
    }, 500);
  }
}