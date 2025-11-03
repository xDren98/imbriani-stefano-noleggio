/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.0 UNIFICATO (Code.gs)
 * - Disponibilità reale (fasce 08–22 ogni 2h, rientro → fascia successiva)
 * - Prenotazione BOOK-YYYY-### con upsert Clienti
 * - Autocompleta Cliente (CF) con fallback da Prenotazioni
 * - Invio riepilogo (solo se email fornita)
 * - Dashboard Admin: flotta, manutenzioni, modifica stato con email
 */

const CONFIG = {
  VERSION: '8.0.0',
  TOKEN: 'imbriani_secret_2025',
  SHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  DEBUG: true,
  MAX_TIMESTAMP_AGE: 600000, // 10 min
  SHEETS: { PRENOTAZIONI:'Risposte del modulo 1', CLIENTI:'Clienti', VEICOLI:'Gestione pulmini', MANUTENZIONI:'Gestione manutenzioni' }
};

// Mappatura colonne (0-based) del foglio "Risposte del modulo 1"
CONFIG.PREN_COLS = {
  NAME: 0, DATA_NASCITA: 1, LUOGO_NASCITA: 2, CF: 3, COMUNE: 4, VIA: 5, CIVICO: 6,
  NUMERO_PATENTE: 7, INIZIO_PATENTE: 8, SCADENZA_PATENTE: 9, TARGA: 10,
  ORA_INIZIO: 11, ORA_FINE: 12, GIORNO_INIZIO: 13, GIORNO_FINE: 14,
  DESTINAZIONE: 15, CELLULARE: 16, DATA_CONTRATTO: 17,
  // Autista 2 (18–27)
  NOME2: 18, DATA_NASCITA2: 19, LUOGO_NASCITA2: 20, CF2: 21, COMUNE2: 22, VIA2: 23, CIVICO2: 24, NUMERO_PATENTE2: 25, INIZIO_PATENTE2: 26, SCADENZA_PATENTE2: 27,
  // Autista 3 (28–37)
  NOME3: 28, DATA_NASCITA3: 29, LUOGO_NASCITA3: 30, CF3: 31, COMUNE3: 32, VIA3: 33, CIVICO3: 34, NUMERO_PATENTE3: 35, INIZIO_PATENTE3: 36, SCADENZA_PATENTE3: 37,
  // Prenotazione
  ID_PREN: 38, STATO_PRENOTAZIONE: 39, IMPORTO_PREVENTIVO: 40, EMAIL: 41, TEST: 42
};

// ===== Entry points =====
function doGet(e){try{const v=validateRequest(e);if(!v.valid)return respond(false,null,v.error,400);const p=e.parameter||{};switch(p.action){
  case 'creaPrenotazione':return creaPrenotazione(p);
  case 'autocompletaCliente':return autocompletaClienteWithFallback(p);
  case 'inviaRiepilogo':return inviaRiepilogo(p);
  case 'disponibilita':return handleDisponibilita(p);
  case 'flotta':return handleFlotta(p);
  case 'manutenzioni':return handleManutenzioni(p);
  case 'modificaStato':return handleModificaStato(p);
  case 'login':return handleLogin(p);
  case 'recuperaPrenotazioni':return handleRecuperaPrenotazioni(p);
  default:return respond(false,null,'Azione non supportata',400);
}}catch(err){return respond(false,null,'Errore interno: '+err.message,500)}}
function doPost(e){return doGet(e)}

// ===== Infra =====
function respond(success,data,message,code){return ContentService.createTextOutput(JSON.stringify({success,data,message:message||'',code:code||200,timestamp:new Date().toISOString(),version:CONFIG.VERSION})).setMimeType(ContentService.MimeType.JSON)}
function ss(){return SpreadsheetApp.openById(CONFIG.SHEET_ID)}
function validateRequest(e){const p=e.parameter||{};const ts=parseInt(p.ts);if(p.token!==CONFIG.TOKEN)return{valid:false,error:'Token non valido'};if(!ts||isNaN(ts))return{valid:false,error:'Timestamp mancante'};if(Math.abs(Date.now()-ts)>CONFIG.MAX_TIMESTAMP_AGE)return{valid:false,error:'Timestamp scaduto'};return{valid:true}}

// ===== Disponibilità v8 =====
const TIME_SLOTS = ['08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];
function handleDisponibilita(p){try{const startReq=mergeDateTime(p.dataInizio,p.oraInizio||'08:00');const endReq=mergeDateTime(p.dataFine,p.oraFine||'20:00');const flotta=JSON.parse(getFlottaRaw());const man=JSON.parse(getManutenzioniRaw());
  const manAttive=man.filter(m=>{const st=(m.Stato||'').toLowerCase();if(!(st.includes('programma')||st.includes('corso')))return false;const s=toDateSafe(m.DataInizio),f=toDateSafe(m.DataFine)||s;return s&&s<=endReq&&f>=startReq});
  const manSet=new Set(manAttive.map(m=>String(m.Targa||'').trim()).filter(Boolean));
  const pren= getPrenotazioniAttive();
  const occ=new Set();
  pren.forEach(pr=>{ if((pr.Stato||'').toLowerCase()==='annullata')return; const s=mergeDateTime(pr.DataInizio,pr.OraInizio), e=mergeDateTime(pr.DataFine,pr.OraFine); const eAdj=new Date(e.getTime()+2*60*60*1000); if(s<endReq && eAdj>startReq) occ.add(pr.Targa); });
  flotta.forEach(v=>{ if(manSet.has(v.Targa)){v.Stato='Manutenzione';v.Disponibile=false} else if(occ.has(v.Targa)){v.Stato='Occupato';v.Disponibile=false} else { const base=(v.Stato||'').toLowerCase(); v.Disponibile=base.includes('disponibile')||!base.includes('manutenzione'); }});
  const disponibili=flotta.filter(v=>v.Disponibile);
  let suggerimenti=[]; if(disponibili.length===0){ suggerimenti=calcolaSuggerimentiAlternativi(startReq,endReq,flotta,pren); }
  return respond(true,{disponibili,totaleFlotta:flotta.length,suggerimenti},`${disponibili.length} disponibili${suggerimenti.length?`, ${suggerimenti.length} suggerimenti`:''}`)
}catch(e){return respond(false,{disponibili:[]},'Errore disponibilità: '+e.message,500)}}
function getPrenotazioniAttive(){const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);if(!sh)return[];const d=sh.getDataRange().getValues();const H=CONFIG.PREN_COLS;const out=[];for(let i=1;i<d.length;i++){const r=d[i];if(r[H.TARGA]) out.push({Targa:r[H.TARGA],DataInizio:r[H.GIORNO_INIZIO],OraInizio:r[H.ORA_INIZIO]||'08:00',DataFine:r[H.GIORNO_FINE],OraFine:r[H.ORA_FINE]||'20:00',Stato:r[H.STATO_PRENOTAZIONE]||'Da Confermare'});}return out}
function calcolaSuggerimentiAlternativi(startReq,endReq,flotta,pren){const sug=[];const durata=endReq.getTime()-startReq.getTime();flotta.filter(v=>!v.Disponibile&&v.Stato==='Occupato').forEach(v=>{const slot=trovaSlotLibero(v.Targa,startReq,durata,pren);if(slot){sug.push({targa:v.Targa,marca:v.Marca,modello:v.Modello,dataInizioSuggerita:slot.dataInizio,oraInizioSuggerita:slot.oraInizio,dataFineSuggerita:slot.dataFine,oraFineSuggerita:slot.oraFine,motivoOriginale:'Occupato nella fascia richiesta'})}});return sug.slice(0,3)}
function trovaSlotLibero(targa,startReq,durata,pren){for(let deltaDays=0;deltaDays<=7;deltaDays++){for(let delta of [0,1,-1,2,-2,3,-3]){const base=new Date(startReq);base.setDate(base.getDate()+deltaDays);const hour=startReq.getHours();const idx=TIME_SLOTS.findIndex(f=>parseInt(f.split(':')[0])>=hour);const idx2=idx+delta; if(idx2<0||idx2>=TIME_SLOTS.length)continue;const ora=TIME_SLOTS[idx2];const [h,m]=ora.split(':').map(Number);base.setHours(h,m,0,0);const fine=new Date(base.getTime()+durata);const clash=pren.some(p=>{if(p.Targa!==targa)return false; if((p.Stato||'').toLowerCase()==='annullata')return false; const s=mergeDateTime(p.DataInizio,p.OraInizio), e=mergeDateTime(p.DataFine,p.OraFine), eAdj=new Date(e.getTime()+2*60*60*1000); return s<fine && eAdj>base;}); if(!clash){return{dataInizio:base.toISOString().split('T')[0],oraInizio:ora,dataFine:fine.toISOString().split('T')[0],oraFine:String(fine.getHours()).padStart(2,'0')+':00'};}}}return null}

// ===== Booking =====
function creaPrenotazione(p){try{if(!p.targa||!p.dataInizio||!p.dataFine)return respond(false,{},'Targa, date obbligatorie',400);if(!p.drv1_CF||p.drv1_CF.length!==16)return respond(false,{},'CF primo autista non valido',400);if(!p.drv1_Nome||!p.drv1_NumeroPatente)return respond(false,{},'Nome e patente primo autista obbligatori',400);const id=generaIdPrenotazione();const now=new Date();const H=CONFIG.PREN_COLS;const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);if(!sh)throw new Error('Foglio prenotazioni non trovato');const row=new Array(43).fill('');row[H.NAME]=p.drv1_Nome||'';row[H.DATA_NASCITA]=p.drv1_DataNascita||'';row[H.LUOGO_NASCITA]=p.drv1_LuogoNascita||'';row[H.CF]=(p.drv1_CF||'').toUpperCase();row[H.COMUNE]=p.drv1_ComuneResidenza||'';row[H.VIA]=p.drv1_ViaResidenza||'';row[H.CIVICO]=p.drv1_CivicoResidenza||'';row[H.NUMERO_PATENTE]=p.drv1_NumeroPatente||'';row[H.INIZIO_PATENTE]=p.drv1_DataInizioPatente||'';row[H.SCADENZA_PATENTE]=p.drv1_ScadenzaPatente||'';row[H.TARGA]=p.targa;row[H.ORA_INIZIO]=p.oraInizio||'08:00';row[H.ORA_FINE]=p.oraFine||'20:00';row[H.GIORNO_INIZIO]=p.dataInizio;row[H.GIORNO_FINE]=p.dataFine;row[H.DESTINAZIONE]=p.destinazione||'';row[H.CELLULARE]=p.drv1_Cellulare||'';row[H.DATA_CONTRATTO]=toISO(now);row[H.ID_PREN]=id;row[H.STATO_PRENOTAZIONE]='Da Confermare';row[H.EMAIL]=p.drv1_Email||'';sh.appendRow(row);
  // Upsert clienti (1..3)
  [1,2,3].forEach(n=>{const cf=(p[`drv${n}_CF`]||'').toUpperCase();if(cf&&cf.length===16){upsertCliente({CF:cf,Nome:p[`drv${n}_Nome`]||'',DataNascita:p[`drv${n}_DataNascita`]||'',LuogoNascita:p[`drv${n}_LuogoNascita`]||'',ComuneResidenza:p[`drv${n}_ComuneResidenza`]||'',ViaResidenza:p[`drv${n}_ViaResidenza`]||'',CivicoResidenza:p[`drv${n}_CivicoResidenza`]||'',NumeroPatente:p[`drv${n}_NumeroPatente`]||'',DataInizioPatente:p[`drv${n}_DataInizioPatente`]||'',ScadenzaPatente:p[`drv${n}_ScadenzaPatente`]||'',Cellulare:p[`drv${n}_Cellulare`]||'',Email:p[`drv${n}_Email`]||''})}});
  return respond(true,{id},'Prenotazione creata: '+id)
}catch(e){return respond(false,{},'Errore creazione: '+e.message,500)}}
function generaIdPrenotazione(){const anno=new Date().getFullYear();const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const d=sh.getDataRange().getValues();let max=0;const pref=`BOOK-${anno}-`;for(let i=1;i<d.length;i++){const id=String(d[i][CONFIG.PREN_COLS.ID_PREN]||'');if(id.startsWith(pref)){const n=parseInt(id.replace(pref,''))||0;max=Math.max(max,n)}}return `${pref}${String(max+1).padStart(3,'0')}`}

// ===== Clienti =====
function autocompletaCliente(p){try{const cf=(p.cf||'').toUpperCase().trim();if(!cf||cf.length!==16)return respond(false,{},'CF non valido',400);const sh=ss().getSheetByName(CONFIG.SHEETS.CLIENTI);if(!sh)return respond(false,{},'Foglio Clienti non trovato',500);const data=sh.getDataRange().getValues();const headers=data[0];let row=null;for(let i=1;i<data.length;i++){if((data[i][headers.indexOf('CF')]||'').toString().toUpperCase()===cf){row=data[i];break}}if(!row)return respond(false,{},'Cliente non trovato',404);const m=h=>row[headers.indexOf(h)]||'';return respond(true,{CF:m('CF'),Nome:m('Nome'),DataNascita:m('DataNascita'),LuogoNascita:m('LuogoNascita'),ComuneResidenza:m('ComuneResidenza'),ViaResidenza:m('ViaResidenza'),CivicoResidenza:m('CivicoResidenza'),NumeroPatente:m('NumeroPatente'),DataInizioPatente:m('DataInizioPatente'),ScadenzaPatente:m('ScadenzaPatente'),Cellulare:m('Cellulare'),Email:m('Email')},'OK')}catch(e){return respond(false,{},'Errore ricerca cliente: '+e.message,500)}}
function autocompletaClienteWithFallback(p){const r=autocompletaCliente(p);if(r.success)return r;try{const cf=(p.cf||'').toUpperCase().trim();const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const d=sh.getDataRange().getValues();const H=CONFIG.PREN_COLS;for(let i=1;i<d.length;i++){const x=d[i];if(x[H.CF]===cf){return respond(true,{CF:x[H.CF],Nome:x[H.NAME],DataNascita:x[H.DATA_NASCITA],LuogoNascita:x[H.LUOGO_NASCITA],ComuneResidenza:x[H.COMUNE],ViaResidenza:x[H.VIA],CivicoResidenza:x[H.CIVICO],NumeroPatente:x[H.NUMERO_PATENTE],DataInizioPatente:x[H.INIZIO_PATENTE],ScadenzaPatente:x[H.SCADENZA_PATENTE],Cellulare:x[H.CELLULARE],Email:x[H.EMAIL]},'OK (fallback)')}}return r}catch(e){return r}}
function upsertCliente(c){const sh=ss().getSheetByName(CONFIG.SHEETS.CLIENTI);if(!sh)return;const d=sh.getDataRange().getValues();const H=d[0];let row=-1;for(let i=1;i<d.length;i++){if((d[i][H.indexOf('CF')]||'')===c.CF){row=i+1;break}}const order=['Nome','DataNascita','LuogoNascita','CF','ComuneResidenza','ViaResidenza','CivicoResidenza','NumeroPatente','DataInizioPatente','ScadenzaPatente','Cellulare','Email'];const arr=order.map(h=>c[h]||'');if(row>0){sh.getRange(row,1,1,arr.length).setValues([arr])}else{sh.appendRow(arr)}}

// ===== Email =====
function inviaRiepilogo(p){try{const id=p.idPrenotazione, email=(p.email||'').trim();if(!id)return respond(false,{},'ID mancante',400);if(!email)return respond(false,{},'Email non fornita',400);const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const d=sh.getDataRange().getValues();const H=CONFIG.PREN_COLS;let rec=null;for(let i=1;i<d.length;i++){if(d[i][H.ID_PREN]===id){rec=d[i];break}}if(!rec)return respond(false,{},'Prenotazione non trovata',404);const targa=rec[H.TARGA];let veicolo=targa;try{const flotta=JSON.parse(getFlottaRaw());const v=flotta.find(x=>x.Targa===targa);if(v){veicolo=`${v.Marca} ${v.Modello} (${v.Targa})${(v.PassoLungo||v.Targa==='EC787NM')?' - Passo Lungo':''}`}}catch(e){}
  const oggetto=`Riepilogo Prenotazione ${id} - Imbriani Stefano Noleggio`;
  const link=`https://imbriani-noleggio.vercel.app/?login=${encodeURIComponent(rec[H.NAME]||'')}`;
  const body=`ID: ${id}\nVeicolo: ${veicolo}\nRitiro: ${formatDateForEmail(rec[H.GIORNO_INIZIO])} ${rec[H.ORA_INIZIO]}\nConsegna: ${formatDateForEmail(rec[H.GIORNO_FINE])} ${rec[H.ORA_FINE]}\nDestinazione: ${rec[H.DESTINAZIONE]}\n\nArea personale: ${link}`;
  MailApp.sendEmail({to:email,subject:oggetto,body:body});
  return respond(true,{email,id},'Email inviata')
}catch(e){return respond(false,{},'Errore invio email: '+e.message,500)}}

// ===== Flotta/Manutenzioni/Admin =====
function handleFlotta(p){try{const sh=ss().getSheetByName(CONFIG.SHEETS.VEICOLI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0])out.push({Targa:r[0],Marca:r[1]||'',Modello:r[2]||'',Posti:parseInt(r[3])||9,Stato:r[4]||'Disponibile',Note:r[5]||'',PassoLungo:(r[0]==='EC787NM'),Disponibile:(String(r[4]||'').toLowerCase().includes('disponibile'))})}return respond(true,out,`${out.length} veicoli`)}catch(e){return respond(false,[],'Errore flotta',500)}}
function handleManutenzioni(p){try{const sh=ss().getSheetByName(CONFIG.SHEETS.MANUTENZIONI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0])out.push({ID:i,Targa:r[0],Marca:r[1]||'',Modello:r[2]||'',Posti:parseInt(r[3])||9,Stato:r[4]||'',DataInizio:toISO(r[5])||'',DataFine:toISO(r[6])||'',Costo:r[7]||0,Note:r[8]||''})}return respond(true,out,`${out.length} manutenzioni`)}catch(e){return respond(false,[],'Errore manutenzioni',500)}}
function handleModificaStato(p){const id=p.idPrenotazione||'', nuovo=p.nuovoStato||'';if(!id||!nuovo)return respond(false,{},'ID e stato richiesti',400);try{const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const d=sh.getDataRange().getValues();const H=CONFIG.PREN_COLS;for(let i=1;i<d.length;i++){if(d[i][H.ID_PREN]===id){sh.getRange(i+1,H.STATO_PRENOTAZIONE+1).setValue(nuovo);const email=d[i][H.EMAIL];if(email&&nuovo.toLowerCase()==='confermata'){MailApp.sendEmail({to:email,subject:`Conferma ${id}`,body:`La tua prenotazione ${id} è stata confermata.`})}return respond(true,{old:d[i][H.STATO_PRENOTAZIONE],nuovo},'Stato aggiornato')}}return respond(false,{},'Prenotazione non trovata',404)}catch(e){return respond(false,{},'Errore: '+e.message,500)}}

// ===== Login/Area Personale =====
function handleLogin(p){try{const cf=(p.cf||'').toUpperCase().trim();if(!cf||cf.length!==16)return respond(false,{},'CF non valido',400);const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const d=sh.getDataRange().getValues();const H=CONFIG.PREN_COLS;for(let i=1;i<d.length;i++){const r=d[i];if((r[H.CF]||'').toString().toUpperCase()===cf){return respond(true,{nome:r[H.NAME]||'',cf,telefono:r[H.CELLULARE]||''},'Login OK')}}return respond(false,{},'Utente non trovato',404)}catch(e){return respond(false,{},'Errore login',500)}}
function handleRecuperaPrenotazioni(p){try{const cf=(p.cf||'').toUpperCase().trim();if(!cf)return respond(false,{},'CF mancante',400);const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const d=sh.getDataRange().getValues();const H=CONFIG.PREN_COLS;const out=[];for(let i=1;i<d.length;i++){const r=d[i];if(cf==='ALL'||(r[H.CF]&&String(r[H.CF]).toUpperCase()===cf)){out.push({ID:r[H.ID_PREN]||'',NomeCompleto:r[H.NAME]||'',CF:r[H.CF]||'',Targa:r[H.TARGA]||'',DataRitiro:r[H.GIORNO_INIZIO]||'',OraRitiro:r[H.ORA_INIZIO]||'',DataConsegna:r[H.GIORNO_FINE]||'',OraConsegna:r[H.ORA_FINE]||'',Destinazione:r[H.DESTINAZIONE]||'',Stato:r[H.STATO_PRENOTAZIONE]||'Da Confermare'})}}return respond(true,out,`${out.length} prenotazioni`)}catch(e){return respond(false,[],'Errore: '+e.message,500)}}

// ===== Helpers =====
function getFlottaRaw(){const sh=ss().getSheetByName(CONFIG.SHEETS.VEICOLI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0])out.push({Targa:r[0],Marca:r[1]||'',Modello:r[2]||'',Posti:parseInt(r[3])||9,Stato:r[4]||'Disponibile',Note:r[5]||'',PassoLungo:(r[0]==='EC787NM'),Disponibile:(String(r[4]||'').toLowerCase().includes('disponibile'))})}return JSON.stringify(out)}
function getManutenzioniRaw(){const sh=ss().getSheetByName(CONFIG.SHEETS.MANUTENZIONI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0])out.push({ID:i,Targa:r[0],Stato:r[4]||'',DataInizio:toISO(r[5])||'',DataFine:toISO(r[6])||''})}return JSON.stringify(out)}
function toISO(v){try{if(!v)return'';if(v instanceof Date)return v.toISOString().split('T')[0];if(typeof v==='string'){if(v.includes('/')){const a=v.split('/');if(a.length===3){const d=new Date(a[2],a[1]-1,a[0]);return isNaN(d.getTime())?'':d.toISOString().split('T')[0]}}const d=new Date(v);return isNaN(d.getTime())?'':d.toISOString().split('T')[0]}return''}catch{return''}}
function toDateSafe(s){try{if(!s)return null;const d=(s instanceof Date)?s:new Date(s);return isNaN(d.getTime())?null:d}catch{return null}}
function mergeDateTime(d,t){try{const date=toDateSafe(d)||new Date();const [h,m]=(t||'00:00').split(':').map(Number);const out=new Date(date);out.setHours(h||0,m||0,0,0);return out}catch{return new Date(0)}}
function formatDateForEmail(x){const d=toDateSafe(x);if(!d)return String(x||'');const dd=String(d.getDate()).padStart(2,'0'),mm=String(d.getMonth()+1).padStart(2,'0'),yy=d.getFullYear();return `${dd}/${mm}/${yy}`}
