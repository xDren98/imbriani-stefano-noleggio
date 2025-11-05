/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.4.1
 * Aggiunta action=notifyTest per test rapido notifica Telegram
 */

// ... resto del file invariato ...

function doGet(e){
  var p=(e&&e.parameter)?e.parameter:{};
  var action=p.action||'health';
  var token=p.token||(p.Authorization?p.Authorization.replace('Bearer ',''):'');
  try{
    if (action==='health') return createJsonResponse({ success:true, service:'imbriani-backend', spreadsheet_id:CONFIG.SPREADSHEET_ID, sheets:['PRENOTAZIONI','PULMINI','CLIENTI','MANUTENZIONI'], action:'health_supported' });

    // NUOVO: test rapido notifica Telegram
    if (action==='notifyTest'){
      if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
      var demo={ targa:'TEST123', giornoInizio:new Date().toISOString().slice(0,10), giornoFine:new Date().toISOString().slice(0,10), oraInizio:'09:00', oraFine:'12:00', destinazione:'Test', autista1:{ nomeCompleto:'Test User', codiceFiscale:'TSTUSR85M01H501Z', cellulare:'3330000000' }, email:'test@example.com' };
      inviaNotificaTelegram(demo);
      return createJsonResponse({success:true,message:'Notifica Telegram inviata (test)'});
    }

    if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    switch(action){ case 'getVeicoli': return getVeicoli(); case 'getPrenotazioni': return getPrenotazioni(); case 'checkDisponibilita': return checkDisponibilita(p); case 'updateStatiLive': return updateStatiLive(); case 'getSheet': return getSheetGeneric(p); case 'sincronizzaClienti': return sincronizzaClienti(); default: return createJsonResponse({success:false,message:'Azione non supportata: '+action},400);} 
  }catch(err){
    return createJsonResponse({success:false,message:'Errore server: '+err.message},500);
  }
}
