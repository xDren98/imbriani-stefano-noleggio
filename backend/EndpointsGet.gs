function handleGet(e){var p=(e&&e.parameter)||{};var action=String(p.action||'').trim();var token=parseToken(e);
  if(action==='debugAuth'){var i=getSessionInfo(token);var resp=createJsonResponse({success:true,sessionValid:i.sessionValid,sessionRole:i.sessionRole});if(p.callback){var cb=String(p.callback);var cnt=resp.getContent();return ContentService.createTextOutput(cb+'('+cnt+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return resp}
  if(action==='getVeicoli'&&typeof getVeicoli==='function'){var noc=String(p.nocache||'')==='1';var k='getVeicoli:'+JSON.stringify(p||{});var c=CacheService.getScriptCache();if(!noc){var hit=c.get(k);if(hit){if(p.callback){var cb=String(p.callback);return ContentService.createTextOutput(cb+'('+hit+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON)}}var r=getVeicoli(p);try{var t=r.getContent();if(!noc&&t)c.put(k,t,120)}catch(_){ }if(p.callback){var cb2=String(p.callback);var cnt2;try{cnt2=r.getContent()}catch(__){cnt2='{}'}return ContentService.createTextOutput(cb2+'('+cnt2+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return r}
  if(action==='disponibilita'&&typeof checkDisponibilita==='function'){var rd=checkDisponibilita(p);if(p.callback){var cbd=String(p.callback);var ctd;try{ctd=rd.getContent()}catch(__){ctd='{}'}return ContentService.createTextOutput(cbd+'('+ctd+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rd}
  if(action==='bulkCheckDisponibilita'&&typeof bulkCheckDisponibilita==='function'){var rb=bulkCheckDisponibilita(p);if(p.callback){var cbb=String(p.callback);var ctb;try{ctb=rb.getContent()}catch(__){ctb='{}'}return ContentService.createTextOutput(cbb+'('+ctb+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rb}
  if(action==='firstAvailableSlot'&&typeof firstAvailableSlot==='function'){var rf=firstAvailableSlot(p);if(p.callback){var cbf=String(p.callback);var ctf;try{ctf=rf.getContent()}catch(__){ctf='{}'}return ContentService.createTextOutput(cbf+'('+ctf+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rf}
  if(action==='getPrenotazioni'&&typeof getPrenotazioni==='function'){var noc2=String(p.nocache||'')==='1';var k2='getPrenotazioni:'+JSON.stringify(p||{});var c2=CacheService.getScriptCache();if(!noc2){var hit2=c2.get(k2);if(hit2){if(p.callback){var cbh=String(p.callback);return ContentService.createTextOutput(cbh+'('+hit2+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return ContentService.createTextOutput(hit2).setMimeType(ContentService.MimeType.JSON)}}var r2=getPrenotazioni(p);try{var t2=r2.getContent();if(!noc2&&t2)c2.put(k2,t2,120)}catch(_){ }if(p.callback){var cb2h=String(p.callback);var cnt2h;try{cnt2h=r2.getContent()}catch(__){cnt2h='{}'}return ContentService.createTextOutput(cb2h+'('+cnt2h+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return r2}
  if(action==='getCliente'&&typeof getCliente==='function'){var cf=String(p.codiceFiscale||p.cf||'').trim().toUpperCase();var noc3=String(p.nocache||'')==='1';var k3='getCliente:'+cf;var c3=CacheService.getScriptCache();if(!noc3&&cf.length===16){var hit3=c3.get(k3);if(hit3){if(p.callback){var cbc=String(p.callback);return ContentService.createTextOutput(cbc+'('+hit3+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return ContentService.createTextOutput(hit3).setMimeType(ContentService.MimeType.JSON)}}var rc=getCliente(p);try{var t3=rc.getContent();if(!noc3&&t3&&cf.length===16)c3.put(k3,t3,60)}catch(_){ }if(p.callback){var cbc=String(p.callback);var ctc;try{ctc=rc.getContent()}catch(__){ctc='{}'}return ContentService.createTextOutput(cbc+'('+ctc+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rc}
  if(action==='getSheet'&&typeof getSheetGeneric==='function'){var rs=getSheetGeneric(p);if(p.callback){var cbs=String(p.callback);var cts;try{cts=rs.getContent()}catch(__){cts='{}'}return ContentService.createTextOutput(cbs+'('+cts+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rs}
  if(action==='health'){var rh=createJsonResponse({success:true,timestamp:new Date().toISOString()});if(p.callback){var cbh2=String(p.callback);var cnth;try{cnth=rh.getContent()}catch(__){cnth='{}'}return ContentService.createTextOutput(cbh2+'('+cnth+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rh}
  if(action==='version'){var rv=createJsonResponse(versionInfo());if(p.callback){var cbv=String(p.callback);var cntv;try{cntv=rv.getContent()}catch(__){cntv='{}'}return ContentService.createTextOutput(cbv+'('+cntv+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rv}
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
      if(p.callback){var cba=String(p.callback);var cnta;try{cnta=jr.getContent()}catch(__){cnta='{}'}return ContentService.createTextOutput(cba+'('+cnta+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}
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
      if(p.callback){var cb2=String(p.callback);var cnt2;try{cnt2=jr2.getContent()}catch(__){cnt2='{}'}return ContentService.createTextOutput(cb2+'('+cnt2+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}
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
      if(p.callback){var cbp=String(p.callback);var cntp;try{cntp=jrp.getContent()}catch(__){cntp='{}'}return ContentService.createTextOutput(cbp+'('+cntp+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}
      return jrp;
    }
    var jrn=createJsonResponse({success:false,message:'Entità non supportata'});
    if(p.callback){var cbn2=String(p.callback);var cntn2;try{cntn2=jrn.getContent()}catch(__){cntn2='{}'}return ContentService.createTextOutput(cbn2+'('+cntn2+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}
    return jrn;
  }
  var rna=createJsonResponse({success:false,message:'Azione non supportata'});if(p.callback){var cbn=String(p.callback);var cntn;try{cntn=rna.getContent()}catch(__){cntn='{}'}return ContentService.createTextOutput(cbn+'('+cntn+')').setMimeType(ContentService.MimeType.JAVASCRIPT)}return rna}
