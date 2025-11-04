// scripts.js v9.4 - login with redirect to area-personale and session management
(function(){
  function bindLogin(){
    const btn = document.getElementById('login-btn');
    if(!btn){ console.warn('[LOGIN] bottone non trovato'); return; }

    const handler = function(e){
      try{
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const cfEl = document.getElementById('cf-input');
        if(!cfEl){ 
          if (window.showToast) showToast('Campo CF non trovato', 'error');
          else alert('Campo CF non trovato'); 
          return; 
        }
        const cf = (cfEl.value||'').trim().toUpperCase();
        if (cf.length !== 16){ 
          if (window.showToast) showToast('Inserisci un CF di 16 caratteri', 'warning');
          else alert('Inserisci un CF di 16 caratteri'); 
          return; 
        }
        const token = (window.CONFIG && window.CONFIG.AUTH_TOKEN) ? window.CONFIG.AUTH_TOKEN : 'imbriani_secret_2025';
        const url = (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'https://imbriani-proxy.dreenhd.workers.dev';
        console.log('[LOGIN] Invio richiesta...', { url, token: token ? '***' : '(vuoto)' });
        
        // Disabilita bottone durante richiesta
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Accesso in corso...';
        
        api.call({ action:'login', codiceFiscale: cf }).then(res => {
          console.log('[LOGIN] risposta', res);
          
          // Ripristina bottone
          btn.disabled = false;
          btn.innerHTML = originalText;
          
          if(!res || res.success === false){
            if (res && res.requiresRegistration) {
              if (window.showToast) showToast('CF non registrato. Contatta per registrarti.', 'warning');
              else alert('CF non registrato. Contatta per registrarti.');
            } else {
              const msg = (res && res.message) ? res.message : 'Login fallito';
              if (window.showToast) showToast(msg, 'error');
              else alert(msg);
            }
            return;
          }
          
          // Login riuscito - salva sessione e redirect
          const userData = res.user;
          localStorage.setItem('imbriani_user', JSON.stringify(userData));
          localStorage.setItem('imbriani_session', JSON.stringify({
            timestamp: Date.now(),
            cf: userData.codiceFiscale,
            loginTime: new Date().toISOString()
          }));
          
          if (window.showToast) {
            showToast(`Benvenuto ${userData.nome || 'Cliente'}!`, 'success');
            // Delay per far vedere il toast
            setTimeout(() => {
              window.location.href = 'area-personale.html';
            }, 1200);
          } else {
            alert('Login ok');
            window.location.href = 'area-personale.html';
          }
        }).catch(err => {
          console.error('[LOGIN] Errore:', err);
          btn.disabled = false;
          btn.innerHTML = originalText;
          if (window.showToast) showToast('Errore di connessione', 'error');
          else alert('Errore login: ' + err.message);
        });
      }catch(err){ 
        console.error(err); 
        if (window.showToast) showToast('Errore inaspettato', 'error');
        else alert('Errore login: ' + err.message); 
      }
    };

    // capture:true per intercettare prima di altri listener/estensioni
    btn.addEventListener('click', handler, { capture:true, passive:false });
    console.log('[LOGIN] handler agganciato (capture)');
  }
  
  // Auto-bind quando DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLogin);
  } else {
    bindLogin();
  }
  
  // Esporta per compatibilità
  window.bindCFHandlers = bindLogin;
})();
