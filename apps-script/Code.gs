/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.0.1 COMPLETO
 * - Disponibilità reale: fasce 08–22 ogni 2h, rientro → fascia successiva
 * - Prenotazioni senza orari bloccano tutto il giorno (00:00→23:59)
 * - Estados ≠ "Annullata" considerati occupati
 * - Manutenzioni "Programmata/In corso" bloccano disponibilità
 * - creaPrenotazione: ID BOOK-YYYY-###, upsert Clienti
 * - autocompletaCliente: CF lookup + fallback da Prenotazioni
 * - inviaRiepilogo: email con link area personale (solo se email presente)
 * - Admin: flotta, manutenzioni, modifica stato con notifica email
 */

const CONFIG = {
  VERSION: '8.0.1',
  TOKEN: 'imbriani_secret_2025',
  SHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  DEBUG: true,
  MAX_TIMESTAMP_AGE: 600000, // 10 minuti
  SHEETS: { 
    PRENOTAZIONI:'Risposte del modulo 1', 
    CLIENTI:'Clienti', 
    VEICOLI:'Gestione pulmini', 
    MANUTENZIONI:'Gestione manutenzioni' 
  }
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

CONFIG.CLIENTI_HEADERS = ['Nome','Data di nascita','Luogo di nascita','Codice fiscale','Comune di residenza','Via di residenza','Civico di residenza','Numero di patente','Data inizio validità patente','Scadenza patente','Cellulare','Email'];

// ===== ENTRY POINTS =====
function doGet(e){
  try{
    const v=validateRequest(e);
    if(!v.valid)return respond(false,null,v.error,400);
    const p=e.parameter||{};
    switch(p.action){
      case 'creaPrenotazione':return creaPrenotazione(p);
      case 'autocompletaCliente':return autocompletaClienteWithFallback(p);
      case 'inviaRiepilogo':return inviaRiepilogo(p);
      case 'disponibilita':return handleDisponibilita(p);
      case 'flotta':return handleFlotta(p);
      case 'manutenzioni':return handleManutenzioni(p);
      case 'modificaStato':return handleModificaStato(p);
      case 'login':return handleLogin(p);
      case 'recuperaPrenotazioni':return handleRecuperaPrenotazioni(p);
      case 'testEmail':return handleTestEmail(p);
      case 'ricalcolaStati':return handleRicalcolaStati();
      case 'populateClienti':return handlePopulateClienti();
      default:return respond(false,null,'Azione non supportata',400);
    }
  }catch(err){
    console.error('[GLOBAL] Errore:', err);
    return respond(false,null,'Errore interno: '+err.message,500);
  }
}
function doPost(e){return doGet(e)}

// ===== INFRA =====
function respond(success,data,message,code){
  return ContentService.createTextOutput(JSON.stringify({
    success,
    data,
    message:message||'',
    code:code||200,
    timestamp:new Date().toISOString(),
    version:CONFIG.VERSION
  })).setMimeType(ContentService.MimeType.JSON);
}

function ss(){
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function validateRequest(e){
  const p=e.parameter||{};
  const ts=parseInt(p.ts);
  if(p.token!==CONFIG.TOKEN)return{valid:false,error:'Token non valido'};
  if(!ts||isNaN(ts))return{valid:false,error:'Timestamp mancante'};
  if(Math.abs(Date.now()-ts)>CONFIG.MAX_TIMESTAMP_AGE)return{valid:false,error:'Timestamp scaduto'};
  return{valid:true};
}

// ===== DISPONIBILITÀ v8.0.1 =====
const TIME_SLOTS = ['08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];

function handleDisponibilita(p){
  try{
    const startReq=mergeDateTime(p.dataInizio,p.oraInizio||'08:00');
    const endReq=mergeDateTime(p.dataFine,p.oraFine||'20:00');
    
    console.log(`[DISP] Check: ${startReq.toISOString()} - ${endReq.toISOString()}`);
    
    const flotta=JSON.parse(getFlottaRaw());
    const man=JSON.parse(getManutenzioniRaw());
    
    // Filtra manutenzioni attive
    const manAttive=man.filter(m=>{
      const st=(m.Stato||'').toLowerCase();
      if(!(st.includes('programma')||st.includes('corso')))return false;
      const s=toDateSafe(m.DataInizio),f=toDateSafe(m.DataFine)||s;
      return s&&s<=endReq&&f>=startReq;
    });
    const manSet=new Set(manAttive.map(m=>String(m.Targa||'').trim()).filter(Boolean));
    
    // Filtra prenotazioni che si sovrappongono
    const pren=getPrenotazioniAttive();
    const occ=new Set();
    pren.forEach(pr=>{
      if((pr.Stato||'').toLowerCase()==='annullata')return;
      const s=mergeDateTime(pr.DataInizio,pr.OraInizio);
      const e=mergeDateTime(pr.DataFine,pr.OraFine);
      const eAdj=new Date(e.getTime()+2*60*60*1000); // +2h buffer fascia
      if(s<endReq && eAdj>startReq) {
        occ.add(pr.Targa);
        console.log(`[DISP] ${pr.Targa} occupata: ${s.toISOString()} - ${eAdj.toISOString()}`);
      }
    });
    
    console.log(`[DISP] Manutenzione: [${Array.from(manSet)}]`);
    console.log(`[DISP] Occupate: [${Array.from(occ)}]`);
    
    // Applica stati finali
    flotta.forEach(v=>{
      if(manSet.has(v.Targa)){
        v.Stato='Manutenzione';
        v.Disponibile=false;
      } else if(occ.has(v.Targa)){
        v.Stato='Occupato';
        v.Disponibile=false;
      } else {
        const base=(v.Stato||'').toLowerCase();
        v.Disponibile=base.includes('disponibile')||!base.includes('manutenzione');
      }
    });
    
    const disponibili=flotta.filter(v=>v.Disponibile);
    
    // Calcola suggerimenti se nessun veicolo disponibile
    let suggerimenti=[];
    if(disponibili.length===0){
      suggerimenti=calcolaSuggerimentiAlternativi(startReq,endReq,flotta,pren);
    }
    
    return respond(true,{
      disponibili,
      totaleFlotta:flotta.length,
      suggerimenti,
      debug:{
        richiesta:{inizio:startReq.toISOString(),fine:endReq.toISOString()},
        manutenzioni:Array.from(manSet),
        occupate:Array.from(occ)
      }
    },`${disponibili.length} disponibili${suggerimenti.length?`, ${suggerimenti.length} suggerimenti`:''}`);
    
  }catch(e){
    console.error('[DISP] Errore:', e);
    return respond(false,{disponibili:[]},'Errore disponibilità: '+e.message,500);
  }
}

// FIX CRITICO: orari vuoti = tutta la giornata (00:00→23:59)
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
      
      // Se entrambi gli orari sono vuoti, blocca tutta la giornata
      if(!oraInizio && !oraFine) {
        oraInizio = '00:00';
        oraFine = '23:59';
        console.log(`[PREN] ${r[H.TARGA]} senza orari → tutto il giorno (${r[H.GIORNO_INIZIO]} - ${r[H.GIORNO_FINE]})`);
      } else {
        // Se solo uno è vuoto, usa i default
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

function calcolaSuggerimentiAlternativi(startReq,endReq,flotta,pren){
  const sug=[];
  const durata=endReq.getTime()-startReq.getTime();
  
  flotta.filter(v=>!v.Disponibile&&v.Stato==='Occupato').forEach(v=>{
    const slot=trovaSlotLibero(v.Targa,startReq,durata,pren);
    if(slot){
      sug.push({
        targa:v.Targa,
        marca:v.Marca,
        modello:v.Modello,
        dataInizioSuggerita:slot.dataInizio,
        oraInizioSuggerita:slot.oraInizio,
        dataFineSuggerita:slot.dataFine,
        oraFineSuggerita:slot.oraFine,
        motivoOriginale:'Occupato nella fascia richiesta'
      });
    }
  });
  
  return sug.slice(0,3);
}

function trovaSlotLibero(targa,startReq,durata,pren){
  for(let deltaDays=0;deltaDays<=7;deltaDays++){
    for(let delta of [0,1,-1,2,-2,3,-3]){
      const base=new Date(startReq);
      base.setDate(base.getDate()+deltaDays);
      
      const hour=startReq.getHours();
      const idx=TIME_SLOTS.findIndex(f=>parseInt(f.split(':')[0])>=hour);
      const idx2=idx+delta;
      if(idx2<0||idx2>=TIME_SLOTS.length)continue;
      
      const ora=TIME_SLOTS[idx2];
      const [h,m]=ora.split(':').map(Number);
      base.setHours(h,m,0,0);
      const fine=new Date(base.getTime()+durata);
      
      const clash=pren.some(p=>{
        if(p.Targa!==targa)return false;
        if((p.Stato||'').toLowerCase()==='annullata')return false;
        const s=mergeDateTime(p.DataInizio,p.OraInizio);
        const e=mergeDateTime(p.DataFine,p.OraFine);
        const eAdj=new Date(e.getTime()+2*60*60*1000);
        return s<fine && eAdj>base;
      });
      
      if(!clash){
        return{
          dataInizio:base.toISOString().split('T')[0],
          oraInizio:ora,
          dataFine:fine.toISOString().split('T')[0],
          oraFine:String(fine.getHours()).padStart(2,'0')+':00'
        };
      }
    }
  }
  return null;
}

// ===== BOOKING =====
function creaPrenotazione(p){
  try{
    if(!p.targa||!p.dataInizio||!p.dataFine)return respond(false,{},'Targa, date obbligatorie',400);
    if(!p.drv1_CF||p.drv1_CF.length!==16)return respond(false,{},'CF primo autista non valido',400);
    if(!p.drv1_Nome||!p.drv1_NumeroPatente)return respond(false,{},'Nome e patente primo autista obbligatori',400);
    
    const id=generaIdPrenotazione();
    const now=new Date();
    const H=CONFIG.PREN_COLS;
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)throw new Error('Foglio prenotazioni non trovato');
    
    const row=new Array(43).fill('');
    row[H.NAME]=p.drv1_Nome||'';
    row[H.DATA_NASCITA]=p.drv1_DataNascita||'';
    row[H.LUOGO_NASCITA]=p.drv1_LuogoNascita||'';
    row[H.CF]=(p.drv1_CF||'').toUpperCase();
    row[H.COMUNE]=p.drv1_ComuneResidenza||'';
    row[H.VIA]=p.drv1_ViaResidenza||'';
    row[H.CIVICO]=p.drv1_CivicoResidenza||'';
    row[H.NUMERO_PATENTE]=p.drv1_NumeroPatente||'';
    row[H.INIZIO_PATENTE]=p.drv1_DataInizioPatente||'';
    row[H.SCADENZA_PATENTE]=p.drv1_ScadenzaPatente||'';
    row[H.TARGA]=p.targa;
    row[H.ORA_INIZIO]=p.oraInizio||'08:00';
    row[H.ORA_FINE]=p.oraFine||'20:00';
    row[H.GIORNO_INIZIO]=p.dataInizio;
    row[H.GIORNO_FINE]=p.dataFine;
    row[H.DESTINAZIONE]=p.destinazione||'';
    row[H.CELLULARE]=p.drv1_Cellulare||'';
    row[H.DATA_CONTRATTO]=toISO(now);
    
    // Autista 2
    row[H.NOME2]=p.drv2_Nome||'';
    row[H.DATA_NASCITA2]=p.drv2_DataNascita||'';
    row[H.LUOGO_NASCITA2]=p.drv2_LuogoNascita||'';
    row[H.CF2]=(p.drv2_CF||'').toUpperCase();
    row[H.COMUNE2]=p.drv2_ComuneResidenza||'';
    row[H.VIA2]=p.drv2_ViaResidenza||'';
    row[H.CIVICO2]=p.drv2_CivicoResidenza||'';
    row[H.NUMERO_PATENTE2]=p.drv2_NumeroPatente||'';
    row[H.INIZIO_PATENTE2]=p.drv2_DataInizioPatente||'';
    row[H.SCADENZA_PATENTE2]=p.drv2_ScadenzaPatente||'';
    
    // Autista 3
    row[H.NOME3]=p.drv3_Nome||'';
    row[H.DATA_NASCITA3]=p.drv3_DataNascita||'';
    row[H.LUOGO_NASCITA3]=p.drv3_LuogoNascita||'';
    row[H.CF3]=(p.drv3_CF||'').toUpperCase();
    row[H.COMUNE3]=p.drv3_ComuneResidenza||'';
    row[H.VIA3]=p.drv3_ViaResidenza||'';
    row[H.CIVICO3]=p.drv3_CivicoResidenza||'';
    row[H.NUMERO_PATENTE3]=p.drv3_NumeroPatente||'';
    row[H.INIZIO_PATENTE3]=p.drv3_DataInizioPatente||'';
    row[H.SCADENZA_PATENTE3]=p.drv3_ScadenzaPatente||'';
    
    // Metadati prenotazione
    row[H.ID_PREN]=id;
    row[H.STATO_PRENOTAZIONE]='Da Confermare';
    row[H.IMPORTO_PREVENTIVO]='';
    row[H.EMAIL]=p.drv1_Email||'';
    row[H.TEST]='';
    
    sh.appendRow(row);
    
    // Upsert clienti (1..3)
    const clienti=[];
    [1,2,3].forEach(n=>{
      const cf=(p[`drv${n}_CF`]||'').toUpperCase().trim();
      if(cf&&cf.length===16){
        clienti.push({
          CF:cf,
          Nome:p[`drv${n}_Nome`]||'',
          DataNascita:p[`drv${n}_DataNascita`]||'',
          LuogoNascita:p[`drv${n}_LuogoNascita`]||'',
          ComuneResidenza:p[`drv${n}_ComuneResidenza`]||'',
          ViaResidenza:p[`drv${n}_ViaResidenza`]||'',
          CivicoResidenza:p[`drv${n}_CivicoResidenza`]||'',
          NumeroPatente:p[`drv${n}_NumeroPatente`]||'',
          DataInizioPatente:p[`drv${n}_DataInizioPatente`]||'',
          ScadenzaPatente:p[`drv${n}_ScadenzaPatente`]||'',
          Cellulare:n===1?(p[`drv${n}_Cellulare`]||''):'',
          Email:n===1?(p[`drv${n}_Email`]||''):''
        });
      }
    });
    
    if(clienti.length){
      const resUpsert=upsertClienti(clienti);
      console.log(`[BOOKING] ${id}: upsert ${resUpsert.inserted} nuovi, ${resUpsert.updated} aggiornati`);
    }
    
    console.log(`[BOOKING] Creata prenotazione ${id} per ${clienti.length} clienti`);
    
    return respond(true,{
      id,
      targa:p.targa,
      clienti:clienti.length,
      dataInizio:p.dataInizio,
      dataFine:p.dataFine
    },`Prenotazione ${id} creata con successo`);
    
  }catch(e){
    console.error('[BOOKING] Errore:', e);
    return respond(false,{},'Errore creazione prenotazione: '+e.message,500);
  }
}

function generaIdPrenotazione(){
  const anno=new Date().getFullYear();
  const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
  if(!sh)return `BOOK-${anno}-001`;
  
  const data=sh.getDataRange().getValues();
  const H=CONFIG.PREN_COLS;
  let max=0;
  const prefisso=`BOOK-${anno}-`;
  
  for(let i=1;i<data.length;i++){
    const id=String(data[i][H.ID_PREN]||'');
    if(id.startsWith(prefisso)){
      const num=parseInt(id.replace(prefisso,''))||0;
      if(num>max)max=num;
    }
  }
  
  return `${prefisso}${String(max+1).padStart(3,'0')}`;
}

// ===== CLIENTI =====
function autocompletaCliente(p){
  try{
    const cf=(p.cf||'').toUpperCase().trim();
    if(!cf||cf.length!==16)return respond(false,{},'CF non valido',400);
    
    console.log(`[AUTOCOMPLETE] Ricerca CF: ${cf}`);
    
    const sh=ss().getSheetByName(CONFIG.SHEETS.CLIENTI);
    if(!sh)return respond(false,{},'Foglio Clienti non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const headers=data[0];
    
    // Cerca riga per CF
    let row=null;
    for(let i=1;i<data.length;i++){
      const cfIndex=headers.indexOf('Codice fiscale');
      if(cfIndex>=0 && (data[i][cfIndex]||'').toString().toUpperCase()===cf){
        row=data[i];
        break;
      }
    }
    
    if(!row)return respond(false,{},'Cliente non trovato',404);
    
    // Mappa i dati secondo gli header
    const m=h=>row[headers.indexOf(h)]||'';
    
    const response={
      CF:m('Codice fiscale')||cf,
      Nome:m('Nome'),
      DataNascita:m('Data di nascita'),
      LuogoNascita:m('Luogo di nascita'),
      ComuneResidenza:m('Comune di residenza'),
      ViaResidenza:m('Via di residenza'),
      CivicoResidenza:m('Civico di residenza'),
      NumeroPatente:m('Numero di patente'),
      DataInizioPatente:m('Data inizio validità patente'),
      ScadenzaPatente:m('Scadenza patente'),
      Cellulare:m('Cellulare'),
      Email:m('Email')
    };
    
    console.log(`[AUTOCOMPLETE] Cliente ${cf} trovato: ${response.Nome}`);
    
    return respond(true,response,`Cliente ${response.Nome} trovato`);
    
  }catch(e){
    console.error('[AUTOCOMPLETE] Errore:', e);
    return respond(false,{},'Errore ricerca cliente: '+e.message,500);
  }
}

function autocompletaClienteWithFallback(p){
  // Prova prima dal foglio Clienti
  const result=autocompletaCliente(p);
  if(result.success)return result;
  
  // Fallback: cerca nelle prenotazioni precedenti
  const cf=(p.cf||'').toUpperCase().trim();
  if(!cf||cf.length!==16)return result;
  
  try{
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return result;
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    
    // Cerca CF in qualsiasi autista delle prenotazioni
    for(let i=1;i<data.length;i++){
      const r=data[i];
      
      // Controlla CF autista 1, 2, 3
      if((r[H.CF]||'').toString().toUpperCase()===cf){
        return respond(true,{
          CF:r[H.CF],
          Nome:r[H.NAME],
          DataNascita:r[H.DATA_NASCITA],
          LuogoNascita:r[H.LUOGO_NASCITA],
          ComuneResidenza:r[H.COMUNE],
          ViaResidenza:r[H.VIA],
          CivicoResidenza:r[H.CIVICO],
          NumeroPatente:r[H.NUMERO_PATENTE],
          DataInizioPatente:r[H.INIZIO_PATENTE],
          ScadenzaPatente:r[H.SCADENZA_PATENTE],
          Cellulare:r[H.CELLULARE],
          Email:r[H.EMAIL]
        },`Cliente trovato nelle prenotazioni precedenti`);
      }
      
      if((r[H.CF2]||'').toString().toUpperCase()===cf){
        return respond(true,{
          CF:r[H.CF2],
          Nome:r[H.NOME2],
          DataNascita:r[H.DATA_NASCITA2],
          LuogoNascita:r[H.LUOGO_NASCITA2],
          ComuneResidenza:r[H.COMUNE2],
          ViaResidenza:r[H.VIA2],
          CivicoResidenza:r[H.CIVICO2],
          NumeroPatente:r[H.NUMERO_PATENTE2],
          DataInizioPatente:r[H.INIZIO_PATENTE2],
          ScadenzaPatente:r[H.SCADENZA_PATENTE2],
          Cellulare:'',
          Email:''
        },`Autista 2 trovato nelle prenotazioni precedenti`);
      }
      
      if((r[H.CF3]||'').toString().toUpperCase()===cf){
        return respond(true,{
          CF:r[H.CF3],
          Nome:r[H.NOME3],
          DataNascita:r[H.DATA_NASCITA3],
          LuogoNascita:r[H.LUOGO_NASCITA3],
          ComuneResidenza:r[H.COMUNE3],
          ViaResidenza:r[H.VIA3],
          CivicoResidenza:r[H.CIVICO3],
          NumeroPatente:r[H.NUMERO_PATENTE3],
          DataInizioPatente:r[H.INIZIO_PATENTE3],
          ScadenzaPatente:r[H.SCADENZA_PATENTE3],
          Cellulare:'',
          Email:''
        },`Autista 3 trovato nelle prenotazioni precedenti`);
      }
    }
    
    return result; // Cliente non trovato
    
  }catch(e){
    console.error('[AUTOCOMPLETE-FALLBACK] Errore:', e);
    return result;
  }
}

function upsertClienti(clienti){
  if(!clienti||!clienti.length)return{inserted:0,updated:0};
  
  const sh=ss().getSheetByName(CONFIG.SHEETS.CLIENTI);
  if(!sh)throw new Error('Foglio Clienti mancante');
  
  const data=sh.getDataRange().getValues();
  const headers=data[0];
  const cfIdx=headers.indexOf('Codice fiscale');
  if(cfIdx===-1)throw new Error('Colonna "Codice fiscale" non trovata');
  
  // Mappa CF esistenti
  const cfMap=new Map();
  for(let i=1;i<data.length;i++){
    const cf=(data[i][cfIdx]||'').toString().toUpperCase().trim();
    if(cf)cfMap.set(cf,i+1); // 1-based row
  }
  
  let inserted=0,updated=0;
  
  clienti.forEach(cliente=>{
    const cf=(cliente.CF||'').toUpperCase().trim();
    if(!cf||cf.length!==16)return;
    
    const existingRow=cfMap.get(cf);
    const rowData=CONFIG.CLIENTI_HEADERS.map(header=>{
      switch(header){
        case 'Nome':return cliente.Nome||'';
        case 'Data di nascita':return toISO(cliente.DataNascita)||'';
        case 'Luogo di nascita':return cliente.LuogoNascita||'';
        case 'Codice fiscale':return cf;
        case 'Comune di residenza':return cliente.ComuneResidenza||'';
        case 'Via di residenza':return cliente.ViaResidenza||'';
        case 'Civico di residenza':return cliente.CivicoResidenza||'';
        case 'Numero di patente':return cliente.NumeroPatente||'';
        case 'Data inizio validità patente':return toISO(cliente.DataInizioPatente)||'';
        case 'Scadenza patente':return toISO(cliente.ScadenzaPatente)||'';
        case 'Cellulare':return cliente.Cellulare||'';
        case 'Email':return cliente.Email||'';
        default:return '';
      }
    });
    
    if(existingRow){
      sh.getRange(existingRow,1,1,rowData.length).setValues([rowData]);
      updated++;
      console.log(`[UPSERT] Cliente ${cf} aggiornato`);
    }else{
      sh.appendRow(rowData);
      inserted++;
      console.log(`[UPSERT] Cliente ${cf} creato`);
    }
  });
  
  return{inserted,updated};
}

// ===== EMAIL =====
function inviaRiepilogo(p){
  try{
    const id=p.idPrenotazione;
    const email=(p.email||'').trim();
    
    if(!id)return respond(false,{},'ID prenotazione mancante',400);
    if(!email){
      console.log(`[EMAIL] Email non fornita per ${id}, skip invio`);
      return respond(false,{},'Email non fornita, invio saltato',400);
    }
    
    // Cerca prenotazione nel foglio
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return respond(false,{},'Foglio prenotazioni non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    
    let prenotazione=null;
    for(let i=1;i<data.length;i++){
      if(data[i][H.ID_PREN]===id){
        const r=data[i];
        prenotazione={
          id:r[H.ID_PREN],
          targa:r[H.TARGA],
          dataInizio:r[H.GIORNO_INIZIO],
          oraInizio:r[H.ORA_INIZIO],
          dataFine:r[H.GIORNO_FINE],
          oraFine:r[H.ORA_FINE],
          destinazione:r[H.DESTINAZIONE],
          nome:r[H.NAME],
          cellulare:r[H.CELLULARE],
          stato:r[H.STATO_PRENOTAZIONE]
        };
        break;
      }
    }
    
    if(!prenotazione)return respond(false,{},'Prenotazione non trovata',404);
    
    // Trova info veicolo dalla flotta
    let veicoloInfo='Veicolo';
    try{
      const flotta=JSON.parse(getFlottaRaw());
      const veicolo=flotta.find(v=>v.Targa===prenotazione.targa);
      if(veicolo){
        veicoloInfo=`${veicolo.Marca} ${veicolo.Modello} (${veicolo.Targa})`;
        if(veicolo.PassoLungo||veicolo.Targa==='EC787NM'){
          veicoloInfo+=' - Passo Lungo';
        }
      }
    }catch(e){
      console.warn('[EMAIL] Errore caricamento veicolo:', e);
    }
    
    // Costruisci email
    const oggetto=`Riepilogo Prenotazione ${id} - Imbriani Stefano Noleggio`;
    const linkAreaPersonale=`https://imbriani-noleggio.vercel.app/?login=${encodeURIComponent(prenotazione.nome.split(' ')[0])}`;
    
    const corpo=`
Gentile ${prenotazione.nome},

Grazie per aver scelto Imbriani Stefano Noleggio!

Ecco il riepilogo della sua prenotazione:

🆔 ID PRENOTAZIONE: ${id}
🚐 VEICOLO: ${veicoloInfo}
📅 RITIRO: ${formatDateForEmail(prenotazione.dataInizio)} alle ${prenotazione.oraInizio}
📅 CONSEGNA: ${formatDateForEmail(prenotazione.dataFine)} alle ${prenotazione.oraFine}
📍 DESTINAZIONE: ${prenotazione.destinazione}
ℹ️ STATO: ${prenotazione.stato}

🔗 AREA PERSONALE:
Per seguire lo stato della sua prenotazione:
${linkAreaPersonale}

Per qualsiasi informazione:
📞 Tel: 328 658 9618
📧 Email: info@imbrianinoleggio.it

Cordiali saluti,
Imbriani Stefano Noleggio
    `;
    
    // Invia email
    MailApp.sendEmail({
      to:email,
      subject:oggetto,
      body:corpo
    });
    
    console.log(`[EMAIL] Riepilogo inviato a ${email} per ${id}`);
    
    return respond(true,{
      email:email,
      idPrenotazione:id,
      linkAreaPersonale:linkAreaPersonale
    },`Email riepilogo inviata a ${email}`);
    
  }catch(e){
    console.error('[EMAIL] Errore invio:', e);
    return respond(false,{},'Errore invio email: '+e.message,500);
  }
}

// ===== FLOTTA & MANUTENZIONI =====
function handleFlotta(p){
  const method=p.method||'get';
  if(method==='get'){
    try{
      const sh=ss().getSheetByName(CONFIG.SHEETS.VEICOLI);
      if(!sh)return respond(false,[],'Foglio veicoli non trovato',500);
      
      const data=sh.getDataRange().getValues();
      const out=[];
      for(let i=1;i<data.length;i++){
        const r=data[i];
        if(r[0]){
          const v={
            Targa:r[0],
            Marca:r[1]||'',
            Modello:r[2]||'',
            Posti:parseInt(r[3])||9,
            Stato:r[4]||'Disponibile',
            Note:r[5]||'',
            PassoLungo:(r[0]==='EC787NM'),
            Disponibile:(String(r[4]||'').toLowerCase().includes('disponibile'))
          };
          out.push(v);
        }
      }
      return respond(true,out,`${out.length} veicoli`);
    }catch(e){
      return respond(false,[],'Errore flotta: '+e.message,500);
    }
  }
  return respond(false,null,'Metodo non supportato',400);
}

function handleManutenzioni(p){
  try{
    const sh=ss().getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
    if(!sh)return respond(false,[],'Foglio manutenzioni non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const out=[];
    for(let i=1;i<data.length;i++){
      const r=data[i];
      if(r[0]){
        out.push({
          ID:i,
          Targa:r[0],
          Marca:r[1]||'',
          Modello:r[2]||'',
          Posti:parseInt(r[3])||9,
          Stato:r[4]||'',
          DataInizio:toISO(r[5])||'',
          DataFine:toISO(r[6])||'',
          Costo:r[7]||0,
          Note:r[8]||''
        });
      }
    }
    return respond(true,out,`${out.length} manutenzioni`);
  }catch(e){
    return respond(false,[],'Errore manutenzioni: '+e.message,500);
  }
}

function getFlottaRaw(){
  const sh=ss().getSheetByName(CONFIG.SHEETS.VEICOLI);
  if(!sh)return JSON.stringify([]);
  
  const data=sh.getDataRange().getValues();
  const out=[];
  for(let i=1;i<data.length;i++){
    const r=data[i];
    if(r[0]){
      out.push({
        Targa:r[0],
        Marca:r[1]||'',
        Modello:r[2]||'',
        Posti:parseInt(r[3])||9,
        Stato:r[4]||'Disponibile',
        Note:r[5]||'',
        PassoLungo:(r[0]==='EC787NM'),
        Disponibile:(String(r[4]||'').toLowerCase().includes('disponibile'))
      });
    }
  }
  return JSON.stringify(out);
}

function getManutenzioniRaw(){
  const sh=ss().getSheetByName(CONFIG.SHEETS.MANUTENZIONI);
  if(!sh)return JSON.stringify([]);
  
  const data=sh.getDataRange().getValues();
  const out=[];
  for(let i=1;i<data.length;i++){
    const r=data[i];
    if(r[0]){
      out.push({
        ID:i,
        Targa:r[0],
        Stato:r[4]||'',
        DataInizio:toISO(r[5])||'',
        DataFine:toISO(r[6])||''
      });
    }
  }
  return JSON.stringify(out);
}

// ===== ADMIN =====
function handleModificaStato(p){
  const id=p.idPrenotazione||'';
  const nuovo=p.nuovoStato||'';
  if(!id||!nuovo)return respond(false,{},'ID e stato richiesti',400);
  
  try{
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return respond(false,{},'Foglio prenotazioni non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    
    for(let i=1;i<data.length;i++){
      if(data[i][H.ID_PREN]===id){
        const oldState=data[i][H.STATO_PRENOTAZIONE];
        sh.getRange(i+1,H.STATO_PRENOTAZIONE+1).setValue(nuovo);
        
        // Email di conferma se stato passa a "Confermata"
        const email=data[i][H.EMAIL];
        if(email&&nuovo.toLowerCase()==='confermata'&&oldState.toLowerCase()!=='confermata'){
          const subject=`Conferma prenotazione ${id} — Imbriani Stefano Noleggio`;
          const body=`La sua prenotazione ${id} è stata confermata!\n\nRiceverà un promemoria 3 giorni prima della partenza.\n\nImbriani Stefano Noleggio\nTel: 328 658 9618`;
          
          try{
            MailApp.sendEmail({to:email,subject:subject,body:body});
            console.log(`[ADMIN] Email conferma inviata a ${email} per ${id}`);
          }catch(emailErr){
            console.error('[ADMIN] Errore invio email:', emailErr);
          }
        }
        
        return respond(true,{oldState,nuovoStato:nuovo},'Stato aggiornato da "'+oldState+'" a "'+nuovo+'"');
      }
    }
    return respond(false,{},'Prenotazione non trovata',404);
  }catch(e){
    return respond(false,{},'Errore modifica stato: '+e.message,500);
  }
}

// ===== LOGIN & AREA PERSONALE =====
function handleLogin(p){
  try{
    const cf=(p.cf||'').toUpperCase().trim();
    if(!cf||cf.length!==16)return respond(false,{},'CF non valido',400);
    
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return respond(false,{},'Foglio prenotazioni non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    
    for(let i=1;i<data.length;i++){
      const r=data[i];
      if((r[H.CF]||'').toString().toUpperCase()===cf){
        return respond(true,{
          nome:r[H.NAME]||'',
          cf:cf,
          telefono:r[H.CELLULARE]||''
        },'Login OK');
      }
    }
    return respond(false,{},'Utente non trovato',404);
  }catch(e){
    return respond(false,{},'Errore login: '+e.message,500);
  }
}

function handleRecuperaPrenotazioni(p){
  try{
    const cf=(p.cf||'').toUpperCase().trim();
    if(!cf)return respond(false,{},'CF mancante',400);
    
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return respond(false,{},'Foglio prenotazioni non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    const out=[];
    
    for(let i=1;i<data.length;i++){
      const r=data[i];
      if(cf==='ALL'||(r[H.CF]&&String(r[H.CF]).toUpperCase()===cf)){
        out.push({
          ID:r[H.ID_PREN]||`BOOK-2025-${String(i).padStart(3,'0')}`,
          NomeCompleto:r[H.NAME]||'',
          CF:r[H.CF]||'',
          Targa:r[H.TARGA]||'',
          DataRitiro:r[H.GIORNO_INIZIO]||'',
          OraRitiro:r[H.ORA_INIZIO]||'',
          DataConsegna:r[H.GIORNO_FINE]||'',
          OraConsegna:r[H.ORA_FINE]||'',
          Destinazione:r[H.DESTINAZIONE]||'',
          Stato:r[H.STATO_PRENOTAZIONE]||'Da Confermare'
        });
      }
    }
    return respond(true,out,`${out.length} prenotazioni`);
  }catch(e){
    return respond(false,[],'Errore recupero prenotazioni: '+e.message,500);
  }
}

// ===== TEST & UTILITY =====
function handleTestEmail(p){
  try{
    const email=p.email||'dreenhd@gmail.com';
    const subject='🧪 Test Email - Imbriani Stefano Noleggio';
    const body=`Test email inviata il ${new Date().toLocaleString('it-IT')}.\n\nSe ricevi questa email, il sistema di invio funziona correttamente!\n\nImbriani Stefano Noleggio\nTel: 328 658 9618`;
    
    MailApp.sendEmail({to:email,subject:subject,body:body});
    
    return respond(true,{sent:true,email:email},'Email di test inviata a '+email);
  }catch(err){
    return respond(false,{},'Errore test email: '+err.message,500);
  }
}

function handleRicalcolaStati(){
  try{
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return respond(false,{},'Foglio prenotazioni non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    const now=new Date();
    let updated=0;
    
    for(let i=1;i<data.length;i++){
      const r=data[i];
      let changed=false;
      
      // Genera ID se mancante
      if(!r[H.ID_PREN]){
        r[H.ID_PREN]=generaIdPrenotazione();
        changed=true;
      }
      
      // Aggiorna stati automatici per prenotazioni confermate
      const stato=(r[H.STATO_PRENOTAZIONE]||'').toString();
      if(stato.toLowerCase()==='confermata'){
        const start=mergeDateTime(r[H.GIORNO_INIZIO],r[H.ORA_INIZIO]);
        const end=mergeDateTime(r[H.GIORNO_FINE],r[H.ORA_FINE]);
        
        let newState='Futura';
        if(now>=end)newState='Completato';
        else if(now>=start)newState='In corso';
        
        if(r[H.STATO_PRENOTAZIONE]!==newState){
          r[H.STATO_PRENOTAZIONE]=newState;
          changed=true;
        }
      }
      
      if(changed){
        data[i]=r;
        updated++;
      }
    }
    
    if(updated>0){
      sh.getRange(1,1,data.length,data[0].length).setValues(data);
    }
    
    // Popola anche i clienti dalle prenotazioni
    handlePopulateClienti();
    
    return respond(true,{updated:updated},'Ricalcolo: '+updated+' righe aggiornate');
  }catch(err){
    return respond(false,{},'Errore ricalcolo: '+err.message,500);
  }
}

function handlePopulateClienti(){
  try{
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return respond(false,{},'Foglio prenotazioni non trovato',500);
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    const clienti=[];
    
    for(let i=1;i<data.length;i++){
      const r=data[i];
      
      // Autista 1
      const cf1=(r[H.CF]||'').toString().toUpperCase().trim();
      if(cf1&&cf1.length===16){
        clienti.push({
          Nome:r[H.NAME]||'',
          DataNascita:r[H.DATA_NASCITA]||'',
          LuogoNascita:r[H.LUOGO_NASCITA]||'',
          CF:cf1,
          ComuneResidenza:r[H.COMUNE]||'',
          ViaResidenza:r[H.VIA]||'',
          CivicoResidenza:r[H.CIVICO]||'',
          NumeroPatente:r[H.NUMERO_PATENTE]||'',
          DataInizioPatente:r[H.INIZIO_PATENTE]||'',
          ScadenzaPatente:r[H.SCADENZA_PATENTE]||'',
          Cellulare:r[H.CELLULARE]||'',
          Email:r[H.EMAIL]||''
        });
      }
      
      // Autista 2
      const cf2=(r[H.CF2]||'').toString().toUpperCase().trim();
      if(cf2&&cf2.length===16){
        clienti.push({
          Nome:r[H.NOME2]||'',
          DataNascita:r[H.DATA_NASCITA2]||'',
          LuogoNascita:r[H.LUOGO_NASCITA2]||'',
          CF:cf2,
          ComuneResidenza:r[H.COMUNE2]||'',
          ViaResidenza:r[H.VIA2]||'',
          CivicoResidenza:r[H.CIVICO2]||'',
          NumeroPatente:r[H.NUMERO_PATENTE2]||'',
          DataInizioPatente:r[H.INIZIO_PATENTE2]||'',
          ScadenzaPatente:r[H.SCADENZA_PATENTE2]||'',
          Cellulare:'',
          Email:''
        });
      }
      
      // Autista 3
      const cf3=(r[H.CF3]||'').toString().toUpperCase().trim();
      if(cf3&&cf3.length===16){
        clienti.push({
          Nome:r[H.NOME3]||'',
          DataNascita:r[H.DATA_NASCITA3]||'',
          LuogoNascita:r[H.LUOGO_NASCITA3]||'',
          CF:cf3,
          ComuneResidenza:r[H.COMUNE3]||'',
          ViaResidenza:r[H.VIA3]||'',
          CivicoResidenza:r[H.CIVICO3]||'',
          NumeroPatente:r[H.NUMERO_PATENTE3]||'',
          DataInizioPatente:r[H.INIZIO_PATENTE3]||'',
          ScadenzaPatente:r[H.SCADENZA_PATENTE3]||'',
          Cellulare:'',
          Email:''
        });
      }
    }
    
    if(clienti.length){
      const res=upsertClienti(clienti);
      console.log(`[POPULATE] Clienti: ${res.inserted} nuovi, ${res.updated} aggiornati`);
      return respond(true,res,`Popolamento: ${res.inserted} nuovi, ${res.updated} aggiornati`);
    }
    
    return respond(true,{inserted:0,updated:0},'Nessun cliente da popolare');
  }catch(err){
    console.error('[POPULATE] Errore:', err);
    return respond(false,{},'Errore popolamento clienti: '+err.message,500);
  }
}

// ===== REMINDER JOB (Trigger giornaliero 09:00) =====
function reminderDailyJob(){
  try{
    const now=new Date();
    const in3Days=new Date(now.getTime()+3*24*60*60*1000);
    const sh=ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if(!sh)return;
    
    const data=sh.getDataRange().getValues();
    const H=CONFIG.PREN_COLS;
    let sent=0;
    
    for(let i=1;i<data.length;i++){
      const r=data[i];
      const stato=(r[H.STATO_PRENOTAZIONE]||'').toLowerCase();
      if(stato!=='confermata')continue;
      
      const start=mergeDateTime(r[H.GIORNO_INIZIO],r[H.ORA_INIZIO]);
      if(start.toDateString()===in3Days.toDateString()){
        const email=r[H.EMAIL];
        if(email){
          const id=r[H.ID_PREN]||'';
          const subject=`Promemoria — tra 3 giorni si parte! (${id})`;
          const body=`Ciao ${r[H.NAME]||''},\n\nTra 3 giorni inizia il tuo noleggio!\n\nRitiro: ${formatDateForEmail(r[H.GIORNO_INIZIO])} alle ${r[H.ORA_INIZIO]}\nVeicolo: ${r[H.TARGA]}\nDestinazione: ${r[H.DESTINAZIONE]}\n\nImbriani Stefano Noleggio\nTel: 328 658 9618`;
          
          try{
            MailApp.sendEmail({to:email,subject:subject,body:body});
            sent++;
          }catch(emailErr){
            console.error(`[REMINDER] Errore invio per ${id}:`, emailErr);
          }
        }
      }
    }
    
    console.log(`[REMINDER] Job completato: ${sent} email inviate per ${in3Days.toDateString()}`);
  }catch(err){
    console.error('[REMINDER] Errore job:', err);
  }
}

// ===== UTILITY =====
function toISO(v){
  try{
    if(!v)return'';
    if(v instanceof Date)return v.toISOString().split('T')[0];
    if(typeof v==='string'){
      if(v.includes('/')){
        const parts=v.split('/');
        if(parts.length===3){
          const d=new Date(parts[2],parts[1]-1,parts[0]);
          return isNaN(d.getTime())?'':d.toISOString().split('T')[0];
        }
      }
      const d=new Date(v);
      return isNaN(d.getTime())?'':d.toISOString().split('T')[0];
    }
    return'';
  }catch{
    return'';
  }
}

function toDateSafe(s){
  try{
    if(!s)return null;
    const d=(s instanceof Date)?s:new Date(s);
    return isNaN(d.getTime())?null:d;
  }catch{
    return null;
  }
}

function mergeDateTime(dateInput,timeString){
  try{
    const date=toDateSafe(dateInput)||new Date();
    const [hours,minutes]=(timeString||'00:00').split(':').map(Number);
    const result=new Date(date);
    result.setHours(hours||0,minutes||0,0,0);
    return result;
  }catch{
    return new Date(0);
  }
}

function formatDateForEmail(dateInput){
  if(!dateInput)return'';
  const date=toDateSafe(dateInput);
  if(!date)return String(dateInput);
  
  const day=date.getDate().toString().padStart(2,'0');
  const month=(date.getMonth()+1).toString().padStart(2,'0');
  const year=date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

function formatItalianDate(dateInput){
  try{
    const date=toDateSafe(dateInput);
    if(!date)return String(dateInput||'');
    return date.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
  }catch{
    return String(dateInput||'');
  }
}

// ===== DEBUG =====
function debugDisponibilita(){
  console.log('=== DEBUG DISPONIBILITÀ ===');
  
  // 1. Verifica prenotazioni attive
  const pren=getPrenotazioniAttive();
  console.log('PRENOTAZIONI ATTIVE:', pren);
  
  // 2. Verifica manutenzioni
  const man=JSON.parse(getManutenzioniRaw());
  console.log('MANUTENZIONI:', man);
  
  // 3. Verifica flotta
  const flotta=JSON.parse(getFlottaRaw());
  console.log('FLOTTA:', flotta);
  
  // 4. Test periodo specifico
  const result=handleDisponibilita({
    dataInizio:'2025-11-04',
    dataFine:'2025-11-07',
    oraInizio:'10:00',
    oraFine:'18:00'
  });
  console.log('RISULTATO TEST:', result);
}