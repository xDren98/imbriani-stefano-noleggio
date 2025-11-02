/* ═══════════════════════════════════════════════════════════════════════════
   IMBRIANI NOLEGGIO - config.js v6.0 - CONFIGURAZIONE CORRETTA
   Configurazione Centralizzata Frontend
   Aggiornato: 02 Novembre 2025
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const FRONTEND_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec',
  TOKEN: 'imbriani_secret_2025',
  
  endpoints: {
    login: '?action=login',
    datiCliente: '?action=login',
    recuperaPrenotazioni: '?action=recuperaPrenotazioni',
    disponibilita: '?action=disponibilita',
    aggiornaProfilo: '?action=aggiornaProfilo',
    creaPrenotazione: '?action=creaPrenotazione',
    generatePDF: '?action=generatePDF',
    adminPrenotazioni: '?action=recuperaPrenotazioni&cf=ALL',
    modificaStato: '?action=modificaStato',
  },
  
  timeouts: {
    fetch: 15000,
    retry: 3
  },
  
  ui: {
    animationDuration: 300,
    toastDuration: 5000,
    loadingDelay: 200
  },
  
  validation: {
    CF_LENGTH: 16,
    MAX_AUTISTI: 3,
    MIN_AUTISTI: 1,
    ORARI_VALIDI: ['08:00','12:00','16:00','20:00']
  },
  
  stati: {
    DA_CONFERMARE: 'Da Confermare',
    CONFERMATA: 'Confermata',
    RIFIUTATA: 'Rifiutata',
    ANNULLATA: 'Annullata'
  },
  
  statiEmoji: {
    'Da Confermare': '⏳',
    'Confermata': '✅',
    'Rifiutata': '❌',
    'Annullata': '🚫'
  },
  
  storage: {
    CF: 'imbriani_cf',
    USER_DATA: 'imbriani_user',
    BOOKING_DRAFT: 'imbriani_booking_draft',
    LAST_LOGIN: 'imbriani_last_login'
  },
  
  DEBUG: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

const SHEETS_CONFIG = {
  // ✅ NOMI FOGLI CORRETTI DAL BACKEND
  FOGLI: {
    PRENOTAZIONI: 'Risposte del modulo 1',  // ✅ Nome corretto
    CLIENTI: 'Clienti',
    VEICOLI: 'Gestione Pulmini',
    MANUTENZIONI: 'Registro manutenzioni'
  },
  
  // Mapping campi prenotazioni
  CAMPI_PRENOTAZIONI: {
    TIMESTAMP: 'Informazioni cronologiche',
    NOME: 'Nome',
    DATA_NASCITA: 'Data di nascita',
    LUOGO_NASCITA: 'Luogo di nascita',
    CF: 'Codice fiscale',
    COMUNE_RESIDENZA: 'Comune di residenza',
    VIA_RESIDENZA: 'Via di residenza',
    CIVICO_RESIDENZA: 'Civico di residenza',
    NUMERO_PATENTE: 'Numero di patente',
    INIZIO_PATENTE: 'Data inizio validità patente',
    SCADENZA_PATENTE: 'Scadenza patente',
    TARGA: 'Targa',
    ORA_INIZIO: 'Ora inizio noleggio',
    ORA_FINE: 'Ora fine noleggio',
    GIORNO_INIZIO: 'Giorno inizio noleggio',
    GIORNO_FINE: 'Giorno fine noleggio',
    DESTINAZIONE: 'Destinazione',
    CELLULARE: 'Cellulare',
    DATA_CONTRATTO: 'Data contratto',
    
    // Autista 2
    NOME_AUTISTA_2: 'Nome Autista 2',
    DATA_NASCITA_AUTISTA_2: 'Data di nascita Autista 2',
    LUOGO_NASCITA_AUTISTA_2: 'Luogo di nascita Autista 2',
    CF_AUTISTA_2: 'Codice fiscale Autista 2',
    PATENTE_AUTISTA_2: 'Numero di patente Autista 2',
    SCADENZA_PATENTE_AUTISTA_2: 'Scadenza patente Autista 2',
    
    // Autista 3
    NOME_AUTISTA_3: 'Nome Autista 3',
    DATA_NASCITA_AUTISTA_3: 'Data di nascita Autista 3',
    LUOGO_NASCITA_AUTISTA_3: 'Luogo di nascita Autista 3',
    CF_AUTISTA_3: 'Codice fiscale Autista 3',
    PATENTE_AUTISTA_3: 'Numero di patente Autista 3',
    SCADENZA_PATENTE_AUTISTA_3: 'Scadenza patente Autista 3',
    
    // Gestione
    ID_PRENOTAZIONE: 'ID prenotazione',
    STATO_PRENOTAZIONE: 'Stato prenotazione',
    IMPORTO_PREVENTIVO: 'Importo preventivo',
    EMAIL: 'Email'
  },
  
  CAMPI_VEICOLI: {
    TARGA: 'Targa',
    MARCA: 'Marca',
    MODELLO: 'Modello',
    POSTI: 'Posti',
    STATO: 'Stato',
    COLORE: 'Colore',
    INIZIO_MANUTENZIONE: 'Data Inizio Manutenzione',
    FINE_MANUTENZIONE: 'Data Fine Manutenzione',
    NOTE: 'Note'
  }
};

// Export globale
window.FRONTEND_CONFIG = FRONTEND_CONFIG;
window.SHEETS_CONFIG = SHEETS_CONFIG;

// Debug mode
if (FRONTEND_CONFIG.DEBUG) {
  console.log('%c🔧 CONFIG v6.0 DEBUG MODE ATTIVO', 'color:#ff6b35;font-weight:bold;');
  console.log('API URL:', FRONTEND_CONFIG.API_URL);
  console.log('Sheets Config:', SHEETS_CONFIG);
}