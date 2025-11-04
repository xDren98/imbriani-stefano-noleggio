/**
 * Patch v8.3.3 - aggiunge action 'aggiornaCliente' per aggiornare dati nel foglio CLIENTI
 * Campi supportati: nome, luogoNascita, comuneResidenza, viaResidenza, civicoResidenza,
 * numeroPatente, inizioValiditaPatente, scadenzaPatente, cellulare, email
 */

// --- AGGIUNTA FUNZIONE ---
function aggiornaCliente(postData){
  try{
    const cf = (postData.codiceFiscale || '').trim();
    if (!cf || cf.length !== 16){
      return createJsonResponse({success:false,message:'Codice fiscale mancante o non valido'},400);
    }
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CLIENTI);
    const values = sheet.getDataRange().getValues();

    let rowIndex = -1; // 0-based su array, 1-based su sheet
    for (let i=1;i<values.length;i++){
      if (String(values[i][CONFIG.CLIENTI_COLS.CODICE_FISCALE - 1]).trim() === cf){
        rowIndex = i; break;
      }
    }
    if (rowIndex === -1){
      return createJsonResponse({success:false,message:'Cliente non trovato'},404);
    }

    // Prepara aggiornamenti solo per i campi presenti in postData
    function setIfProvided(colKey, value){
      if (value !== undefined && value !== null){
        sheet.getRange(rowIndex+1, CONFIG.CLIENTI_COLS[colKey], 1, 1).setValue(value);
      }
    }

    setIfProvided('NOME', postData.nome);
    setIfProvided('LUOGO_NASCITA', postData.luogoNascita);
    setIfProvided('COMUNE_RESIDENZA', postData.comuneResidenza);
    setIfProvided('VIA_RESIDENZA', postData.viaResidenza);
    setIfProvided('CIVICO_RESIDENZA', postData.civicoResidenza);
    setIfProvided('NUMERO_PATENTE', postData.numeroPatente);
    setIfProvided('DATA_INIZIO_PATENTE', postData.inizioValiditaPatente);
    setIfProvided('SCADENZA_PATENTE', postData.scadenzaPatente);
    setIfProvided('CELLULARE', postData.cellulare);
    setIfProvided('EMAIL', postData.email);

    return createJsonResponse({success:true,message:'Profilo aggiornato', codiceFiscale: cf});
  }catch(error){
    return createJsonResponse({success:false,message:'Errore aggiornamento cliente: '+error.message},500);
  }
}
