/**
 * SERVIZIO OCR DOCUMENTI AUTISTI - v8.9.6
 * 
 * FIX: Ordine corretto patente italiana (1=COGNOME, 2=NOME)
 * Migliorati pattern estrazione e normalizzazione date
 * 
 * Supporta:
 * - Patente fronte (nome, date, numero, comune nascita)
 * - Carta Identità cartacea/CIE (residenza)
 * - Tessera Sanitaria (CF)
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
    civicoResidenza: '',
    categorie: ''
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
 * Parser specifico PATENTE ITALIANA (formato europeo)
 * FIX v8.9.6: Ordine corretto 1=COGNOME, 2=NOME
 */
function parsePatente(text, result) {
  Logger.log('[PARSE PATENTE] Inizio...');
  
  var lines = text.split('\n').map(function(l) { return l.trim(); });
  
  // ========================================
  // 1. COGNOME (campo 1.)
  // ========================================
  var cognomeFound = false;
  
  // Tentativo 1: Regex su singola riga
  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(/^1[\.\s]+([A-ZÀ-Ù\s]+)$/i);
    if (match && match[1].length > 1) {
      result.cognome = match[1].trim();
      cognomeFound = true;
      Logger.log('[PATENTE] ✅ Cognome (campo 1): ' + result.cognome);
      break;
    }
  }
  
  // Tentativo 2: Cerca riga che inizia con "1." e prendi contenuto
  if (!cognomeFound) {
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].match(/^1[\.\s]/)) {
        var cognome = lines[i].replace(/^1[\.\s]+/, '').replace(/COGNOME|SURNAME/gi, '').trim();
        if (cognome.length > 1 && /^[A-ZÀ-Ù\s]+$/i.test(cognome)) {
          result.cognome = cognome;
          cognomeFound = true;
          Logger.log('[PATENTE] ✅ Cognome (fallback): ' + result.cognome);
          break;
        }
      }
    }
  }
  
  // ========================================
  // 2. NOME (campo 2.)
  // ========================================
  var nomeFound = false;
  
  // Tentativo 1: Regex su singola riga
  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(/^2[\.\s]+([A-ZÀ-Ù\s]+)$/i);
    if (match && match[1].length > 1) {
      result.nome = match[1].trim();
      nomeFound = true;
      Logger.log('[PATENTE] ✅ Nome (campo 2): ' + result.nome);
      break;
    }
  }
  
  // Tentativo 2: Cerca riga che inizia con "2." e prendi contenuto
  if (!nomeFound) {
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].match(/^2[\.\s]/)) {
        var nome = lines[i].replace(/^2[\.\s]+/, '').replace(/NOME|NAME/gi, '').trim();
        if (nome.length > 1 && /^[A-ZÀ-Ù\s]+$/i.test(nome)) {
          result.nome = nome;
          nomeFound = true;
          Logger.log('[PATENTE] ✅ Nome (fallback): ' + result.nome);
          break;
        }
      }
    }
  }
  
  // Nome completo: NOME + COGNOME
  if (result.nome && result.cognome) {
    result.nomeCompleto = result.nome + ' ' + result.cognome;
    Logger.log('[PATENTE] ✅ Nome completo: ' + result.nomeCompleto);
  }
  
  // ========================================
  // 3. DATA E LUOGO NASCITA (campo 3.)
  // ========================================
  var regexData3 = /3[\.\s]+(\d{2}[\/.:\-]?\d{2}[\/.:\-]?\d{2,4})/i;
  var matchData3 = text.match(regexData3);
  if (matchData3) {
    var dataRaw = matchData3[1];
    result.dataNascita = normalizzaData(dataRaw);
    Logger.log('[PATENTE] ✅ Data nascita: ' + result.dataNascita);
  }
  
  // Luogo nascita: dopo la data nel campo 3
  var regexLuogo = /3[\.\s]+\d{2}[\/.:\-]?\d{2}[\/.:\-]?\d{2,4}\s+([A-ZÀ-Ù\s\(\)]+?)(?=\s+4[ab]|\s+\d{2}[\/.:\-]|\n|$)/i;
  var matchLuogo = text.match(regexLuogo);
  if (matchLuogo) {
    result.luogoNascita = matchLuogo[1].trim();
    Logger.log('[PATENTE] ✅ Luogo nascita: ' + result.luogoNascita);
  }
  
  // ========================================
  // 4a. DATA RILASCIO (campo 4a.)
  // ========================================
  var regexRilascio = /4a[\.\s]+(\d{2}[\/.:\-]?\d{2}[\/.:\-]?\d{2,4})/i;
  var matchRilascio = text.match(regexRilascio);
  if (matchRilascio) {
    var dataRaw = matchRilascio[1];
    result.dataInizioPatente = normalizzaData(dataRaw);
    Logger.log('[PATENTE] ✅ Data rilascio: ' + result.dataInizioPatente);
  }
  
  // ========================================
  // 4b. DATA SCADENZA (campo 4b.)
  // ========================================
  var regexScadenza = /4b[\.\s]+(\d{2}[\/.:\-]?\d{2}[\/.:\-]?\d{2,4})/i;
  var matchScadenza = text.match(regexScadenza);
  if (matchScadenza) {
    var dataRaw = matchScadenza[1];
    result.scadenzaPatente = normalizzaData(dataRaw);
    Logger.log('[PATENTE] ✅ Data scadenza: ' + result.scadenzaPatente);
  }
  
  // ========================================
  // 5. NUMERO PATENTE (campo 5.)
  // ========================================
  var regexNumero = /5[\.\s]+([A-Z0-9]{8,15})/i;
  var matchNumero = text.match(regexNumero);
  if (matchNumero) {
    result.numeroPatente = matchNumero[1].trim();
    result.numeroDocumento = result.numeroPatente;
    Logger.log('[PATENTE] ✅ Numero patente: ' + result.numeroPatente);
  }
  
  // ========================================
  // 9. CATEGORIE PATENTE (campo 9.)
  // ========================================
  var regexCategorie = /9[\.\s]+([A-Z\s]+?)(?=\n|$)/i;
  var matchCategorie = text.match(regexCategorie);
  if (matchCategorie) {
    result.categorie = matchCategorie[1].replace(/\s+/g, '').trim();
    Logger.log('[PATENTE] ✅ Categorie: ' + result.categorie);
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
 * Normalizza data da vari formati a YYYY-MM-DD
 * Supporta: DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD.MM.YY
 * FIX: Gestione anni a 2 cifre (66 -> 1966, 25 -> 2025)
 */
function normalizzaData(dataStr) {
  if (!dataStr) return '';
  
  try {
    // Rimuovi spazi
    dataStr = String(dataStr).trim();
    
    // Rimuovi separatori multipli
    dataStr = dataStr.replace(/[\/.:\-]+/g, '/');
    
    // Split su /
    var parts = dataStr.split('/');
    if (parts.length !== 3) return dataStr;
    
    var giorno = parseInt(parts[0], 10);
    var mese = parseInt(parts[1], 10);
    var anno = parseInt(parts[2], 10);
    
    // Fix anno a 2 cifre
    // Regola: 00-50 -> 2000-2050, 51-99 -> 1951-1999
    if (anno < 100) {
      anno = (anno > 50) ? (1900 + anno) : (2000 + anno);
    }
    
    // Valida range
    if (giorno < 1 || giorno > 31 || mese < 1 || mese > 12 || anno < 1900 || anno > 2100) {
      Logger.log('[normalizzaData] Data fuori range: ' + dataStr);
      return dataStr;
    }
    
    // Formatta YYYY-MM-DD
    var result = anno + '-' + String(mese).padStart(2, '0') + '-' + String(giorno).padStart(2, '0');
    Logger.log('[normalizzaData] ' + dataStr + ' -> ' + result);
    return result;
    
  } catch (e) {
    Logger.log('[normalizzaData] Errore: ' + e.message);
    return dataStr;
  }
}

/**
 * Test endpoint OCR
 */
function testOcrService() {
  var apiKey = CONFIG.GOOGLE && CONFIG.GOOGLE.VISION_API_KEY ? CONFIG.GOOGLE.VISION_API_KEY : '';
  
  return createJsonResponse({
    success: true,
    message: 'OCR Service v8.9.6 - Italian Driver License Fixed',
    apiKeyConfigured: apiKey ? true : false,
    supportedDocuments: ['patente', 'carta', 'tessera'],
    endpoint: 'POST /exec?action=ocrDocument',
    fixes: [
      'Correct name/surname order (1=COGNOME, 2=NOME)',
      'Robust date normalization with 2-digit year support',
      'Enhanced field extraction with fallback patterns'
    ]
  });
}
