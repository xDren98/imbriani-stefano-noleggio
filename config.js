// config.js v8.3.2 - LOCAL/PROD con proxy Cloudflare per CORS risolti
(function(){
  const ENV = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'LOCAL' : 'PROD';

  const ENDPOINTS = {
    PROXY: 'https://imbriani-proxy.dreenhd.workers.dev',
    APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec'
  };

  const CONFIG = {
    ENV,
    VERSION: '8.3.2',
    // Usa SEMPRE il proxy (sia LOCAL che PROD) per garantire header CORS e Authorization coerenti
    API_URL: ENDPOINTS.PROXY,
    AUTH_TOKEN: 'imbriani_secret_2025',
    SHEETS_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns'
  };

  window.CONFIG = CONFIG;

  function logApp(){
    try{ console.log(`[${CONFIG.ENV}] ${new Date().toISOString()}:`, ...arguments); }catch(_){ }
  }
  window.logApp = logApp;

  logApp('ℹ️ 🚀 CONFIG v' + CONFIG.VERSION + ' loaded');
  logApp('ℹ️ Environment:', CONFIG.ENV);
  logApp('ℹ️ API URL:', CONFIG.API_URL);
  logApp('ℹ️ Token: imbriani...');
  logApp('ℹ️ Sheets ID:', CONFIG.SHEETS_ID);
})();