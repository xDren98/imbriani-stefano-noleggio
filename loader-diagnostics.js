// Loader diagnostics - extended v2
(function(){
  try {
    const log = (ok, label, extra='') => {
      const mark = ok ? '✅' : '❌';
      console.log(`${mark} ${label}`, extra||'');
    };

    log(true, 'Loader check started');

    // Core globals
    log(typeof window.callAPI === 'function', 'callAPI available');
    log(typeof window.showLoader === 'function', 'showLoader available');
    log(typeof window.showToast === 'function', 'showToast available');
    log(typeof window.bootstrap === 'object', 'bootstrap available');

    // Script tags present
    const expected = ['bootstrap.bundle.min.js','config.js','shared-utils.js','scripts.js','safe-whatsapp-fix.js','whatsapp-loader.js'];
    const present = Array.from(document.scripts).map(s=>s.getAttribute('src')).filter(Boolean);
    expected.forEach(name=>{ log(present.some(src=>src.includes(name)), `script tag present: ${name}`); });

    // Probe API URL and token on first useful call
    const originalCallAPI = window.callAPI;
    if (typeof originalCallAPI === 'function'){
      window.callAPI = async function(action, params={}){
        try {
          const ts = Date.now().toString();
          const url = new URL(window.API_URL || '');
          const qp = { action, token: window.API_TOKEN || 'N/A', ts, ...params };
          Object.entries(qp).forEach(([k,v]) => url.searchParams.append(k, v?.toString?.() || ''));
          console.log('🔎 API probe URL →', url.toString());
        } catch(e){ console.warn('API probe error', e); }
        return originalCallAPI(action, params);
      }
      log(true, 'API probe hook installed');
    }

    setTimeout(()=>{
      console.log('⏳ Re-checking after 800ms...');
      log(typeof window.callAPI === 'function', 'callAPI available (recheck)');
      log(typeof window.showLoader === 'function', 'showLoader available (recheck)');
      log(typeof window.showToast === 'function', 'showToast available (recheck)');
      log(typeof window.bootstrap === 'object', 'bootstrap available (recheck)');
    }, 800);
  } catch(e){
    console.error('Loader check error', e);
  }
})();
