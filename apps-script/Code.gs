/**
 * IMBRIANI STEFANO NOLEGGIO - BACKEND v8.0.2
 * Patch: integra mapping PREN_COLS secondo header fornito e auto-fix all'avvio
 */

// 1) Mapping definitivo (0-based) coerente con l'ordine header comunicato
CONFIG.PREN_COLS = {
  NAME: 1,
  DATA_NASCITA: 2,
  LUOGO_NASCITA: 3,
  CF: 4,
  COMUNE: 5,
  VIA: 6,
  CIVICO: 7,
  NUMERO_PATENTE: 8,
  INIZIO_PATENTE: 9,
  SCADENZA_PATENTE: 10,
  TARGA: 11,
  ORA_INIZIO: 12,
  ORA_FINE: 13,
  GIORNO_INIZIO: 14,
  GIORNO_FINE: 15,
  DESTINAZIONE: 16,
  CELLULARE: 17,
  DATA_CONTRATTO: 18,
  NOME2: 19,
  DATA_NASCITA2: 20,
  LUOGO_NASCITA2: 21,
  CF2: 22,
  COMUNE2: 23,
  VIA2: 24,
  CIVICO2: 25,
  NUMERO_PATENTE2: 26,
  INIZIO_PATENTE2: 27,
  SCADENZA_PATENTE2: 28,
  NOME3: 29,
  DATA_NASCITA3: 30,
  LUOGO_NASCITA3: 31,
  CF3: 32,
  COMUNE3: 33,
  VIA3: 34,
  CIVICO3: 35,
  NUMERO_PATENTE3: 36,
  INIZIO_PATENTE3: 37,
  SCADENZA_PATENTE3: 38,
  ID_PREN: 39,
  STATO_PRENOTAZIONE: 40,
  IMPORTO_PREVENTIVO: 41,
  EMAIL: 42,
  TEST: 43
};

// 2) Auto-fix opzionale: verifica che la prima riga del foglio coincida con le etichette chiave
function __autoFixPrenCols() {
  try {
    const sh = ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
    if (!sh) return;
    const header = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(x=>String(x||'').trim().toLowerCase());
    // Chiavi minime da validare
    const expect = {
      targa: CONFIG.PREN_COLS.TARGA,
      giorno_inizio: CONFIG.PREN_COLS.GIORNO_INIZIO,
      giorno_fine: CONFIG.PREN_COLS.GIORNO_FINE,
      stato: CONFIG.PREN_COLS.STATO_PRENOTAZIONE,
      id: CONFIG.PREN_COLS.ID_PREN
    };
    // Se le posizioni non tornano, logga un warning (non modifica)
    if (header[expect.targa] !== 'targa' || header[expect.giorno_inizio] !== 'giorno inizio noleggio') {
      console.warn('[MAPPING] Header non allineato alle posizioni attese. Verifica PREN_COLS.');
    }
  } catch(e) {
    console.warn('[MAPPING] AutoFix error:', e.message);
  }
}

// 3) Esegui una verifica mapping all'avvio di doGet
const __ORIG_doGet = typeof doGet === 'function' ? doGet : null;
function doGet(e){
  __autoFixPrenCols();
  if (__ORIG_doGet) return __ORIG_doGet(e);
  return respond(false,null,'Router non inizializzato',500);
}
