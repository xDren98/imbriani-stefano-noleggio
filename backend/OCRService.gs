/**
 * SERVIZIO OCR DOCUMENTI AUTISTI
 * 
 * Gestisce riconoscimento automatico documenti (patente, carta identità)
 * usando Google Cloud Vision API
 * Versione: 1.2.0 - Fix parsing patente europea formato standard
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
    
    Logger.log('[OCR] Testo estratto (primi 500 caratteri): ' + text.substring(0, 500));
    
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
 * Parsing intelligente di documenti italiani (patente europea)
 * Estrae: nome, cognome, CF, data nascita, numero documento
 * Versione 1.2.0 - Ottimizzato per patente europea formato:
 * 1. COGNOME
 * 2. NOME
 * 3. DATA E LUOGO NASCITA
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
  
  Logger.log('[PARSE] Inizio parsing...');
  
  // 1. CODICE FISCALE (16 caratteri alfanumerici)
  var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
  if (cfMatch) {
    result.codiceFiscale = cfMatch[1].toUpperCase();
    Logger.log('[PARSE] ✅ CF: ' + result.codiceFiscale);
  }
  
  // 2. FORMATO PATENTE EUROPEA (priorità massima)
  // Pattern: "1. COGNOME" seguito da "2. NOME"
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // Cerca "1." seguito da testo (COGNOME)
    if (line.match(/^1[\.\s]/)) {
      var cognomeText = line.replace(/^1[\.\s]+/, '').trim();
      // Rimuovi eventuali label tipo "COGNOME", "SURNAME"
      cognomeText = cognomeText.replace(/^(COGNOME|SURNAME)[:\s]*/i, '');
      if (cognomeText && cognomeText.length > 0) {
        result.cognome = cognomeText;
        Logger.log('[PARSE] ✅ Cognome (da 1.): ' + result.cognome);
      }
    }
    
    // Cerca "2." seguito da testo (NOME)
    if (line.match(/^2[\.\s]/)) {
      var nomeText = line.replace(/^2[\.\s]+/, '').trim();
      // Rimuovi eventuali label tipo "NOME", "NAME"
      nomeText = nomeText.replace(/^(NOME|NAME)[:\s]*/i, '');
      if (nomeText && nomeText.length > 0) {
        result.nome = nomeText;
        Logger.log('[PARSE] ✅ Nome (da 2.): ' + result.nome);
      }
    }
    
    // Cerca "3." per data e luogo nascita
    if (line.match(/^3[\.\s]/)) {
      var nascitaText = line.replace(/^3[\.\s]+/, '').trim();
      Logger.log('[PARSE] Riga 3 (nascita): ' + nascitaText);
      
      // Estrai data
      var dateMatch = nascitaText.match(/(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/);
      if (dateMatch) {
        result.dataNascita = dateMatch[3] + '-' + dateMatch[2] + '-' + dateMatch[1];
        Logger.log('[PARSE] ✅ Data nascita (da 3.): ' + result.dataNascita);
      }
      
      // Estrai luogo (tutto ciò che viene dopo la data)
      var luogoMatch = nascitaText.match(/\d{4}\s+(.+?)(?=\(|$)/);
      if (luogoMatch) {
        result.luogoNascita = luogoMatch[1].trim();
        Logger.log('[PARSE] ✅ Luogo nascita (da 3.): ' + result.luogoNascita);
      }
    }
  }
  
  // 3. FALLBACK: Se non trovati con pattern numerici, cerca keyword
  if (!result.cognome) {
    var cognomeMatch = text.match(/(?:COGNOME|SURNAME)[:\s]+([A-Z]+)/i);
    if (cognomeMatch) {
      result.cognome = cognomeMatch[1].trim();
      Logger.log('[PARSE] ✅ Cognome (fallback): ' + result.cognome);
    }
  }
  
  if (!result.nome) {
    var nomeMatch = text.match(/(?:NOME|NAME)[:\s]+([A-Z]+)/i);
    if (nomeMatch) {
      result.nome = nomeMatch[1].trim();
      Logger.log('[PARSE] ✅ Nome (fallback): ' + result.nome);
    }
  }
  
  // 4. DATA DI NASCITA (se non trovata in "3.")
  if (!result.dataNascita) {
    var dateMatch = text.match(/\b(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})\b/);
    if (dateMatch) {
      result.dataNascita = dateMatch[3] + '-' + dateMatch[2] + '-' + dateMatch[1];
      Logger.log('[PARSE] ✅ Data nascita (fallback): ' + result.dataNascita);
    }
  }
  
  // 5. Costruisci nome completo
  if (result.nome && result.cognome) {
    result.nomeCompleto = result.nome + ' ' + result.cognome;
  } else if (result.cognome) {
    result.nomeCompleto = result.cognome;
  } else if (result.nome) {
    result.nomeCompleto = result.nome;
  }
  
  Logger.log('[PARSE] ✅ Nome completo: ' + result.nomeCompleto);
  
  // 6. NUMERO PATENTE (formato vario: U1C1234567, MI1234567, etc)
  var patenteMatch = text.match(/\b([A-Z0-9]{9,10})\b/);
  if (patenteMatch) {
    var candidato = patenteMatch[1];
    // Verifica che non sia il CF
    if (candidato !== result.codiceFiscale && candidato.length >= 9) {
      result.numeroPatente = candidato;
      result.numeroDocumento = candidato;
      Logger.log('[PARSE] ✅ Numero patente: ' + result.numeroPatente);
    }
  }
  
  // 7. LUOGO DI NASCITA (se non trovato in "3.")
  if (!result.luogoNascita) {
    var luogoMatch = text.match(/(?:NATO\s+A|LUOGO\s+DI\s+NASCITA|PLACE\s+OF\s+BIRTH)[:\s]+([A-Z][A-Z\s\(\)]+?)(?=\s+IL|\s+\d{2}|\n|$)/i);
    if (luogoMatch) {
      result.luogoNascita = luogoMatch[1].trim();
      Logger.log('[PARSE] ✅ Luogo nascita (fallback): ' + result.luogoNascita);
    }
  }
  
  // 8. DATE PATENTE (4a. e 4b.)
  var rilascioMatch = text.match(/(?:4a\.|VALID\s+FROM)[:\s]*(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (rilascioMatch) {
    result.dataInizioPatente = rilascioMatch[3] + '-' + rilascioMatch[2] + '-' + rilascioMatch[1];
    Logger.log('[PARSE] ✅ Inizio validità: ' + result.dataInizioPatente);
  }
  
  var scadenzaMatch = text.match(/(?:4b\.|VALID\s+UNTIL)[:\s]*(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (scadenzaMatch) {
    result.scadenzaPatente = scadenzaMatch[3] + '-' + scadenzaMatch[2] + '-' + scadenzaMatch[1];
    Logger.log('[PARSE] ✅ Scadenza: ' + result.scadenzaPatente);
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
