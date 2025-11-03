/**
 * IMBRIANI STEFANO NOLEGGIO - CONFIG v8.2 CORS+TOKEN FIX
 * Configurazione centralizzata - TOKEN ALLINEATO
 */

// Environment detection
const ENV = {
  PROD: window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app'),
  LOCAL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

// API Configuration UNIFICATA
const API_CONFIG = {
  VERSION: '8.2.0',
  BASE_URL: 'https://imbriani-proxy.dreenhd.workers.dev',
  TOKEN: 'imbriani_secret_2025',  // ALLINEATO CON BACKEND v8.0.1
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Detect current environment
const CURRENT_ENV = ENV.PROD ? 'PROD' : 'LOCAL';

// Expose API globals
window.API_URL = API_CONFIG.BASE_URL;
window.API_TOKEN = API_CONFIG.TOKEN;
window.ENV_NAME = CURRENT_ENV;

// Google Sheets Configuration
window.SHEETS_CONFIG = {
  SPREADSHEET_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
  TABS: {
    PRENOTAZIONI: 'Risposte del modulo 1',
    PULMINI: 'Gestione Pulmini', 
    CLIENTI: 'Clienti',
    MANUTENZIONI: 'Gestione manutenzioni'
  }
};

// Vehicle constants
window.VEHICLE_CONSTANTS = {
  PASSO_LUNGO_TARGA: 'EC787NM',
  DEFAULT_POSTI: 9,
  PHONE_NUMBER: '393286589618'
};

// Centralized logging with environment
window.logApp = function(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${CURRENT_ENV}] ${timestamp}`;
  
  switch(type) {
    case 'error':
      console.error(`${prefix}: ❌ ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix}: ⚠️ ${message}`);
      break;
    case 'success':
      console.log(`${prefix}: ✅ ${message}`);
      break;
    default:
      console.log(`${prefix}: ℹ️ ${message}`);
  }
};

// API Helper with correct token
window.apiCall = async function(endpoint, options = {}) {
  const url = `${window.API_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.API_TOKEN}`
    }
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  window.logApp(`API Call: ${endpoint}`);
  
  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    if (data.success) {
      window.logApp(`API Success: ${endpoint}`, 'success');
    } else {
      window.logApp(`API Error: ${endpoint} - ${data.message}`, 'error');
    }
    
    return data;
  } catch (error) {
    window.logApp(`API Exception: ${endpoint} - ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
};

// Initialize
window.logApp(`🚀 CONFIG v${API_CONFIG.VERSION} loaded`);
window.logApp(`Environment: ${CURRENT_ENV}`);
window.logApp(`API URL: ${API_CONFIG.BASE_URL}`);
window.logApp(`Token: ${API_CONFIG.TOKEN.substring(0,8)}...`);
window.logApp(`Sheets ID: ${window.SHEETS_CONFIG.SPREADSHEET_ID}`);

// Global error handling
window.addEventListener('error', (event) => {
  window.logApp(`Global error: ${event.error?.message || event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  window.logApp(`Unhandled promise: ${event.reason}`, 'error');
});