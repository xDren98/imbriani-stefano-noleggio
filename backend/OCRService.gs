/**
 * SERVIZIO OCR DOCUMENTI AUTISTI - v8.9.7
 * Miglioramento estrazione luogo di nascita patente: ignora "REPUBBLICA ITALIANA", parole comuni e header, prende solo comuni o città validi con provincia
 */

function parsePatente(text, result) {
  Logger.log('[PARSE PATENTE] Inizio...');
  var lines = text.split('\n').map(function(l) { return l.trim(); });

  // ...campi cognome, nome, data: identici...

  // ===================
  // 3. DATA E LUOGO NASCITA (campo 3.)
  // ===================
  var regexData3 = /3[\.\s]+(\d{2}[\/.:\-]?\d{2}[\/.:\-]?\d{2,4})/i;
  var matchData3 = text.match(regexData3);
  if (matchData3) {
    var dataRaw = matchData3[1];
    result.dataNascita = normalizzaData(dataRaw);
    Logger.log('[PATENTE] ✅ Data nascita: ' + result.dataNascita);
  }

  // PATCH: luogo nascita piu" smart
  // Prende testo dopo la data e:
  // - Ignora "REPUBBLICA ITALIANA", "PATENTE DI GUIDA", "MIT-UCO", "MINISTERO", "DI GUIDA", "REPUBBLICA"
  // - Se trova comunE e provincia (LEVERANO (LE)), prende solo quelli
  // - Se trova solo città, restituisce città, se no vuoto
  var luogo = '';
  var afterData = text.split(matchData3[0])[1] || '';
  if (afterData) {
    var cleaned = afterData.replace(/\s+4[ab].*|\s+5\..*|\s+REPUBBLICA ITALIANA|PATENTE DI GUIDA|MIT-UCO|MINISTERO|DI GUIDA|REPUBBLICA|ITALIANA/gi, '')
                          .replace(/\n/g, ' ').trim();
    // cerca il pattern COMUNE (PROVINCIA)
    var comuneMatch = cleaned.match(/([A-ZÀ-Ù][A-ZÀ-Ù'\-]+(?:\s+[A-ZÀ-Ù'\-]+)*\s*\([A-Z]{2}\))/);
    if (comuneMatch) {
      luogo = comuneMatch[1].trim();
    } else {
      // Altrimenti, prima parola in lettere maiuscole lunga >=3 , senza parole comuni
      var tokens = cleaned.split(' ');
      for(var i=0;i<tokens.length;i++) {
        var t = tokens[i].trim();
        if (t.length >= 3 && /^[A-ZÀ-Ù'\-]{3,}$/.test(t) && ['REPUBBLICA','ITALIANA','PATENTE','MIT-UCO','DI','MINISTERO','GUIDA','DI','CONDUCENTE'].indexOf(t) === -1) {
          luogo = t;
          break;
        }
      }
    }
  }
  if(luogo) {
    result.luogoNascita = luogo;
    Logger.log('[PATENTE] ✅ Luogo nascita (patch): ' + result.luogoNascita);
  }

  // ... resto invariato ...
}
