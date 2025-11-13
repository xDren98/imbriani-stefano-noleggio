function handlePost(e){var p=(e&&e.parameter)||{};var ct=(e&&e.postData&&e.postData.type)||'';var bodyRaw=(e&&e.postData&&e.postData.contents)||'';var body=p;try{if(ct.indexOf('application/json')>-1&&bodyRaw){body=JSON.parse(bodyRaw)}}catch(_){body=p}var action=String(p.action||body.action||'').trim();var token=parseToken(e);
  var adminRequired=(function(a){return a==='setVeicolo'||a==='eliminaVeicolo'||a==='setManutenzione'||a==='aggiornaPrenotazione'||a==='aggiornaPrenotazioneCompleta'||a==='eliminaPrenotazione'||a==='aggiornaStatoPrenotazione'||a==='aggiornaStato'||a==='confermaPrenotazione'||a==='sincronizzaClienti'||a==='importaPrenotazioniICS'||a==='importaPrenotazioniCSV'||a==='setConfigProps';})(action);
  if(adminRequired&&!isAdmin(token)){return json({success:false,message:'Admin required'},403)}
  if(action==='requestAdminOTP'){var name=String(body.name||p.name||'').trim()||'Admin';var code=(''+Math.floor(100000+Math.random()*900000));var ttl=(CONFIG&&CONFIG.SECURITY&&CONFIG.SECURITY.OTP_TTL_MINUTES?CONFIG.SECURITY.OTP_TTL_MINUTES:5)*60;var exp=nowSec()+ttl;getProps().setProperty('OTP:'+name,JSON.stringify({code:code,exp:exp}));try{if(typeof inviaOTPAdmin==='function'){inviaOTPAdmin(name, code)}}catch(_){ }var res={success:true};var dbgFlag=(String(p.debug||body.debug||'')==='1')||(CONFIG&&CONFIG.SECURITY&&CONFIG.SECURITY.DEBUG_OTP);if(dbgFlag){res.debugOtp=code}return json(res)}
  if(action==='adminLogin'){var name=String(body.name||p.name||'').trim()||'Admin';var otp=String(body.otp||p.otp||'').trim();var raw=getProps().getProperty('OTP:'+name);if(!raw){return json({success:false,message:'OTP missing'})}var o;try{o=JSON.parse(raw)}catch(_){o=null}if(!o||o.exp<nowSec()||o.code!==otp){return json({success:false,message:'OTP invalid'})}getProps().deleteProperty('OTP:'+name);var msgRaw=getProps().getProperty('OTPMSG:'+name);if(msgRaw){try{var m=JSON.parse(msgRaw);if(m&&m.chat_id&&Array.isArray(m.message_ids)&&typeof deleteTelegramMessage==='function'){for(var i=0;i<m.message_ids.length;i++){try{deleteTelegramMessage(m.chat_id,m.message_ids[i])}catch(__){}}}}catch(_){ }getProps().deleteProperty('OTPMSG:'+name)}var exp=nowSec()+3600;var payload={name:name,role:'admin',exp:exp,iat:nowSec()};var jwt=createJWT(payload);return json({success:true,token:jwt,role:'admin',exp:new Date(exp*1000).toISOString(),name:name})}
  if(action==='devLogin'){var name2=String(body.name||p.name||'').trim()||'DevAdmin';var isLocal=String(p.originLocal||'')==='1';if(!isLocal){return json({success:false,message:'Forbidden'},403)}var exp2=nowSec()+3600;var payload2={name:name2,role:'admin',exp:exp2,iat:nowSec(),dev:true};var jwt2=createJWT(payload2);return json({success:true,token:jwt2,role:'admin',exp:new Date(exp2*1000).toISOString(),name:name2})}
  if(action==='revokeSession'){var t=token||String(body.token||p.token||'');if(!t){return json({success:false,message:'token required'})}revokeSession(t);return json({success:true})}
  if(action==='login'&&typeof login==='function'){return login(body)}
  if(action==='getVeicoli'&&typeof getVeicoli==='function'){return getVeicoli(body)}
  if(action==='getPrenotazioni'&&typeof getPrenotazioni==='function'){return getPrenotazioni(body)}
  if(action==='getCliente'&&typeof getCliente==='function'){return getCliente(body)}
  if(action==='ocrDocument'&&typeof ocrDocument==='function'){return ocrDocument(body)}
  if(action==='creaPrenotazione'&&typeof creaPrenotazione==='function'){return creaPrenotazione(body)}
  if(action==='aggiornaPrenotazione'&&typeof aggiornaPrenotazioneCompleta==='function'){return aggiornaPrenotazioneCompleta(body)}
  if(action==='aggiornaPrenotazioneCompleta'&&typeof aggiornaPrenotazioneCompleta==='function'){return aggiornaPrenotazioneCompleta(body)}
  if(action==='aggiornaStatoPrenotazione'&&typeof aggiornaStatoPrenotazione==='function'){return aggiornaStatoPrenotazione(body)}
  if(action==='aggiornaStato'&&typeof aggiornaStatoPrenotazione==='function'){return aggiornaStatoPrenotazione(body)}
  if(action==='eliminaPrenotazione'&&typeof eliminaPrenotazione==='function'){return eliminaPrenotazione(body)}
  if(action==='confermaPrenotazione'&&typeof confermaPrenotazione==='function'){return confermaPrenotazione(body)}
  if(action==='aggiornaAutistiPubblico'&&typeof aggiornaAutistiPubblico==='function'){return aggiornaAutistiPubblico(body)}
  if(action==='aggiornaAutistiPubblico_secure'){
    var s=getSession(token);
    if(!s){return json({success:false,message:'Auth required'},401)}
    var cfBody=String(body.codiceFiscale||body.cf||'').trim().toUpperCase();
    var cfTok=String((s.cf||'')).trim().toUpperCase();
    if(s.role!=='admin' && cfBody && cfTok && cfBody!==cfTok){return json({success:false,message:'Forbidden'},403)}
    if(typeof aggiornaAutistiPubblico==='function'){return aggiornaAutistiPubblico(body)}
    return json({success:false,message:'Funzione non disponibile'})
  }
  if(action==='setVeicolo'&&typeof setVeicolo==='function'){return setVeicolo(body)}
  if(action==='eliminaVeicolo'&&typeof eliminaVeicolo==='function'){return eliminaVeicolo(body)}
  if(action==='setManutenzione'&&typeof setManutenzione==='function'){return setManutenzione(body)}
  if(action==='aggiornaCliente'&&typeof aggiornaCliente==='function'){return aggiornaCliente(body)}
  if(action==='creaCliente'&&typeof creaCliente==='function'){return creaCliente(body)}
  if(action==='sincronizzaClienti'&&typeof sincronizzaClienti==='function'){return sincronizzaClienti(body)}
  if(action==='importaPrenotazioniICS'&&typeof importaPrenotazioniICS==='function'){return importaPrenotazioniICS(body)}
  if(action==='importaPrenotazioniCSV'&&typeof importaPrenotazioniCSV==='function'){return importaPrenotazioniCSV(body)}
  if(action==='inviaRiepilogo'&&typeof inviaEmailConfermaPreventivo==='function'){return inviaEmailConfermaPreventivo(body)}
  if(action==='setConfigProps'&&typeof setConfigProps==='function'){return setConfigProps(body)}
  return createJsonResponse({success:false,message:'Azione non supportata'})}
