// config.js v8.3.1 - puntamento diretto a Apps Script per bypassare Worker durante test
(function(){
  const CONFIG = {
    ENV: 'LOCAL',
    VERSION: '8.3.1',
    API_URL: 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec',
    AUTH_TOKEN: 'imbriani_secret_2025',
    SHEETS_ID: '1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns'
  };

  window.CONFIG = CONFIG;

  function logApp(...args){
    try{ console.log(`[${CONFIG.ENV}] ${new Date().toISOString()}:`, ...args); }catch(_){ }
  }
  window.logApp = logApp;

  logApp('ℹ️ 🚀 CONFIG v' + CONFIG.VERSION + ' loaded');
  logApp('ℹ️ Environment:', CONFIG.ENV);
  logApp('ℹ️ API URL:', CONFIG.API_URL);
  logApp('ℹ️ Token: imbriani...');
  logApp('ℹ️ Sheets ID:', CONFIG.SHEETS_ID);
})();
