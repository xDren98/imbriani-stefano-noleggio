/**
 * SERVIZIO OCR DOCUMENTI AUTISTI
 * Miglioria parser: fix nome = cognome e pattern aggiuntivi
 */

function ocrDocument(post) {
  // ... (resta identico)
}

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
  var normalized = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. CF
  var cfMatch = text.match(/\b([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])\b/i);
  if (cfMatch) result.codiceFiscale = cfMatch[1].toUpperCase();
  // 2. Data nascita
  var dateMatch = text.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})\b/);
  if (dateMatch) result.dataNascita = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;

  // 3. Regole migliorate per nome/cognome
  // Tentativo 1: COGNOME ... NOME ...
  var cognomeNomeMatch = text.match(/COGNOME[:\s]+([A-Z]+)[\s]+NOME[:\s]+([A-Z]+)/i);
  if (cognomeNomeMatch) {
    result.cognome = cognomeNomeMatch[1];
    result.nome = cognomeNomeMatch[2];
  } else {
    // Tentativo 2: NOME: ... COGNOME: ...
    var nomeMatch = text.match(/NOME[:\s]+([A-Z][A-Z\s]+?)(?=\s+COGNOME|\s+[A-Z]{2,}\s|\n|$)/i);
    if (nomeMatch) result.nome = nomeMatch[1].trim();
    var cognomeMatch = text.match(/COGNOME[:\s]+([A-Z][A-Z\s]+?)(?=\s+NOME|\s+NATO|\s+[A-Z]{2,}\s|\n|$)/i);
    if (cognomeMatch) result.cognome = cognomeMatch[1].trim();
  }
  // Tentativo 3: se uno dei due non trovato, prova con "E NOME", "E COGNOME"
  if (!result.nome || !result.cognome) {
    var NC = text.match(/COGNOME[\s:]*([A-Z\s]+)[\s]+NOME[\s:]*([A-Z\s]+)/);
    if (NC && (!result.cognome || !result.nome)) {
      result.cognome = NC[1].trim();
      result.nome = NC[2].trim();
    }
  }
  // Fix errore: nome == cognome (tipico OCR)
  if (result.nome && result.cognome && result.nome === result.cognome) {
    result.nome = '';
  }

  // Assembla nomeCompleto
  if (result.nome && result.cognome) {
    result.nomeCompleto = result.nome + ' ' + result.cognome;
  } else if (result.nome) {
    result.nomeCompleto = result.nome;
  } else if (result.cognome) {
    result.nomeCompleto = result.cognome;
  }

  // Luogo nascita
  var luogoMatch = text.match(/(?:NATO A|LUOGO DI NASCITA|PLACE OF BIRTH)[:\s]+([A-Z][A-Z\s]+?)(?=\s+IL|\s+\d{2}|$)/i);
  if (luogoMatch) result.luogoNascita = luogoMatch[1].trim();

  // Numero patente: 2 lettere + 7 cifre
  var patenteMatch = text.match(/\b([A-Z]{2}\d{7})\b/);
  if (patenteMatch) {
    result.numeroPatente = patenteMatch[1];
    result.numeroDocumento = patenteMatch[1];
  }
  // Carta identità number
  if (!result.numeroDocumento) {
    var ciMatch = text.match(/(?:CARTA\s+IDENTIT[AÀ]\s+N[°\.]?|NUMERO)[:\s]+([A-Z0-9]{6,10})/i);
    if (ciMatch) result.numeroDocumento = ciMatch[1];
  }
  // Data rilascio/scadenza patente
  var rilascioMatch = text.match(/(?:VALID FROM|RILASCIATA IL|4a\.)[:\s]+(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/i);
  if (rilascioMatch) result.dataInizioPatente = rilascioMatch[3] + '-' + rilascioMatch[2] + '-' + rilascioMatch[1];
  var scadenzaMatch = text.match(/(?:VALID UNTIL|SCADENZA|4b\.)[:\s]+(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/i);
  if (scadenzaMatch) result.scadenzaPatente = scadenzaMatch[3] + '-' + scadenzaMatch[2] + '-' + scadenzaMatch[1];

  return result;
}

// ... resto file invariato ...
