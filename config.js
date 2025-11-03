/**
 * IMBRIANI STEFANO NOLEGGIO - CONFIG v8.0
 * Configurazione globale per API Cloudflare e autenticazione
 */

// API Configuration
const API_CONFIG = {
  VERSION: '8.0.0',
  BASE_URL: 'https://imbriani-proxy.dreenhd.workers.dev',
  TOKEN: 'imbriani_secret_2025',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Expose API URL globally
window.API_URL = API_CONFIG.BASE_URL;
window.API_TOKEN = API_CONFIG.TOKEN;

// Vehicle types and constants
window.VEHICLE_CONSTANTS = {
  PASSO_LUNGO_TARGA: 'EC787NM',
  DEFAULT_POSTI: 9,
  PHONE_NUMBER: '393286589618'
};

// Debug logging
function logConfig(message) {
  console.log(`[CONFIG] ${new Date().toISOString()}: ${message}`);
}

logConfig(`🔧 CONFIG v${API_CONFIG.VERSION} - CORS via Cloudflare`);
logConfig(`API URL: ${API_CONFIG.BASE_URL}`);

// Initialize global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});