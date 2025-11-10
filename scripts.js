// scripts.js v10.1 - Flusso unificato + Suggerimenti Date Intelligenti
(function(){
  let isGuestFlow = false;
  let guestBookingData = null;

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
          // --- FIX AUTO COMPILAZIONE ---
          sessionStorage.setItem('userData', JSON.stringify(userData));
          
          if (window.showToast) {
            showToast(`Benvenuto ${userData.nome || 'Cliente'}!`, 'success');
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

    btn.addEventListener('click', handler, { capture:true, passive:false });
    console.log('[LOGIN] handler agganciato (capture)');
  }

  // NUOVO: Gestione flusso guest users
  function bindGuestBooking(){
    const checkBtn = document.getElementById('check-disponibilita');
    if (!checkBtn) {
      console.warn('[GUEST] Bottone verifica disponibilità non trovato');
      return;
    }

    checkBtn.addEventListener('click', async function(e){
      e.preventDefault();
      
      try {
        // Leggi dati dal form guest
        const dataRitiro = document.getElementById('new-data-ritiro')?.value;
        const oraRitiro = document.getElementById('new-ora-ritiro')?.value;
        const dataConsegna = document.getElementById('new-data-consegna')?.value;
        const oraConsegna = document.getElementById('new-ora-consegna')?.value;
        const posti = document.getElementById('new-posti')?.value;
        
        // Validazione
        if (!dataRitiro || !dataConsegna || !oraRitiro || !oraConsegna) {
          if (window.showToast) showToast('⚠️ Compila tutti i campi data/ora', 'warning');
          else alert('Compila tutti i campi data/ora');
          return;
        }
        
        const ritiro = new Date(dataRitiro);
        const consegna = new Date(dataConsegna);
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        
        if (ritiro < oggi) {
          if (window.showToast) showToast('❌ La data di ritiro non può essere nel passato', 'error');
          else alert('La data di ritiro non può essere nel passato');
          return;
        }
        
        if (consegna < ritiro) {
          if (window.showToast) showToast('❌ La data di consegna deve essere successiva al ritiro', 'error');
          else alert('La data di consegna deve essere successiva al ritiro');
          return;
        }
        
        if (dataRitiro === dataConsegna && oraConsegna <= oraRitiro) {
          if (window.showToast) showToast('❌ Per lo stesso giorno, l\'ora di consegna deve essere successiva', 'error');
          else alert('Per lo stesso giorno, l\'ora di consegna deve essere successiva');
          return;
        }
        
        // Imposta loading
        const originalText = checkBtn.innerHTML;
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verifica in corso...';
        
        // Salva dati per il prossimo step
        guestBookingData = {
          dataInizio: dataRitiro,
          dataFine: dataConsegna, 
          oraRitiro: oraRitiro,
          oraRiconsegna: oraConsegna,
          posti: parseInt(posti, 10) || 9,
          isGuest: true
        };
        
        // Salva in localStorage per la pagina veicoli
        localStorage.setItem('imbriani_guest_booking', JSON.stringify(guestBookingData));
        
        // Feedback positivo
        if (window.showToast) {
          showToast('✅ Date verificate! Reindirizzamento...', 'success');
          
          setTimeout(() => {
            const params = new URLSearchParams({
              dal: dataRitiro,
              al: dataConsegna,
              guest: '1'
            });
            window.location.href = `veicoli.html?${params.toString()}`;
          }, 1200);
          
        } else {
          alert('Disponibilità verificata! Redirezione...');
          setTimeout(() => {
            window.location.href = `veicoli.html?dal=${dataRitiro}&al=${dataConsegna}&guest=1`;
          }, 500);
        }
        
      } catch (error) {
        console.error('[GUEST] Errore verifica disponibilità:', error);
        checkBtn.disabled = false;
        checkBtn.innerHTML = originalText;
        if (window.showToast) showToast('❌ Errore durante la verifica', 'error');
        else alert('Errore durante la verifica: ' + error.message);
      }
    });
    
    console.log('[GUEST] Handler verifica disponibilità attivato');
  }
  
  // Inizializzazione automatica
  function initializeHomepage(){
    try {
      const oggi = new Date().toISOString().split('T')[0];
      const dataRitiroEl = document.getElementById('new-data-ritiro');
      const dataConsegnaEl = document.getElementById('new-data-consegna');
      
      if (dataRitiroEl) {
        dataRitiroEl.min = oggi;
        dataRitiroEl.value = oggi;
      }
      if (dataConsegnaEl) {
        dataConsegnaEl.min = oggi;
        const domani = new Date();
        domani.setDate(domani.getDate() + 1);
        dataConsegnaEl.value = domani.toISOString().split('T')[0];
      }
      
      bindLogin();
      bindGuestBooking();
      
      console.log('✅ Homepage inizializzata - flusso unificato guest/logged');
      
    } catch (error) {
      console.error('[INIT] Errore inizializzazione homepage:', error);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHomepage);
  } else {
    initializeHomepage();
  }
  
  window.bindCFHandlers = initializeHomepage;
  window.guestBookingData = guestBookingData;
})();

// ...resto invariato, funzioni suggerimenti date...
