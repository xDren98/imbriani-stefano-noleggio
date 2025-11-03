/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.0 UNIFICATO (Code.gs)
 * Fix: prenotazioni senza orario bloccano tutta la giornata (00:00→23:59)
 */

const CONFIG = {
  VERSION: '8.0.1',
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
  NOME2: 18, DATA_NASCITA2: 19, LUOGO_NASCITA2: 20, CF2: 21, COMUNE2: 22, VIA2: 23, CIVICO2: 24, NUMERO_PATENTE2: 25, INIZIO_PATENTE2: 26, SCADENZA_PATENTE2: 27,
  NOME3: 28, DATA_NASCITA3: 29, LUOGO_NASCITA3: 30, CF3: 31, COMUNE3: 32, VIA3: 33, CIVICO3: 34, NUMERO_PATENTE3: 35, INIZIO_PATENTE3: 36, SCADENZA_PATENTE3: 37,
  ID_PREN: 38, STATO_PRENOTAZIONE: 39, IMPORTO_PREVENTIVO: 40, EMAIL: 41, TEST: 42
};

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

function respond(success,data,message,code){return ContentService.createTextOutput(JSON.stringify({success,data,message:message||'',code:code||200,timestamp:new Date().toISOString(),version:CONFIG.VERSION})).setMimeType(ContentService.MimeType.JSON)}
function ss(){return SpreadsheetApp.openById(CONFIG.SHEET_ID)}
function validateRequest(e){const p=e.parameter||{};const ts=parseInt(p.ts);if(p.token!==CONFIG.TOKEN)return{valid:false,error:'Token non valido'};if(!ts||isNaN(ts))return{valid:false,error:'Timestamp mancante'};if(Math.abs(Date.now()-ts)>CONFIG.MAX_TIMESTAMP_AGE)return{valid:false,error:'Timestamp scaduto'};return{valid:true}}

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

// FIX: orari vuoti bloccano tutta la giornata (00:00 → 23:59)
function getPrenotazioniAttive(){
  const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
  if(!sh)return[];
  const d=sh.getDataRange().getValues();
  const H=CONFIG.PREN_COLS;
  const out=[];
  for(let i=1;i<d.length;i++){
    const r=d[i];
    if(r[H.TARGA]) {
      let oraInizio = r[H.ORA_INIZIO];
      let oraFine = r[H.ORA_FINE];
      if(!oraInizio && !oraFine) { // entrambi vuoti → tutto il giorno
        oraInizio = '00:00';
        oraFine = '23:59';
      } else {
        oraInizio = oraInizio || '08:00';
        oraFine = oraFine || '20:00';
      }
      out.push({
        Targa:r[H.TARGA],
        DataInizio:r[H.GIORNO_INIZIO],
        OraInizio:oraInizio,
        DataFine:r[H.GIORNO_FINE],
        OraFine:oraFine,
        Stato:r[H.STATO_PRENOTAZIONE]||'Da Confermare'
      });
    }
  }
  return out;
}

function calcolaSuggerimentiAlternativi(startReq,endReq,flotta,pren){const sug=[];const durata=endReq.getTime()-startReq.getTime();flotta.filter(v=>!v.Disponibile&&v.Stato==='Occupato').forEach(v=>{const slot=trovaSlotLibero(v.Targa,startReq,durata,pren);if(slot){sug.push({targa:v.Targa,marca:v.Marca,modello:v.Modello,dataInizioSuggerita:slot.dataInizio,oraInizioSuggerita:slot.oraInizio,dataFineSuggerita:slot.dataFine,oraFineSuggerita:slot.oraFine,motivoOriginale:'Occupato nella fascia richiesta'})}});return sug.slice(0,3)}
function trovaSlotLibero(targa,startReq,durata,pren){for(let deltaDays=0;deltaDays<=7;deltaDays++){for(let delta of [0,1,-1,2,-2,3,-3]){const base=new Date(startReq);base.setDate(base.getDate()+deltaDays);const hour=startReq.getHours();const idx=TIME_SLOTS.findIndex(f=>parseInt(f.split(':')[0])>=hour);const idx2=idx+delta; if(idx2<0||idx2>=TIME_SLOTS.length)continue;const ora=TIME_SLOTS[idx2];const [h,m]=ora.split(':').map(Number);base.setHours(h,m,0,0);const fine=new Date(base.getTime()+durata);const clash=pren.some(p=>{if(p.Targa!==targa)return false; if((p.Stato||'').toLowerCase()==='annullata')return false; const s=mergeDateTime(p.DataInizio,p.OraInizio), e=mergeDateTime(p.DataFine,p.OraFine), eAdj=new Date(e.getTime()+2*60*60*1000); return s<fine && eAdj>base;}); if(!clash){return{dataInizio:base.toISOString().split('T')[0],oraInizio:ora,dataFine:fine.toISOString().split('T')[0],oraFine:String(fine.getHours()).padStart(2,'0')+':00'};}}}return null}

// ... resto invariato (creaPrenotazione, autocompletaCliente, inviaRiepilogo, flotta/manutenzioni, login, helpers)
