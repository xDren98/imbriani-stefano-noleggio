/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v7.2 COMPLETE
 * - creaPrenotazione con ID BOOK-YYYY-###, stato "Da Confermare"
 * - autocompletaCliente(cf)
 * - upsertClienti([])
 * - ricalcolaStati() + populateClientiDaPrenotazioni()
 */

const CONFIG = {
  VERSION: '7.2.0',
  TOKEN: 'imbriani_secret_2025',
  SHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  DEBUG: true,
  MAX_TIMESTAMP_AGE: 120000,
  SHEETS: { PRENOTAZIONI:'Risposte del modulo 1', CLIENTI:'Clienti', VEICOLI:'Gestione pulmini', MANUTENZIONI:'Registro manutenzioni' },
  PREN_COLS: { TIMESTAMP:0,NOME:1,DATA_NASCITA:2,LUOGO_NASCITA:3,CF:4,COMUNE_RESIDENZA:5,VIA_RESIDENZA:6,CIVICO_RESIDENZA:7,NUMERO_PATENTE:8,INIZIO_PATENTE:9,SCADENZA_PATENTE:10,TARGA:11,ORA_INIZIO:12,ORA_FINE:13,GIORNO_INIZIO:14,GIORNO_FINE:15,DESTINAZIONE:16,CELLULARE:17,DATA_CONTRATTO:18,ID_PRENOTAZIONE:39,STATO_PRENOTAZIONE:40,IMPORTO_PREVENTIVO:41,NOTE:42,EMAIL:43 }
};

function doGet(e){try{const v=validateRequest(e);if(!v.valid)return respond(false,null,v.error,400);const p=e.parameter;switch(p.action){case 'creaPrenotazione':return handleCreaPrenotazione(p);case 'autocompletaCliente':return handleAutocompletaCliente(p);case 'ricalcolaStati':return handleRicalcolaStati();default:return proxyLegacy(e)}}catch(err){return respond(false,null,'Errore interno',500)}}
function doPost(e){return doGet(e)}

function respond(success,data,message,code){const out={success,data,message:message||'',code:code||200,timestamp:new Date().toISOString(),version:CONFIG.VERSION};return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON)}
function ss(){return SpreadsheetApp.openById(CONFIG.SHEET_ID)}
function validateRequest(e){const p=e.parameter||{};const ts=parseInt(p.ts);if(p.token!==CONFIG.TOKEN)return{valid:false,error:'Token non valido'};if(!ts||isNaN(ts))return{valid:false,error:'Timestamp mancante'};if(Math.abs(Date.now()-ts)>CONFIG.MAX_TIMESTAMP_AGE)return{valid:false,error:'Timestamp scaduto'};return{valid:true}}

// ===== CLIENTI =====
function handleAutocompletaCliente(p){const cf=(p.cf||'').toUpperCase().trim();if(!cf||cf.length!==16)return respond(false,null,'CF non valido',400);const sh=ss().getSheetByName(CONFIG.SHEETS.CLIENTI);if(!sh)return respond(false,null,'Foglio Clienti mancante',500);const data=sh.getDataRange().getValues();const header=data[0];for(let i=1;i<data.length;i++){const r=data[i];if((r[header.indexOf('CF')]||'').toString().toUpperCase().trim()===cf){const obj={CF:cf,NomeCompleto:r[header.indexOf('NomeCompleto')]||'',DataNascita:toISO(r[header.indexOf('DataNascita')])||'',LuogoNascita:r[header.indexOf('LuogoNascita')]||'',Telefono:r[header.indexOf('Telefono')]||'',Email:r[header.indexOf('Email')]||'',Via:r[header.indexOf('Via')]||'',Civico:r[header.indexOf('Civico')]||'',Comune:r[header.indexOf('Comune')]||'',Patente:r[header.indexOf('Patente')]||'',ScadenzaPatente:toISO(r[header.indexOf('ScadenzaPatente')])||''};return respond(true,obj,'Cliente trovato')}}return respond(false,null,'Cliente non trovato',404)}

function upsertClienti(clienti){if(!clienti||!clienti.length)return{inserted:0,updated:0};const sh=ss().getSheetByName(CONFIG.SHEETS.CLIENTI);if(!sh)throw new Error('Foglio Clienti mancante');const data=sh.getDataRange().getValues();const header=data[0];const idxCF=header.indexOf('CF');const map=new Map();for(let i=1;i<data.length;i++){const cf=(data[i][idxCF]||'').toString().toUpperCase().trim();if(cf)map.set(cf,i)}let ins=0,upd=0;clienti.forEach(c=>{const cf=(c.CF||'').toUpperCase().trim();if(!cf)return;const rowIdx=map.get(cf);const row=new Array(header.length).fill('');header.forEach((h,ix)=>{let val=c[h]!==undefined?c[h]:'';if(val instanceof Date) val=toISO(val);row[ix]=val});if(rowIdx){sh.getRange(rowIdx+1,1,1,header.length).setValues([row]);upd++;}else{sh.appendRow(row);ins++;}});return{inserted:ins,updated:upd}}

// ===== PRENOTAZIONI =====
function handleCreaPrenotazione(p){try{const req=parseBookingRequest(p);const id=generateBookingID();const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);if(!sh)throw new Error('Foglio Prenotazioni mancante');const H=CONFIG.PREN_COLS;const row=new Array(60).fill('');row[H.TIMESTAMP]=new Date();row[H.NOME]=req.driver1.NomeCompleto||'';row[H.DATA_NASCITA]=toISO(req.driver1.DataNascita)||'';row[H.LUOGO_NASCITA]=req.driver1.LuogoNascita||'';row[H.CF]=req.driver1.CF||'';row[H.COMUNE_RESIDENZA]=req.driver1.Comune||'';row[H.VIA_RESIDENZA]=req.driver1.Via||'';row[H.CIVICO_RESIDENZA]=req.driver1.Civico||'';row[H.NUMERO_PATENTE]=req.driver1.Patente||'';row[H.INIZIO_PATENTE]='';row[H.SCADENZA_PATENTE]=toISO(req.driver1.ScadenzaPatente)||'';row[H.TARGA]=req.targa||'';row[H.ORA_INIZIO]=req.oraInizio||'';row[H.ORA_FINE]=req.oraFine||'';row[H.GIORNO_INIZIO]=toISO(req.dataInizio)||'';row[H.GIORNO_FINE]=toISO(req.dataFine)||'';row[H.DESTINAZIONE]=req.destinazione||'';row[H.CELLULARE]=req.driver1.Telefono||'';row[H.DATA_CONTRATTO]=toISO(new Date())||'';row[H.ID_PRENOTAZIONE]=id;row[H.STATO_PRENOTAZIONE]='Da Confermare';row[H.NOTE]='Autisti totali: '+([req.driver1,req.driver2,req.driver3].filter(Boolean).length);
sh.appendRow(row);
// Upsert clienti
const clienti=[];clienti.push(normalizeCliente(req.driver1,true));if(req.driver2)clienti.push(normalizeCliente(req.driver2,false));if(req.driver3)clienti.push(normalizeCliente(req.driver3,false));const resUpsert=upsertClienti(clienti);
return respond(true,{id,upsert:resUpsert},'Prenotazione creata: '+id)}catch(err){return respond(false,null,'Errore creazione prenotazione: '+err.message,500)}}

function parseBookingRequest(p){const parseDriver=(prefix,withContacts)=>({ CF:(p[prefix+'CF']||'').toUpperCase().trim(), NomeCompleto:p[prefix+'NomeCompleto']||'', DataNascita:p[prefix+'DataNascita']||'', LuogoNascita:p[prefix+'LuogoNascita']||'', Via:p[prefix+'Via']||'', Civico:p[prefix+'Civico']||'', Comune:p[prefix+'Comune']||'', Patente:p[prefix+'Patente']||'', ScadenzaPatente:p[prefix+'ScadenzaPatente']||'', Telefono:withContacts?(p[prefix+'Telefono']||''):'', Email:withContacts?(p[prefix+'Email']||''):'' });
const driver1=parseDriver('drv1_',true);const driver2=p['drv2_CF']?parseDriver('drv2_',false):null;const driver3=p['drv3_CF']?parseDriver('drv3_',false):null;return{ targa:p.targa||'', dataInizio:p.dataInizio||'', dataFine:p.dataFine||'', oraInizio:p.oraInizio||'', oraFine:p.oraFine||'', destinazione:p.destinazione||'', driver1,driver2,driver3 }}

function normalizeCliente(d,withContacts){return{ CF:d.CF, NomeCompleto:d.NomeCompleto, DataNascita:toISO(d.DataNascita)||'', LuogoNascita:d.LuogoNascita||'', Via:d.Via||'', Civico:d.Civico||'', Comune:d.Comune||'', Patente:d.Patente||'', ScadenzaPatente:toISO(d.ScadenzaPatente)||'', Telefono:withContacts?d.Telefono:'', Email:withContacts?d.Email:'' }}

function generateBookingID(){const y=new Date().getFullYear();const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const data=sh.getDataRange().getValues();let max=0;for(let i=1;i<data.length;i++){const id=data[i][CONFIG.PREN_COLS.ID_PRENOTAZIONE];if(id&&typeof id==='string'&&id.startsWith('BOOK-'+y+'-')){const n=parseInt(id.split('-')[2])||0;max=Math.max(max,n)}}const next=(max+1).toString().padStart(3,'0');return `BOOK-${y}-${next}`}

// ===== STATI =====
function handleRicalcolaStati(){try{const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const data=sh.getDataRange().getValues();const H=CONFIG.PREN_COLS;const now=new Date();for(let i=1;i<data.length;i++){const r=data[i];if(!r[H.ID_PRENOTAZIONE]){r[H.ID_PRENOTAZIONE]=generateBookingID()}const stato=(r[H.STATO_PRENOTAZIONE]||'').toString();if(stato.toLowerCase()==='confermata'){const start=mergeDateTime(r[H.GIORNO_INIZIO], r[H.ORA_INIZIO]);const end=mergeDateTime(r[H.GIORNO_FINE], r[H.ORA_FINE]);let newState='Futura';if(now>=end)newState='Completato';else if(now>=start)newState='In corso';r[H.STATO_PRENOTAZIONE]=newState}data[i]=r}sh.getRange(1,1,data.length,data[0].length).setValues(data);populateClientiDaPrenotazioni();return respond(true,{rows:data.length},'Ricalcolo completato')}catch(err){return respond(false,null,'Errore ricalcolo: '+err.message,500)}}

function populateClientiDaPrenotazioni(){const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);const H=CONFIG.PREN_COLS;const data=sh.getDataRange().getValues();const clienti=[];for(let i=1;i<data.length;i++){const r=data[i];const cfr=(r[H.CF]||'').toString().toUpperCase().trim();if(!cfr)continue;clienti.push({CF:cfr,NomeCompleto:r[H.NOME]||'',DataNascita:toISO(r[H.DATA_NASCITA])||'',LuogoNascita:r[H.LUOGO_NASCITA]||'',Via:r[H.VIA_RESIDENZA]||'',Civico:r[H.CIVICO_RESIDENZA]||'',Comune:r[H.COMUNE_RESIDENZA]||'',Patente:r[H.NUMERO_PATENTE]||'',ScadenzaPatente:toISO(r[H.SCADENZA_PATENTE])||'',Telefono:r[H.CELLULARE]||'',Email:r[H.EMAIL]||''});}
if(clienti.length) upsertClienti(clienti);}

// ===== UTIL =====
function toISO(v){try{if(!v)return'';if(v instanceof Date)return v.toISOString().split('T')[0];if(typeof v==='string'){if(v.includes('/')){const a=v.split('/');if(a.length===3){const d=new Date(a[2],a[1]-1,a[0]);return isNaN(d.getTime())?'':d.toISOString().split('T')[0]}}const d=new Date(v);return isNaN(d.getTime())?'':d.toISOString().split('T')[0]}return''}catch{return''}}
function mergeDateTime(d,t){try{if(!d)return new Date(0);const ds=toISO(d);const iso=ds+'T'+(t||'00:00')+':00.000Z';const x=new Date(iso);return isNaN(x.getTime())?new Date(ds+'T00:00:00.000Z'):x}catch{return new Date(0)}}

// Legacy proxies (flotta/manutenzioni/disponibilita/login/recuperaPrenotazioni) tenuti come nella v7.1
function proxyLegacy(e){return respond(false,null,'Non implementato qui: usa endpoint v7.1 per le altre azioni',400)}
