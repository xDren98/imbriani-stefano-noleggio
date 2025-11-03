/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v7.1 (fix manutenzioni overlap)
 */

const CONFIG = {
  VERSION: '7.1.0',
  TOKEN: 'imbriani_secret_2025',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  SHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  DEBUG: true,
  MAX_TIMESTAMP_AGE: 120000,
  SHEETS: {
    PRENOTAZIONI: 'Risposte del modulo 1',
    CLIENTI: 'Clienti',
    VEICOLI: 'Gestione pulmini',
    MANUTENZIONI: 'Registro manutenzioni'
  },
  VEICOLI_COLS: { TARGA:0, MARCA:1, MODELLO:2, POSTI:3, STATO:4, NOTE:5 },
  MANUTENZIONI_COLS: { TARGA:0, MARCA:1, MODELLO:2, POSTI:3, STATO:4, DATA_INIZIO:5, DATA_FINE:6, COSTO:7, NOTE:8 },
  PRENOTAZIONI_COLS: { TIMESTAMP:0, NOME:1, DATA_NASCITA:2, LUOGO_NASCITA:3, CF:4, COMUNE_RESIDENZA:5, VIA_RESIDENZA:6, CIVICO_RESIDENZA:7, NUMERO_PATENTE:8, INIZIO_PATENTE:9, SCADENZA_PATENTE:10, TARGA:11, ORA_INIZIO:12, ORA_FINE:13, GIORNO_INIZIO:14, GIORNO_FINE:15, DESTINAZIONE:16, CELLULARE:17, DATA_CONTRATTO:18, ID_PRENOTAZIONE:39, STATO_PRENOTAZIONE:40, IMPORTO_PREVENTIVO:41, NOTE:42, EMAIL:43 }
};

function doGet(e){try{const output=ContentService.createTextOutput();output.setMimeType(ContentService.MimeType.JSON);if(CONFIG.DEBUG)console.log(`GET ${JSON.stringify(e.parameter)}`);const validation=validateRequest(e);if(!validation.valid){return createResponse(false,null,validation.error,400)}const action=e.parameter.action;switch(action){case'login':return handleLogin(e.parameter);case'recuperaPrenotazioni':return handleRecuperaPrenotazioni(e.parameter);case'disponibilita':return handleDisponibilita(e.parameter);case'flotta':return handleFlotta(e.parameter);case'manutenzioni':return handleManutenzioni(e.parameter);case'creaPrenotazione':return handleCreaPrenotazione(e.parameter);case'modificaStato':return handleModificaStato(e.parameter);default:return createResponse(false,null,`Azione non supportata: ${action}`,400)}}catch(error){return createResponse(false,null,'Errore interno server',500)}}
function doPost(e){return doGet(e)}

// Helpers base
function createResponse(success,data,message,code){const resp={success,data,message:message||'',code:code||200,timestamp:new Date().toISOString(),version:CONFIG.VERSION};const out=ContentService.createTextOutput(JSON.stringify(resp));out.setMimeType(ContentService.MimeType.JSON);return out}
function getSheet(name){const ss=SpreadsheetApp.openById(CONFIG.SHEET_ID);return ss.getSheetByName(name)}
function validateRequest(e){const p=e.parameter;if(!p.token||p.token!==CONFIG.TOKEN)return{valid:false,error:'Token non valido'};const ts=parseInt(p.ts);if(!ts||isNaN(ts))return{valid:false,error:'Timestamp mancante o invalido'};if(Math.abs(Date.now()-ts)>CONFIG.MAX_TIMESTAMP_AGE)return{valid:false,error:'Timestamp scaduto o futuro'};return{valid:true}}

// Flotta
function handleFlotta(params){const method=params.method||'get';if(method==='get'){try{const sh=getSheet(CONFIG.SHEETS.VEICOLI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0]){const v={Targa:r[0],Marca:r[1]||'',Modello:r[2]||'',Posti:parseInt(r[3])||9,Stato:r[4]||'Disponibile',Note:r[5]||'',PassoLungo:(r[0]==='EC787NM'&&(String(r[1]).toLowerCase().includes('fiat')&&String(r[2]).toLowerCase().includes('ducato'))),Disponibile:(String(r[4]||'').toLowerCase().includes('disponibile')||!String(r[4]||'').toLowerCase().includes('manutenzione'))};out.push(v)}}return createResponse(true,out,`${out.length} veicoli in flotta`)}catch(e){return createResponse(false,[], 'Errore caricamento flotta',500)}}return createResponse(false,null,'Metodo flotta non supportato',400)}

// Manutenzioni
function handleManutenzioni(params){const method=params.method||'list';try{const sh=getSheet(CONFIG.SHEETS.MANUTENZIONI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0]){out.push({ID:i,Targa:r[0],Marca:r[1]||'',Modello:r[2]||'',Posti:parseInt(r[3])||9,Stato:r[4]||'',DataInizio:formatDate(r[5])||'',DataFine:formatDate(r[6])||'',Costo:r[7]||0,Note:r[8]||''})}}return createResponse(true,out,`${out.length} manutenzioni`) }catch(e){return createResponse(false,[], 'Errore manutenzioni',500)}}

// Disponibilità FIX: considera solo Programmata/In corso e sovrapposizione effettiva
function handleDisponibilita(params){try{const flotta=JSON.parse(getFlottaRaw());const man=JSON.parse(getManutenzioniRaw());const inizioCheck=toDateSafe(params.dataInizio)||new Date();const fineCheck=toDateSafe(params.dataFine)||inizioCheck;const attive=man.filter(m=>{const stato=(m.Stato||'').toLowerCase();if(!(stato.includes('programma')||stato.includes('corso')))return false;const s=toDateSafe(m.DataInizio);const f=toDateSafe(m.DataFine)||s;if(!s)return false;return s<=fineCheck && f>=inizioCheck});const manutSet=new Set(attive.map(m=>String(m.Targa||'').trim()).filter(Boolean));flotta.forEach(v=>{if(manutSet.has(v.Targa)){v.Stato='Manutenzione';v.Disponibile=false}else{const base=(v.Stato||'').toLowerCase();v.Disponibile=base.includes('disponibile')||!base.includes('manutenzione')}});const disponibili=flotta.filter(v=>v.Disponibile);return createResponse(true,{disponibili,totaleFlotta:flotta.length,inManutenzione:flotta.length-disponibili.length},`${disponibili.length} veicoli disponibili`)}catch(e){return createResponse(false,{disponibili:[]},'Errore calcolo disponibilità',500)}}

function getFlottaRaw(){const sh=getSheet(CONFIG.SHEETS.VEICOLI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0]){out.push({Targa:r[0],Marca:r[1]||'',Modello:r[2]||'',Posti:parseInt(r[3])||9,Stato:r[4]||'Disponibile',Note:r[5]||'',PassoLungo:(r[0]==='EC787NM'&&(String(r[1]).toLowerCase().includes('fiat')&&String(r[2]).toLowerCase().includes('ducato'))),Disponibile:(String(r[4]||'').toLowerCase().includes('disponibile')||!String(r[4]||'').toLowerCase().includes('manutenzione'))})}}return JSON.stringify(out)}
function getManutenzioniRaw(){const sh=getSheet(CONFIG.SHEETS.MANUTENZIONI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(r[0]){out.push({ID:i,Targa:r[0],Marca:r[1]||'',Modello:r[2]||'',Posti:parseInt(r[3])||9,Stato:r[4]||'',DataInizio:formatDate(r[5])||'',DataFine:formatDate(r[6])||'',Costo:r[7]||0,Note:r[8]||''})}}return JSON.stringify(out)}

// Util
function toDateSafe(s){try{if(!s)return null;const d=(s instanceof Date)?s:new Date(s);return isNaN(d.getTime())?null:d}catch{return null}}
function formatDate(v){try{if(!v)return'';if(v instanceof Date)return v.toISOString().split('T')[0];if(typeof v==='string'){if(v.includes('/')){const a=v.split('/');if(a.length===3){const d=new Date(a[2],a[1]-1,a[0]);return isNaN(d.getTime())?'':d.toISOString().split('T')[0]}}const d=new Date(v);return isNaN(d.getTime())?'':d.toISOString().split('T')[0]}return''}catch{return''}}

// Le altre funzioni (login, prenotazioni, stato) restano invariate rispetto v7.0…
function handleLogin(p){try{const cf=p.cf?.toUpperCase()?.trim();if(!cf||cf.length!==16)return createResponse(false,null,'Codice fiscale non valido',400);if(!/^[A-Z0-9]{16}$/.test(cf))return createResponse(false,null,'Formato codice fiscale non valido',400);const sh=getSheet(CONFIG.SHEETS.PRENOTAZIONI);const data=sh.getDataRange().getValues();for(let i=1;i<data.length;i++){const r=data[i];if(r[4]&&String(r[4]).toUpperCase().trim()===cf){return createResponse(true,{nome:r[1]||'',cf,telefono:r[17]||''},'Login effettuato')}}return createResponse(false,null,'Utente non trovato',404)}catch(e){return createResponse(false,null,'Errore durante il login',500)}}
function handleRecuperaPrenotazioni(p){try{const cf=p.cf?.toUpperCase()?.trim();if(!cf)return createResponse(false,null,'Codice fiscale mancante',400);const sh=getSheet(CONFIG.SHEETS.PRENOTAZIONI);const data=sh.getDataRange().getValues();const out=[];for(let i=1;i<data.length;i++){const r=data[i];if(cf==='ALL'||(r[4]&&String(r[4]).toUpperCase().trim()===cf)){out.push({ID:r[39]||`BOOK-2025-${String(i).padStart(3,'0')}`,NomeCompleto:r[1]||'',CF:r[4]||'',Targa:r[11]||'',DataRitiro:formatDate(r[14])||'',OraRitiro:r[12]||'',DataConsegna:formatDate(r[15])||'',OraConsegna:r[13]||'',Destinazione:r[16]||'',Stato:r[40]||'Da Confermare'})}}return createResponse(true,out,`${out.length} prenotazioni`)}catch(e){return createResponse(false,[], 'Errore recupero prenotazioni',500)}}
function handleCreaPrenotazione(p){return createResponse(false,null,'Non implementato in questa patch',501)}
function handleModificaStato(p){return createResponse(false,null,'Non implementato in questa patch',501)}
