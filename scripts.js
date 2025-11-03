// scripts.js minimal init tweaks v8.1
(function(){
  document.addEventListener('DOMContentLoaded', init);
  
  function init(){
    console.log('🚀 Inizializzazione Imbriani Noleggio v8.1...');
    safeSetupNetworkHandlers();
    loadSavedState();
  }
  
  function safeSetupNetworkHandlers(){
    if(typeof window.onNetworkChange!=='function'){
      window.onNetworkChange=function(online){ if(window.showToast) showToast(`Sei ${online?'online':'offline'}`, online?'success':'warning', 2000); };
    }
    window.addEventListener('online', ()=>onNetworkChange(true));
    window.addEventListener('offline', ()=>onNetworkChange(false));
  }
  
  function loadSavedState(){
    try{
      const params = getFromStorage('searchParams', {});
      if(params && params.dataInizio){ console.log('ℹ️ Stato caricato da storage', params); }
    }catch(e){ console.warn('Storage read error', e); }
  }
})();
