// scripts.js (estratto rilevante) - v9.2 login hardening
(function(){
  function bindLogin(){
    const btn = document.getElementById('login-btn');
    if(!btn){ console.warn('[LOGIN] bottone non trovato'); return; }
    btn.addEventListener('click', function(e){
      try{
        e.preventDefault(); e.stopPropagation();
        const cfEl = document.getElementById('cf-input');
        if(!cfEl){ alert('Campo CF non trovato'); return; }
        const cf = (cfEl.value||'').trim().toUpperCase();
        if (cf.length !== 16){ alert('Inserisci un CF di 16 caratteri'); return; }
        console.log('[LOGIN] Invio richiesta...');
        api.call({ action:'login', codiceFiscale: cf }).then(res => {
          console.log('[LOGIN] risposta', res);
          if(!res || res.success === false){
            alert((res && res.message) ? res.message : 'Login fallito');
            return;
          }
          alert('Login ok');
          // TODO: redirect area personale
        });
      }catch(err){ console.error(err); alert('Errore login: ' + err.message); }
    }, { passive:false });
    console.log('[LOGIN] handler agganciato');
  }
  document.addEventListener('DOMContentLoaded', bindLogin);
})();
