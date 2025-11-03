# Backend v8.0 - Google Apps Script Integration Guide

## 📋 Checklist Integrazione GAS

### 1. Copia file backend nella tua GAS

**File da copiare (in ordine):**

1. **backend-config.js** - Configurazione colonne e costanti
2. **availability.js** - handleDisponibilita v8 (fasce 2h + suggerimenti)
3. **bookings.js** - creaPrenotazione (BOOK-YYYY-### + upsert clienti)
4. **clients.js** - autocompletaCliente (CF lookup + fallback)
5. **email.js** - inviaRiepilogo (email con link area personale)

### 2. Verifica nomi fogli Google Sheets

**Nomi attesi dal backend:**
- `"Risposte del modulo 1"` - Prenotazioni (CONFIG.SHEETS.PRENOTAZIONI)
- `"Gestione manutenzioni"` - Manutenzioni (CONFIG.SHEETS.MANUTENZIONI)
- `"Clienti"` - Anagrafica clienti per autocompletaCliente
- `"Flotta"` - Veicoli disponibili

**Se i nomi differiscono, aggiorna in backend-config.js:**
```javascript
CONFIG.SHEETS = {
  PRENOTAZIONI: "Il tuo nome sheet prenotazioni",
  MANUTENZIONI: "Il tuo nome sheet manutenzioni",
  CLIENTI: "Il tuo nome sheet clienti",
  FLOTTA: "Il tuo nome sheet flotta"
};
```

### 3. Verifica funzioni esistenti

**Funzioni che devono esistere nel tuo GAS:**
- `ss()` - ritorna SpreadsheetApp.getActiveSpreadsheet()
- `respond(success, data, message, code)` - formato risposta standard
- `getFlottaRaw()` - ritorna JSON string della flotta
- `getManutenzioniRaw()` - ritorna JSON string delle manutenzioni
- `toDateSafe(input)` - converte input in Date

### 4. Mapping colonne "Risposte del modulo 1"

**Ordine colonne (0-based):**
```javascript
const PREN_COLS = {
  NAME: 0,                    // Nome
  DATA_NASCITA: 1,           // Data di nascita
  LUOGO_NASCITA: 2,          // Luogo di nascita
  CF: 3,                     // Codice fiscale
  COMUNE: 4,                 // Comune di residenza
  VIA: 5,                    // Via di residenza
  CIVICO: 6,                 // Civico di residenza
  NUMERO_PATENTE: 7,         // Numero di patente
  INIZIO_PATENTE: 8,         // Data inizio validità patente
  SCADENZA_PATENTE: 9,       // Scadenza patente
  TARGA: 10,                 // Targa
  ORA_INIZIO: 11,            // Ora inizio noleggio
  ORA_FINE: 12,              // Ora fine noleggio
  GIORNO_INIZIO: 13,         // Giorno inizio noleggio
  GIORNO_FINE: 14,           // Giorno fine noleggio
  DESTINAZIONE: 15,          // Destinazione
  CELLULARE: 16,             // Cellulare
  DATA_CONTRATTO: 17,        // Data contratto
  // Autista 2 (18-27)
  NOME2: 18,
  // ... altri campi autista 2
  // Autista 3 (28-37)
  NOME3: 28,
  // ... altri campi autista 3
  ID_PREN: 38,               // ID prenotazione
  STATO_PRENOTAZIONE: 39,    // Stato prenotazione
  IMPORTO_PREVENTIVO: 40,    // Importo preventivo
  EMAIL: 41,                 // Email
  TEST: 42                   // test
};
```

### 5. Logica Disponibilità v8

**Regole:**
- ✅ Fasce consentite: 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
- ✅ Regola rientro: se prenotazione finisce alle 08:00, veicolo disponibile dalle 10:00 (+2h buffer)
- ❌ Esclusi: stati prenotazione ≠ "Annullata" (case insensitive)
- ❌ Esclusi: manutenzioni "Programmata" o "In corso" che si sovrappongono al periodo
- 💡 Suggerimenti: se nessun veicolo disponibile, propone ±2h/±4h/±6h stesso giorno, poi giorni successivi (max 7)

### 6. Test Backend

**Test handleDisponibilita:**
```javascript
// Test con periodo futuro
const result = handleDisponibilita({
  dataInizio: '2025-11-10',
  dataFine: '2025-11-12', 
  oraInizio: '10:00',
  oraFine: '18:00'
});
console.log(result);
```

**Test autocompletaCliente:**
```javascript
const client = autocompletaCliente({cf: 'RSSMRA85M01H501Z'});
console.log(client);
```

**Test creaPrenotazione:**
```javascript
const booking = creaPrenotazione({
  targa: 'AB123CD',
  dataInizio: '2025-11-10',
  dataFine: '2025-11-12',
  oraInizio: '10:00',
  oraFine: '18:00',
  drv1_CF: 'RSSMRA85M01H501Z',
  drv1_Nome: 'Mario Rossi',
  drv1_NumeroPatente: 'U1234567890',
  drv1_Email: 'test@example.com'
});
console.log(booking);
```

### 7. Autorizzazioni GAS richieste

- **Sheets**: lettura/scrittura fogli Google Sheets
- **Gmail**: invio email (MailApp.sendEmail)
- **Utilities**: formattazione date (Utilities.formatDate)

### 8. Trigger consigliati

- **doGet(e)**: entry point per richieste GET frontend
- **doPost(e)**: entry point per richieste POST (se usi POST)

## 🚀 Quick Start

1. Copia tutti i file backend/*.js nel tuo progetto GAS
2. Verifica/aggiorna i nomi fogli in CONFIG.SHEETS
3. Testa le funzioni con i comandi sopra
4. Autorizza le API richieste
5. Pubblica come Web App

## 🛠️ Debug

**Console logs utili:**
- `[DISP] Check: ...` - Periodo richiesto
- `[DISP] Manutenzione: [...]` - Targhe in manutenzione
- `[DISP] Occupate: [...]` - Targhe occupate da prenotazioni
- `[BOOKING] Creata prenotazione ...` - Prenotazione salvata
- `[EMAIL] Riepilogo inviato ...` - Email inviata

**Errori comuni:**
- `step-autisti element not found` → Aggiorna index.html con Step 4
- `3 disponibili` ma tutti occupati → Verifica PREN_COLS e stati prenotazioni
- Autocomplete non funziona → Verifica headers foglio "Clienti"