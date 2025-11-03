/**
 * BACKEND BOOKINGS v8.0 - creaPrenotazione with BOOK-YYYY-### ID generation
 * Handles driver data parsing (drv1_/drv2_/drv3_) and client upserts
 */

/**
 * creaPrenotazione
 * Genera ID BOOK-YYYY-###, processa drv1_/drv2_/drv3_, upsert Clienti
 */
function creaPrenotazione(p) {
  try {
    // 1. Validazione base
    if (!p.targa || !p.dataInizio || !p.dataFine) {
      return respond(false, {}, 'Targa, dataInizio e dataFine obbligatori', 400);
    }
    
    // 2. Validazione primo autista
    if (!p.drv1_CF || p.drv1_CF.length !== 16) {
      return respond(false, {}, 'CF primo autista non valido', 400);
    }
    if (!p.drv1_Nome || !p.drv1_NumeroPatente) {
      return respond(false, {}, 'Nome e patente primo autista obbligatori', 400);
    }
    
    // 3. Genera ID prenotazione BOOK-YYYY-###
    const bookingId = generaIdPrenotazione();
    
    // 4. Prepara dati per inserimento
    const now = new Date();
    const rowData = [
      p.drv1_Nome || '',                    // Nome (0)
      p.drv1_DataNascita || '',             // Data di nascita (1)
      p.drv1_LuogoNascita || '',            // Luogo di nascita (2)
      p.drv1_CF || '',                      // Codice fiscale (3)
      p.drv1_ComuneResidenza || '',         // Comune di residenza (4)
      p.drv1_ViaResidenza || '',            // Via di residenza (5)
      p.drv1_CivicoResidenza || '',         // Civico di residenza (6)
      p.drv1_NumeroPatente || '',           // Numero di patente (7)
      p.drv1_DataInizioPatente || '',       // Data inizio validità patente (8)
      p.drv1_ScadenzaPatente || '',         // Scadenza patente (9)
      p.targa || '',                        // Targa (10)
      p.oraInizio || '08:00',               // Ora inizio noleggio (11)
      p.oraFine || '20:00',                 // Ora fine noleggio (12)
      p.dataInizio || '',                   // Giorno inizio noleggio (13)
      p.dataFine || '',                     // Giorno fine noleggio (14)
      p.destinazione || '',                 // Destinazione (15)
      p.drv1_Cellulare || '',               // Cellulare (16)
      Utilities.formatDate(now, 'GMT+1', 'yyyy-MM-dd'), // Data contratto (17)
      // Autista 2
      p.drv2_Nome || '',                    // Nome Autista 2 (18)
      p.drv2_DataNascita || '',             // Data di nascita Autista 2 (19)
      p.drv2_LuogoNascita || '',            // Luogo di nascita Autista 2 (20)
      p.drv2_CF || '',                      // Codice fiscale Autista 2 (21)
      p.drv2_ComuneResidenza || '',         // Comune di residenza Autista 2 (22)
      p.drv2_ViaResidenza || '',            // Via di residenza Autista 2 (23)
      p.drv2_CivicoResidenza || '',         // Civico di residenza Autista 2 (24)
      p.drv2_NumeroPatente || '',           // Numero di patente Autista 2 (25)
      p.drv2_DataInizioPatente || '',       // Data inizio validità patente Autista 2 (26)
      p.drv2_ScadenzaPatente || '',         // Scadenza patente Autista 2 (27)
      // Autista 3
      p.drv3_Nome || '',                    // Nome Autista 3 (28)
      p.drv3_DataNascita || '',             // Data di nascita Autista 3 (29)
      p.drv3_LuogoNascita || '',            // Luogo di nascita Autista 3 (30)
      p.drv3_CF || '',                      // Codice fiscale Autista 3 (31)
      p.drv3_ComuneResidenza || '',         // Comune di residenza Autista 3 (32)
      p.drv3_ViaResidenza || '',            // Via di residenza Autista 3 (33)
      p.drv3_CivicoResidenza || '',         // Civico di residenza Autista 3 (34)
      p.drv3_NumeroPatente || '',           // Numero di patente Autista 3 (35)
      p.drv3_DataInizioPatente || '',       // Data inizio validità patente Autista 3 (36)
      p.drv3_ScadenzaPatente || '',         // Scadenza patente Autista 3 (37)
      // Prenotazione
      bookingId,                            // ID prenotazione (38)
      'Da Confermare',                      // Stato prenotazione (39)
      '',                                   // Importo preventivo (40)
      p.drv1_Email || '',                   // Email (41)
      ''                                    // test (42)
    ];
    
    // 5. Inserisci nel foglio prenotazioni
    const sheetPren = ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if (!sheetPren) {
      return respond(false, {}, 'Foglio prenotazioni non trovato', 500);
    }
    
    sheetPren.appendRow(rowData);
    
    // 6. Upsert clienti per tutti gli autisti
    const clienti = [1, 2, 3].map(n => ({
      CF: p[`drv${n}_CF`],
      Nome: p[`drv${n}_Nome`],
      DataNascita: p[`drv${n}_DataNascita`],
      LuogoNascita: p[`drv${n}_LuogoNascita`],
      ComuneResidenza: p[`drv${n}_ComuneResidenza`],
      ViaResidenza: p[`drv${n}_ViaResidenza`],
      CivicoResidenza: p[`drv${n}_CivicoResidenza`],
      NumeroPatente: p[`drv${n}_NumeroPatente`],
      DataInizioPatente: p[`drv${n}_DataInizioPatente`],
      ScadenzaPatente: p[`drv${n}_ScadenzaPatente`],
      Cellulare: p[`drv${n}_Cellulare`],
      Email: p[`drv${n}_Email`]
    })).filter(c => c.CF && c.CF.length === 16);
    
    clienti.forEach(cliente => upsertCliente(cliente));
    
    console.log(`[BOOKING] Creata prenotazione ${bookingId} per ${clienti.length} clienti`);
    
    return respond(true, {
      id: bookingId,
      targa: p.targa,
      clienti: clienti.length,
      dataInizio: p.dataInizio,
      dataFine: p.dataFine
    }, `Prenotazione ${bookingId} creata con successo`);
    
  } catch (e) {
    console.error('[BOOKING] Errore:', e);
    return respond(false, {}, 'Errore creazione prenotazione: ' + e.message, 500);
  }
}

/**
 * Genera ID progressivo BOOK-YYYY-###
 */
function generaIdPrenotazione() {
  const anno = new Date().getFullYear();
  const sheet = ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
  if (!sheet) return `BOOK-${anno}-001`;
  
  // Trova l'ultimo numero per l'anno corrente
  const data = sheet.getDataRange().getValues();
  const H = CONFIG.PREN_COLS;
  
  let maxNum = 0;
  const prefisso = `BOOK-${anno}-`;
  
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][H.ID_PREN] || '');
    if (id.startsWith(prefisso)) {
      const num = parseInt(id.replace(prefisso, '')) || 0;
      if (num > maxNum) maxNum = num;
    }
  }
  
  return `${prefisso}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Upsert cliente nel foglio Clienti
 */
function upsertCliente(cliente) {
  if (!cliente.CF) return;
  
  const sheetClienti = ss().getSheetByName('Clienti'); // Adatta il nome se diverso
  if (!sheetClienti) {
    console.warn('[UPSERT] Foglio Clienti non trovato');
    return;
  }
  
  const data = sheetClienti.getDataRange().getValues();
  const headers = data[0];
  
  // Cerca riga esistente per CF
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('CF')] === cliente.CF) {
      targetRow = i + 1; // 1-based per sheets
      break;
    }
  }
  
  // Prepara dati riga
  const rowData = [];
  headers.forEach(header => {
    const value = cliente[header] || '';
    rowData.push(value);
  });
  
  if (targetRow > 0) {
    // Aggiorna riga esistente
    sheetClienti.getRange(targetRow, 1, 1, headers.length).setValues([rowData]);
    console.log(`[UPSERT] Cliente ${cliente.CF} aggiornato`);
  } else {
    // Inserisci nuova riga
    sheetClienti.appendRow(rowData);
    console.log(`[UPSERT] Cliente ${cliente.CF} creato`);
  }
}