// admin-scripts.js v3.1 - Same complete logic as frontend + admin sections
(function(){
  const ADMIN_CONFIG = { VERSION: '3.1', REFRESH_INTERVAL: 30000, ITEMS_PER_PAGE: 50 };
  let adminData = { prenotazioni: [], clienti: [], flotta: [], manutenzioni: [], stats: {} };
  
  function qs(id){ return document.getElementById(id); }
  async function callAPI(action, params={}){
    console.log(`[ADMIN-API] ${action}:`, params);
    if(typeof window.secureGet==='function') {
      const result = await window.secureGet(action, params);
      console.log(`[ADMIN-API] ${action} result:`, result);
      return result;
    }
    return { success:false, message:'secureGet missing' };
  }

  const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  // NEW BOOKING MODAL with same flow as frontend
  window.showNewBookingModal = function(){
    console.log('[ADMIN] Opening new booking modal');
    const modalHtml = `
    <div class="modal fade" id="newBookingModal" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-plus me-2"></i>Nuova Prenotazione Admin</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- Step 1: Date/Orari -->
            <div class="mb-4">
              <h6 class="text-primary mb-3"><span class="badge bg-primary me-2">1</span>Selezione Date e Orari</h6>
              <div class="row g-3">
                <div class="col-md-3">
                  <label class="form-label">Data Ritiro</label>
                  <input type="date" id="admin-data-ritiro" class="form-control" required>
                </div>
                <div class="col-md-3">
                  <label class="form-label">Ora Ritiro</label>
                  <select id="admin-ora-ritiro" class="form-select"></select>
                </div>
                <div class="col-md-3">
                  <label class="form-label">Data Consegna</label>
                  <input type="date" id="admin-data-consegna" class="form-control" required>
                </div>
                <div class="col-md-3">
                  <label class="form-label">Ora Consegna</label>
                  <select id="admin-ora-consegna" class="form-select"></select>
                </div>
              </div>
              <div class="row g-3 mt-2">
                <div class="col-md-6">
                  <label class="form-label">Destinazione</label>
                  <input type="text" id="admin-destinazione" class="form-control" placeholder="Destinazione viaggio">
                </div>
                <div class="col-md-6">
                  <button type="button" id="admin-check-availability" class="btn btn-primary mt-4 w-100">
                    <i class="fas fa-search me-2"></i>Verifica e Seleziona Veicolo
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Step 2: Vehicles -->
            <div class="mb-4">
              <h6 class="text-primary mb-3"><span class="badge bg-primary me-2">2</span>Selezione Veicolo</h6>
              <div id="admin-vehicles-grid" class="text-center text-muted">
                Clicca "Verifica e Seleziona Veicolo" per vedere la disponibilità
              </div>
              <div id="admin-vehicles-count" class="small text-muted mt-2"></div>
            </div>
            
            <!-- Continue Banner (added dynamically) -->
            
            <!-- Step 3: Drivers Form (hidden initially) -->
            <div id="admin-drivers-form" class="d-none">
              <h6 class="text-primary mb-3"><span class="badge bg-primary me-2">3</span>Dati Cliente/Autisti</h6>
              
              <!-- Driver 1 (required) -->
              <div class="mb-4">
                <h6 class="text-success mb-3">Primo Autista (obbligatorio)</h6>
                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="form-label">CF *</label>
                    <input type="text" id="admin-cf-driver1" class="form-control" maxlength="16" required>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Nome *</label>
                    <input type="text" id="admin-nome-driver1" class="form-control" required>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Data Nascita</label>
                    <input type="date" id="admin-data-nascita-driver1" class="form-control">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Luogo Nascita</label>
                    <input type="text" id="admin-luogo-nascita-driver1" class="form-control">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Comune</label>
                    <input type="text" id="admin-comune-driver1" class="form-control">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Via</label>
                    <input type="text" id="admin-via-driver1" class="form-control">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Civico</label>
                    <input type="text" id="admin-civico-driver1" class="form-control">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">N. Patente *</label>
                    <input type="text" id="admin-patente-driver1" class="form-control" required>
                  </div>
                  <div class="col-md-2">
                    <label class="form-label">Inizio Patente</label>
                    <input type="date" id="admin-inizio-patente-driver1" class="form-control">
                  </div>
                  <div class="col-md-2">
                    <label class="form-label">Scadenza</label>
                    <input type="date" id="admin-scadenza-patente-driver1" class="form-control">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Telefono</label>
                    <input type="tel" id="admin-telefono-driver1" class="form-control">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input type="email" id="admin-email-driver1" class="form-control">
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
            <button type="button" id="admin-confirm-booking" class="btn btn-success d-none">
              <i class="fas fa-check me-2"></i>Conferma Prenotazione
            </button>
          </div>
        </div>
      </div>
    </div>`;
    
    // Insert modal if not exists
    if(!qs('newBookingModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    try {
      const modal = new bootstrap.Modal(qs('newBookingModal'));
      modal.show();
      initAdminTimeSelectors();
      resetAdminForm();
    } catch(e) {
      console.error('[ADMIN] Modal error:', e);
    }
  };

  function initAdminTimeSelectors(){
    ['admin-ora-ritiro', 'admin-ora-consegna'].forEach(id => {
      const sel = qs(id); if(!sel) return;
      sel.innerHTML = TIME_SLOTS.map(t => `<option value="${t}">${t}</option>`).join('');
      if(id === 'admin-ora-ritiro') sel.value = '08:00';
      if(id === 'admin-ora-consegna') sel.value = '20:00';
    });
  }

  function resetAdminForm(){
    const driversForm = qs('admin-drivers-form');
    if(driversForm) driversForm.classList.add('d-none');
    const confirmBtn = qs('admin-confirm-booking');
    if(confirmBtn) confirmBtn.classList.add('d-none');
    window.adminSelectedVehicle = null;
    const banner = qs('admin-step-continue-banner');
    if(banner) banner.remove();
  }

  window.handleAdminCheckAvailability = async function(){
    const dr=qs('admin-data-ritiro')?.value, dc=qs('admin-data-consegna')?.value;
    const or=qs('admin-ora-ritiro')?.value||'08:00', oc=qs('admin-ora-consegna')?.value||'20:00';
    const de=qs('admin-destinazione')?.value?.trim()||'';
    
    if(!dr||!dc){ window.showToast?.('Seleziona date','warning'); return; }
    if(!TIME_SLOTS.includes(or) || !TIME_SLOTS.includes(oc)){
      window.showToast?.('Orari non validi (solo fasce 08:00-22:00)','warning'); return;
    }
    
    window.adminSearchParams={dataInizio:dr,dataFine:dc,oraInizio:or,oraFine:oc,destinazione:de,posti:'9'};
    await loadAdminVehicles();
  };

  async function loadAdminVehicles(){
    try{
      const grid = qs('admin-vehicles-grid'); if(!grid) return;
      grid.innerHTML = '<div class="text-center p-3">🔄 Verifico disponibilità reale…</div>';
      
      const [flottaResp, dispResp] = await Promise.all([
        callAPI('flotta',{method:'get'}), 
        callAPI('disponibilita', window.adminSearchParams||{})
      ]);
      
      const flotta = flottaResp?.success ? flottaResp.data : [];
      const dispData = dispResp?.success ? dispResp.data : {};
      const disponibili = dispData.disponibili || [];
      const suggerimenti = dispData.suggerimenti || [];
      
      if(!flotta?.length) {
        grid.innerHTML = '<div class="text-center text-muted p-3">Nessun veicolo in flotta</div>';
        return;
      }
      
      if(suggerimenti.length > 0 && disponibili.length === 0) {
        showAdminSuggestions(suggerimenti, grid); return;
      }
      
      renderAdminVehicles(flotta, disponibili.map(v => v.Targa));
    }catch(e){ 
      const grid = qs('admin-vehicles-grid');
      if(grid) grid.innerHTML = '<div class="text-center text-danger p-3">Errore: ' + e.message + '</div>';
    }
  }

  function showAdminSuggestions(suggestions, grid){
    const suggHtml = suggestions.map(s => 
      `<div class="alert alert-warning mb-2"><div class="d-flex justify-content-between align-items-start">
          <div><strong>💡 ${s.marca} ${s.modello} (${s.targa})</strong><br><small>${s.motivoOriginale}</small><br>
          <strong>Proposta:</strong> ${s.dataInizioSuggerita} ${s.oraInizioSuggerita} → ${s.dataFineSuggerita} ${s.oraFineSuggerita}</div>
          <button class="btn btn-sm btn-warning use-admin-suggestion" data-start-date="${s.dataInizioSuggerita}" data-start-time="${s.oraInizioSuggerita}" data-end-date="${s.dataFineSuggerita}" data-end-time="${s.oraFineSuggerita}">✅ Usa fascia</button>
        </div></div>`
    ).join('');
    
    grid.innerHTML = `<div class="alert alert-warning"><h6>⚠️ Nessun veicolo disponibile</h6><p class="mb-0">Alternative:</p></div>${suggHtml}`;
    
    grid.querySelectorAll('.use-admin-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const b = e.target;
        qs('admin-data-ritiro').value = b.dataset.startDate; qs('admin-ora-ritiro').value = b.dataset.startTime;
        qs('admin-data-consegna').value = b.dataset.endDate; qs('admin-ora-consegna').value = b.dataset.endTime;
        window.showToast?.('✅ Fascia aggiornata!', 'success'); handleAdminCheckAvailability();
      });
    });
  }

  function renderAdminVehicles(flotta, availableTags){
    const grid = qs('admin-vehicles-grid'); if(!grid) return;
    const availableSet = new Set(availableTags); const available = flotta.filter(v => availableSet.has(v.Targa));
    
    if(available.length === 0) {
      grid.innerHTML = '<div class="text-center text-muted p-3">Nessun veicolo disponibile</div>'; return;
    }
    
    grid.innerHTML = available.map(v => {
      const badges = ['<span class="badge bg-success">Disponibile</span>'];
      const passoLungo = v.PassoLungo || v.Targa === 'EC787NM';
      if(passoLungo) badges.push('<span class="badge bg-warning">Passo Lungo</span>');
      
      return `<div class="mb-3 p-3 border rounded"><div class="d-flex justify-content-between align-items-start mb-2">
          <div><h6 class="fw-bold mb-1">${v.Marca} ${v.Modello}</h6><div class="small text-muted">Targa: ${v.Targa} | ${v.Posti} posti</div></div>
          <div class="d-flex flex-wrap gap-1">${badges.join('')}</div></div>
        <button class="btn btn-sm btn-primary admin-vehicle-select" data-targa="${v.Targa}" data-vehicle='${encodeURIComponent(JSON.stringify(v))}'>
          <i class="fas fa-check me-1"></i>Seleziona per prenotazione</button></div>`;
    }).join('');
    
    const countEl = qs('admin-vehicles-count');
    if(countEl) countEl.textContent = `${available.length} disponibili su ${flotta.length} totali`;
    
    grid.querySelectorAll('.admin-vehicle-select').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        try{ 
          window.adminSelectedVehicle = JSON.parse(decodeURIComponent(ev.target.dataset.vehicle)); 
          showAdminQuoteStep();
        }catch(e){ window.adminSelectedVehicle=null; }
      });
    });
  }

  function showAdminQuoteStep(){
    // Show continue banner
    addAdminContinueBanner();
  }

  function addAdminContinueBanner(){
    if(qs('admin-step-continue-banner')) return;
    const grid = qs('admin-vehicles-grid'); if(!grid) return;
    
    const banner = document.createElement('div'); banner.id = 'admin-step-continue-banner'; banner.className = 'mt-4 text-center';
    banner.innerHTML = `<div class="alert alert-info py-2 mb-3"><small><i class="fas fa-info-circle me-2"></i>Veicolo selezionato. Procedi con i dati della prenotazione</small></div>
      <button id="admin-continue-to-drivers" class="btn btn-primary btn-sm"><i class="fas fa-arrow-right me-2"></i>Continua ai dati prenotazione</button>`;
    
    grid.parentNode.insertBefore(banner, grid.nextSibling);
    
    const continueBtn = qs('admin-continue-to-drivers');
    if(continueBtn) continueBtn.addEventListener('click', () => showAdminDriversForm());
  }

  function showAdminDriversForm(){
    const form = qs('admin-drivers-form'); if(!form) return;
    form.classList.remove('d-none'); form.scrollIntoView({behavior:'smooth'});
    
    const confirmBtn = qs('admin-confirm-booking'); if(confirmBtn) confirmBtn.classList.remove('d-none');
    const continueBtn = qs('admin-continue-to-drivers');
    if(continueBtn) { continueBtn.innerHTML = '<i class="fas fa-check me-2"></i>Dati attivi'; continueBtn.disabled = true; continueBtn.classList.add('btn-success'); }
    
    ['admin-cf-driver1'].forEach(bindAdminAutocomplete);
    const confirmFinalBtn = qs('admin-confirm-booking'); if(confirmFinalBtn) confirmFinalBtn.onclick = handleAdminBookingConfirm;
  }

  function bindAdminAutocomplete(fieldId){
    const cfField = qs(fieldId); if(!cfField) return;
    cfField.addEventListener('blur', async () => {
      const cf = cfField.value.toUpperCase().trim(); if(cf.length !== 16) return;
      window.showLoader?.(true, 'Caricamento dati cliente...');
      try{
        const resp = await callAPI('autocompletaCliente', {cf});
        if(resp.success && resp.data) {
          const d = resp.data; const prefix = fieldId.replace('admin-cf-', 'admin-');
          const fields = {[`nome-${prefix}`]: d.Nome,[`data-nascita-${prefix}`]: d.DataNascita,[`luogo-nascita-${prefix}`]: d.LuogoNascita,[`comune-${prefix}`]: d.ComuneResidenza,[`via-${prefix}`]: d.ViaResidenza,[`civico-${prefix}`]: d.CivicoResidenza,[`patente-${prefix}`]: d.NumeroPatente,[`inizio-patente-${prefix}`]: d.DataInizioPatente,[`scadenza-patente-${prefix}`]: d.ScadenzaPatente,[`telefono-${prefix}`]: d.Cellulare,[`email-${prefix}`]: d.Email};
          Object.entries(fields).forEach(([id, value]) => { const el = qs(id); if(el && value) el.value = value; });
          window.showToast?.('✅ Cliente compilato automaticamente', 'success');
        } else { window.showToast?.('ℹ️ Cliente non trovato', 'info'); }
      } catch(e) { window.showToast?.('❌ Errore ricerca', 'error'); } finally { window.showLoader?.(false); }
    });
  }

  async function handleAdminBookingConfirm(){
    const cf1 = qs('admin-cf-driver1')?.value?.toUpperCase()?.trim();
    const nome1 = qs('admin-nome-driver1')?.value?.trim();
    const patente1 = qs('admin-patente-driver1')?.value?.trim();
    
    if(!cf1 || cf1.length !== 16 || !nome1 || !patente1) {
      window.showToast?.('❌ CF, nome e patente primo autista obbligatori', 'error'); return;
    }
    
    const payload = {targa: window.adminSelectedVehicle?.Targa, dataInizio: window.adminSearchParams?.dataInizio, dataFine: window.adminSearchParams?.dataFine, oraInizio: window.adminSearchParams?.oraInizio, oraFine: window.adminSearchParams?.oraFine, destinazione: window.adminSearchParams?.destinazione, drv1_CF: cf1, drv1_Nome: nome1, drv1_DataNascita: qs('admin-data-nascita-driver1')?.value||'', drv1_LuogoNascita: qs('admin-luogo-nascita-driver1')?.value||'', drv1_ComuneResidenza: qs('admin-comune-driver1')?.value||'', drv1_ViaResidenza: qs('admin-via-driver1')?.value||'', drv1_CivicoResidenza: qs('admin-civico-driver1')?.value||'', drv1_NumeroPatente: patente1, drv1_DataInizioPatente: qs('admin-inizio-patente-driver1')?.value||'', drv1_ScadenzaPatente: qs('admin-scadenza-patente-driver1')?.value||'', drv1_Cellulare: qs('admin-telefono-driver1')?.value||'', drv1_Email: qs('admin-email-driver1')?.value||''};
    
    window.showLoader?.(true, 'Creazione prenotazione...');
    try {
      const resp = await callAPI('creaPrenotazione', payload);
      if(resp.success) {
        const bookingId = resp.data?.id;
        window.showToast?.(`✅ Prenotazione Admin creata: ${bookingId}`, 'success');
        const email1 = qs('admin-email-driver1')?.value?.trim();
        if(email1) {
          try { const emailResp = await callAPI('inviaRiepilogo', {idPrenotazione: bookingId, email: email1});
            if(emailResp.success) window.showToast?.('📧 Email riepilogo inviata', 'info'); } catch(e) {}
        }
        setTimeout(() => { bootstrap.Modal.getInstance(qs('newBookingModal'))?.hide(); location.reload(); }, 2000);
      } else { window.showToast?.('❌ Errore: ' + resp.message, 'error'); }
    } catch(e) { window.showToast?.('❌ Errore di rete', 'error'); } finally { window.showLoader?.(false); }
  }

  // EXISTING ADMIN SECTIONS (kept from original)
  function loadAdminSection(section) {
    const root = qs('admin-root'); if (!root) return;
    window.showLoader?.(true, `Caricamento ${section}...`);
    switch (section) {
      case 'dashboard': loadDashboard(); break;
      case 'prenotazioni': loadPrenotazioni(); break;
      case 'flotta': loadFlotta(); break;
      case 'manutenzioni': loadManutenzioni(); break;
      default: loadDashboard();
    }
  }

  async function loadDashboard() {
    window.showLoader?.(false);
    const root = qs('admin-root');
    root.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4">
      <div><h2 class="h4 fw-bold mb-1">Dashboard Admin</h2><p class="text-muted mb-0">Panoramica generale</p></div>
      <button class="btn btn-success" onclick="showNewBookingModal()"><i class="fas fa-plus me-2"></i>Nuova Prenotazione</button>
    </div>
    <div class="row g-4"><div class="col-12"><div class="card"><div class="card-body text-center py-5"><h5 class="text-muted">Dashboard</h5><p class="text-muted">Statistiche in arrivo</p></div></div></div></div>`;
  }

  async function loadPrenotazioni() { window.showLoader?.(false); const root = qs('admin-root'); root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Prenotazioni</h5><p class="text-muted">Sezione in costruzione</p></div></div>'; }
  async function loadFlotta() { window.showLoader?.(false); const root = qs('admin-root'); root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Flotta</h5><p class="text-muted">Sezione in costruzione</p></div></div>'; }
  async function loadManutenzioni() { window.showLoader?.(false); const root = qs('admin-root'); root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Manutenzioni</h5><p class="text-muted">Sezione in costruzione</p></div></div>'; }

  // Expose globals
  window.loadAdminSection = loadAdminSection;
  window.handleAdminCheckAvailability = handleAdminCheckAvailability;
  
  console.log(`[ADMIN-SCRIPTS] v${ADMIN_CONFIG.VERSION} loaded - New booking flow + sections`);
})();