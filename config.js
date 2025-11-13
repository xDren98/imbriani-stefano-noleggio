// CONFIGURAZIONE FRONTEND - Imbriani Stefano Noleggio v8.9
(function(){
  const isLocalHost = ['localhost','127.0.0.1'].includes(location.hostname);
  const ENV = isLocalHost ? 'LOCAL' : 'PROD';

  const ENDPOINTS = {
    PROXY: 'https://imbriani-proxy.dreenhd.workers.dev',
    APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec'
  };

  const CONFIG = {
    ENV,
    VERSION: '8.9',
    // Usa sempre il proxy per evitare preflight CORS verso Apps Script
  API_URL: ENDPOINTS.PROXY,
  TOKEN: '',
  AUTH_TOKEN: '',
    SHEETS_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns',
    PHONE_NUMBER: '+393286589618',
    WHATSAPP_NUMBER: '+393286589618'
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
  logApp('ℹ️ WhatsApp/Phone:', CONFIG.WHATSAPP_NUMBER);
})()
