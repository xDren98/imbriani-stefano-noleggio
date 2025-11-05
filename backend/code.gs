/*
 * Apps Script backend v8.4.0
 * - Stato default prenotazioni: "In attesa"
 * - Notifica Telegram admin alla creazione prenotazione
 *
 * NOTE: Imposta CONFIG_SHEET e nomi fogli in base al tuo documento
 */

/** CONFIG **/
const TELEGRAM = {
  BOT_TOKEN: '8029941478:AAGR808kmlCeyw5j5joJn0T_MLKL25qwM0o',
  CHAT_ID: '203195623'
};

const SHEETS = {
  PRENOTAZIONI: 'PRENOTAZIONI',
  CLIENTI: 'CLIENTI'
};

/** UTIL **/
function formatDateISO(d){ try{ return new Date(d).toISOString(); }catch(e){ return d; } }
function formatDateIT(d){ try{ return new Date(d).toLocaleString('it-IT'); }catch(e){ return d; } }
function safe(v){ return (v===undefined||v===null)?'':v; }

/**
 * Telegram: invia messaggio su chat admin
 */
function inviaNotificaTelegram(pren){
  try{
    var msg = [
      '🚐 NUOVA PRENOTAZIONE IN ATTESA',
      '',
      '📋 Riepilogo:',
      '🚗 Veicolo: ' + safe(pren.targa),
      '📅 Dal: ' + safe(pren.giornoInizio) + ' ' + safe(pren.oraInizio),
      '📅 Al: ' + safe(pren.giornoFine) + ' ' + safe(pren.oraFine),
      '📍 Destinazione: ' + (safe(pren.destinazione) || 'Non specificata'),
      '',
      '👤 Autista principale:',
      '👨‍💼 ' + safe(pren.autista1 && pren.autista1.nomeCompleto),
      '🆔 ' + safe(pren.autista1 && pren.autista1.codiceFiscale),
      '📱 ' + safe(pren.autista1 && pren.autista1.cellulare),
      '📧 ' + (safe(pren.email) || 'Non fornita'),
      '',
      '⏰ Ricevuta: ' + formatDateIT(new Date()),
      '🔄 Stato: In attesa',
      '',
      'Accedi alla dashboard per confermare.'
    ].join('\n');

    var url = 'https://api.telegram.org/bot' + TELEGRAM.BOT_TOKEN + '/sendMessage';
    var payload = { chat_id: TELEGRAM.CHAT_ID, text: msg, parse_mode: 'Markdown' };
    UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) });
  }catch(e){
    console.error('Errore invio Telegram:', e && e.message);
  }
}

/**
 * Crea una riga in PRENOTAZIONI + upsert CLIENTI.
 * Stato default: "In attesa".
 */
function creaPrenotazione(payload){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shPren = ss.getSheetByName(SHEETS.PRENOTAZIONI);
  var shCli = ss.getSheetByName(SHEETS.CLIENTI);

  // 1) Scrivi prenotazione su PRENOTAZIONI
  var now = new Date();
  var stato = 'In attesa';
  var row = [
    formatDateIT(now),                               // Informazioni cronologiche / timestamp
    safe(payload.autista1 && payload.autista1.nomeCompleto),
    safe(payload.autista1 && payload.autista1.dataNascita),
    safe(payload.autista1 && payload.autista1.luogoNascita),
    safe(payload.autista1 && payload.autista1.codiceFiscale),
    safe(payload.autista1 && payload.autista1.comuneResidenza),
    safe(payload.autista1 && payload.autista1.viaResidenza),
    safe(payload.autista1 && payload.autista1.civicoResidenza),
    safe(payload.autista1 && payload.autista1.numeroPatente),
    safe(payload.autista1 && payload.autista1.inizioValiditaPatente),
    safe(payload.autista1 && payload.autista1.scadenzaPatente),
    safe(payload.targa),
    safe(payload.oraInizio),
    safe(payload.oraFine),
    safe(payload.giornoInizio),
    safe(payload.giornoFine),
    safe(payload.destinazione),
    safe(payload.autista1 && payload.autista1.cellulare),
    formatDateIT(now),                               // Data contratto
    safe(payload.autista2 && payload.autista2.nomeCompleto),
    safe(payload.autista2 && payload.autista2.dataNascita),
    safe(payload.autista2 && payload.autista2.luogoNascita),
    safe(payload.autista2 && payload.autista2.codiceFiscale),
    safe(payload.autista2 && payload.autista2.comuneResidenza),
    safe(payload.autista2 && payload.autista2.viaResidenza),
    safe(payload.autista2 && payload.autista2.civicoResidenza),
    safe(payload.autista2 && payload.autista2.numeroPatente),
    safe(payload.autista2 && payload.autista2.inizioValiditaPatente),
    safe(payload.autista2 && payload.autista2.scadenzaPatente),
    safe(payload.autista3 && payload.autista3.nomeCompleto),
    safe(payload.autista3 && payload.autista3.dataNascita),
    safe(payload.autista3 && payload.autista3.luogoNascita),
    safe(payload.autista3 && payload.autista3.codiceFiscale),
    safe(payload.autista3 && payload.autista3.comuneResidenza),
    safe(payload.autista3 && payload.autista3.viaResidenza),
    safe(payload.autista3 && payload.autista3.civicoResidenza),
    safe(payload.autista3 && payload.autista3.numeroPatente),
    safe(payload.autista3 && payload.autista3.inizioValiditaPatente),
    safe(payload.autista3 && payload.autista3.scadenzaPatente),
    '',                                             // ID prenotazione (gestito da altro script se necessario)
    stato,                                          // Stato prenotazione
    '',                                             // Importo preventivo
    safe(payload.email),                            // Email
    ''                                              // test / colonna di servizio
  ];
  shPren.appendRow(row);

  // 2) Upsert CLIENTI per CF (autista1 sempre, autista2/3 se presenti)
  try { upsertCliente(shCli, payload.autista1); } catch(e){}
  try { if (payload.autista2 && payload.autista2.codiceFiscale) upsertCliente(shCli, payload.autista2); } catch(e){}
  try { if (payload.autista3 && payload.autista3.codiceFiscale) upsertCliente(shCli, payload.autista3); } catch(e){}

  // 3) Notifica Telegram
  inviaNotificaTelegram(payload);

  return { success:true, message:'Prenotazione inserita e notifica inviata', stato: stato };
}

/** Upsert su CLIENTI per Codice Fiscale */
function upsertCliente(shCli, c){
  if (!c || !c.codiceFiscale) return;
  var data = shCli.getDataRange().getValues();
  var headers = data.shift();
  var cfIdx = headers.indexOf('Codice fiscale');
  if (cfIdx < 0){
    // fallback: prova prima colonna
    cfIdx = 0;
  }
  var rowIndex = -1;
  for (var i=0;i<data.length;i++){
    if (String(data[i][cfIdx]).trim().toUpperCase() === String(c.codiceFiscale).trim().toUpperCase()){
      rowIndex = i+2; // +2 per header e 1-based
      break;
    }
  }
  var record = [
    safe(c.nomeCompleto), safe(c.dataNascita), safe(c.luogoNascita), safe(c.codiceFiscale),
    safe(c.comuneResidenza), safe(c.viaResidenza), safe(c.civicoResidenza),
    safe(c.numeroPatente), safe(c.inizioValiditaPatente), safe(c.scadenzaPatente)
  ];
  if (rowIndex>0){
    shCli.getRange(rowIndex, 1, 1, record.length).setValues([record]);
  } else {
    shCli.appendRow(record);
  }
}

/** Endpoint web doPost **/
function doPost(e){
  try{
    var body = JSON.parse(e.postData.contents||'{}');
    var action = body.action;
    if (action === 'creaPrenotazione'){
      return ContentService.createTextOutput(JSON.stringify(creaPrenotazione(body)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({success:false,message:'Azione non riconosciuta'}))
      .setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({success:false,message:err && err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
