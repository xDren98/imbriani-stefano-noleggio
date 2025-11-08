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

// ========================================
// NUOVE FUNZIONI - SUGGERIMENTI DATE INTELLIGENTI
// ========================================

/**
 * Mostra suggerimento data alternativa con badge visivi
 * @param {Object} sugg - Dati suggerimento da VeicoliService
 */
function mostraSuggerimentoAlternativa(sugg) {
  console.log('[SUGGERIMENTO] Mostro alternativa:', sugg);
  
  const container = document.getElementById('step-preventivo');
  if (!container) {
    console.warn('[SUGGERIMENTO] Container step-preventivo non trovato');
    return;
  }
  
  let icona = '💡';
  let badgeClass = 'bg-success';
  let badgeText = 'Trovata!';
  
  if (sugg.tipoAlternativa === 'stessa_data_fascia_diversa') {
    icona = '🕐';
    badgeClass = 'bg-primary';
    badgeText = 'Stesso giorno';
  } else if (sugg.tipoAlternativa === 'data_diversa_stessa_fascia') {
    icona = '📅';
    badgeClass = 'bg-info';
    badgeText = 'Stessa fascia';
  } else if (sugg.tipoAlternativa === 'data_diversa_fascia_diversa') {
    icona = '📆';
    badgeClass = 'bg-warning text-dark';
    badgeText = 'Alternativa';
  }
  
  const html = `
    <div class="alert alert-success mt-3 border-success" id="suggestion-alert">
      <div class="d-flex align-items-center mb-2">
        <h5 class="mb-0 me-2">${icona} Prima data disponibile!</h5>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <p class="text-muted mb-3"><small>${sugg.motivazione}</small></p>
      
      <div class="card bg-white border-success shadow-sm">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-8">
              <h6 class="card-title mb-3">
                <i class="fas fa-van-shuttle me-2 text-primary"></i>
                ${sugg.marca} ${sugg.modello} <span class="badge bg-secondary">${sugg.targa}</span>
              </h6>
              <ul class="list-unstyled mb-0">
                <li class="mb-2">
                  <i class="fas fa-calendar-day me-2 text-success"></i>
                  <strong>Dal:</strong> ${sugg.dataInizioFormatted} ore <span class="badge bg-light text-dark">${sugg.oraInizio}</span>
                </li>
                <li class="mb-2">
                  <i class="fas fa-calendar-check me-2 text-danger"></i>
                  <strong>Al:</strong> ${sugg.dataFineFormatted} ore <span class="badge bg-light text-dark">${sugg.oraFine}</span>
                </li>
                <li>
                  <i class="fas fa-clock me-2 text-info"></i>
                  <strong>Durata:</strong> ${sugg.durataGiorni} ${sugg.durataGiorni === 1 ? 'giorno' : 'giorni'}
                </li>
              </ul>
            </div>
            <div class="col-md-4 text-md-end mt-3 mt-md-0">
              <button type="button" 
                      class="btn btn-success w-100 mb-2" 
                      onclick="prenotaDataAlternativa('${sugg.targa}', '${sugg.dataInizio}', '${sugg.dataFine}', '${sugg.oraInizio}', '${sugg.oraFine}')">
                <i class="fas fa-check-circle me-2"></i>Prenota questa data
              </button>
              <button type="button" 
                      class="btn btn-outline-secondary w-100" 
                      onclick="cercaAltreDate()">
                <i class="fas fa-search me-2"></i>Cerca altre date
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-3 p-3 bg-light rounded">
        <div class="row align-items-center">
          <div class="col-md-8">
            <small class="text-muted">
              <i class="fas fa-info-circle me-1"></i>
              <strong>Non ti convince?</strong> Contattaci per trovare la soluzione perfetta
            </small>
          </div>
          <div class="col-md-4 text-md-end mt-2 mt-md-0">
            <a href="https://wa.me/393286589618?text=Ciao,%20vorrei%20info%20noleggio%20${sugg.dataInizioFormatted}" 
               target="_blank" 
               class="btn btn-sm btn-success me-1">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
            <a href="tel:+393286589618" class="btn btn-sm btn-outline-secondary">
              <i class="fas fa-phone"></i> Chiama
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML += html;
  
  // Scroll al suggerimento
  setTimeout(() => {
    document.getElementById('suggestion-alert')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }, 300);
}

/**
 * Prenota la data alternativa suggerita (auto-fill form)
 * @param {string} targa - Targa veicolo
 * @param {string} dataInizio - Data inizio ISO
 * @param {string} dataFine - Data fine ISO
 * @param {string} oraInizio - Ora inizio HH:MM
 * @param {string} oraFine - Ora fine HH:MM
 */
function prenotaDataAlternativa(targa, dataInizio, dataFine, oraInizio, oraFine) {
  console.log('[PRENOTA ALT] Popolo form con:', {targa, dataInizio, dataFine, oraInizio, oraFine});
  
  const dataRitiroEl = document.getElementById('new-data-ritiro');
  const oraRitiroEl = document.getElementById('new-ora-ritiro');
  const dataConsegnaEl = document.getElementById('new-data-consegna');
  const oraConsegnaEl = document.getElementById('new-ora-consegna');
  
  if (dataRitiroEl) dataRitiroEl.value = dataInizio;
  if (oraRitiroEl) oraRitiroEl.value = oraInizio;
  if (dataConsegnaEl) dataConsegnaEl.value = dataFine;
  if (oraConsegnaEl) oraConsegnaEl.value = oraFine;
  
  // Rimuovi suggerimento
  const suggAlert = document.getElementById('suggestion-alert');
  if (suggAlert) suggAlert.remove();
  
  // Simula click verifica per refresh UI
  const checkBtn = document.getElementById('check-disponibilita');
  if (checkBtn) {
    setTimeout(() => {
      checkBtn.click();
    }, 300);
  }
  
  if (window.showToast) {
    showToast('✅ Date aggiornate! Verifica in corso...', 'success');
  } else {
    alert('✅ Date aggiornate! Procedi con la richiesta preventivo.');
  }
}

/**
 * Reset ricerca per cercare altre date
 */
function cercaAltreDate() {
  console.log('[CERCA ALTRE] Reset form');
  
  const dataRitiroEl = document.getElementById('new-data-ritiro');
  const dataConsegnaEl = document.getElementById('new-data-consegna');
  const stepPreventivo = document.getElementById('step-preventivo');
  
  if (dataRitiroEl) dataRitiroEl.value = '';
  if (dataConsegnaEl) dataConsegnaEl.value = '';
  if (stepPreventivo) stepPreventivo.classList.add('d-none');
  
  // Scroll al form
  if (dataRitiroEl) {
    dataRitiroEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => dataRitiroEl.focus(), 500);
  }
  
  if (window.showToast) {
    showToast('🔍 Cerca una nuova data', 'info');
  }
}

/**
 * Mostra messaggio "non disponibile" con conflitti
 * @param {Object} data - Risposta checkDisponibilita
 */
function mostraNonDisponibile(data) {
  console.log('[NON DISP] Mostro conflitti:', data);
  
  const container = document.getElementById('step-preventivo');
  if (!container) return;
  
  container.classList.remove('d-none');
  
  let html = `
    <div class="alert alert-warning">
      <h5><i class="fas fa-exclamation-triangle me-2"></i>Spiacenti, nessun veicolo disponibile</h5>
      <p class="mb-2"><strong>Periodo richiesto:</strong></p>
      <ul class="mb-0">
        <li>📅 Dal: ${data.periodoRichiesto.dataInizio} ore ${data.periodoRichiesto.oraInizio}</li>
        <li>📅 Al: ${data.periodoRichiesto.dataFine} ore ${data.periodoRichiesto.oraFine}</li>
      </ul>
  `;
  
  if (data.conflitti && data.conflitti.length > 0) {
    html += `<hr><p class="mb-2"><strong>Conflitti trovati:</strong></p><ul class="mb-0">`;
    data.conflitti.forEach(c => {
      if (c.tipo === 'prenotazione') {
        html += `<li>🚗 Prenotazione ${c.idPrenotazione}: ${c.dataInizio} - ${c.dataFine} (${c.stato})</li>`;
      } else if (c.tipo === 'manutenzione') {
        html += `<li>🔧 Manutenzione: ${c.dataInizio} - ${c.dataFine} (${c.stato})</li>`;
      }
    });
    html += `</ul>`;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// Esporta funzioni globalmente
window.mostraSuggerimentoAlternativa = mostraSuggerimentoAlternativa;
window.prenotaDataAlternativa = prenotaDataAlternativa;
window.cercaAltreDate = cercaAltreDate;
window.mostraNonDisponibile = mostraNonDisponibile;

console.log('✅ Funzioni suggerimenti date caricate');
