/**
 * SERVIZIO OCR DOCUMENTI AUTISTI
 * 
 * Gestisce riconoscimento automatico documenti (patente, carta identità)
 * usando Google Cloud Vision API
 * Versione: 1.0.0
 */

/**
 * Endpoint principale per OCR documento autista
 * Riceve immagine base64, chiama Google Vision API, estrae dati strutturati
 * 
 * @param {Object} post - Payload POST con { image: "base64...", autista: 1-3 }
 * @return {ContentService} Risposta JSON con dati estratti
 */
function ocrDocument(post) {
  Logger.log('[OCR] Richiesta OCR ricevuta');
  
  try {
    // Validazione input
    if (!post || !post.image) {
      return createJsonResponse({
        success: false,
        message: 'Immagine mancante'
      }, 400);
    }
    
    var imageBase64 = post.image;
    var autistaNum = post.autista || 1;
    
    // Rimuovi prefisso data:image se presente
    if (imageBase64.indexOf('base64,') !== -1) {
      imageBase64 = imageBase64.split('base64,')[1];
    }
    
    Logger.log('[OCR] Autista: ' + autistaNum + ' | Dimensione immagine: ~' + Math.round(imageBase64.length / 1024) + 'KB');
    
    // Chiama Google Cloud Vision API
    var visionApiKey = CONFIG.GOOGLE && CONFIG.GOOGLE.VISION_API_KEY 
      ? CONFIG.GOOGLE.VISION_API_KEY 
      : '';
    
    if (!visionApiKey) {
      Logger.log('[OCR] ERRORE: API Key Google Vision non configurata');
      return createJsonResponse({
        success: false,
        message: 'Servizio OCR non configurato. Contatta l\'amministratore.'
      }, 500);
    }
    
    var visionUrl = 'https://vision.googleapis.com/v1/images:annotate?key=' + visionApiKey;
    
    var payload = {
      requests: [{
        image: { content: imageBase64 },
        features: [{ 
          type: 'DOCUMENT_TEXT_DETECTION', 
          maxResults: 1 
        }],
        imageContext: { 
          languageHints: ['it', 'en'] 
        }
      }]
    };
    
    Logger.log('[OCR] Chiamata Google Vision API...');
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(visionUrl, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    Logger.log('[OCR] Response code: ' + responseCode);
    
    if (responseCode !== 200) {
      Logger.log('[OCR] Errore Vision API: ' + responseText);
      return createJsonResponse({
        success: false,
        message: 'Errore servizio OCR: ' + responseCode,
        debug: responseText.substring(0, 200)
      }, 500);
    }
    
    var data = JSON.parse(responseText);
    var text = '';
    
    if (data && data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
      text = data.responses[0].fullTextAnnotation.text;
    }
    
    if (!text) {
      Logger.log('[OCR] Nessun testo estratto dall\'immagine');
      return createJsonResponse({
        success: false,
        message: 'Impossibile leggere il documento. Riprova con una foto più nitida.'
      }, 400);
    }
    
    Logger.log('[OCR] Testo estratto (primi 200 caratteri): ' + text.substring(0, 200));
    
    // Parsing dati documento italiano
    var extracted = parseItalianDocument(text);
    
    Logger.log('[OCR] Dati estratti: ' + JSON.stringify(extracted));
    
    return createJsonResponse({
      success: true,
      message: 'Documento scansionato con successo',
      data: extracted,
      autista: autistaNum,
      debugText: text.substring(0, 500) // Prime 500 char per debug
    });
    
  } catch (err) {
    Logger.log('[OCR] Errore: ' + err.message + ' | Stack: ' + err.stack);
    return createJsonResponse({
      success: false,
      message: 'Errore durante la scansione: ' + err.message
    }, 500);
  }
}

/**
 * Parsing intelligente di documenti italiani (patente, carta identità)
 * Estrae: nome, cognome, CF, data nascita, numero documento
 * 
 * @param {string} text - Testo OCR completo
 * @return {Object} Dati estratti strutturati
 */
function parseItalianDocument(text) {
  var result = {
    nomeCompleto: '',
    nome: '',
    cognome: '',
    codiceFiscale: '',
    dataNascita: '',
    luogoNascita: '',
    numeroPatente: '',
    numeroDocumento: '',
    dataInizioPatente: '',
    scadenzaPatente: ''
  };
  
  // Normalizza testo (rimuovi a capo multipli, spazi extra)
  var normalized = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // 1. CODICE FISCALE (16 caratteri alfanumerici)
  var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
  if (cfMatch) {
    result.codiceFiscale = cfMatch[1].toUpperCase();
    Logger.log('[PARSE] CF trovato: ' + result.codiceFiscale);
  }
  
  // 2. DATA DI NASCITA (vari formati italiani)
  // Formato: DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
  var dateMatch = text.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})\b/);
  if (dateMatch) {
    var day = dateMatch[1].padStart(2, '0');
    var month = dateMatch[2].padStart(2, '0');
    var year = dateMatch[3];
    result.dataNascita = year + '-' + month + '-' + day; // Formato ISO per input date
    Logger.log('[PARSE] Data nascita: ' + result.dataNascita);
  }
  
  // 3. NOME (cerca pattern comuni)
  // Pattern: "NOME:" o "NOME" seguito da testo
  var nomeMatch = text.match(/NOME[:\s]+([A-Z][A-Z\s]+?)(?=\s+COGNOME|\s+[A-Z]{2,}\s|\n|$)/i);
  if (nomeMatch) {
    result.nome = nomeMatch[1].trim();
    Logger.log('[PARSE] Nome trovato: ' + result.nome);
  }
  
  // 4. COGNOME
  var cognomeMatch = text.match(/COGNOME[:\s]+([A-Z][A-Z\s]+?)(?=\s+NOME|\s+NATO|\s+[A-Z]{2,}\s|\n|$)/i);
  if (cognomeMatch) {
    result.cognome = cognomeMatch[1].trim();
    Logger.log('[PARSE] Cognome trovato: ' + result.cognome);
  }
  
  // 5. NOME COMPLETO (se non trovati separati, cerca pattern "Cognome Nome")
  if (!result.nome && !result.cognome) {
    // Cerca dopo "COGNOME E NOME" o pattern simili
    var nomeCompletoMatch = text.match(/(?:COGNOME E NOME|SURNAME AND NAME)[:\s]+([A-Z][A-Z\s]+)/i);
    if (nomeCompletoMatch) {
      var parts = nomeCompletoMatch[1].trim().split(/\s+/);
      if (parts.length >= 2) {
        result.cognome = parts[0];
        result.nome = parts.slice(1).join(' ');
      }
    }
  }
  
  // Costruisci nome completo
  if (result.nome && result.cognome) {
    result.nomeCompleto = result.nome + ' ' + result.cognome;
  } else if (result.nome) {
    result.nomeCompleto = result.nome;
  } else if (result.cognome) {
    result.nomeCompleto = result.cognome;
  }
  
  // 6. LUOGO DI NASCITA
  var luogoMatch = text.match(/(?:NATO A|LUOGO DI NASCITA|PLACE OF BIRTH)[:\s]+([A-Z][A-Z\s]+?)(?=\s+IL|\s+\d{2}|$)/i);
  if (luogoMatch) {
    result.luogoNascita = luogoMatch[1].trim();
    Logger.log('[PARSE] Luogo nascita: ' + result.luogoNascita);
  }
  
  // 7. NUMERO PATENTE (formato: 2 lettere + 7 cifre, es. MI1234567)
  var patenteMatch = text.match(/\b([A-Z]{2}\d{7})\b/);
  if (patenteMatch) {
    result.numeroPatente = patenteMatch[1];
    result.numeroDocumento = patenteMatch[1];
    Logger.log('[PARSE] Numero patente: ' + result.numeroPatente);
  }
  
  // 8. NUMERO CARTA IDENTITÀ (formato variabile, cerca dopo "N." o "NUMERO")
  if (!result.numeroDocumento) {
    var ciMatch = text.match(/(?:CARTA\s+IDENTIT[AÀ]\s+N[°\.]?|NUMERO)[:\s]+([A-Z0-9]{6,10})/i);
    if (ciMatch) {
      result.numeroDocumento = ciMatch[1];
      Logger.log('[PARSE] Numero documento: ' + result.numeroDocumento);
    }
  }
  
  // 9. DATE PATENTE (rilascio e scadenza)
  // Cerca pattern "4a. VALID FROM" o "RILASCIATA IL"
  var rilascioMatch = text.match(/(?:VALID FROM|RILASCIATA IL|4a\.)[:\s]+(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/i);
  if (rilascioMatch) {
    var day = rilascioMatch[1].padStart(2, '0');
    var month = rilascioMatch[2].padStart(2, '0');
    var year = rilascioMatch[3];
    result.dataInizioPatente = year + '-' + month + '-' + day;
    Logger.log('[PARSE] Data rilascio patente: ' + result.dataInizioPatente);
  }
  
  // Cerca pattern "4b. VALID UNTIL" o "SCADENZA"
  var scadenzaMatch = text.match(/(?:VALID UNTIL|SCADENZA|4b\.)[:\s]+(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/i);
  if (scadenzaMatch) {
    var day = scadenzaMatch[1].padStart(2, '0');
    var month = scadenzaMatch[2].padStart(2, '0');
    var year = scadenzaMatch[3];
    result.scadenzaPatente = year + '-' + month + '-' + day;
    Logger.log('[PARSE] Scadenza patente: ' + result.scadenzaPatente);
  }
  
  return result;
}

/**
 * Test endpoint OCR (per sviluppo)
 * GET ?action=testOcr&token=xxx
 */
function testOcrService() {
  Logger.log('[TEST OCR] Verifica configurazione');
  
  var apiKey = CONFIG.GOOGLE && CONFIG.GOOGLE.VISION_API_KEY 
    ? CONFIG.GOOGLE.VISION_API_KEY 
    : '';
  
  return createJsonResponse({
    success: true,
    message: 'OCR Service configurato',
    apiKeyConfigured: apiKey ? true : false,
    apiKeyLength: apiKey ? apiKey.length : 0,
    endpoint: 'POST /exec con action=ocrDocument'
  });
}
