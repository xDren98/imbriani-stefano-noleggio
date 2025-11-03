/**
 * IMBRIANI STEFANO NOLEGGIO - CONFIG v8.1 CLEAN
 * Configurazione centralizzata per tutti gli ambienti
 */

// Environment detection
const ENV = {
  PROD: window.location.hostname === 'imbriani-noleggio.vercel.app',
  LOCAL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

// API Configuration per ambiente
const API_CONFIG = {
  VERSION: '8.1.0',
  ENVIRONMENTS: {
    PROD: {
      BASE_URL: 'https://imbriani-proxy.dreenhd.workers.dev',
      TOKEN: 'imbriani_secret_2025'
    },
    LOCAL: {
      BASE_URL: 'https://imbriani-proxy.dreenhd.workers.dev',
      TOKEN: 'imbriani_secret_2025'
    }
  },
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Detect current environment
const CURRENT_ENV = ENV.PROD ? 'PROD' : 'LOCAL';
const CURRENT_CONFIG = API_CONFIG.ENVIRONMENTS[CURRENT_ENV];

// Expose API globals
window.API_URL = CURRENT_CONFIG.BASE_URL;
window.API_TOKEN = CURRENT_CONFIG.TOKEN;
window.ENV_NAME = CURRENT_ENV;

// Vehicle constants
window.VEHICLE_CONSTANTS = {
  PASSO_LUNGO_TARGA: 'EC787NM',
  DEFAULT_POSTI: 9,
  PHONE_NUMBER: '393286589618'
};

// Centralized logging
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

// Initialize
logApp(`🚀 CONFIG v${API_CONFIG.VERSION} loaded`);
logApp(`Environment: ${CURRENT_ENV}`);
logApp(`API URL: ${CURRENT_CONFIG.BASE_URL}`);

// Global error handling
window.addEventListener('error', (event) => {
  logApp(`Global error: ${event.error?.message || event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  logApp(`Unhandled promise: ${event.reason}`, 'error');
});