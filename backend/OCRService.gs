/**
 * SERVIZIO OCR DOCUMENTI AUTISTI - Multi-documento Guidato
 * 
 * Supporta:
 * - Patente fronte (nome, date, numero, comune nascita)
 * - Carta Identità cartacea/CIE (residenza)
 * - Tessera Sanitaria (CF)
 * 
 * Versione: 2.0.0 - Parser universale multi-documento
 */

function ocrDocument(post) {
  Logger.log('[OCR] Richiesta OCR ricevuta');
  
  try {
    if (!post || !post.image) {
      return createJsonResponse({
        success: false,
        message: 'Immagine mancante'
      }, 400);
    }
    
    var imageBase64 = post.image;
    var autistaNum = post.autista || 1;
    var tipoDoc = post.tipoDocumento || 'auto'; // patente, carta, tessera, auto
    
    if (imageBase64.indexOf('base64,') !== -1) {
      imageBase64 = imageBase64.split('base64,')[1];
    }
    
    Logger.log('[OCR] Autista: ' + autistaNum + ' | Tipo: ' + tipoDoc + ' | Size: ~' + Math.round(imageBase64.length / 1024) + 'KB');
    
    var visionApiKey = CONFIG.GOOGLE && CONFIG.GOOGLE.VISION_API_KEY ? CONFIG.GOOGLE.VISION_API_KEY : '';
    
    if (!visionApiKey) {
      Logger.log('[OCR] ERRORE: API Key non configurata');
      return createJsonResponse({
        success: false,
        message: 'Servizio OCR non configurato.'
      }, 500);
    }
    
    var visionUrl = 'https://vision.googleapis.com/v1/images:annotate?key=' + visionApiKey;
    
    var payload = {
      requests: [{
        image: { content: imageBase64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['it', 'en'] }
      }]
    };
    
    Logger.log('[OCR] Chiamata Vision API...');
    
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
        message: 'Errore servizio OCR: ' + responseCode
      }, 500);
    }
    
    var data = JSON.parse(responseText);
    var text = '';
    
    if (data && data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
      text = data.responses[0].fullTextAnnotation.text;
    }
    
    if (!text) {
      Logger.log('[OCR] Nessun testo estratto');
      return createJsonResponse({
        success: false,
        message: 'Impossibile leggere il documento. Riprova con foto più nitida.'
      }, 400);
    }
    
    Logger.log('[OCR] Testo estratto (primi 500 char): ' + text.substring(0, 500));
    
    // Auto-detect tipo documento se non specificato
    if (tipoDoc === 'auto') {
      tipoDoc = detectDocumentType(text);
      Logger.log('[OCR] Tipo documento auto-rilevato: ' + tipoDoc);
    }
    
    // Parsing basato sul tipo documento
    var extracted = parseMultiDocument(text, tipoDoc);
    
    Logger.log('[OCR] Dati estratti: ' + JSON.stringify(extracted));
    
    return createJsonResponse({
      success: true,
      message: 'Documento scansionato con successo',
      data: extracted,
      autista: autistaNum,
      tipoDocumento: tipoDoc,
      debugText: text.substring(0, 500)
    });
    
  } catch (err) {
    Logger.log('[OCR] Errore: ' + err.message);
    return createJsonResponse({
      success: false,
      message: 'Errore durante la scansione: ' + err.message
    }, 500);
  }
}

/**
 * Rileva automaticamente il tipo di documento
 */
function detectDocumentType(text) {
  if (/PATENTE\s+DI\s+GUIDA|DRIVING\s+LICENCE/i.test(text)) {
    return 'patente';
  }
  if (/CARTA\s+D.?\s?IDENTIT|IDENTITY\s+CARD/i.test(text)) {
    return 'carta';
  }
  if (/TESSERA\s+SANITARIA|MINISTERO.*SALUTE/i.test(text)) {
    return 'tessera';
  }
  return 'generico';
}

/**
 * Parser universale multi-documento
 */
function parseMultiDocument(text, tipoDoc) {
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
    scadenzaPatente: '',
    comuneResidenza: '',
    viaResidenza: '',
    civicoResidenza: ''
  };
  
  Logger.log('[PARSE] Tipo documento: ' + tipoDoc);
  
  // SEMPRE estrai CF (presente su tutti i documenti)
  var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
  if (cfMatch) {
    result.codiceFiscale = cfMatch[1].toUpperCase();
    Logger.log('[PARSE] ✅ CF: ' + result.codiceFiscale);
  }
  
  // PARSING SPECIFICO PER TIPO
  if (tipoDoc === 'patente') {
    parsePatente(text, result);
  } else if (tipoDoc === 'carta') {
    parseCartaIdentita(text, result);
  } else if (tipoDoc === 'tessera') {
    parseTesseraSanitaria(text, result);
  } else {
    // Generico: prova tutti i pattern
    parsePatente(text, result);
    parseCartaIdentita(text, result);
  }
  
  return result;
}

/**
 * Parser specifico PATENTE (formato europeo)
 */
function parsePatente(text, result) {
  Logger.log('[PARSE PATENTE] Inizio...');
  
  var lines = text.split('\n');
  
  // Formato europeo: 1. COGNOME, 2. NOME, 3. DATA/LUOGO
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // 1. COGNOME
    if (line.match(/^1[\.\s]/)) {
      var cognome = line.replace(/^1[\.\s]+/, '').replace(/COGNOME|SURNAME/i, '').trim();
      if (cognome) result.cognome = cognome;
    }
    
    // 2. NOME
    if (line.match(/^2[\.\s]/)) {
      var nome = line.replace(/^2[\.\s]+/, '').replace(/NOME|NAME/i, '').trim();
      if (nome) result.nome = nome;
    }
    
    // 3. DATA E LUOGO NASCITA
    if (line.match(/^3[\.\s]/)) {
      var nascita = line.replace(/^3[\.\s]+/, '').trim();
      
      // Data
      var dateMatch = nascita.match(/(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/);
      if (dateMatch) {
        result.dataNascita = dateMatch[3] + '-' + dateMatch[2] + '-' + dateMatch[1];
      }
      
      // Luogo (dopo la data)
      var luogoMatch = nascita.match(/\d{4}\s+([A-Z][A-Z\s]+?)(?=\(|$)/);
      if (luogoMatch) {
        result.luogoNascita = luogoMatch[1].trim();
      }
    }
  }
  
  // Nome completo
  if (result.nome && result.cognome) {
    result.nomeCompleto = result.nome + ' ' + result.cognome;
  }
  
  // Numero patente (9-10 caratteri alfanumerici)
  var numPatenteMatch = text.match(/\b([A-Z0-9]{9,10})\b/);
  if (numPatenteMatch && numPatenteMatch[1] !== result.codiceFiscale) {
    result.numeroPatente = numPatenteMatch[1];
    result.numeroDocumento = numPatenteMatch[1];
  }
  
  // Date validità: 4a. e 4b.
  var rilascio = text.match(/4a[\.\s]+(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (rilascio) {
    result.dataInizioPatente = rilascio[3] + '-' + rilascio[2] + '-' + rilascio[1];
  }
  
  var scadenza = text.match(/4b[\.\s]+(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (scadenza) {
    result.scadenzaPatente = scadenza[3] + '-' + scadenza[2] + '-' + scadenza[1];
  }
  
  Logger.log('[PARSE PATENTE] ✅ Completato');
}

/**
 * Parser specifico CARTA IDENTITÀ
 */
function parseCartaIdentita(text, result) {
  Logger.log('[PARSE CARTA] Inizio...');
  
  // Nome e Cognome (fallback se non già presenti)
  if (!result.nome) {
    var nomeMatch = text.match(/(?:NOME|NAME)[:\s]+([A-Z]+)/i);
    if (nomeMatch) result.nome = nomeMatch[1].trim();
  }
  
  if (!result.cognome) {
    var cognomeMatch = text.match(/(?:COGNOME|SURNAME)[:\s]+([A-Z]+)/i);
    if (cognomeMatch) result.cognome = cognomeMatch[1].trim();
  }
  
  // RESIDENZA - Pattern multipli
  
  // Comune
  var comuneMatch = text.match(/(?:RESIDENZA|COMUNE)[:\s]+([A-Z][A-Z\s]+?)(?=\s+VIA|\s+\d{5}|\n|$)/i);
  if (comuneMatch) {
    result.comuneResidenza = comuneMatch[1].trim();
  }
  
  // Via/Indirizzo
  var viaMatch = text.match(/VIA[:\s]+([A-Z][A-Z\s\.,0-9]+?)(?=\s+\d{1,4}\s|$|\n)/i);
  if (viaMatch) {
    result.viaResidenza = viaMatch[1].trim();
  }
  
  // Civico (cerca numero dopo via o standalone)
  var civicoMatch = text.match(/(?:N[\.\s°]?|CIVICO)[:\s]*(\d{1,4}[A-Z]?)/i);
  if (civicoMatch) {
    result.civicoResidenza = civicoMatch[1];
  }
  
  // Luogo nascita (se non già presente)
  if (!result.luogoNascita) {
    var luogoMatch = text.match(/(?:NATO\s+A|LUOGO\s+NASCITA|PLACE\s+OF\s+BIRTH)[:\s]+([A-Z][A-Z\s\(\)]+?)(?=\s+IL|\s+\d{2}|\n|$)/i);
    if (luogoMatch) {
      result.luogoNascita = luogoMatch[1].trim();
    }
  }
  
  Logger.log('[PARSE CARTA] ✅ Completato');
}

/**
 * Parser specifico TESSERA SANITARIA
 */
function parseTesseraSanitaria(text, result) {
  Logger.log('[PARSE TESSERA] Inizio...');
  
  // CF (già estratto prima, ma verifica)
  if (!result.codiceFiscale) {
    var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
    if (cfMatch) {
      result.codiceFiscale = cfMatch[1].toUpperCase();
    }
  }
  
  // Nome e Cognome (pattern tessera)
  var cognomeNomeMatch = text.match(/([A-Z]+)\s+([A-Z]+)/);
  if (cognomeNomeMatch && !result.cognome && !result.nome) {
    result.cognome = cognomeNomeMatch[1];
    result.nome = cognomeNomeMatch[2];
    result.nomeCompleto = result.nome + ' ' + result.cognome;
  }
  
  Logger.log('[PARSE TESSERA] ✅ Completato');
}

/**
 * Test endpoint OCR
 */
function testOcrService() {
  var apiKey = CONFIG.GOOGLE && CONFIG.GOOGLE.VISION_API_KEY ? CONFIG.GOOGLE.VISION_API_KEY : '';
  
  return createJsonResponse({
    success: true,
    message: 'OCR Service Multi-Documento v2.0',
    apiKeyConfigured: apiKey ? true : false,
    supportedDocuments: ['patente', 'carta', 'tessera'],
    endpoint: 'POST /exec?action=ocrDocument'
  });
}
