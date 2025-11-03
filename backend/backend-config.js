// backend-config.js - Prenotazioni sheet mapping + availability notes
// Mappa colonne (0-based) per il foglio "Risposte del modulo 1"
const PREN_COLS = {
  NAME: 0,
  DATA_NASCITA: 1,
  LUOGO_NASCITA: 2,
  CF: 3,
  COMUNE: 4,
  VIA: 5,
  CIVICO: 6,
  NUMERO_PATENTE: 7,
  INIZIO_PATENTE: 8,
  SCADENZA_PATENTE: 9,
  TARGA: 10,
  ORA_INIZIO: 11,
  ORA_FINE: 12,
  GIORNO_INIZIO: 13,
  GIORNO_FINE: 14,
  DESTINAZIONE: 15,
  CELLULARE: 16,
  DATA_CONTRATTO: 17,
  NOME2: 18,
  DATA_NASCITA2: 19,
  LUOGO_NASCITA2: 20,
  CF2: 21,
  COMUNE2: 22,
  VIA2: 23,
  CIVICO2: 24,
  NUMERO_PATENTE2: 25,
  INIZIO_PATENTE2: 26,
  SCADENZA_PATENTE2: 27,
  NOME3: 28,
  DATA_NASCITA3: 29,
  LUOGO_NASCITA3: 30,
  CF3: 31,
  COMUNE3: 32,
  VIA3: 33,
  CIVICO3: 34,
  NUMERO_PATENTE3: 35,
  INIZIO_PATENTE3: 36,
  SCADENZA_PATENTE3: 37,
  ID_PREN: 38,
  STATO_PRENOTAZIONE: 39,
  IMPORTO_PREVENTIVO: 40,
  EMAIL: 41,
  TEST: 42
};

const CONFIG_BACKEND_GUIDE = `
Note calcolo disponibilità (v8):
- Esclusi sempre stati diversi da "Annullata".
- Buffer rientro +2h: se una prenotazione termina alle 08:00, il mezzo è libero dalle 10:00.
- Fasce consentite: 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00.
- Manutenzioni "Programmata" / "In corso" bloccano la disponibilità.
`;

if (typeof module !== 'undefined') {
  module.exports = { PREN_COLS, CONFIG_BACKEND_GUIDE };
}
