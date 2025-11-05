/**
 * Trigger e test email aggiunti (v8.5.1)
 * - setupDailyTrigger() per reminder 09:00
 * - testInvioEmailBrevo() invia email di test a indirizzo passato via query o default
 */

function setupDailyTrigger(){
  var triggers = ScriptApp.getProjectTriggers();
  for (var i=0;i<triggers.length;i++){
    if (triggers[i].getHandlerFunction()==='dailyReminderCheck'){
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('dailyReminderCheck').timeBased().everyDays(1).atHour(9).create();
}

function dailyReminderCheck(){
  try{ checkReminderEmails(); updateStatiLive(); }catch(e){ Logger.log('Errore dailyReminderCheck: '+e.message); }
}

function doGet(e){
  var p=(e&&e.parameter)?e.parameter:{}; var action=p.action||'health';
  if (action==='testEmail'){
    if (!validateToken(p.token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    var to = p.to || 'melloanto@icloud.com';
    var demo={
      idPrenotazione:'PRE-TEST-'+Date.now(), targa:'TEST123', giornoInizio:new Date().toISOString().slice(0,10), giornoFine:new Date().toISOString().slice(0,10), oraInizio:'09:00', oraFine:'12:00', destinazione:'Test', email:to, autista1:{nomeCompleto:'Test Client'}
    };
    try{ inviaEmailConfermaCliente(demo); return createJsonResponse({success:true,message:'Email di test inviata a '+to}); }catch(err){ return createJsonResponse({success:false,message:'Errore invio test: '+err.message},500); }
  }
  // fall back to original doGet if defined
  if (typeof this.__original_doGet==='function'){ return this.__original_doGet(e); }
  return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
}

// Preserve original doGet if not already wrapped
if (typeof __original_doGet === 'undefined' && typeof doGet === 'function'){
  var __original_doGet = doGet;
}
