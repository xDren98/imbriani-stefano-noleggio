/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.3.9 (completo)
 * Patch: sostituiti 'e' con operatori logici '&&' e corretti helper in sincronizzaClienti
 */

const CONFIG = {
  VERSION: '8.3.9',
  SPREADSHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  TOKEN: 'imbriani_secret_2025',
  SHEETS: { PRENOTAZIONI: 'PRENOTAZIONI', PULMINI: 'PULMINI', CLIENTI: 'CLIENTI', MANUTENZIONI: 'MANUTENZIONI' },
  PRENOTAZIONI_COLS: { TIMESTAMP:1,NOME_AUTISTA_1:2,DATA_NASCITA_AUTISTA_1:3,LUOGO_NASCITA_AUTISTA_1:4,CODICE_FISCALE_AUTISTA_1:5,COMUNE_RESIDENZA_AUTISTA_1:6,VIA_RESIDENZA_AUTISTA_1:7,CIVICO_RESIDENZA_AUTISTA_1:8,NUMERO_PATENTE_AUTISTA_1:9,DATA_INIZIO_PATENTE_AUTISTA_1:10,SCADENZA_PATENTE_AUTISTA_1:11,TARGA:12,ORA_INIZIO:13,ORA_FINE:14,GIORNO_INIZIO:15,GIORNO_FINE:16,DESTINAZIONE:17,CELLULARE:18,DATA_CONTRATTO:19,NOME_AUTISTA_2:20,DATA_NASCITA_AUTISTA_2:21,LUOGO_NASCITA_AUTISTA_2:22,CODICE_FISCALE_AUTISTA_2:23,COMUNE_RESIDENZA_AUTISTA_2:24,VIA_RESIDENZA_AUTISTA_2:25,CIVICO_RESIDENZA_AUTISTA_2:26,NUMERO_PATENTE_AUTISTA_2:27,DATA_INIZIO_PATENTE_AUTISTA_2:28,SCADENZA_PATENTE_AUTISTA_2:29,NOME_AUTISTA_3:30,DATA_NASCITA_AUTISTA_3:31,LUOGO_NASCITA_AUTISTA_3:32,CODICE_FISCALE_AUTISTA_3:33,COMUNE_RESIDENZA_AUTISTA_3:34,VIA_RESIDENZA_AUTISTA_3:35,CIVICO_RESIDENZA_AUTISTA_3:36,NUMERO_PATENTE_AUTISTA_3:37,DATA_INIZIO_PATENTE_AUTISTA_3:38,SCADENZA_PATENTE_AUTISTA_3:39,ID_PRENOTAZIONE:40,STATO_PRENOTAZIONE:41,IMPORTO_PREVENTIVO:42,EMAIL:43,TEST:44 },
  CLIENTI_COLS: { NOME:1,DATA_NASCITA:2,LUOGO_NASCITA:3,CODICE_FISCALE:4,COMUNE_RESIDENZA:5,VIA_RESIDENZA:6,CIVICO_RESIDENZA:7,NUMERO_PATENTE:8,DATA_INIZIO_PATENTE:9,SCADENZA_PATENTE:10,CELLULARE:11,EMAIL:12 },
  PULMINI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,NOTE:6 },
  MANUTENZIONI_COLS: { TARGA:1,MARCA:2,MODELLO:3,POSTI:4,STATO:5,DATA_INIZIO:6,DATA_FINE:7,COSTO:8,NOTE:9 }
};

function doGet(e){
  const p = e?.parameter || {}; const action = p.action || 'health'; const token = p.token || p.Authorization?.replace('Bearer ','');
  try{
    if (action==='health') return createJsonResponse({ success:true, service:'imbriani-backend', version:CONFIG.VERSION, timestamp:new Date().toISOString(), spreadsheet_id:CONFIG.SPREADSHEET_ID, sheets:Object.keys(CONFIG.SHEETS), action:'health_supported', columns_mapped:{ prenotazioni:Object.keys(CONFIG.PRENOTAZIONI_COLS).length, clienti:Object.keys(CONFIG.CLIENTI_COLS).length, pulmini:Object.keys(CONFIG.PULMINI_COLS).length, manutenzioni:Object.keys(CONFIG.MANUTENZIONI_COLS).length } });
    if (!validateToken(token)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    switch(action){
      case 'getVeicoli': return getVeicoli();
      case 'getPrenotazioni': return getPrenotazioni();
      case 'checkDisponibilita': return checkDisponibilita(p);
      case 'updateStatiLive': return updateStatiLive();
      case 'getSheet': return getSheetGeneric(p);
      case 'sincronizzaClienti': return sincronizzaClienti();
      default: return createJsonResponse({success:false,message:'Azione non supportata: '+action},400);
    }
  }catch(err){ return createJsonResponse({success:false,message:'Errore server: '+err.message},500); }
}

function doPost(e){
  try{
    const tokenHeader = e?.parameter?.token || getAuthHeader(e); let post = {}; try{ post = JSON.parse(e?.postData?.contents || '{}'); }catch(_){ return createJsonResponse({success:false,message:'Invalid JSON in request body'},400); }
    const action = post.action || 'login'; const finalToken = tokenHeader || post.token || post.AUTH_TOKEN; if (action==='login') return handleLogin(post, finalToken);
    if (!validateToken(finalToken)) return createJsonResponse({success:false,message:'Token non valido',code:401},401);
    switch(action){ case 'getPrenotazioni':return getPrenotazioni(); case 'getVeicoli':return getVeicoli(); case 'creaPrenotazione':return creaPrenotazione(post); case 'aggiornaStato':return aggiornaStatoPrenotazione?.(post) || createJsonResponse({success:false,message:'aggiornaStato non implementata'},400); case 'setManutenzione':return setManutenzione?.(post) || createJsonResponse({success:false,message:'setManutenzione non implementata'},400); case 'aggiornaCliente':return aggiornaCliente(post); default:return createJsonResponse({success:false,message:'Azione POST non supportata: '+action},400); }
  }catch(err){ return createJsonResponse({success:false,message:'Errore POST: '+err.message},500); }
}

function validateToken(t){ return t===CONFIG.TOKEN; }
function createJsonResponse(data,status){ const s=status||200; const resp={...data,timestamp:new Date().toISOString(),version:CONFIG.VERSION,status:s}; return ContentService.createTextOutput(JSON.stringify(resp,null,2)).setMimeType(ContentService.MimeType.JSON); }
function getAuthHeader(e){ if (e?.parameter?.token) return e.parameter.token; if (e?.parameter?.Authorization) return e.parameter.Authorization.replace('Bearer ',''); return null; }

function getSheetGeneric(p){ try{ const name = p.name; if (!name) return createJsonResponse({success:false,message:'Parametro name mancante'},400); const sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name); if (!sh) return createJsonResponse({success:false,message:'Foglio non trovato: '+name},404); const vals=sh.getDataRange().getValues(); const headers=vals[0]; const rows=[]; for (let i=1;i<vals.length;i++){ const obj={}; for (let c=0;c<headers.length;c++){ obj[headers[c]]=vals[i][c]; } rows.push(obj);} return createJsonResponse({success:true,data:rows,count:rows.length}); }catch(err){ return createJsonResponse({success:false,message:'Errore getSheet: '+err.message},500);} }

function handleLogin(post){ try{ const cf=post.codiceFiscale; if (!cf||cf.length!==16) return createJsonResponse({success:false,message:'Codice fiscale non valido (deve essere 16 caratteri)'},400); const sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.CLIENTI); const data=sh.getDataRange().getValues(); for (let i=1;i<data.length;i++){ const row=data[i]; if (String(row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1]).trim()===cf){ return createJsonResponse({ success:true,message:'Login effettuato', user:{ nome:row[CONFIG.CLIENTI_COLS.NOME-1], codiceFiscale:row[CONFIG.CLIENTI_COLS.CODICE_FISCALE-1], dataNascita:row[CONFIG.CLIENTI_COLS.DATA_NASCITA-1], luogoNascita:row[CONFIG.CLIENTI_COLS.LUOGO_NASCITA-1], comuneResidenza:row[CONFIG.CLIENTI_COLS.COMUNE_RESIDENZA-1], viaResidenza:row[CONFIG.CLIENTI_COLS.VIA_RESIDENZA-1], civicoResidenza:row[CONFIG.CLIENTI_COLS.CIVICO_RESIDENZA-1], numeroPatente:row[CONFIG.CLIENTI_COLS.NUMERO_PATENTE-1], inizioValiditaPatente:row[CONFIG.CLIENTI_COLS.DATA_INIZIO_PATENTE-1], scadenzaPatente:row[CONFIG.CLIENTI_COLS.SCADENZA_PATENTE-1], cellulare:row[CONFIG.CLIENTI_COLS.CELLULARE-1], email:row[CONFIG.CLIENTI_COLS.EMAIL-1] } }); } } return createJsonResponse({success:false,message:'Codice fiscale non trovato. Registrazione richiesta.',requiresRegistration:true},404);}catch(err){ return createJsonResponse({success:false,message:'Errore login: '+err.message},500); }
}

function getVeicoli(){ try{ const sp=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); const shP=sp.getSheetByName(CONFIG.SHEETS.PULMINI); const shM=sp.getSheetByName(CONFIG.SHEETS.MANUTENZIONI); if (!shP) return createJsonResponse({success:false,message:'Foglio PULMINI non trovato'},500); const dataP=shP.getDataRange().getValues(); if (dataP.length<=1) return createJsonResponse({success:true,message:'Nessun veicolo trovato',data:[]}); let manut=new Map(); if (shM){ const dataM=shM.getDataRange().getValues(); for (let i=1;i<dataM.length;i++){ const r=dataM[i]; const t=r[CONFIG.MANUTENZIONI_COLS.TARGA-1]; const st=r[CONFIG.MANUTENZIONI_COLS.STATO-1]; if (t&&st){ manut.set(t,{stato:st,dataInizio:r[CONFIG.MANUTENZIONI_COLS.DATA_INIZIO-1],dataFine:r[CONFIG.MANUTENZIONI_COLS.DATA_FINE-1],note:r[CONFIG.MANUTENZIONI_COLS.NOTE-1]}); } } } const res=[]; for (let i=1;i<dataP.length;i++){ const r=dataP[i]; const t=r[CONFIG.PULMINI_COLS.TARGA-1]; if (!t) continue; const man=manut.get(t); const inMan=man&&(String(man.stato).toLowerCase().includes('in corso')||String(man.stato).toLowerCase().includes('programmata')); const base=r[CONFIG.PULMINI_COLS.STATO-1]||'Disponibile'; res.push({ Targa:t, Marca:r[CONFIG.PULMINI_COLS.MARCA-1]||'', Modello:r[CONFIG.PULMINI_COLS.MODELLO-1]||'', Posti:parseInt(r[CONFIG.PULMINI_COLS.POSTI-1])||9, Disponibile:!inMan&&(base==='Disponibile'||base==='Attivo'), Note:r[CONFIG_PULMINI_COLS.NOTE-1]||'', PassoLungo:(t==='EC787NM')||(r[CONFIG.PULMINI_COLS.NOTE-1]&&String(r[CONFIG_PULMINI_COLS.NOTE-1]).toLowerCase().includes('passo lungo')), StatoManutenzione:man?man.stato:'-', DisponibileDate:!inMan&&(base==='Disponibile'||base==='Attivo') }); } return createJsonResponse({success:true,message:`Trovati ${res.length} veicoli`,data:res,count:res.length}); }catch(err){ return createJsonResponse({success:false,message:'Errore caricamento veicoli: '+err.message},500); }
}

function getPrenotazioni(){ try{ const sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PRENOTAZIONI); if (!sh) return createJsonResponse({success:false,message:'Foglio PRENOTAZIONI non trovato'},500); const data=sh.getDataRange().getValues(); if (data.length<=1) return createJsonResponse({success:true,message:'Nessuna prenotazione trovata',data:[]}); const out=[]; for (let i=1;i<data.length;i++){ const r=data[i]; const t=r[CONFIG.PRENOTAZIONI_COLS.TARGA-1]; const cf=r[CONFIG.PRENOTAZIONI_COLS.CODICE_FISCALE_AUTISTA_1-1]; if (!t && !cf) continue; out.push({ id:i, targa:t||'', giornoInizio:r[CONFIG.PRENOTAZIONI_COLS.GIORNO_INIZIO-1]||'', giornoFine:r[CONFIG.PRENOTAZIONI_COLS.GIORNO_FINE-1]||'', oraInizio:r[CONFIG_P…