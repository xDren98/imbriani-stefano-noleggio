function handlePost(e){var p=(e&&e.parameter)||{};var ct=(e&&e.postData&&e.postData.type)||'';var bodyRaw=(e&&e.postData&&e.postData.contents)||'';var body=p;try{if(ct.indexOf('application/json')>-1&&bodyRaw){body=JSON.parse(bodyRaw)}}catch(_){body=p}var action=String(p.action||body.action||'').trim();var token=parseToken(e);
  var adminRequired=(function(a){return a==='setVeicolo'||a==='eliminaVeicolo'||a==='setManutenzione'||a==='aggiornaPrenotazione'||a==='aggiornaPrenotazioneCompleta'||a==='eliminaPrenotazione'||a==='aggiornaStatoPrenotazione'||a==='aggiornaStato'||a==='confermaPrenotazione'||a==='sincronizzaClienti'||a==='importaPrenotazioniICS'||a==='importaPrenotazioniCSV'||a==='setConfigProps';})(action);
  if(adminRequired&&!isAdmin(token)){return json({success:false,message:'Admin required'},403)}
  if(action==='requestAdminOTP'){var name=String(body.name||p.name||'').trim()||'Admin';var code=(''+Math.floor(100000+Math.random()*900000));var ttl=(CONFIG&&CONFIG.SECURITY&&CONFIG.SECURITY.OTP_TTL_MINUTES?CONFIG.SECURITY.OTP_TTL_MINUTES:5)*60;var exp=nowSec()+ttl;getProps().setProperty('OTP:'+name,JSON.stringify({code:code,exp:exp}));try{if(typeof inviaOTPAdmin==='function'){inviaOTPAdmin(name, code)}}catch(_){ }var res={success:true};var dbgFlag=(String(p.debug||body.debug||'')==='1')||(CONFIG&&CONFIG.SECURITY&&CONFIG.SECURITY.DEBUG_OTP);if(dbgFlag){res.debugOtp=code}try{logSecurityEvent('admin_otp_request',{name:name})}catch(__){}return json(res)}
  if(action==='adminLogin'){var name=String(body.name||p.name||'').trim()||'Admin';var otp=String(body.otp||p.otp||'').trim();var raw=getProps().getProperty('OTP:'+name);if(!raw){try{incFailedLogin(name)}catch(__){}return json({success:false,message:'OTP missing'})}var o;try{o=JSON.parse(raw)}catch(_){o=null}if(!o||o.exp<nowSec()||o.code!==otp){try{incFailedLogin(name)}catch(__){}return json({success:false,message:'OTP invalid'})}getProps().deleteProperty('OTP:'+name);var msgRaw=getProps().getProperty('OTPMSG:'+name);if(msgRaw){try{var m=JSON.parse(msgRaw);if(m&&m.chat_id&&Array.isArray(m.message_ids)&&typeof deleteTelegramMessage==='function'){for(var i=0;i<m.message_ids.length;i++){try{deleteTelegramMessage(m.chat_id,m.message_ids[i])}catch(__){}}}}catch(_){ }getProps().deleteProperty('OTPMSG:'+name)}var exp=nowSec()+3600;var payload={name:name,role:'admin',exp:exp,iat:nowSec()};var jwt=createJWT(payload);var csrfToken=generateCSRFToken(jwt);try{logAdminAction(jwt,'adminLogin',{})}catch(__){}return json({success:true,token:jwt,csrfToken:csrfToken,role:'admin',exp:new Date(exp*1000).toISOString(),name:name})}
  // RIMOSSO: devLogin disabilitato per motivi di sicurezza
  if(action==='revokeSession'){var t=token||String(body.token||p.token||'');if(!t){return json({success:false,message:'token required'})}revokeSession(t);return json({success:true})}
  if(action==='login'&&typeof login==='function'){var cfRaw=String(body.codiceFiscale||body.cf||'').trim().toUpperCase();var validCF=/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cfRaw);if(!validCF){return json({success:false,message:'Codice Fiscale non valido'},400)}return login(body)}
  if(action==='getVeicoli'&&typeof getVeicoli==='function'){return getVeicoli(body)}
  if(action==='getPrenotazioni'&&typeof getPrenotazioni==='function'){return getPrenotazioni(body)}
  if(action==='getCliente'&&typeof getCliente==='function'){return getCliente(body)}
  if(action==='ocrDocument'&&typeof ocrDocument==='function'){return ocrDocument(body)}
  if(action==='creaPrenotazione'&&typeof creaPrenotazione==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return creaPrenotazione(body)
  }
  if(action==='aggiornaPrenotazione'&&typeof aggiornaPrenotazioneCompleta==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var r=aggiornaPrenotazioneCompleta(body);try{logAdminAction(token,'aggiornaPrenotazione',{})}catch(__){}return r
  }
  if(action==='aggiornaPrenotazioneCompleta'&&typeof aggiornaPrenotazioneCompleta==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return aggiornaPrenotazioneCompleta(body)
  }
  if(action==='aggiornaStatoPrenotazione'&&typeof aggiornaStatoPrenotazione==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var r2=aggiornaStatoPrenotazione(body);try{logAdminAction(token,'aggiornaStatoPrenotazione',{})}catch(__){}return r2
  }
  if(action==='aggiornaStato'&&typeof aggiornaStatoPrenotazione==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return aggiornaStatoPrenotazione(body)
  }
  if(action==='eliminaPrenotazione'&&typeof eliminaPrenotazione==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var r3=eliminaPrenotazione(body);try{logAdminAction(token,'eliminaPrenotazione',{})}catch(__){}return r3
  }
  if(action==='confermaPrenotazione'&&typeof confermaPrenotazione==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var r4=confermaPrenotazione(body);try{logAdminAction(token,'confermaPrenotazione',{})}catch(__){}return r4
  }
  if(action==='aggiornaAutistiPubblico'&&typeof aggiornaAutistiPubblico==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return aggiornaAutistiPubblico(body)
  }
  if(action==='aggiornaAutistiPubblico_secure'){
    var s=getSession(token);
    if(!s){return json({success:false,message:'Auth required'},401)}
    var cfBody=String(body.codiceFiscale||body.cf||'').trim().toUpperCase();
    var cfTok=String((s.cf||'')).trim().toUpperCase();
    if(s.role!=='admin' && cfBody && cfTok && cfBody!==cfTok){return json({success:false,message:'Forbidden'},403)}
    if(typeof aggiornaAutistiPubblico==='function'){return aggiornaAutistiPubblico(body)}
    return json({success:false,message:'Funzione non disponibile'})
  }
  if(action==='setVeicolo'&&typeof setVeicolo==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var rv=setVeicolo(body);try{logAdminAction(token,'setVeicolo',{})}catch(__){}return rv
  }
  if(action==='eliminaVeicolo'&&typeof eliminaVeicolo==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var rv2=eliminaVeicolo(body);try{logAdminAction(token,'eliminaVeicolo',{})}catch(__){}return rv2
  }
  if(action==='setManutenzione'&&typeof setManutenzione==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var rm=setManutenzione(body);try{logAdminAction(token,'setManutenzione',{})}catch(__){}return rm
  }
  if(action==='sincronizzaClienti'&&typeof sincronizzaClienti==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return sincronizzaClienti(body)
  }
  if(action==='importaPrenotazioniICS'&&typeof importaPrenotazioniICS==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return importaPrenotazioniICS(body)
  }
  if(action==='importaPrenotazioniCSV'&&typeof importaPrenotazioniCSV==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return importaPrenotazioniCSV(body)
  }
  if(action==='setConfigProps'&&typeof setConfigProps==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return setConfigProps(body)
  }
  if(action==='aggiornaCliente'&&typeof aggiornaCliente==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return aggiornaCliente(body)
  }
  if(action==='creaCliente'&&typeof creaCliente==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return creaCliente(body)
  }
  if(action==='importaPrenotazioniCSV'&&typeof importaPrenotazioniCSV==='function'){return importaPrenotazioniCSV(body)}
  if(action==='inviaRiepilogo'&&typeof inviaEmailConfermaPreventivo==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    return inviaEmailConfermaPreventivo(body)
  }
  if(action==='setConfigProps'&&typeof setConfigProps==='function'){return setConfigProps(body)}
  if(action==='generaPdfUltimaRiga'&&typeof generaPdfUltimaRiga==='function'){return json(generaPdfUltimaRiga(body))}
  if(action==='generaPDFContratto'&&typeof generaPDFContratto==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var gp=generaPDFContratto(String(body.idPrenotazione||body.id||body.ID||''), token);try{logAdminAction(token,'generaPDFContratto',{})}catch(__){}return json(gp)
  }
  if(action==='eliminaPDFPrenotazione'&&typeof eliminaPDFPrenotazione==='function'){
    var csrfToken=String(body.csrfToken||p.csrfToken||'');
    if(!csrfToken||!validateCSRFToken(token,csrfToken)){return json({success:false,message:'CSRF token invalid'},403)}
    var ep=eliminaPDFPrenotazione(String(body.idPrenotazione||body.id||body.ID||''), token);try{logAdminAction(token,'eliminaPDFPrenotazione',{})}catch(__){}return json(ep)
  }
  return createJsonResponse({success:false,message:'Azione non supportata'})}
