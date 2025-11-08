/**
 * SERVIZIO OCR DOCUMENTI AUTISTI
 * 
 * Gestisce riconoscimento automatico documenti (patente, carta identità)
 * usando Google Cloud Vision API
 * Versione: 1.1.0 - Fix parsing nome/cognome duplicati
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
 * Versione 1.1.0 - Fix duplicati nome/cognome
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
  
  // Normalizza testo
  var normalized = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  Logger.log('[PARSE] Testo normalizzato (primi 300 char): ' + normalized.substring(0, 300));
  
  // 1. CODICE FISCALE (16 caratteri alfanumerici)
  var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
  if (cfMatch) {
    result.codiceFiscale = cfMatch[1].toUpperCase();
    Logger.log('[PARSE] CF trovato: ' + result.codiceFiscale);
  }
  
  // 2. DATA DI NASCITA (vari formati italiani)
  var dateMatch = text.match(/\b(\d{1,2})[\/.:\-](\d{1,2})[\/.:\-](\d{4})\b/);
  if (dateMatch) {
    var day = dateMatch[1].padStart(2, '0');
    var month = dateMatch[2].padStart(2, '0');
    var year = dateMatch[3];
    result.dataNascita = year + '-' + month + '-' + day;
    Logger.log('[PARSE] Data nascita: ' + result.dataNascita);
  }
  
  // 3. NOME E COGNOME - Pattern multipli per robustezza
  
  // Tentativo A: Pattern "COGNOME XXXXX NOME YYYYY" (tipico patente italiana)
  var cognomeNomePattern = text.match(/COGNOME[:\s]+([A-Z]+)[^\n]*NOME[:\s]+([A-Z]+)/i);
  if (cognomeNomePattern) {
    result.cognome = cognomeNomePattern[1].trim();
    result.nome = cognomeNomePattern[2].trim();
    Logger.log('[PARSE] Pattern A - Cognome: ' + result.cognome + ' | Nome: ' + result.nome);
  }
  
  // Tentativo B: Cerca separatamente se Pattern A fallisce
  if (!result.nome || !result.cognome) {
    var nomeMatch = text.match(/NOME[:\s]+([A-Z]+)(?=\s|$|\n)/i);
    if (nomeMatch) {
      result.nome = nomeMatch[1].trim();
      Logger.log('[PARSE] Pattern B - Nome: ' + result.nome);
    }
    
    var cognomeMatch = text.match(/COGNOME[:\s]+([A-Z]+)(?=\s|$|\n)/i);
    if (cognomeMatch) {
      result.cognome = cognomeMatch[1].trim();
      Logger.log('[PARSE] Pattern B - Cognome: ' + result.cognome);
    }
  }
  
  // Tentativo C: "1. COGNOME/SURNAME" e "2. NOME/NAME" (patente europea)
  if (!result.cognome) {
    var cognomeEU = text.match(/1\.\s*(?:COGNOME|SURNAME)[:\s]*([A-Z\s]+?)(?=\n|2\.)/i);
    if (cognomeEU) {
      result.cognome = cognomeEU[1].trim();
      Logger.log('[PARSE] Pattern C - Cognome EU: ' + result.cognome);
    }
  }
  
  if (!result.nome) {
    var nomeEU = text.match(/2\.\s*(?:NOME|NAME)[:\s]*([A-Z\s]+?)(?=\n|3\.)/i);
    if (nomeEU) {
      result.nome = nomeEU[1].trim();
      Logger.log('[PARSE] Pattern C - Nome EU: ' + result.nome);
    }
  }
  
  // FIX: Se nome == cognome, probabilmente è un errore OCR
  if (result.nome && result.cognome && result.nome === result.cognome) {
    Logger.log('[PARSE] ATTENZIONE: Nome uguale a Cognome, resetto nome');
    result.nome = '';
  }
  
  // Costruisci nome completo
  if (result.nome && result.cognome) {
    result.nomeCompleto = result.nome + ' ' + result.cognome;
  } else if (result.nome) {
    result.nomeCompleto = result.nome;
  } else if (result.cognome) {
    result.nomeCompleto = result.cognome;
  }
  
  Logger.log('[PARSE] Nome completo finale: ' + result.nomeCompleto);
  
  // 4. LUOGO DI NASCITA
  var luogoPattern1 = text.match(/(?:3\.|NATO\s+A|LUOGO\s+DI\s+NASCITA|PLACE\s+OF\s+BIRTH)[:\s]+([A-Z][A-Z\s\(\)]+?)(?=\s+IL|\s+\d{2}|\n|$)/i);
  if (luogoPattern1) {
    result.luogoNascita = luogoPattern1[1].trim();
    Logger.log('[PARSE] Luogo nascita: ' + result.luogoNascita);
  }
  
  // 5. NUMERO PATENTE (formato: 2 lettere + 7 cifre, es. MI1234567 o U1C1234567)
  var patentePattern = text.match(/\b([A-Z]{1,2}\d{7}[A-Z]?)\b/);
  if (patentePattern) {
    result.numeroPatente = patentePattern[1];
    result.numeroDocumento = patentePattern[1];
    Logger.log('[PARSE] Numero patente: ' + result.numeroPatente);
  }
  
  // 6. NUMERO CARTA IDENTITÀ (se non trovato patente)
  if (!result.numeroDocumento) {
    var ciMatch = text.match(/(?:CARTA\s+IDENTIT[AÀ]\s+N[\°\.]?|NUMERO)[:\s]+([A-Z0-9]{6,10})/i);
    if (ciMatch) {
      result.numeroDocumento = ciMatch[1];
      Logger.log('[PARSE] Numero documento: ' + result.numeroDocumento);
    }
  }
  
  // 7. DATE PATENTE (rilascio e scadenza)
  var rilascioPattern = text.match(/(?:4a\.|VALID\s+FROM|RILASCIATA\s+IL)[:\s]*(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (rilascioPattern) {
    var day = rilascioPattern[1].padStart(2, '0');
    var month = rilascioPattern[2].padStart(2, '0');
    var year = rilascioPattern[3];
    result.dataInizioPatente = year + '-' + month + '-' + day;
    Logger.log('[PARSE] Data rilascio patente: ' + result.dataInizioPatente);
  }
  
  var scadenzaPattern = text.match(/(?:4b\.|VALID\s+UNTIL|SCADENZA)[:\s]*(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (scadenzaPattern) {
    var day = scadenzaPattern[1].padStart(2, '0');
    var month = scadenzaPattern[2].padStart(2, '0');
    var year = scadenzaPattern[3];
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
