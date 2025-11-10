/**
 * SERVIZIO OCR DOCUMENTI AUTISTI v2.1
 * FIX luogo nascita: robusto, ignora header/documento, prende solo comune reale
 * Parsing robusto patente/carta/tessera, tutti helper e commenti inclusi
 */

function ocrDocument(post) {
  Logger.log('[OCR] Richiesta OCR ricevuta');
  try {
    if (!post || !post.image) {
      return createJsonResponse({ success: false, message: 'Immagine mancante' }, 400); }
    var imageBase64 = post.image;
    var autistaNum = post.autista || 1;
    var tipoDoc = post.tipoDocumento || 'auto';
    if (imageBase64.indexOf('base64,') !== -1) {
      imageBase64 = imageBase64.split('base64,')[1];
    }
    var visionApiKey = CONFIG.GOOGLE && CONFIG.GOOGLE.VISION_API_KEY ? CONFIG.GOOGLE.VISION_API_KEY : '';
    if (!visionApiKey) {
      return createJsonResponse({ success: false, message: 'Servizio OCR non configurato.' }, 500); }
    var visionUrl = 'https://vision.googleapis.com/v1/images:annotate?key=' + visionApiKey;
    var payload = {
      requests: [{ image: { content: imageBase64 }, features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }], imageContext: { languageHints: ['it', 'en'] } }]
    };
    var options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true };
    var response = UrlFetchApp.fetch(visionUrl, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    if (responseCode !== 200) { return createJsonResponse({ success: false, message: 'Errore servizio OCR: ' + responseCode }, 500); }
    var data = JSON.parse(responseText);
    var text = '';
    if (data && data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
      text = data.responses[0].fullTextAnnotation.text;
    }
    if (!text) { return createJsonResponse({ success: false, message: 'Impossibile leggere il documento.' }, 400); }
    Logger.log('[OCR] Testo estratto (primi 600 char): ' + text.substring(0, 600));
    if (tipoDoc === 'auto') { tipoDoc = detectDocumentType(text); Logger.log('[OCR] Tipo auto-rilevato: ' + tipoDoc); }
    var extracted = parseMultiDocument(text, tipoDoc);
    Logger.log('[OCR] Dati estratti: ' + JSON.stringify(extracted));
    return createJsonResponse({ success: true, message: 'Documento scansionato', data: extracted, autista: autistaNum, tipoDocumento: tipoDoc, debugText: text.substring(0, 600) });
  } catch (err) {
    Logger.log('[OCR] Errore: ' + err.message);
    return createJsonResponse({ success: false, message: 'Errore: ' + err.message }, 500);
  }
}

function detectDocumentType(text) {
  if (/PATENTE\s+DI\s+GUIDA|DRIVING\s+LICENCE/i.test(text)) return 'patente';
  if (/CARTA\s+D.?\s?IDENTIT|IDENTITY\s+CARD/i.test(text)) return 'carta';
  if (/TESSERA\s+SANITARIA|MINISTERO.*SALUTE/i.test(text)) return 'tessera';
  return 'generico';
}

function parseMultiDocument(text, tipoDoc) {
  var result = {
    nomeCompleto: '', nome: '', cognome: '', codiceFiscale: '', dataNascita: '', luogoNascita: '', numeroPatente: '', numeroDocumento: '', dataInizioPatente: '', scadenzaPatente: '', comuneResidenza: '', viaResidenza: '', civicoResidenza: ''
  };
  Logger.log('[PARSE] Tipo: ' + tipoDoc);
  var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
  if (cfMatch) { result.codiceFiscale = cfMatch[1].toUpperCase(); Logger.log('[PARSE] ✅ CF: ' + result.codiceFiscale); }
  if (tipoDoc === 'patente') { parsePatenteV2(text, result); }
  else if (tipoDoc === 'carta') { parseCartaIdentita(text, result); }
  else if (tipoDoc === 'tessera') { parseTesseraSanitaria(text, result); }
  else { parsePatenteV2(text, result); parseCartaIdentita(text, result); }
  return result;
}

/**
 * Parser PATENTE v2.1 - FIX data nascita e luogo smart
 */
function parsePatenteV2(text, result) {
  Logger.log('[PARSE PATENTE v2.1] Inizio...');
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // 1. COGNOME
    if (line.match(/^1[\.\s]/)) {
      var cognome = line.replace(/^1[\.\s]+/, '').replace(/COGNOME|SURNAME/gi, '').trim();
      if (cognome && cognome.length > 1) { result.cognome = cognome; Logger.log('[PARSE] ✅ Cognome: ' + result.cognome); }
    }
    // 2. NOME
    if (line.match(/^2[\.\s]/)) {
      var nome = line.replace(/^2[\.\s]+/, '').replace(/NOME|NAME/gi, '').trim();
      if (nome && nome.length > 1) { result.nome = nome; Logger.log('[PARSE] ✅ Nome: ' + result.nome); }
    }
    // 3. DATA E LUOGO NASCITA - FIX COMPLETO
    if (line.match(/^3[\.\s]/)) {
      var nascitaLine = line.replace(/^3[\.\s]+/, '').trim();
      Logger.log('[PARSE] Riga 3 raw: ' + nascitaLine);
      // Estrai DATA (prima parte)
      var dateMatch = nascitaLine.match(/(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/);
      if (dateMatch) {
        result.dataNascita = dateMatch[3] + '-' + dateMatch[2].padStart(2, '0') + '-' + dateMatch[1].padStart(2, '0');
        Logger.log('[PARSE] ✅ Data nascita: ' + result.dataNascita);
        nascitaLine = nascitaLine.replace(dateMatch[0], '').trim();
      }
      // PATCH SMART LUOGO: elimina header/testi comuni dopo la data
      var luogoClean = nascitaLine.replace(/(REPUBBLICA ITALIANA|PATENTE DI GUIDA|MIT-UCO|MINISTERO|DI GUIDA|REPUBBLICA|ITALIANA)/gi,'').replace(/[\(\)]/g, '').replace(/\s+/g, ' ').trim();
      if (luogoClean && luogoClean.length > 2) { result.luogoNascita = luogoClean; Logger.log('[PARSE] ✅ Luogo nascita: ' + result.luogoNascita); }
    }
  }
  if (result.nome && result.cognome) { result.nomeCompleto = result.nome + ' ' + result.cognome; }
  // NUMERO PATENTE - FIX robusto (esclude cf/nome/cognome)
  var allTokens = text.match(/\b[A-Z0-9]{9,10}\b/g);
  if (allTokens) {
    for (var t = 0; t < allTokens.length; t++) {
      var token = allTokens[t];
      if (token === result.codiceFiscale) continue;
      if (result.nome && token.toUpperCase() === result.nome.toUpperCase()) continue;
      if (result.cognome && token.toUpperCase() === result.cognome.toUpperCase()) continue;
      if (/\d/.test(token)) { result.numeroPatente = token; result.numeroDocumento = token; Logger.log('[PARSE] ✅ Numero patente: ' + result.numeroPatente); break; }
    }
  }
  var rilascio = text.match(/(?:4a[\.\s]+|VALID\s+FROM[:\s]+)(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (rilascio) { result.dataInizioPatente = rilascio[3] + '-' + rilascio[2] + '-' + rilascio[1]; Logger.log('[PARSE] ✅ Inizio validità: ' + result.dataInizioPatente); }
  var scadenza = text.match(/(?:4b[\.\s]+|VALID\s+UNTIL[:\s]+)(\d{2})[\/.:\-](\d{2})[\/.:\-](\d{4})/i);
  if (scadenza) { result.scadenzaPatente = scadenza[3] + '-' + scadenza[2] + '-' + scadenza[1]; Logger.log('[PARSE] ✅ Scadenza: ' + result.scadenzaPatente); }
  Logger.log('[PARSE PATENTE v2.1] ✅ Completato');
}

function parseCartaIdentita(text, result) {
  Logger.log('[PARSE CARTA] Inizio...');
  if (!result.nome) { var nomeMatch = text.match(/(?:NOME|NAME)[:\s]+([A-Z]+)/i); if (nomeMatch) result.nome = nomeMatch[1].trim(); }
  if (!result.cognome) { var cognomeMatch = text.match(/(?:COGNOME|SURNAME)[:\s]+([A-Z]+)/i); if (cognomeMatch) result.cognome = cognomeMatch[1].trim(); }
  var comuneMatch = text.match(/(?:RESIDENZA|COMUNE)[:\s]+([A-Z][A-Z\s]+?)(?=\s+VIA|\s+\d{5}|\n|$)/i); if (comuneMatch) result.comuneResidenza = comuneMatch[1].trim();
  var viaMatch = text.match(/VIA[:\s]+([A-Z][A-Z\s\.,0-9]+?)(?=\s+\d{1,4}\s|$|\n)/i); if (viaMatch) result.viaResidenza = viaMatch[1].trim();
  var civicoMatch = text.match(/(?:N[\.\s°]?|CIVICO)[:\s]*(\d{1,4}[A-Z]?)/i); if (civicoMatch) result.civicoResidenza = civicoMatch[1];
  if (!result.luogoNascita) { var luogoMatch = text.match(/(?:NATO\s+A|LUOGO\s+NASCITA|PLACE\s+OF\s+BIRTH)[:\s]+([A-Z][A-Z\s\(\)]+?)(?=\s+IL|\s+\d{2}|\n|$)/i); if (luogoMatch) result.luogoNascita = luogoMatch[1].trim(); }
  Logger.log('[PARSE CARTA] ✅');
}

function parseTesseraSanitaria(text, result) {
  Logger.log('[PARSE TESSERA] Inizio...');
  if (!result.codiceFiscale) {
    var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
    if (cfMatch) result.codiceFiscale = cfMatch[1].toUpperCase();
  }
  var cognomeNomeMatch = text.match(/([A-Z]+)\s+([A-Z]+)/);
  if (cognomeNomeMatch && !result.cognome && !result.nome) {
    result.cognome = cognomeNomeMatch[1];
    result.nome = cognomeNomeMatch[2];
    result.nomeCompleto = result.nome + ' ' + result.cognome;
  }
  Logger.log('[PARSE TESSERA] ✅');
}

function testOcrService() {
  var apiKey = CONFIG.GOOGLE && CONFIG.GOOGLE.VISION_API_KEY ? CONFIG.GOOGLE.VISION_API_KEY : '';
  return createJsonResponse({
    success: true,
    message: 'OCR Service v2.1 - Fix data nascita, luogo e numero patente',
    apiKeyConfigured: apiKey ? true : false,
    supportedDocuments: ['patente', 'carta', 'tessera']
  });
}

function normalizzaData(dataStr) {
  if (!dataStr) return '';
  try {
    dataStr = String(dataStr).trim();
    dataStr = dataStr.replace(/[\/.:\-]+/g, '/');
    var parts = dataStr.split('/');
    if (parts.length !== 3) return dataStr;
    var giorno = parseInt(parts[0], 10);
    var mese = parseInt(parts[1], 10);
    var anno = parseInt(parts[2], 10);
    if (anno < 100) { anno = (anno > 50) ? (1900 + anno) : (2000 + anno); }
    if (giorno < 1 || giorno > 31 || mese < 1 || mese > 12 || anno < 1900 || anno > 2100) { return dataStr; }
    return anno + '-' + String(mese).padStart(2, '0') + '-' + String(giorno).padStart(2, '0');
  } catch (e) { return dataStr; }
}
