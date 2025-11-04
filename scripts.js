// scripts.js (estratto rilevante) - v9.3 login hardening + capture
(function(){
  function bindLogin(){
    const btn = document.getElementById('login-btn');
    if(!btn){ console.warn('[LOGIN] bottone non trovato'); return; }

    const handler = function(e){
      try{
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const cfEl = document.getElementById('cf-input');
        if(!cfEl){ alert('Campo CF non trovato'); return; }
        const cf = (cfEl.value||'').trim().toUpperCase();
        if (cf.length !== 16){ alert('Inserisci un CF di 16 caratteri'); return; }
        const token = (window.CONFIG && window.CONFIG.AUTH_TOKEN) ? window.CONFIG.AUTH_TOKEN : 'imbriani_secret_2025';
        const url = (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'https://imbriani-proxy.dreenhd.workers.dev';
        console.log('[LOGIN] Invio richiesta...', { url, token: token ? '***' : '(vuoto)' });
        api.call({ action:'login', codiceFiscale: cf }).then(res => {
          console.log('[LOGIN] risposta', res);
          if(!res || res.success === false){
            alert((res && res.message) ? res.message : 'Login fallito');
            return;
          }
          alert('Login ok');
        });
      }catch(err){ console.error(err); alert('Errore login: ' + err.message); }
    };

    // capture:true per intercettare prima di altri listener/estensioni
    btn.addEventListener('click', handler, { capture:true, passive:false });
    console.log('[LOGIN] handler agganciato (capture)');
  }
  document.addEventListener('DOMContentLoaded', bindLogin);
})();
