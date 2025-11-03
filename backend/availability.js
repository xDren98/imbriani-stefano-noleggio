/**
 * BACKEND AVAILABILITY v8.0 - Real availability with 2h slots and suggestions
 * Handles real booking overlaps, maintenance blocks, and smart alternatives
 */

// CONFIG: Incolla nel tuo GAS se non importi backend-config.js
const PREN_COLS = {
  NAME: 0, DATA_NASCITA: 1, LUOGO_NASCITA: 2, CF: 3, COMUNE: 4, VIA: 5, CIVICO: 6,
  NUMERO_PATENTE: 7, INIZIO_PATENTE: 8, SCADENZA_PATENTE: 9, TARGA: 10,
  ORA_INIZIO: 11, ORA_FINE: 12, GIORNO_INIZIO: 13, GIORNO_FINE: 14,
  DESTINAZIONE: 15, CELLULARE: 16, DATA_CONTRATTO: 17,
  NOME2: 18, DATA_NASCITA2: 19, LUOGO_NASCITA2: 20, CF2: 21, COMUNE2: 22,
  VIA2: 23, CIVICO2: 24, NUMERO_PATENTE2: 25, INIZIO_PATENTE2: 26, SCADENZA_PATENTE2: 27,
  NOME3: 28, DATA_NASCITA3: 29, LUOGO_NASCITA3: 30, CF3: 31, COMUNE3: 32,
  VIA3: 33, CIVICO3: 34, NUMERO_PATENTE3: 35, INIZIO_PATENTE3: 36, SCADENZA_PATENTE3: 37,
  ID_PREN: 38, STATO_PRENOTAZIONE: 39, IMPORTO_PREVENTIVO: 40, EMAIL: 41, TEST: 42
};

const CONFIG = CONFIG || {};
CONFIG.SHEETS = CONFIG.SHEETS || {};
CONFIG.SHEETS.PRENOTAZIONI = "Risposte del modulo 1";
CONFIG.SHEETS.MANUTENZIONI = "Gestione manutenzioni"; // Adatta se diverso
CONFIG.PREN_COLS = PREN_COLS;

const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

/**
 * handleDisponibilita v8.0
 * Calcola disponibilità reale con:
 * - Esclusione prenotazioni (stato ≠ Annullata)
 * - Esclusione manutenzioni (Programmata/In corso)
 * - Regola fasce 2h: rientro → disponibile dalla fascia successiva (+2h buffer)
 * - Suggerimenti alternativi se nessun slot disponibile
 */
function handleDisponibilita(p) {
  try {
    const inizioReq = toDateSafe(p.dataInizio) || new Date();
    const fineReq = toDateSafe(p.dataFine) || inizioReq;
    const oraInizioReq = p.oraInizio || '08:00';
    const oraFineReq = p.oraFine || '20:00';
    
    // Merge datetime richiesti
    const startReq = mergeDateTime(inizioReq, oraInizioReq);
    const endReq = mergeDateTime(fineReq, oraFineReq);
    
    console.log(`[DISP] Check: ${startReq.toISOString()} - ${endReq.toISOString()}`);
    
    // 1. Carica flotta base
    const flotta = JSON.parse(getFlottaRaw());
    
    // 2. Carica manutenzioni attive nel periodo
    const manutenzioni = JSON.parse(getManutenzioniRaw());
    const manAttive = manutenzioni.filter(m => {
      const stato = (m.Stato || '').toLowerCase();
      if (!(stato.includes('programma') || stato.includes('corso'))) return false;
      const s = toDateSafe(m.DataInizio);
      const f = toDateSafe(m.DataFine) || s;
      if (!s) return false;
      return s <= endReq && f >= startReq;
    });
    const targheInManutenzione = new Set(manAttive.map(m => String(m.Targa || '').trim()).filter(Boolean));
    
    // 3. Carica prenotazioni e calcola overlap (QUALSIASI stato diverso da "Annullata")
    const prenotazioni = getPrenotazioniAttive();
    const targheOccupate = new Set();
    
    prenotazioni.forEach(pren => {
      const stato = (pren.Stato || '').toLowerCase().trim();
      if (stato === 'annullata') return; // Solo "Annullata" è esclusa
      
      const startPren = mergeDateTime(pren.DataInizio, pren.OraInizio);
      const endPren = mergeDateTime(pren.DataFine, pren.OraFine);
      
      // Check overlap con logica fasce: se pulmino rientra alle 08:00, è libero dalle 10:00
      // Quindi endPren alle 08:00 NON blocca startReq dalle 10:00
      const endPrenAdjusted = new Date(endPren.getTime() + 2 * 60 * 60 * 1000); // +2h buffer fascia
      
      if (startPren < endReq && endPrenAdjusted > startReq) {
        targheOccupate.add(pren.Targa);
      }
    });
    
    console.log(`[DISP] Manutenzione: ${Array.from(targheInManutenzione)}`);
    console.log(`[DISP] Occupate: ${Array.from(targheOccupate)}`);
    
    // 4. Applica stati finali
    flotta.forEach(v => {
      if (targheInManutenzione.has(v.Targa)) {
        v.Stato = 'Manutenzione';
        v.Disponibile = false;
      } else if (targheOccupate.has(v.Targa)) {
        v.Stato = 'Occupato';
        v.Disponibile = false;
      } else {
        const baseStato = (v.Stato || '').toLowerCase();
        v.Disponibile = baseStato.includes('disponibile') || !baseStato.includes('manutenzione');
      }
    });
    
    const disponibili = flotta.filter(v => v.Disponibile);
    
    // 5. Calcola suggerimenti se nessun veicolo disponibile
    let suggerimenti = [];
    if (disponibili.length === 0) {
      suggerimenti = calcolaSuggerimentiAlternativi(startReq, endReq, flotta, prenotazioni);
    }
    
    return respond(true, {
      disponibili,
      totaleFlotta: flotta.length,
      suggerimenti,
      debug: {
        richiesta: { inizio: startReq.toISOString(), fine: endReq.toISOString() },
        manutenzioni: Array.from(targheInManutenzione),
        occupate: Array.from(targheOccupate)
      }
    }, `${disponibili.length} disponibili${suggerimenti.length ? `, ${suggerimenti.length} suggerimenti` : ''}`);
    
  } catch (e) {
    return respond(false, { disponibili: [] }, 'Errore disponibilità: ' + e.message, 500);
  }
}

/**
 * Carica prenotazioni attive dal foglio "Risposte del modulo 1"
 */
function getPrenotazioniAttive() {
  const sh = ss().getSheetByName(CONFIG.SHEETS.PRENOTAZIONI);
  if (!sh) return [];
  
  const data = sh.getDataRange().getValues();
  const H = CONFIG.PREN_COLS;
  const out = [];
  
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[H.TARGA]) {
      out.push({
        Targa: r[H.TARGA],
        DataInizio: r[H.GIORNO_INIZIO],
        OraInizio: r[H.ORA_INIZIO] || '08:00',
        DataFine: r[H.GIORNO_FINE],
        OraFine: r[H.ORA_FINE] || '20:00',
        Stato: r[H.STATO_PRENOTAZIONE] || 'Da Confermare'
      });
    }
  }
  
  return out;
}

/**
 * Calcola suggerimenti alternativi per fasce non disponibili
 * Strategia: ±2h, ±4h, ±6h stesso giorno, poi giorni successivi (max 7)
 */
function calcolaSuggerimentiAlternativi(startReq, endReq, flotta, prenotazioni) {
  const suggerimenti = [];
  const durataOriginale = endReq.getTime() - startReq.getTime();
  
  // Per ogni veicolo non disponibile (Occupato), trova slot liberi
  flotta.filter(v => !v.Disponibile && v.Stato === 'Occupato').forEach(veicolo => {
    const libero = trovaSlotLibero(veicolo.Targa, startReq, durataOriginale, prenotazioni);
    if (libero) {
      suggerimenti.push({
        targa: veicolo.Targa,
        marca: veicolo.Marca,
        modello: veicolo.Modello,
        dataInizioSuggerita: libero.dataInizio,
        oraInizioSuggerita: libero.oraInizio,
        dataFineSuggerita: libero.dataFine,
        oraFineSuggerita: libero.oraFine,
        motivoOriginale: 'Occupato nella fascia richiesta'
      });
    }
  });
  
  return suggerimenti.slice(0, 3); // Max 3 suggerimenti
}

/**
 * Trova il primo slot libero per una targa specifica
 * Prova fasce vicine: ±2h, ±4h, ±6h stesso giorno, poi giorni successivi
 */
function trovaSlotLibero(targa, startReq, durata, prenotazioni) {
  // Prova fasce vicine: prima +/- ore stesso giorno, poi giorni successivi
  for (let deltaDays = 0; deltaDays <= 7; deltaDays++) {
    for (let deltaSlots of [0, 1, -1, 2, -2, 3, -3]) {
      const dataBase = new Date(startReq);
      dataBase.setDate(dataBase.getDate() + deltaDays);
      
      const oraOriginale = startReq.getHours();
      const slotOriginale = TIME_SLOTS.findIndex(f => parseInt(f.split(':')[0]) >= oraOriginale);
      const nuovoSlot = slotOriginale + deltaSlots;
      
      if (nuovoSlot < 0 || nuovoSlot >= TIME_SLOTS.length) continue;
      
      const nuovaOra = TIME_SLOTS[nuovoSlot];
      const [h, m] = nuovaOra.split(':').map(Number);
      dataBase.setHours(h, m, 0, 0);
      
      const fineSlot = new Date(dataBase.getTime() + durata);
      
      // Verifica se questo slot è libero per la targa
      const conflitto = prenotazioni.some(p => {
        if (p.Targa !== targa) return false;
        const stato = (p.Stato || '').toLowerCase();
        if (stato === 'annullata') return false;
        
        const startP = mergeDateTime(p.DataInizio, p.OraInizio);
        const endP = mergeDateTime(p.DataFine, p.OraFine);
        const endPAdjusted = new Date(endP.getTime() + 2 * 60 * 60 * 1000);
        
        return startP < fineSlot && endPAdjusted > dataBase;
      });
      
      if (!conflitto) {
        return {
          dataInizio: dataBase.toISOString().split('T')[0],
          oraInizio: nuovaOra,
          dataFine: fineSlot.toISOString().split('T')[0],
          oraFine: fineSlot.getHours().toString().padStart(2, '0') + ':00'
        };
      }
    }
  }
  
  return null;
}

/**
 * Funzioni helper (da copiare nel tuo GAS se non presenti)
 */
function mergeDateTime(dateObj, timeString) {
  const date = toDateSafe(dateObj) || new Date();
  const [hours, minutes] = (timeString || '08:00').split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function toDateSafe(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}