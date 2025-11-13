function handleGet(e){var p=(e&&e.parameter)||{};var action=String(p.action||'').trim();var token=parseToken(e);
  if(action==='debugAuth'){var i=getSessionInfo(token);var resp=createJsonResponse({success:true,sessionValid:i.sessionValid,sessionRole:i.sessionRole});return resp}
  if(action==='getVeicoli'&&typeof getVeicoli==='function'){var noc=String(p.nocache||'')==='1';var k='getVeicoli:'+JSON.stringify(p||{});var c=CacheService.getScriptCache();if(!noc){var hit=c.get(k);if(hit){return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON)}}var r=getVeicoli(p);try{var t=r.getContent();if(!noc&&t)c.put(k,t,120)}catch(_){ }return r}
  if(action==='disponibilita'&&typeof checkDisponibilita==='function'){var rd=checkDisponibilita(p);return rd}
  if(action==='bulkCheckDisponibilita'&&typeof bulkCheckDisponibilita==='function'){var rb=bulkCheckDisponibilita(p);return rb}
  if(action==='firstAvailableSlot'&&typeof firstAvailableSlot==='function'){var rf=firstAvailableSlot(p);return rf}
  if(action==='getPrenotazioni'&&typeof getPrenotazioni==='function'){var noc2=String(p.nocache||'')==='1';var k2='getPrenotazioni:'+JSON.stringify(p||{});var c2=CacheService.getScriptCache();if(!noc2){var hit2=c2.get(k2);if(hit2){return ContentService.createTextOutput(hit2).setMimeType(ContentService.MimeType.JSON)}}var r2=getPrenotazioni(p);try{var t2=r2.getContent();if(!noc2&&t2)c2.put(k2,t2,120)}catch(_){ }return r2}
  if(action==='getCliente'&&typeof getCliente==='function'){var cf=String(p.codiceFiscale||p.cf||'').trim().toUpperCase();var noc3=String(p.nocache||'')==='1';var k3='getCliente:'+cf;var c3=CacheService.getScriptCache();if(!noc3&&cf.length===16){var hit3=c3.get(k3);if(hit3){return ContentService.createTextOutput(hit3).setMimeType(ContentService.MimeType.JSON)}}var rc=getCliente(p);try{var t3=rc.getContent();if(!noc3&&t3&&cf.length===16)c3.put(k3,t3,60)}catch(_){ }return rc}
  if(action==='getSheet'&&typeof getSheetGeneric==='function'){var rs=getSheetGeneric(p);return rs}
  if(action==='health'){var rh=createJsonResponse({success:true,timestamp:new Date().toISOString()});return rh}
  if(action==='version'){var rv=createJsonResponse(versionInfo());return rv}
  if(action==='configStatus'){
    var keys=['SPREADSHEET_ID','GOOGLE_VISION_API_KEY','TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','EMAIL_FROM_EMAIL','PDF_TEMPLATE_DOC_ID','PDF_FOLDER_ID','SESSION_TTL_MINUTES','JWT_SECRET'];
    var props=PropertiesService.getScriptProperties();
    var status={};
    for(var i=0;i<keys.length;i++){var k=keys[i];var v=props.getProperty(k);status[k]=!!(v&&String(v).trim());}
    return createJsonResponse({success:true,status:status});
  }
  if(action==='search'){
    var entity=String(p.entity||'').toLowerCase();
    var q=String(p.q||p.query||'').trim();
    var limit=parseInt(p.limit,10); if(isNaN(limit)||limit<=0) limit=50;
    var offset=parseInt(p.offset,10); if(isNaN(offset)||offset<0) offset=0;
    var resObj={success:true,data:[],count:0,total:0};
    if(entity==='clienti'){
      var snap=getClientsSnapshot();
      var tokens=q?normalizeKey(q).split(' '):[];
      var filtered=snap.data.filter(function(it){
        var s=normalizeKey(it.nome+' '+it.cf+' '+it.email+' '+it.cellulare);
        for(var i=0;i<tokens.length;i++){ if(tokens[i] && s.indexOf(tokens[i])===-1) return false; }
        return true;
      });
      var total=filtered.length;
      var sliced=filtered.slice(offset, offset+limit);
      resObj.data=sliced; resObj.count=sliced.length; resObj.total=total;
      var jr=createJsonResponse(resObj);
      return jr;
    }
    if(entity==='veicoli'){
      var noc=String(p.nocache||'')==='1';
      var key='GET_VEICOLI_V1';
      var c=CacheService.getScriptCache();
      var hit=c.get(key);
      var payload=hit?JSON.parse(hit):null;
      if(!payload){ var r=getVeicoli({}); try{ var t=r.getContent(); payload=JSON.parse(t); c.put(key,t,120); }catch(_){ payload=null } }
      var arr=(payload&&payload.data)?payload.data:[];
      var tokens2=q?normalizeKey(q).split(' '):[];
      var filtered2=arr.filter(function(v){
        var s=normalizeKey((v.Targa||'')+' '+(v.Marca||'')+' '+(v.Modello||''));
        for(var i=0;i<tokens2.length;i++){ if(tokens2[i] && s.indexOf(tokens2[i])===-1) return false; }
        return true;
      });
      var total2=filtered2.length;
      var sliced2=filtered2.slice(offset, offset+limit);
      resObj.data=sliced2; resObj.count=sliced2.length; resObj.total=total2;
      var jr2=createJsonResponse(resObj);
      return jr2;
    }
    if(entity==='prenotazioni'){
      var snapP=getPrenotazioniSnapshot();
      var tokensP=q?normalizeKey(q).split(' '):[];
      var filteredP=snapP.data.filter(function(it){
        var s=normalizeKey((it.nome1||'')+' '+(it.nome2||'')+' '+(it.nome3||'')+' '+(it.targa||'')+' '+(it.destinazione||'')+' '+(it.stato||''));
        for(var i=0;i<tokensP.length;i++){ if(tokensP[i] && s.indexOf(tokensP[i])===-1) return false; }
        return true;
      });
      var totalP=filteredP.length;
      var slicedP=filteredP.slice(offset, offset+limit);
      resObj.data=slicedP; resObj.count=slicedP.length; resObj.total=totalP;
      var jrp=createJsonResponse(resObj);
      return jrp;
    }
    var jrn=createJsonResponse({success:false,message:'Entità non supportata'});
    return jrn;
  }
  var rna=createJsonResponse({success:false,message:'Azione non supportata'});return rna}
