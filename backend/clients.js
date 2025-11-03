/**
 * BACKEND CLIENTS v8.0 - autocompletaCliente for CF autocomplete
 * Searches client data and returns structured response for form autocomplete
 */

/**
 * autocompletaCliente
 * Cerca cliente per CF e restituisce dati per autocompilazione form
 */
function autocompletaCliente(p) {
  try {
    const cf = (p.cf || '').toUpperCase().trim();
    if (!cf || cf.length !== 16) {
      return respond(false, {}, 'CF non valido', 400);
    }
    
    console.log(`[AUTOCOMPLETE] Ricerca CF: ${cf}`);
    
    // Cerca nel foglio Clienti
    const sheetClienti = ss().getSheetByName('Clienti'); // Adatta il nome se diverso
    if (!sheetClienti) {
      return respond(false, {}, 'Foglio Clienti non trovato', 500);
    }
    
    const data = sheetClienti.getDataRange().getValues();
    const headers = data[0];
    
    // Trova riga per CF
    let clienteRow = null;
    for (let i = 1; i < data.length; i++) {
      const cfIndex = headers.indexOf('CF');
      if (cfIndex >= 0 && data[i][cfIndex] === cf) {
        clienteRow = data[i];
        break;
      }
    }
    
    if (!clienteRow) {
      console.log(`[AUTOCOMPLETE] CF ${cf} non trovato`);
      return respond(false, {}, 'Cliente non trovato', 404);
    }
    
    // Mappa i dati secondo gli header
    const clienteData = {};
    headers.forEach((header, index) => {
      clienteData[header] = clienteRow[index] || '';
    });
    
    // Struttura risposta per frontend
    const response = {
      CF: clienteData.CF || '',
      Nome: clienteData.Nome || '',
      DataNascita: clienteData.DataNascita || '',
      LuogoNascita: clienteData.LuogoNascita || '',
      ComuneResidenza: clienteData.ComuneResidenza || '',
      ViaResidenza: clienteData.ViaResidenza || '',
      CivicoResidenza: clienteData.CivicoResidenza || '',
      NumeroPatente: clienteData.NumeroPatente || '',
      DataInizioPatente: clienteData.DataInizioPatente || '',
      ScadenzaPatente: clienteData.ScadenzaPatente || '',
      Cellulare: clienteData.Cellulare || '',
      Email: clienteData.Email || ''
    };
    
    console.log(`[AUTOCOMPLETE] Cliente ${cf} trovato: ${response.Nome}`);
    
    return respond(true, response, `Cliente ${response.Nome} trovato`);
    
  } catch (e) {
    console.error('[AUTOCOMPLETE] Errore:', e);
    return respond(false, {}, 'Errore ricerca cliente: ' + e.message, 500);
  }
}

/**
 * Cerca cliente anche nel foglio "Risposte del modulo 1" come fallback
 * Se non trovato in Clienti, controlla nelle prenotazioni precedenti
 */
function autocompletaClienteWithFallback(p) {
  // Prova prima dal foglio Clienti
  const result = autocompletaCliente(p);
  if (result.success) return result;
  
  // Fallback: cerca nelle prenotazioni precedenti
  const cf = (p.cf || '').toUpperCase().trim();
  if (!cf || cf.length !== 16) {
    return respond(false, {}, 'CF non valido', 400);
  }
  
  try {
    const sheetPren = ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if (!sheetPren) return result; // Ritorna il risultato originale
    
    const data = sheetPren.getDataRange().getValues();
    const H = CONFIG.PREN_COLS;
    
    // Cerca CF in qualsiasi autista delle prenotazioni
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      
      // Controlla CF autista 1, 2, 3
      if (r[H.CF] === cf) {
        return respond(true, {
          CF: r[H.CF],
          Nome: r[H.NAME],
          DataNascita: r[H.DATA_NASCITA],
          LuogoNascita: r[H.LUOGO_NASCITA],
          ComuneResidenza: r[H.COMUNE],
          ViaResidenza: r[H.VIA],
          CivicoResidenza: r[H.CIVICO],
          NumeroPatente: r[H.NUMERO_PATENTE],
          DataInizioPatente: r[H.INIZIO_PATENTE],
          ScadenzaPatente: r[H.SCADENZA_PATENTE],
          Cellulare: r[H.CELLULARE],
          Email: r[H.EMAIL]
        }, `Cliente trovato nelle prenotazioni precedenti`);
      }
      
      if (r[H.CF2] === cf) {
        return respond(true, {
          CF: r[H.CF2],
          Nome: r[H.NOME2],
          DataNascita: r[H.DATA_NASCITA2],
          LuogoNascita: r[H.LUOGO_NASCITA2],
          ComuneResidenza: r[H.COMUNE2],
          ViaResidenza: r[H.VIA2],
          CivicoResidenza: r[H.CIVICO2],
          NumeroPatente: r[H.NUMERO_PATENTE2],
          DataInizioPatente: r[H.INIZIO_PATENTE2],
          ScadenzaPatente: r[H.SCADENZA_PATENTE2],
          Cellulare: '', // Non presente separato per autista 2/3
          Email: '' // Email comune nella colonna principale
        }, `Autista 2 trovato nelle prenotazioni precedenti`);
      }
      
      if (r[H.CF3] === cf) {
        return respond(true, {
          CF: r[H.CF3],
          Nome: r[H.NOME3],
          DataNascita: r[H.DATA_NASCITA3],
          LuogoNascita: r[H.LUOGO_NASCITA3],
          ComuneResidenza: r[H.COMUNE3],
          ViaResidenza: r[H.VIA3],
          CivicoResidenza: r[H.CIVICO3],
          NumeroPatente: r[H.NUMERO_PATENTE3],
          DataInizioPatente: r[H.INIZIO_PATENTE3],
          ScadenzaPatente: r[H.SCADENZA_PATENTE3],
          Cellulare: '',
          Email: ''
        }, `Autista 3 trovato nelle prenotazioni precedenti`);
      }
    }
    
    return result; // Cliente non trovato
    
  } catch (e) {
    console.error('[AUTOCOMPLETE-FALLBACK] Errore:', e);
    return result; // Ritorna il risultato originale in caso di errore
  }
}