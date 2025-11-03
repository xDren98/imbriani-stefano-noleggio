/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v7.2
 * - Crea prenotazione completa con ID BOOK-YYYY-###
 * - Ricalcolo stati prenotazioni (Futura/In corso/Completato) se Confermata
 */

const CONFIG = {
  VERSION: '7.2.0',
  TOKEN: 'imbriani_secret_2025',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  SHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  DEBUG: true,
  MAX_TIMESTAMP_AGE: 120000,
  SHEETS: { PRENOTAZIONI:'Risposte del modulo 1', CLIENTI:'Clienti', VEICOLI:'Gestione pulmini', MANUTENZIONI:'Registro manutenzioni' },
  VEICOLI_COLS: { TARGA:0, MARCA:1, MODELLO:2, POSTI:3, STATO:4, NOTE:5 },
  MANUTENZIONI_COLS: { TARGA:0, MARCA:1, MODELLO:2, POSTI:3, STATO:4, DATA_INIZIO:5, DATA_FINE:6, COSTO:7, NOTE:8 },
  PRENOTAZIONI_COLS: { TIMESTAMP:0, NOME:1, DATA_NASCITA:2, LUOGO_NASCITA:3, CF:4, COMUNE_RESIDENZA:5, VIA_RESIDENZA:6, CIVICO_RESIDENZA:7, NUMERO_PATENTE:8, INIZIO_PATENTE:9, SCADENZA_PATENTE:10, TARGA:11, ORA_INIZIO:12, ORA_FINE:13, GIORNO_INIZIO:14, GIORNO_FINE:15, DESTINAZIONE:16, CELLULARE:17, DATA_CONTRATTO:18, ID_PRENOTAZIONE:39, STATO_PRENOTAZIONE:40, IMPORTO_PREVENTIVO:41, NOTE:42, EMAIL:43 }
};

function doGet(e){try{const out=ContentService.createTextOutput();out.setMimeType(ContentService.MimeType.JSON);const v=validateRequest(e);if(!v.valid)return createResponse(false,null,v.error,400);const a=e.parameter.action;switch(a){case'login':return handleLogin(e.parameter);case'recuperaPrenotazioni':return handleRecuperaPrenotazioni(e.parameter);case'disponibilita':return handleDisponibilita(e.parameter);case'flotta':return handleFlotta(e.parameter);case'manutenzioni':return handleManutenzioni(e.parameter);case'creaPrenotazione':return handleCreaPrenotazione(e.parameter);case'modificaStato':return handleModificaStato(e.parameter);case'ricalcolaStati':return handleRicalcolaStati();default:return createResponse(false,null,`Azione non supportata: ${a}`,400)}}catch(err){return createResponse(false,null,'Errore interno server',500)}}
function doPost(e){return doGet(e)}

function createResponse(success,data,message,code){const resp={success,data,message:message||'',code:code||200,timestamp:new Date().toISOString(),version:CONFIG.VERSION};const out=ContentService.createTextOutput(JSON.stringify(resp));out.setMimeType(ContentService.MimeType.JSON);return out}
function getSheet(name){return SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(name)}
function validateRequest(e){const p=e.parameter;if(!p.token||p.token!==CONFIG.TOKEN)return{valid:false,error:'Token non valido'};const ts=parseInt(p.ts);if(!ts||isNaN(ts))return{valid:false,error:'Timestamp mancante o invalido'};if(Math.abs(Date.now()-ts)>CONFIG.MAX_TIMESTAMP_AGE)return{valid:false,error:'Timestamp scaduto o futuro'};return{valid:true}}

// --- Funzioni esistenti v7.1 invariate (flotta, manutenzioni, disponibilita, util) ---
