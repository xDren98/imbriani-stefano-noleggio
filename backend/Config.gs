/**
 * CONFIGURAZIONE GLOBALE
 * Imbriani Stefano Noleggio - Backend v8.9.5
 * 
 * Contiene tutte le configurazioni e costanti del sistema
 */

// Utilizza Script Properties per caricare segreti e configurazioni sensibili,
// mantenendo compatibilità con i valori attuali come fallback.
function getScriptProp(key, fallback) {
  try {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    if (val && String(val).trim() !== '') return val;
    if (fallback !== undefined) {
      Logger.log('[CONFIG] Proprietà mancante: ' + key + ' — uso fallback');
      return fallback;
    }
    return null;
  } catch (err) {
    Logger.log('[CONFIG] Errore lettura proprietà ' + key + ': ' + err.message);
    return fallback;
  }
}

const CONFIG = {
  VERSION: '8.9.6',
  SPREADSHEET_ID: getScriptProp('SPREADSHEET_ID', '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns'),
  TOKEN: getScriptProp('TOKEN', 'imbriani_secret_2025'),
  // Elenco token consentiti per rotazione; supporta CSV o JSON in Script Properties (chiave: TOKENS)
  TOKENS: (function(){
    var raw = getScriptProp('TOKENS', null);
    if (!raw || String(raw).trim() === '') return [getScriptProp('TOKEN', 'imbriani_secret_2025')];
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
    } catch (_){ /* fallback CSV */ }
    return String(raw).split(',').map(function(t){ return String(t).trim(); }).filter(function(t){ return t.length>0; });
  })(),
  
  SHEETS: {
    PRENOTAZIONI: 'PRENOTAZIONI',
    PULMINI: 'PULMINI',
    CLIENTI: 'CLIENTI',
    MANUTENZIONI: 'MANUTENZIONI'
  },
  
  PRENOTAZIONI_COLS: {
    TIMESTAMP: 1,
    NOME_AUTISTA_1: 2,
    DATA_NASCITA_AUTISTA_1: 3,
    LUOGO_NASCITA_AUTISTA_1: 4,
    CODICE_FISCALE_AUTISTA_1: 5,
    COMUNE_RESIDENZA_AUTISTA_1: 6,
    VIA_RESIDENZA_AUTISTA_1: 7,
    CIVICO_RESIDENZA_AUTISTA_1: 8,
    NUMERO_PATENTE_AUTISTA_1: 9,
    DATA_INIZIO_PATENTE_AUTISTA_1: 10,
    SCADENZA_PATENTE_AUTISTA_1: 11,
    TARGA: 12,
    ORA_INIZIO: 13,
    ORA_FINE: 14,
    GIORNO_INIZIO: 15,
    GIORNO_FINE: 16,
    DESTINAZIONE: 17,
    CELLULARE: 18,
    DATA_CONTRATTO: 19,
    NOME_AUTISTA_2: 20,
    DATA_NASCITA_AUTISTA_2: 21,
    LUOGO_NASCITA_AUTISTA_2: 22,
    CODICE_FISCALE_AUTISTA_2: 23,
    COMUNE_RESIDENZA_AUTISTA_2: 24,
    VIA_RESIDENZA_AUTISTA_2: 25,
    CIVICO_RESIDENZA_AUTISTA_2: 26,
    NUMERO_PATENTE_AUTISTA_2: 27,
    DATA_INIZIO_PATENTE_AUTISTA_2: 28,
    SCADENZA_PATENTE_AUTISTA_2: 29,
    NOME_AUTISTA_3: 30,
    DATA_NASCITA_AUTISTA_3: 31,
    LUOGO_NASCITA_AUTISTA_3: 32,
    CODICE_FISCALE_AUTISTA_3: 33,
    COMUNE_RESIDENZA_AUTISTA_3: 34,
    VIA_RESIDENZA_AUTISTA_3: 35,
    CIVICO_RESIDENZA_AUTISTA_3: 36,
    NUMERO_PATENTE_AUTISTA_3: 37,
    DATA_INIZIO_PATENTE_AUTISTA_3: 38,
    SCADENZA_PATENTE_AUTISTA_3: 39,
    ID_PRENOTAZIONE: 40,
    STATO_PRENOTAZIONE: 41,
    IMPORTO_PREVENTIVO: 42,
    EMAIL: 43,
    TEST: 44,
    PDF_URL: 45
  },
  
  CLIENTI_COLS: {
    NOME: 1,
    DATA_NASCITA: 2,
    LUOGO_NASCITA: 3,
    CODICE_FISCALE: 4,
    COMUNE_RESIDENZA: 5,
    VIA_RESIDENZA: 6,
    CIVICO_RESIDENZA: 7,
    NUMERO_PATENTE: 8,
    DATA_INIZIO_PATENTE: 9,
    SCADENZA_PATENTE: 10,
    CELLULARE: 11,
    EMAIL: 12
  },
  
  PULMINI_COLS: {
    TARGA: 1,
    MARCA: 2,
    MODELLO: 3,
    POSTI: 4,
    STATO: 5,
    NOTE: 6
  },
  
  MANUTENZIONI_COLS: {
    TARGA: 1,
    MARCA: 2,
    MODELLO: 3,
    POSTI: 4,
    STATO: 5,
    DATA_INIZIO: 6,
    DATA_FINE: 7,
    COSTO: 8,
    NOTE: 9
  },
  
  GOOGLE: {
    // API Key per Google Cloud Vision (OCR documenti)
    // Costi: ~$1.50 per 1000 immagini
    // Dashboard: https://console.cloud.google.com/apis/credentials
    VISION_API_KEY: getScriptProp('GOOGLE_VISION_API_KEY', 'AIzaSyA0xqCwwA3ywzW8rOIErg1WS6CnjQeUU2Y')
  },
  
  TELEGRAM: {
    BOT_TOKEN: getScriptProp('TELEGRAM_BOT_TOKEN', '8029941478:AAGR808kmlCeyw5j5joJn0T_MLKL25qwM0o'),
    CHAT_ID: getScriptProp('TELEGRAM_CHAT_ID', '203195623')
  },
  
  EMAIL: {
    FROM_NAME: getScriptProp('EMAIL_FROM_NAME', 'Imbriani Stefano Noleggio'),
    FROM_EMAIL: getScriptProp('EMAIL_FROM_EMAIL', 'imbrianistefanonoleggio@gmail.com')
  },
  
  PDF: {
    TEMPLATE_DOC_ID: getScriptProp('PDF_TEMPLATE_DOC_ID', '1JEpqJZq9SnmmBWAucrRQ-CAzditSK3fL7HXKbWe-kcM'),
    PDF_FOLDER_ID: getScriptProp('PDF_FOLDER_ID', '1bYLuvfydAUaKsZpZVrFq-H3uRT66oo98'),
    TIMEZONE: 'Europe/Rome',
    VEICOLI: {
      'DN391FW': { marca: 'Fiat', modello: 'Ducato' },
      'EC787NM': { marca: 'Fiat', modello: 'Ducato' },
      'EZ841FA': { marca: 'Renault', modello: 'Trafic' }
    }
  },
  
  // Flag globale per attivare/disattivare logging dettagliato lato backend
  DEBUG_LOGS: false,

  // Sicurezza sessioni e 2FA
  SECURITY: {
    SESSION_TTL_MINUTES: Number(getScriptProp('SESSION_TTL_MINUTES', 120)), // durata sessione client
    REQUIRE_OTP_FOR_ADMIN: String(getScriptProp('REQUIRE_OTP_FOR_ADMIN', 'true')) === 'true',
    OTP_TTL_MINUTES: Number(getScriptProp('OTP_TTL_MINUTES', 5)), // validità OTP admin
    DEBUG_OTP: String(getScriptProp('DEBUG_OTP', 'false')) === 'true' // mostra OTP in risposta per test
  }
};
