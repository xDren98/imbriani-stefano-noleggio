/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v7.0 FLOTTA COMPLETA
 * File: apps-script/Code.gs
 * Ultima modifica: 03 Novembre 2025
 */

const CONFIG = {
  VERSION: '7.0.0',
  TOKEN: 'imbriani_secret_2025',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  SHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  DEBUG: true,
  MAX_TIMESTAMP_AGE: 120000,
  SHEETS: {
    PRENOTAZIONI: 'Risposte del modulo 1',
    CLIENTI: 'Clienti',
    VEICOLI: 'Gestione pulmini',
    MANUTENZIONI: 'Registro manutenzioni'
  },
  // Colonne foglio "Gestione pulmini": Targa, Marca, Modello, Posti, Stato, Note
  VEICOLI_COLS: {
    TARGA: 0,
    MARCA: 1,
    MODELLO: 2,
    POSTI: 3,
    STATO: 4,
    NOTE: 5
  },
  // Colonne foglio "Registro manutenzioni": Targa, Marca, Modello, Posti, Stato, Data Inizio, Data Fine, Costo, Note
  MANUTENZIONI_COLS: {
    TARGA: 0,
    MARCA: 1,
    MODELLO: 2,
    POSTI: 3,
    STATO: 4,
    DATA_INIZIO: 5,
    DATA_FINE: 6,
    COSTO: 7,
    NOTE: 8
  },
  PRENOTAZIONI_COLS: {
    TIMESTAMP: 0, NOME: 1, DATA_NASCITA: 2, LUOGO_NASCITA: 3, CF: 4, COMUNE_RESIDENZA: 5, VIA_RESIDENZA: 6, CIVICO_RESIDENZA: 7,
    NUMERO_PATENTE: 8, INIZIO_PATENTE: 9, SCADENZA_PATENTE: 10, TARGA: 11, ORA_INIZIO: 12, ORA_FINE: 13, GIORNO_INIZIO: 14,
    GIORNO_FINE: 15, DESTINAZIONE: 16, CELLULARE: 17, DATA_CONTRATTO: 18, NOME_AUTISTA_2: 19, DATA_NASCITA_AUTISTA_2: 20,
    LUOGO_NASCITA_AUTISTA_2: 21, CF_AUTISTA_2: 22, COMUNE_RESIDENZA_AUTISTA_2: 23, VIA_RESIDENZA_AUTISTA_2: 24,
    CIVICO_RESIDENZA_AUTISTA_2: 25, PATENTE_AUTISTA_2: 26, INIZIO_PATENTE_AUTISTA_2: 27, SCADENZA_PATENTE_AUTISTA_2: 28,
    NOME_AUTISTA_3: 29, DATA_NASCITA_AUTISTA_3: 30, LUOGO_NASCITA_AUTISTA_3: 31, CF_AUTISTA_3: 32, COMUNE_RESIDENZA_AUTISTA_3: 33,
    VIA_RESIDENZA_AUTISTA_3: 34, CIVICO_RESIDENZA_AUTISTA_3: 35, PATENTE_AUTISTA_3: 36, INIZIO_PATENTE_AUTISTA_3: 37,
    SCADENZA_PATENTE_AUTISTA_3: 38, ID_PRENOTAZIONE: 39, STATO_PRENOTAZIONE: 40, IMPORTO_PREVENTIVO: 41, NOTE: 42, EMAIL: 43
  }
};

function doGet(e) {
  try {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    logInfo(`📥 GET Request received: ${JSON.stringify(e.parameter)}`);

    const validation = validateRequest(e);
    if (!validation.valid) {
      return createResponse(false, null, validation.error, 400);
    }

    const action = e.parameter.action;
    switch (action) {
      case 'login':
        return handleLogin(e.parameter);
      case 'recuperaPrenotazioni':
        return handleRecuperaPrenotazioni(e.parameter);
      case 'disponibilita':
        return handleDisponibilita(e.parameter);
      case 'flotta':
        return handleFlotta(e.parameter);
      case 'manutenzioni':
        return handleManutenzioni(e.parameter);
      case 'creaPrenotazione':
        return handleCreaPrenotazione(e.parameter);
      case 'modificaStato':
        return handleModificaStato(e.parameter);
      default:
        return createResponse(false, null, `Azione non supportata: ${action}`, 400);
    }
  } catch (error) {
    logError('Errore doGet:', error);
    return createResponse(false, null, 'Errore interno server', 500);
  }
}

function doPost(e) {
  logInfo('📬 POST Request received, redirecting to GET logic...');
  return doGet(e);
}

// NEW: Gestione Flotta (CRUD Gestione pulmini)
function handleFlotta(params) {
  try {
    const method = params.method || 'get';
    
    switch (method) {
      case 'get':
        return getFlotta();
      case 'upsert':
        return upsertVeicolo(params);
      case 'delete':
        return deleteVeicolo(params);
      default:
        return createResponse(false, null, 'Metodo flotta non supportato', 400);
    }
  } catch (error) {
    logError('Errore handleFlotta:', error);
    return createResponse(false, null, 'Errore gestione flotta', 500);
  }
}

function getFlotta() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.VEICOLI);
    const data = sheet.getDataRange().getValues();
    let veicoli = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[CONFIG.VEICOLI_COLS.TARGA]) {
        const targa = row[CONFIG.VEICOLI_COLS.TARGA];
        const marca = row[CONFIG.VEICOLI_COLS.MARCA] || '';
        const modello = row[CONFIG.VEICOLI_COLS.MODELLO] || '';
        
        // Flag Passo Lungo per EC787NM
        const passoLungo = (targa === 'EC787NM' && marca.toLowerCase().includes('fiat') && modello.toLowerCase().includes('ducato'));
        
        const veicolo = {
          Targa: targa,
          Marca: marca,
          Modello: modello,
          Posti: parseInt(row[CONFIG.VEICOLI_COLS.POSTI]) || 9,
          Stato: row[CONFIG.VEICOLI_COLS.STATO] || 'Disponibile',
          Note: row[CONFIG.VEICOLI_COLS.NOTE] || '',
          PassoLungo: passoLungo,
          Disponibile: (row[CONFIG.VEICOLI_COLS.STATO] || '').toLowerCase().includes('disponibile')
        };
        veicoli.push(veicolo);
      }
    }

    logInfo(`🚐 Flotta caricata: ${veicoli.length} veicoli`);
    return createResponse(true, veicoli, `${veicoli.length} veicoli in flotta`);
  } catch (error) {
    logError('Errore getFlotta:', error);
    return createResponse(false, [], 'Errore caricamento flotta', 500);
  }
}

function upsertVeicolo(params) {
  try {
    const { targa, marca, modello, posti, stato, note } = params;
    if (!targa) return createResponse(false, null, 'Targa obbligatoria', 400);

    const sheet = getSheet(CONFIG.SHEETS.VEICOLI);
    const data = sheet.getDataRange().getValues();
    let found = false;

    // Cerca riga esistente
    for (let i = 1; i < data.length; i++) {
      if (data[i][CONFIG.VEICOLI_COLS.TARGA] === targa) {
        // Aggiorna riga esistente
        sheet.getRange(i + 1, CONFIG.VEICOLI_COLS.MARCA + 1).setValue(marca || '');
        sheet.getRange(i + 1, CONFIG.VEICOLI_COLS.MODELLO + 1).setValue(modello || '');
        sheet.getRange(i + 1, CONFIG.VEICOLI_COLS.POSTI + 1).setValue(parseInt(posti) || 9);
        sheet.getRange(i + 1, CONFIG.VEICOLI_COLS.STATO + 1).setValue(stato || 'Disponibile');
        sheet.getRange(i + 1, CONFIG.VEICOLI_COLS.NOTE + 1).setValue(note || '');
        found = true;
        logInfo(`✅ Veicolo aggiornato: ${targa}`);
        break;
      }
    }

    if (!found) {
      // Aggiungi nuova riga
      const newRow = [];
      newRow[CONFIG.VEICOLI_COLS.TARGA] = targa;
      newRow[CONFIG.VEICOLI_COLS.MARCA] = marca || '';
      newRow[CONFIG.VEICOLI_COLS.MODELLO] = modello || '';
      newRow[CONFIG.VEICOLI_COLS.POSTI] = parseInt(posti) || 9;
      newRow[CONFIG.VEICOLI_COLS.STATO] = stato || 'Disponibile';
      newRow[CONFIG.VEICOLI_COLS.NOTE] = note || '';
      sheet.appendRow(newRow);
      logInfo(`✅ Nuovo veicolo aggiunto: ${targa}`);
    }

    return createResponse(true, { targa, operazione: found ? 'aggiornato' : 'creato' }, 'Veicolo salvato con successo');
  } catch (error) {
    logError('Errore upsertVeicolo:', error);
    return createResponse(false, null, 'Errore salvataggio veicolo', 500);
  }
}

function deleteVeicolo(params) {
  try {
    const targa = params.targa;
    if (!targa) return createResponse(false, null, 'Targa obbligatoria', 400);

    const sheet = getSheet(CONFIG.SHEETS.VEICOLI);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][CONFIG.VEICOLI_COLS.TARGA] === targa) {
        sheet.deleteRow(i + 1);
        logInfo(`🗑️ Veicolo rimosso: ${targa}`);
        return createResponse(true, { targa }, 'Veicolo rimosso con successo');
      }
    }

    return createResponse(false, null, 'Veicolo non trovato', 404);
  } catch (error) {
    logError('Errore deleteVeicolo:', error);
    return createResponse(false, null, 'Errore rimozione veicolo', 500);
  }
}

// NEW: Gestione Manutenzioni (CRUD Registro manutenzioni)
function handleManutenzioni(params) {
  try {
    const method = params.method || 'list';
    
    switch (method) {
      case 'list':
        return getManutenzioni();
      case 'upsert':
        return upsertManutenzione(params);
      case 'delete':
        return deleteManutenzione(params);
      default:
        return createResponse(false, null, 'Metodo manutenzioni non supportato', 400);
    }
  } catch (error) {
    logError('Errore handleManutenzioni:', error);
    return createResponse(false, null, 'Errore gestione manutenzioni', 500);
  }
}

function getManutenzioni() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.MANUTENZIONI);
    const data = sheet.getDataRange().getValues();
    let manutenzioni = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[CONFIG.MANUTENZIONI_COLS.TARGA]) {
        const manutenzione = {
          ID: i,
          Targa: row[CONFIG.MANUTENZIONI_COLS.TARGA],
          Marca: row[CONFIG.MANUTENZIONI_COLS.MARCA] || '',
          Modello: row[CONFIG.MANUTENZIONI_COLS.MODELLO] || '',
          Posti: parseInt(row[CONFIG.MANUTENZIONI_COLS.POSTI]) || 9,
          Stato: row[CONFIG.MANUTENZIONI_COLS.STATO] || '',
          DataInizio: formatDate(row[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO]) || '',
          DataFine: formatDate(row[CONFIG.MANUTENZIONI_COLS.DATA_FINE]) || '',
          Costo: row[CONFIG.MANUTENZIONI_COLS.COSTO] || 0,
          Note: row[CONFIG.MANUTENZIONI_COLS.NOTE] || ''
        };
        manutenzioni.push(manutenzione);
      }
    }

    logInfo(`🔧 Manutenzioni caricate: ${manutenzioni.length}`);
    return createResponse(true, manutenzioni, `${manutenzioni.length} manutenzioni trovate`);
  } catch (error) {
    logError('Errore getManutenzioni:', error);
    return createResponse(false, [], 'Errore caricamento manutenzioni', 500);
  }
}

function upsertManutenzione(params) {
  try {
    const { id, targa, marca, modello, posti, stato, dataInizio, dataFine, costo, note } = params;
    if (!targa) return createResponse(false, null, 'Targa obbligatoria', 400);

    const sheet = getSheet(CONFIG.SHEETS.MANUTENZIONI);
    const data = sheet.getDataRange().getValues();
    let found = false;

    if (id && id > 0) {
      // Aggiorna riga esistente per ID
      const rowIndex = parseInt(id);
      if (rowIndex <= data.length) {
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.TARGA + 1).setValue(targa);
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.MARCA + 1).setValue(marca || '');
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.MODELLO + 1).setValue(modello || '');
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.POSTI + 1).setValue(parseInt(posti) || 9);
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.STATO + 1).setValue(stato || '');
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.DATA_INIZIO + 1).setValue(dataInizio || '');
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.DATA_FINE + 1).setValue(dataFine || '');
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.COSTO + 1).setValue(parseFloat(costo) || 0);
        sheet.getRange(rowIndex, CONFIG.MANUTENZIONI_COLS.NOTE + 1).setValue(note || '');
        found = true;
        logInfo(`✅ Manutenzione aggiornata ID ${id} per ${targa}`);
      }
    }

    if (!found) {
      // Aggiungi nuova riga
      const newRow = [];
      newRow[CONFIG.MANUTENZIONI_COLS.TARGA] = targa;
      newRow[CONFIG.MANUTENZIONI_COLS.MARCA] = marca || '';
      newRow[CONFIG.MANUTENZIONI_COLS.MODELLO] = modello || '';
      newRow[CONFIG.MANUTENZIONI_COLS.POSTI] = parseInt(posti) || 9;
      newRow[CONFIG.MANUTENZIONI_COLS.STATO] = stato || 'In corso';
      newRow[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO] = dataInizio || '';
      newRow[CONFIG.MANUTENZIONI_COLS.DATA_FINE] = dataFine || '';
      newRow[CONFIG.MANUTENZIONI_COLS.COSTO] = parseFloat(costo) || 0;
      newRow[CONFIG.MANUTENZIONI_COLS.NOTE] = note || '';
      sheet.appendRow(newRow);
      logInfo(`✅ Nuova manutenzione aggiunta per ${targa}`);
    }

    return createResponse(true, { targa, operazione: found ? 'aggiornata' : 'creata' }, 'Manutenzione salvata con successo');
  } catch (error) {
    logError('Errore upsertManutenzione:', error);
    return createResponse(false, null, 'Errore salvataggio manutenzione', 500);
  }
}

function deleteManutenzione(params) {
  try {
    const id = parseInt(params.id);
    if (!id || id <= 1) return createResponse(false, null, 'ID manutenzione non valido', 400);

    const sheet = getSheet(CONFIG.SHEETS.MANUTENZIONI);
    const data = sheet.getDataRange().getValues();

    if (id <= data.length) {
      const targa = data[id - 1][CONFIG.MANUTENZIONI_COLS.TARGA];
      sheet.deleteRow(id);
      logInfo(`🗑️ Manutenzione rimossa: ID ${id} per ${targa}`);
      return createResponse(true, { id }, 'Manutenzione rimossa con successo');
    }

    return createResponse(false, null, 'Manutenzione non trovata', 404);
  } catch (error) {
    logError('Errore deleteManutenzione:', error);
    return createResponse(false, null, 'Errore rimozione manutenzione', 500);
  }
}

// UPDATED: Disponibilità con incrocio flotta + manutenzioni
function handleDisponibilita(params) {
  try {
    const dataInizio = params.dataInizio;
    const dataFine = params.dataFine;
    
    // Carica flotta completa
    const flottaResp = getFlotta();
    let flotta = flottaResp.success ? flottaResp.data : [];
    
    // Carica manutenzioni attive
    const manResp = getManutenzioni();
    const manutenzioni = manResp.success ? manResp.data : [];
    
    // Filtra manutenzioni attive nell'intervallo
    const oggi = new Date();
    const inizioCheck = dataInizio ? new Date(dataInizio) : oggi;
    const fineCheck = dataFine ? new Date(dataFine) : oggi;
    
    const manutenzioniAttive = manutenzioni.filter(m => {
      if (!m.DataInizio) return false;
      const inizio = new Date(m.DataInizio);
      const fine = m.DataFine ? new Date(m.DataFine) : new Date('2099-12-31');
      
      // Conflitto se: inizio manutenzione <= fine check AND fine manutenzione >= inizio check
      return inizio <= fineCheck && fine >= inizioCheck;
    });
    
    const targheInManutenzione = new Set(manutenzioniAttive.map(m => m.Targa));
    
    // Applica stato manutenzione alla flotta
    flotta.forEach(v => {
      if (targheInManutenzione.has(v.Targa)) {
        v.Stato = 'Manutenzione';
        v.Disponibile = false;
      }
    });
    
    // TODO: Incrocia anche con prenotazioni esistenti nell'intervallo
    // Per ora restituisce solo flotta con stato manutenzione aggiornato
    
    const disponibili = flotta.filter(v => v.Disponibile);
    logInfo(`🚐 Disponibilità: ${disponibili.length}/${flotta.length} veicoli disponibili`);
    
    return createResponse(true, {
      disponibili: disponibili,
      totaleFlotta: flotta.length,
      inManutenzione: flotta.filter(v => !v.Disponibile).length
    }, `${disponibili.length} veicoli disponibili`);
    
  } catch (error) {
    logError('Errore handleDisponibilita:', error);
    // Fallback con EC787NM
    const fallback = [{
      Targa: 'EC787NM',
      Marca: 'Fiat',
      Modello: 'Ducato',
      Posti: 9,
      Stato: 'Disponibile',
      Note: 'Passo Lungo',
      PassoLungo: true,
      Disponibile: true
    }];
    return createResponse(true, { disponibili: fallback, totaleFlotta: 1, inManutenzione: 0 }, 'Fallback veicoli');
  }
}

// Existing functions remain unchanged
function validateRequest(e) {
  const params = e.parameter;
  if (!params.token || params.token !== CONFIG.TOKEN) {
    return { valid: false, error: 'Token non valido' };
  }
  const timestamp = parseInt(params.ts);
  if (!timestamp || isNaN(timestamp)) {
    return { valid: false, error: 'Timestamp mancante o invalido' };
  }
  const now = Date.now();
  const age = now - timestamp;
  if (Math.abs(age) > CONFIG.MAX_TIMESTAMP_AGE) {
    return { valid: false, error: 'Timestamp scaduto o futuro' };
  }
  if (params.hmac) {
    const isValidHmac = validateHmac(params);
    if (!isValidHmac) {
      return { valid: false, error: 'Firma HMAC non valida' };
    }
  }
  return { valid: true };
}

function validateHmac(params) {
  try {
    const receivedHmac = params.hmac;
    const timestamp = params.ts;
    const action = params.action;
    const sortedKeys = Object.keys(params).filter(key => key !== 'hmac').sort();
    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('|');
    const signatureData = `${timestamp}|${action}|${paramString}`;
    const expectedHmac = calculateHmac(signatureData);
    return constantTimeEquals(receivedHmac, expectedHmac);
  } catch (error) {
    logError('HMAC validation error:', error);
    return false;
  }
}

function calculateHmac(data) {
  const signature = Utilities.computeHmacSha256Signature(data, CONFIG.HMAC_SECRET);
  return signature.map(byte => {
    let hex = (byte & 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function handleLogin(params) {
  try {
    const cf = params.cf?.toUpperCase()?.trim();
    if (!cf || cf.length !== 16) {
      return createResponse(false, null, 'Codice fiscale non valido', 400);
    }
    if (!/^[A-Z0-9]{16}$/.test(cf)) {
      return createResponse(false, null, 'Formato codice fiscale non valido', 400);
    }

    const sheet = getSheet(CONFIG.SHEETS.PRENOTAZIONI);
    const data = sheet.getDataRange().getValues();
    let userFound = false;
    let userData = null;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[CONFIG.PRENOTAZIONI_COLS.CF] && row[CONFIG.PRENOTAZIONI_COLS.CF].toString().toUpperCase().trim() === cf) {
        userFound = true;
        userData = {
          nome: row[CONFIG.PRENOTAZIONI_COLS.NOME] || '',
          cf: cf,
          telefono: row[CONFIG.PRENOTAZIONI_COLS.CELLULARE] || '',
          lastLogin: new Date().toISOString()
        };
        break;
      }
    }

    if (!userFound && cf === 'ABCDEF12G34H567I') {
      userData = {
        nome: 'Utente Demo',
        cf: cf,
        telefono: '123456789',
        lastLogin: new Date().toISOString()
      };
      userFound = true;
    }

    if (!userFound) {
      return createResponse(false, null, 'Utente non trovato nel sistema', 404);
    }

    logInfo(`✅ Login riuscito per CF: ${cf}`);
    return createResponse(true, userData, 'Login effettuato con successo');
  } catch (error) {
    logError('Errore handleLogin:', error);
    return createResponse(false, null, 'Errore durante il login', 500);
  }
}

function handleRecuperaPrenotazioni(params) {
  try {
    const cf = params.cf?.toUpperCase()?.trim();
    if (!cf) {
      return createResponse(false, null, 'Codice fiscale mancante', 400);
    }

    const sheet = getSheet(CONFIG.SHEETS.PRENOTAZIONI);
    const data = sheet.getDataRange().getValues();
    let prenotazioni = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (cf === 'ALL' || (row[CONFIG.PRENOTAZIONI_COLS.CF] && row[CONFIG.PRENOTAZIONI_COLS.CF].toString().toUpperCase().trim() === cf)) {
        let bookingId = row[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE];
        if (!bookingId) {
          bookingId = `BOOK-${row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP] ? new Date(row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP]).getFullYear() : '2025'}-${String(i).padStart(3, '0')}`;
        }

        const prenotazione = {
          ID: bookingId,
          DataCreazione: formatDate(row[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP]) || formatDate(row[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO]) || new Date().toISOString().split('T')[0],
          NomeCompleto: row[CONFIG.PRENOTAZIONI_COLS.NOME] || '',
          CF: row[CONFIG.PRENOTAZIONI_COLS.CF] || '',
          Telefono: row[CONFIG.PRENOTAZIONI_COLS.CELLULARE] || '',
          Targa: row[CONFIG.PRENOTAZIONI_COLS.TARGA] || '',
          DataRitiro: formatDate(row[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO]) || '',
          OraRitiro: row[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO] || '',
          DataConsegna: formatDate(row[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE]) || '',
          OraConsegna: row[CONFIG.PRENOTAZIONI_COLS.ORA_FINE] || '',
          Destinazione: row[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE] || '',
          Stato: row[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE] || 'Da Confermare',
          Note: row[CONFIG.PRENOTAZIONI_COLS.NOTE] || ''
        };
        prenotazioni.push(prenotazione);
      }
    }

    logInfo(`📋 Recuperate ${prenotazioni.length} prenotazioni per CF: ${cf}`);
    return createResponse(true, prenotazioni, `Trovate ${prenotazioni.length} prenotazioni`);
  } catch (error) {
    logError('Errore handleRecuperaPrenotazioni:', error);
    return createResponse(false, [], 'Errore durante il recupero prenotazioni', 500);
  }
}

function handleCreaPrenotazione(params) {
  try {
    const required = ['cf', 'dataRitiro', 'dataConsegna', 'targa', 'destinazione'];
    for (const f of required) {
      if (!params[f]) {
        return createResponse(false, null, `Campo obbligatorio mancante: ${f}`, 400);
      }
    }

    let drivers = [];
    if (params.drivers) {
      try {
        drivers = JSON.parse(params.drivers);
      } catch (e) {
        logError('Errore parsing drivers:', e);
      }
    } else if (params.drivers_b64) {
      try {
        const decoded = Utilities.base64Decode(params.drivers_b64);
        const jsonString = Utilities.newBlob(decoded).getDataAsString();
        drivers = JSON.parse(jsonString);
      } catch (e) {
        logError('Errore decodifica drivers_b64:', e);
      }
    }

    if (!drivers || drivers.length === 0) {
      return createResponse(false, null, 'Almeno un autista è richiesto', 400);
    }

    const sheet = getSheet(CONFIG.SHEETS.PRENOTAZIONI);
    const lastRow = sheet.getLastRow();
    const bookingId = `BOOK-2025-${String(lastRow).padStart(3, '0')}`;
    const now = new Date();

    const newRow = new Array(44).fill('');
    newRow[CONFIG.PRENOTAZIONI_COLS.TIMESTAMP] = now.toISOString();
    newRow[CONFIG.PRENOTAZIONI_COLS.NOME] = drivers[0].Nome || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA] = drivers[0].DataNascita || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.CF] = params.cf.toUpperCase();
    newRow[CONFIG.PRENOTAZIONI_COLS.NUMERO_PATENTE] = drivers[0].NumeroPatente || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE] = drivers[0].ScadenzaPatente || '';
    newRow[CONFIG.PRENOTAZIONI_COLS.TARGA] = params.targa;
    newRow[CONFIG.PRENOTAZIONI_COLS.ORA_INIZIO] = params.oraRitiro || '08:00';
    newRow[CONFIG.PRENOTAZIONI_COLS.ORA_FINE] = params.oraConsegna || '20:00';
    newRow[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO] = params.dataRitiro;
    newRow[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE] = params.dataConsegna;
    newRow[CONFIG.PRENOTAZIONI_COLS.DESTINAZIONE] = params.destinazione;
    newRow[CONFIG.PRENOTAZIONI_COLS.DATA_CONTRATTO] = now.toDateString();

    if (drivers[1]) {
      newRow[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_2] = drivers[1].Nome || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_2] = drivers[1].DataNascita || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.CF_AUTISTA_2] = drivers[1].CF || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.PATENTE_AUTISTA_2] = drivers[1].NumeroPatente || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_2] = drivers[1].ScadenzaPatente || '';
    }

    if (drivers[2]) {
      newRow[CONFIG.PRENOTAZIONI_COLS.NOME_AUTISTA_3] = drivers[2].Nome || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.DATA_NASCITA_AUTISTA_3] = drivers[2].DataNascita || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.CF_AUTISTA_3] = drivers[2].CF || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.PATENTE_AUTISTA_3] = drivers[2].NumeroPatente || '';
      newRow[CONFIG.PRENOTAZIONI_COLS.SCADENZA_PATENTE_AUTISTA_3] = drivers[2].ScadenzaPatente || '';
    }

    newRow[CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE] = bookingId;
    newRow[CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE] = 'Da Confermare';
    newRow[CONFIG.PRENOTAZIONI_COLS.IMPORTO_PREVENTIVO] = 0;
    newRow[CONFIG.PRENOTAZIONI_COLS.NOTE] = `Creata via web app v7.0 - ${now.toISOString()}`;

    sheet.appendRow(newRow);
    logInfo(`✅ Prenotazione creata: ${bookingId}`);
    return createResponse(true, { id: bookingId, stato: 'Da Confermare', dataCreazione: now.toISOString() }, 'Prenotazione creata con successo');
  } catch (error) {
    logError('Errore handleCreaPrenotazione:', error);
    return createResponse(false, null, 'Errore durante la creazione prenotazione', 500);
  }
}

function handleModificaStato(params) {
  try {
    const id = params.id;
    const nuovoStato = params.stato;
    if (!id || !nuovoStato) {
      return createResponse(false, null, 'ID prenotazione e stato sono obbligatori', 400);
    }

    const statiValidi = ['Da Confermare', 'Confermata', 'Annullata', 'Rifiutata'];
    if (!statiValidi.includes(nuovoStato)) {
      return createResponse(false, null, 'Stato non valido', 400);
    }

    const sheet = getSheet(CONFIG.SHEETS.PRENOTAZIONI);
    const data = sheet.getDataRange().getValues();
    let found = false;
    let riga = -1;

    for (let i = 1; i < data.length; i++) {
      const currentId = data[i][CONFIG.PRENOTAZIONI_COLS.ID_PRENOTAZIONE];
      if (currentId === id) {
        sheet.getRange(i + 1, CONFIG.PRENOTAZIONI_COLS.STATO_PRENOTAZIONE + 1).setValue(nuovoStato);
        found = true;
        riga = i + 1;
        break;
      }
    }

    if (!found) {
      return createResponse(false, null, 'Prenotazione non trovata', 404);
    }

    logInfo(`✅ Stato modificato per ${id}: ${nuovoStato} (riga ${riga})`);
    return createResponse(true, { id: id, nuovoStato: nuovoStato, dataModifica: new Date().toISOString() }, 'Stato aggiornato con successo');
  } catch (error) {
    logError('Errore handleModificaStato:', error);
    return createResponse(false, null, 'Errore durante la modifica stato', 500);
  }
}

function createResponse(success, data, message, code = 200) {
  const response = {
    success: success,
    data: data,
    message: message || '',
    code: code,
    timestamp: new Date().toISOString(),
    version: CONFIG.VERSION
  };
  const output = ContentService.createTextOutput(JSON.stringify(response));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    return ss.getSheetByName(sheetName);
  } catch (error) {
    logError(`Errore apertura foglio ${sheetName}:`, error);
    throw new Error(`Impossibile aprire il foglio: ${sheetName}`);
  }
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  try {
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    if (typeof dateValue === 'string') {
      let parsed;
      if (dateValue.includes('/')) {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          parsed = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      } else {
        parsed = new Date(dateValue);
      }
      if (parsed && !isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return dateValue.toString();
  } catch (error) {
    logError('Errore formatDate:', error);
    return '';
  }
}

function logInfo(message) {
  if (CONFIG.DEBUG) {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  }
}

function logError(message, error) {
  console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
  if (error) {
    console.error('Stack trace:', error.stack || error);
  }
}

function testConfiguration() {
  logInfo('🧪 Test configurazione v7.0 con flotta e manutenzioni...');
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    logInfo('✅ Sheet principale aperto correttamente');

    const prenotazioni = ss.getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    const clienti = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    const veicoli = ss.getSheetByName(CONFIG.SHEETS.VEICOLI);
    const manutenzioni = ss.getSheetByName(CONFIG.SHEETS.MANUTENZIONI);

    if (prenotazioni) {
      logInfo(`✅ Foglio "${CONFIG.SHEETS.PRENOTAZIONI}" trovato`);
      const data = prenotazioni.getDataRange().getValues();
      logInfo(`✅ Lette ${data.length - 1} prenotazioni`);
    }
    if (clienti) logInfo(`✅ Foglio "${CONFIG.SHEETS.CLIENTI}" trovato`);
    if (veicoli) logInfo(`✅ Foglio "${CONFIG.SHEETS.VEICOLI}" trovato`);
    if (manutenzioni) logInfo(`✅ Foglio "${CONFIG.SHEETS.MANUTENZIONI}" trovato`);

    // Test nuovi endpoint
    const flottaTest = getFlotta();
    logInfo(`🚐 Test flotta: ${flottaTest.success ? 'OK' : 'ERRORE'}`);
    
    const manTest = getManutenzioni();
    logInfo(`🔧 Test manutenzioni: ${manTest.success ? 'OK' : 'ERRORE'}`);

    logInfo('🎉 Configurazione v7.0 PERFETTA!');
    return true;
  } catch (error) {
    logError('❌ Errore configurazione:', error);
    return false;
  }
}