// Loader diagnostics - prints script availability and core function status
(function(){
  try {
    const log = (ok, label, extra='') => {
      const mark = ok ? '✅' : '❌';
      console.log(`${mark} ${label}`, extra||'');
    };

    log(true, 'Loader check started');

    // Check global functions (may be undefined on first run)
    log(typeof window.callAPI === 'function', 'callAPI available');
    log(typeof window.showLoader === 'function', 'showLoader available');
    log(typeof window.showToast === 'function', 'showToast available');

    // Check that script tags are present in DOM
    const expected = ['config.js','shared-utils.js','scripts.js','safe-whatsapp-fix.js','whatsapp-loader.js'];
    const present = Array.from(document.scripts).map(s=>s.getAttribute('src')).filter(Boolean);
    expected.forEach(name=>{
      log(present.some(src=>src.includes(name)), `script tag present: ${name}`);
    });

    // After network idle, re-check globals (to catch late loads)
    setTimeout(()=>{
      console.log('⏳ Re-checking after 800ms...');
      log(typeof window.callAPI === 'function', 'callAPI available (recheck)');
      log(typeof window.showLoader === 'function', 'showLoader available (recheck)');
      log(typeof window.showToast === 'function', 'showToast available (recheck)');
    }, 800);
  } catch(e){
    console.error('Loader check error', e);
  }
})();
