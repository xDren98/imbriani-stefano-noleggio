// admin-scripts.js v3.2.1 - Fix race condition + retry logic for prenotazioni module
(function(){
  const ADMIN_CONFIG = { VERSION: '3.2.1', REFRESH_INTERVAL: 30000, ITEMS_PER_PAGE: 50 };
  let adminData = { prenotazioni: [], clienti: [], flotta: [], manutenzioni: [], stats: {} };
  
  function qs(id){ return document.getElementById(id); }
  // Usa GET per azioni di lettura e POST per azioni di scrittura
  async function callAPI(action, params={}){
    console.log(`[ADMIN-API] ${action}:`, params);
    const POST_ACTIONS = new Set([
      'setManutenzione',
      'setVeicolo',
      'eliminaVeicolo',
      'creaPrenotazione',
      'aggiornaPrenotazione',
      'aggiornaPrenotazioneCompleta',
      'eliminaPrenotazione',
      'aggiornaStato',
      'confermaPrenotazione',
      'aggiornaCliente',
      'creaCliente',
      'importaPrenotazioniICS',
      'importaPrenotazioniCSV',
      'aggiornaStatoPrenotazione'
    ]);

    const isWrite = POST_ACTIONS.has(action);

    try {
      if (isWrite) {
        if (typeof window.securePost === 'function') {
          const result = await window.securePost(action, params);
          console.log(`[ADMIN-API] ${action} (POST) result:`, result);
          return result;
        }
        // Fallback legacy
        if (typeof window.api?.call === 'function') {
          const result = await window.api.call({ action, ...params });
          console.log(`[ADMIN-API] ${action} (POST-fallback) result:`, result);
          return result;
        }
        return { success:false, message:'securePost missing' };
      } else {
        if (typeof window.secureGet === 'function') {
          const result = await window.secureGet(action, params);
          console.log(`[ADMIN-API] ${action} (GET) result:`, result);
          return result;
        }
        return { success:false, message:'secureGet missing' };
      }
    } catch (err) {
      console.error(`[ADMIN-API] Errore chiamando ${action}:`, err);
      return { success:false, message: String(err && err.message || err) };
    }
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
    
    // 🇮🇹 Normalizza tutte le date in formato gg/mm/aaaa
    const fmtDateIT = (d) => {
      if (!d) return '';
      try {
        const formatted = (window.formatDateIT ? window.formatDateIT(d) : new Date(d).toLocaleDateString('it-IT'));
        return formatted === '-' ? '' : formatted;
      } catch { return ''; }
    };
    const payload = {
      targa: window.adminSelectedVehicle?.Targa,
      dataInizio: fmtDateIT(window.adminSearchParams?.dataInizio),
      dataFine: fmtDateIT(window.adminSearchParams?.dataFine),
      oraInizio: window.adminSearchParams?.oraInizio,
      oraFine: window.adminSearchParams?.oraFine,
      destinazione: window.adminSearchParams?.destinazione,
      drv1_CF: cf1,
      drv1_Nome: nome1,
      drv1_DataNascita: fmtDateIT(qs('admin-data-nascita-driver1')?.value||''),
      drv1_LuogoNascita: qs('admin-luogo-nascita-driver1')?.value||'',
      drv1_ComuneResidenza: qs('admin-comune-driver1')?.value||'',
      drv1_ViaResidenza: qs('admin-via-driver1')?.value||'',
      drv1_CivicoResidenza: qs('admin-civico-driver1')?.value||'',
      drv1_NumeroPatente: patente1,
      drv1_DataInizioPatente: fmtDateIT(qs('admin-inizio-patente-driver1')?.value||''),
      drv1_ScadenzaPatente: fmtDateIT(qs('admin-scadenza-patente-driver1')?.value||''),
      drv1_Cellulare: qs('admin-telefono-driver1')?.value||'',
      drv1_Email: qs('admin-email-driver1')?.value||''
    };
    
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

  // EXISTING ADMIN SECTIONS
  function loadAdminSection(section) {
    const root = qs('admin-root'); if (!root) return;
    window.showLoader?.(true, `Caricamento ${section}...`);
    switch (section) {
      case 'dashboard': loadDashboard(); break;
      case 'prenotazioni': loadPrenotazioni(); break;
      case 'legacy': loadLegacy(); break;
      case 'clienti': loadClienti(); break;
      case 'flotta': loadFlotta(); break;
      case 'manutenzioni': loadManutenzioni(); break;
      default: loadDashboard();
    }
  }

  async function loadDashboard() {
    window.showLoader?.(true, 'Carico dati dashboard…');
    const root = qs('admin-root');
    if(!root) return;

    // Layout base
    root.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4">
      <div><h2 class="h4 fw-bold mb-1">Dashboard Admin</h2><p class="text-muted mb-0">Panoramica generale</p></div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" id="dash-refresh"><i class="fas fa-sync-alt me-2"></i>Ricarica</button>
        <button class="btn btn-primary" id="dash-import-ical"><i class="fas fa-file-import me-2"></i>Importa da iCal</button>
        <button class="btn btn-warning" id="dash-import-csv"><i class="fas fa-table me-2"></i>Importa da Excel/CSV</button>
        <button class="btn btn-success" onclick="showNewBookingModal()"><i class="fas fa-plus me-2"></i>Nuova Prenotazione</button>
      </div>
    </div>
    <div class="row g-4">
      <div class="col-12">
        <div class="row g-3" id="dash-kpis"></div>
      </div>
      <div class="col-12 col-xl-6">
        <div class="card"><div class="card-body">
          <h5 class="fw-semibold mb-3"><i class="fas fa-calendar-day me-2"></i>Prossime prenotazioni (7 giorni)</h5>
          <div class="table-responsive"><table class="table table-sm align-middle text-white-50">
            <thead><tr><th>Data</th><th>Targa</th><th>Cliente</th><th>Stato</th></tr></thead>
            <tbody id="dash-next-bookings"><tr><td colspan="4" class="text-muted">Caricamento…</td></tr></tbody>
          </table></div>
        </div></div>
      </div>
      <div class="col-12 col-xl-6">
        <div class="card"><div class="card-body">
          <h5 class="fw-semibold mb-3"><i class="fas fa-id-card me-2"></i>Patenti in scadenza (90 giorni)</h5>
          <div class="table-responsive"><table class="table table-sm align-middle text-white-50">
            <thead><tr><th>Nome</th><th>CF</th><th>Scadenza</th></tr></thead>
            <tbody id="dash-expiring-licenses"><tr><td colspan="3" class="text-muted">Caricamento…</td></tr></tbody>
          </table></div>
        </div></div>
      </div>
    </div>`;

    // Funzioni utili locali
    const parseDateFlexible = (val) => {
      if(!val) return null;
      if(val instanceof Date && !isNaN(val.getTime())) return val;
      if(typeof val === 'string'){
        // dd/mm/yyyy -> usa componenti locali (evita timezone)
        const mIT = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if(mIT){ const d = new Date(parseInt(mIT[3],10), parseInt(mIT[2],10)-1, parseInt(mIT[1],10)); return isNaN(d.getTime()) ? null : d; }
        // yyyy-mm-dd -> usa componenti locali (evita timezone)
        const mISO = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if(mISO){ const d = new Date(parseInt(mISO[1],10), parseInt(mISO[2],10)-1, parseInt(mISO[3],10)); return isNaN(d.getTime()) ? null : d; }
        // ISO con orario
        const d2 = new Date(val); return isNaN(d2.getTime()) ? null : d2;
      }
      return null;
    };
    const fmtIT = (d) => { const f = window.formatDateIT?.(d) || '-'; return f === '-' ? '' : f; };

    // Fetch dati principali in parallelo
    let veicoli = [], clienti = [], prenotazioni = [];
    try{
      const [vResp, pResp, cResp] = await Promise.all([
        callAPI('getVeicoli'),
        callAPI('getPrenotazioni'),
        callAPI('getSheet', {name:'CLIENTI'})
      ]);
      veicoli = vResp?.success ? (vResp.data||[]) : [];
      prenotazioni = pResp?.success ? (pResp.data||[]) : [];
      clienti = cResp?.success ? (cResp.data||[]) : [];
    } catch(e){ console.error('[Dashboard] Errore fetch dati', e); }

    // KPI: Clienti
    const cHeaders = clienti.length ? Object.keys(clienti[0]) : [];
    const nomeKey = findKey(cHeaders, '^NOME$|Nome|Nominativo');
    const cfKey = findKey(cHeaders, 'CODICE.*FISCALE|CF');
    const scadKey = findKey(cHeaders, 'SCADENZA.*PATENTE|SCADENZA');
    const scadKeyFmt = scadKey ? scadKey+'Formatted' : null;
    const countClients = clienti.length;
    const countExpiring = (months) => {
      const limit = new Date(); limit.setMonth(limit.getMonth() + months);
      return clienti.filter(c => {
        const raw = c[scadKeyFmt] ?? c[scadKey];
        const d = parseDateFlexible(raw);
        return d && d <= limit;
      }).length;
    };

    // KPI: Veicoli
    const countVeicoli = veicoli.length;
    const countManutenzione = veicoli.filter(v => v.InManutenzioneOggi).length;

    // KPI: Prenotazioni
    const now = new Date(); const in7 = new Date(); in7.setDate(in7.getDate()+7);
    const next7 = prenotazioni.filter(p => {
      const d = parseDateFlexible(p.giornoInizio || p.giornoInizioFormatted);
      return d && d >= now && d <= in7;
    });
    const countNext7 = next7.length;
    const countPending = prenotazioni.filter(p => String(p.stato||'').toLowerCase().includes('attesa')).length;

    // Render KPI cards
    const kpisEl = document.getElementById('dash-kpis');
    if(kpisEl){
      kpisEl.innerHTML = [
        `<div class="col-12 col-sm-6 col-xl-3"><div class="card"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="text-muted">Clienti</div>
              <div class="h4 text-white fw-bold">${countClients}</div>
            </div>
            <i class="fas fa-users fa-lg text-muted"></i>
          </div>
        </div></div></div>`,
        `<div class="col-12 col-sm-6 col-xl-3"><div class="card"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="text-muted">Patenti in scadenza (90gg)</div>
              <div class="h4 text-white fw-bold">${countExpiring(3)}</div>
            </div>
            <i class="fas fa-id-card fa-lg text-muted"></i>
          </div>
        </div></div></div>`,
        `<div class="col-12 col-sm-6 col-xl-3"><div class="card"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="text-muted">Veicoli</div>
              <div class="h4 text-white fw-bold">${countVeicoli}</div>
              <div class="small text-muted">In manutenzione: ${countManutenzione}</div>
            </div>
            <i class="fas fa-shuttle-van fa-lg text-muted"></i>
          </div>
        </div></div></div>`,
        `<div class="col-12 col-sm-6 col-xl-3"><div class="card"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="text-muted">Prenotazioni (7 giorni)</div>
              <div class="h4 text-white fw-bold">${countNext7}</div>
              <div class="small text-muted">In attesa: ${countPending}</div>
            </div>
            <i class="fas fa-calendar-check fa-lg text-muted"></i>
          </div>
        </div></div></div>`
      ].join('');
    }

    // Render tabelle: Prossime prenotazioni (top 5)
    const tbBookings = document.getElementById('dash-next-bookings');
    if(tbBookings){
      const sorted = next7.sort((a,b) => {
        const da = parseDateFlexible(a.giornoInizio || a.giornoInizioFormatted)?.getTime()||0;
        const db = parseDateFlexible(b.giornoInizio || b.giornoInizioFormatted)?.getTime()||0;
        return da - db;
      }).slice(0,5);
      tbBookings.innerHTML = sorted.map(p => {
        const d = parseDateFlexible(p.giornoInizio || p.giornoInizioFormatted);
        const data = d ? fmtIT(d) : '';
        const stato = escapeHtml(p.stato||'');
        const cliente = escapeHtml(p.nomeAutista1||'-');
        const targa = escapeHtml(p.targa||'-');
        return `<tr><td>${data}</td><td>${targa}</td><td>${cliente}</td><td>${stato}</td></tr>`;
      }).join('') || '<tr><td colspan="4" class="text-muted">Nessuna prenotazione nei prossimi 7 giorni</td></tr>';
    }

    // Render tabelle: Patenti in scadenza (top 5)
    const tbLic = document.getElementById('dash-expiring-licenses');
    if(tbLic){
      const limit90 = new Date(); limit90.setMonth(limit90.getMonth()+3);
      const expiring = clienti
        .map(c => {
          const raw = (scadKeyFmt && c[scadKeyFmt] !== undefined) ? c[scadKeyFmt] : c[scadKey];
          const d = parseDateFlexible(raw);
          return { d, nome: c[nomeKey] || '-', cf: c[cfKey] || '-' };
        })
        .filter(x => x.d && x.d <= limit90)
        .sort((a,b) => a.d.getTime() - b.d.getTime())
        .slice(0,5);
      tbLic.innerHTML = expiring.map(x => `<tr><td>${escapeHtml(x.nome)}</td><td>${escapeHtml(x.cf)}</td><td>${fmtIT(x.d)}</td></tr>`).join('')
        || '<tr><td colspan="3" class="text-muted">Nessuna scadenza entro 90 giorni</td></tr>';
    }

    // Bind refresh
    document.getElementById('dash-refresh')?.addEventListener('click', () => loadDashboard());
    document.getElementById('dash-import-ical')?.addEventListener('click', () => window.showICSImportModal?.(veicoli));
    document.getElementById('dash-import-csv')?.addEventListener('click', () => window.showCSVImportModal?.());
    window.showLoader?.(false);
  }

  // =============================
  // ICS IMPORT MODAL
  // =============================
  window.showICSImportModal = async function(veicoliList){
    try {
      // Se non abbiamo veicoli, recuperali
      let veicoli = Array.isArray(veicoliList) ? veicoliList : [];
      if (!veicoli.length) {
        const vResp = await callAPI('getVeicoli');
        veicoli = vResp?.success ? (vResp.data||[]) : [];
      }
      const targhe = veicoli.map(v => v.Targa || v.targa).filter(Boolean);
      const modalId = 'icsImportModal';
      if (!qs(modalId)){
        const optionsTarghe = ['<option value="">(deduci da evento)</option>'].concat(targhe.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)).join('');
        const html = `
          <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title"><i class="fas fa-file-import me-2"></i>Importa prenotazioni da iCal (ICS)</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <div class="row g-3 admin-form-grid">
                    <div class="admin-form-group" style="grid-column: span 2;">
                      <label class="form-label">URL ICS (opzionale)</label>
                      <input type="url" id="ics-url" class="form-control-modern" placeholder="https://…/calendar.ics">
                      <div class="form-text">Se presente, verrà usato al posto del testo incollato.</div>
                    </div>
                    <div class="admin-form-group" style="grid-column: span 2;">
                      <label class="form-label">Testo ICS (incolla qui)</label>
                      <textarea id="ics-text" rows="6" class="form-control-modern" placeholder="BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20250115T090000Z\nDTEND:20250115T170000Z\nSUMMARY:DN391FW — Cliente Rossi\nLOCATION:Roma\nEND:VEVENT\nEND:VCALENDAR"></textarea>
                    </div>
                    <div class="admin-form-group">
                      <label class="form-label">Targa di default</label>
                      <select id="ics-targa" class="form-select">${optionsTarghe}</select>
                      <div class="form-text">Se non trovata nel testo evento, userò questa.</div>
                    </div>
                    <div class="admin-form-group">
                      <label class="form-label">Ora inizio default</label>
                      <input type="time" id="ics-ora-inizio" class="form-control-modern" value="08:00">
                    </div>
                    <div class="admin-form-group">
                      <label class="form-label">Ora fine default</label>
                      <input type="time" id="ics-ora-fine" class="form-control-modern" value="22:00">
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                  <button class="btn btn-primary" id="ics-import-go"><i class="fas fa-file-import me-2"></i>Importa</button>
                </div>
              </div>
            </div>
          </div>`;
        const wrapper = document.createElement('div'); wrapper.innerHTML = html; document.body.appendChild(wrapper);
      }
      const modalEl = qs(modalId);
      const modal = new bootstrap.Modal(modalEl);
      modal.show();

      qs('ics-import-go').onclick = async () => {
        const payload = {
          icsUrl: qs('ics-url')?.value?.trim() || '',
          icsText: qs('ics-text')?.value?.trim() || '',
          defaultTarga: qs('ics-targa')?.value || '',
          defaultOraInizio: qs('ics-ora-inizio')?.value || '08:00',
          defaultOraFine: qs('ics-ora-fine')?.value || '22:00'
        };
        if (!payload.icsUrl && !payload.icsText){
          window.showToast?.('Inserisci URL o testo ICS', 'warning');
          return;
        }
        try {
          window.showLoader?.(true, 'Importo prenotazioni ICS…');
          const resp = await callAPI('importaPrenotazioniICS', payload);
          window.showLoader?.(false);
          if (resp?.success){
            window.showToast?.(`✅ Import completato — creati ${resp.created}, duplicati ${resp.duplicates}`, 'success');
            modal.hide();
            loadDashboard();
          } else {
            window.showToast?.(`❌ Import fallito: ${resp?.message||'errore'}`, 'danger');
          }
        } catch(err){
          window.showLoader?.(false);
          console.error('[ICS Import] Errore:', err);
          window.showToast?.('Errore import ICS', 'danger');
        }
      };
    } catch(e){
      console.error('[showICSImportModal] Errore:', e);
      window.showToast?.('Errore apertura modale ICS', 'danger');
    }
  };

  // =============================
  // CSV/EXCEL IMPORT MODAL
  // =============================
  window.showCSVImportModal = function(){
    const modalId = 'csvImportModal';
    if (!qs(modalId)){
      const html = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-table me-2"></i>Importa prenotazioni da Excel/CSV</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3 admin-form-grid">
                  <div class="admin-form-group" style="grid-column: span 2;">
                    <label class="form-label">Carica file CSV</label>
                    <input type="file" id="csv-file" class="form-control-modern" accept=".csv,text/csv">
                    <div class="form-text">Suggerito separatore ";". In alternativa incolla il contenuto sotto.</div>
                  </div>
                  <div class="admin-form-group" style="grid-column: span 2;">
                    <label class="form-label">Oppure incolla CSV</label>
                    <textarea id="csv-text" rows="6" class="form-control-modern" placeholder="targa;data_inizio;ora_inizio;data_fine;ora_fine;destinazione;cliente"></textarea>
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">Anteprima righe</label>
                    <div id="csv-preview" class="small text-muted">(nessuna)</div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                <button class="btn btn-warning" id="csv-import-go"><i class="fas fa-upload me-2"></i>Importa</button>
              </div>
            </div>
          </div>
        </div>`;
      const wrapper = document.createElement('div'); wrapper.innerHTML = html; document.body.appendChild(wrapper);
    }
    const modalEl = qs(modalId); const modal = new bootstrap.Modal(modalEl); modal.show();

    const parseCSV = (text) => {
      if (!text) return { headers: [], rows: [] };
      const raw = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l => l.trim().length);
      if (!raw.length) return { headers: [], rows: [] };
      const delim = raw[0].indexOf(';')>=0 ? ';' : ',';
      const headers = raw[0].split(delim).map(h => h.trim());
      const rows = raw.slice(1).map(line => line.split(delim).map(c => c.trim()));
      return { headers, rows };
    };
    const mapRow = (headers, values) => {
      const H = headers.map(h => h.toLowerCase());
      const idx = (names) => {
        for (let n of names){ const i = H.findIndex(h => h.includes(n)); if (i>=0) return i; }
        return -1;
      };
      // Supporto esplicito alle intestazioni Excel: Title, Location, StartDate, StartTime, EndDate, EndTime
      const idTarga = idx(['targa','plate','veicolo']);
      const idGI = idx(['startdate','giorno_inizio','data_inizio','inizio','start','dal','data']);
      const idGF = idx(['enddate','giorno_fine','data_fine','fine','end','al']);
      const idOI = idx(['starttime','ora_inizio','orario_inizio','from','inizio']);
      const idOF = idx(['endtime','ora_fine','orario_fine','to','fine']);
      const idDest = idx(['location','destinazione','luogo','meta']);
      const idCli = idx(['title','cliente','autista','nome']);
      return {
        targa: idTarga>=0 ? values[idTarga] : '',
        giornoInizio: idGI>=0 ? values[idGI] : '',
        giornoFine: idGF>=0 ? values[idGF] : values[idGI],
        oraInizio: idOI>=0 ? values[idOI] : '',
        oraFine: idOF>=0 ? values[idOF] : '',
        destinazione: idDest>=0 ? values[idDest] : '',
        nomeAutista: idCli>=0 ? values[idCli] : ''
      };
    };

    const previewEl = qs('csv-preview');
    const updatePreview = (parsed) => {
      const { headers, rows } = parsed; if (!rows.length){ previewEl.textContent = '(nessuna riga)'; return; }
      const sample = rows.slice(0,5).map(r => JSON.stringify(mapRow(headers, r))).join('<br>');
      previewEl.innerHTML = sample;
    };

    qs('csv-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { const parsed = parseCSV(reader.result); updatePreview(parsed); modalEl.dataset.csvParsed = JSON.stringify(parsed); };
      reader.readAsText(file);
    });
    qs('csv-text')?.addEventListener('input', (e) => {
      const parsed = parseCSV(e.target.value); updatePreview(parsed); modalEl.dataset.csvParsed = JSON.stringify(parsed);
    });

    qs('csv-import-go').onclick = async () => {
      try {
        const parsed = modalEl.dataset.csvParsed ? JSON.parse(modalEl.dataset.csvParsed) : { headers:[], rows:[] };
        const rows = parsed.rows.map(r => mapRow(parsed.headers, r)).filter(x => x.targa && x.giornoInizio);
        if (!rows.length){ window.showToast?.('CSV vuoto o colonne non riconosciute', 'warning'); return; }
        window.showLoader?.(true, 'Importo prenotazioni CSV…');
        const resp = await callAPI('importaPrenotazioniCSV', { rows });
        window.showLoader?.(false);
        if (resp?.success){ window.showToast?.(`✅ Import CSV completato — creati ${resp.created}, duplicati ${resp.duplicates}, saltati ${resp.skipped}`, 'success'); modal.hide(); loadDashboard(); }
        else { window.showToast?.(`❌ Import CSV fallito: ${resp?.message||'errore'}`, 'danger'); }
      } catch(err){
        window.showLoader?.(false);
        console.error('[CSV Import] Errore:', err);
        window.showToast?.('Errore import CSV', 'danger');
      }
    };
  };

  async function loadPrenotazioni() {
    const root = qs('admin-root');
    if (!root) return;
    
    // Check if admin-prenotazioni.js module is loaded (support both function names)
    const loadFn = typeof window.loadPrenotazioniSection === 'function'
      ? window.loadPrenotazioniSection
      : (typeof window.caricaSezionePrenotazioni === 'function' ? window.caricaSezionePrenotazioni : null);

    if (loadFn) {
      console.log('[ADMIN] Caricamento sezione prenotazioni...');
      try { loadFn(); } catch(e){ console.error('[ADMIN] Errore avvio prenotazioni:', e); }
      return;
    }

    // Retry after 500ms if module not yet loaded (race condition fix)
    console.warn('[ADMIN] admin-prenotazioni.js non ancora disponibile, nuovo tentativo tra 500ms...');
    setTimeout(() => {
      const retryFn = typeof window.loadPrenotazioniSection === 'function'
        ? window.loadPrenotazioniSection
        : (typeof window.caricaSezionePrenotazioni === 'function' ? window.caricaSezionePrenotazioni : null);
      if (retryFn) {
        console.log('[ADMIN] Retry eseguito - caricamento prenotazioni');
        try { retryFn(); } catch(e){ console.error('[ADMIN] Errore avvio prenotazioni:', e); }
      } else {
        // Final fallback after retry
        console.error('[ADMIN] admin-prenotazioni.js ancora non caricato dopo il retry');
        window.showLoader?.(false);
        root.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Errore caricamento modulo prenotazioni</strong><br>
            <small>Il file admin-prenotazioni.js non è stato caricato correttamente. Verifica la console per errori.</small>
          </div>`;
      }
    }, 500);
  }

  // =============================
  // LEGACY SECTION (nuova scheda)
  // =============================
  async function loadLegacy(){
    const root = qs('admin-root'); if(!root) return;
    root.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="h5 fw-bold mb-1">Prenotazioni Legacy</h2>
          <p class="text-muted mb-0">Gestisci importazioni fino a conferma</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" id="legacy-refresh"><i class="fas fa-sync-alt me-1"></i>Ricarica</button>
        </div>
      </div>
      <div class="card"><div class="card-body">
        <div class="table-responsive">
          <table class="table table-dark table-hover align-middle" id="legacy-table">
            <thead><tr>
              <th>Data Inizio</th><th>Ora</th><th>Data Fine</th><th>Ora</th>
              <th>Targa</th><th>Nome (Title)</th><th>Cellulare</th><th>Destinazione</th>
              <th class="text-end">Azioni</th>
            </tr></thead>
            <tbody id="legacy-tbody"><tr><td colspan="99" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-2"></i>Caricamento…</td></tr></tbody>
          </table>
        </div>
      </div></div>`;

    qs('legacy-refresh')?.addEventListener('click', loadLegacy);
    try {
      const resp = await callAPI('getPrenotazioni');
      const all = resp?.success ? (resp.data||[]) : [];
      const legacy = all.filter(p => String(p.stato||'').trim().toLowerCase() === 'legacy');
      const tbody = qs('legacy-tbody');
      const fmtIT = (d) => { const f = window.formatDateIT?.(d) || '-'; return f === '-' ? '' : f; };
      const parseD = (raw) => {
        if(!raw) return null;
        if(raw instanceof Date && !isNaN(raw.getTime())) return raw;
        const d = (window.parseDateAny ? parseDateAny(raw) : parseDateFlexible(raw) || new Date(raw));
        return (!d || isNaN(d.getTime())) ? null : d;
      };
      tbody.innerHTML = legacy.map(p => {
        const gi = p.giornoInizio || p.giornoInizioFormatted; const gf = p.giornoFine || p.giornoFineFormatted;
        const di = parseD(gi), df = parseD(gf);
        const nome = p.nomeAutista1 || '';
        const cell = p.cellulare || '';
        const dest = p.destinazione || '';
        const targa = p.targa || '';
        const idp = p.idPrenotazione || '';
        return `
          <tr>
            <td>${di?fmtIT(di):''}</td><td>${p.oraInizio||''}</td>
            <td>${df?fmtIT(df):''}</td><td>${p.oraFine||''}</td>
            <td>${escapeHtml(targa)}</td>
            <td>${escapeHtml(nome)}</td>
            <td>${escapeHtml(cell)}</td>
            <td>${escapeHtml(dest)}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-light" data-action="edit" data-id="${escapeHtml(idp)}"><i class="fas fa-edit me-1"></i>Modifica</button>
              <button class="btn btn-sm btn-success" data-action="confirm" data-id="${escapeHtml(idp)}"><i class="fas fa-check me-1"></i>Conferma</button>
            </td>
          </tr>`;
      }).join('') || `<tr><td colspan="9" class="text-center text-muted">Nessuna prenotazione Legacy</td></tr>`;

      // Bind azioni
      tbody.querySelectorAll('button[data-action="confirm"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Confermo…';
          try {
            const resp2 = await callAPI('aggiornaStatoPrenotazione', { idPrenotazione: id, nuovoStato: 'Confermata' });
            if (resp2?.success) { window.showToast?.('✅ Prenotazione confermata', 'success'); loadLegacy(); }
            else { window.showToast?.(`❌ ${resp2?.message||'Errore conferma'}`, 'error'); }
          } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check me-1"></i>Conferma'; }
        });
      });

      tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => openLegacyEditModal(btn.dataset.id, legacy.find(x => (x.idPrenotazione||'') === btn.dataset.id)));
      });
    } catch(err){
      qs('legacy-tbody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">${escapeHtml(err.message||String(err))}</td></tr>`;
    }
  }

  function openLegacyEditModal(idPrenotazione, p){
    const modalHtml = `
      <div class="modal fade" id="legacyEditModal" tabindex="-1">
        <div class="modal-dialog modal-lg"><div class="modal-content">
          <div class="modal-header"><h5 class="modal-title"><i class="fas fa-edit me-2"></i>Modifica prenotazione Legacy</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="admin-form-grid">
              <div class="admin-form-group"><label class="form-label">Targa</label><input id="leg-targa" class="form-control-modern" value="${escapeHtml(p?.targa||'')}"></div>
              <div class="admin-form-group"><label class="form-label">Destinazione</label><input id="leg-dest" class="form-control-modern" value="${escapeHtml(p?.destinazione||'')}"></div>
              <div class="admin-form-group" style="grid-column: span 2;"><label class="form-label">Nome (Title)</label><input id="leg-nome" class="form-control-modern" value="${escapeHtml(p?.nomeAutista1||'')}"></div>
              <div class="admin-form-group"><label class="form-label">Cellulare</label><input id="leg-cell" class="form-control-modern" value="${escapeHtml(p?.cellulare||'')}"></div>
              <div class="admin-form-group"><label class="form-label">Email</label><input id="leg-email" class="form-control-modern" value="${escapeHtml(p?.email||'')}"></div>
              <div class="admin-form-group"><label class="form-label">Giorno inizio</label><input type="date" id="leg-gi" class="form-control-modern" value="${(p?.giornoInizio||'').toString().slice(0,10)}"></div>
              <div class="admin-form-group"><label class="form-label">Ora inizio</label><input type="time" id="leg-oi" class="form-control-modern" value="${escapeHtml(p?.oraInizio||'08:00')}"></div>
              <div class="admin-form-group"><label class="form-label">Giorno fine</label><input type="date" id="leg-gf" class="form-control-modern" value="${(p?.giornoFine||'').toString().slice(0,10)}"></div>
              <div class="admin-form-group"><label class="form-label">Ora fine</label><input type="time" id="leg-of" class="form-control-modern" value="${escapeHtml(p?.oraFine||'22:00')}"></div>
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button><button class="btn btn-primary" id="legacy-save"><i class="fas fa-save me-1"></i>Salva</button></div>
        </div></div>
      </div>`;
    const wrapper = document.createElement('div'); wrapper.innerHTML = modalHtml; document.body.appendChild(wrapper);
    const modalEl = wrapper.querySelector('#legacyEditModal'); const modal = new bootstrap.Modal(modalEl); modal.show();
    modalEl.addEventListener('hidden.bs.modal', () => wrapper.remove());
    qs('legacy-save')?.addEventListener('click', async () => {
      const payload = {
        idPrenotazione,
        nuovoStato: 'Legacy',
        targa: qs('leg-targa')?.value||'',
        giornoInizio: qs('leg-gi')?.value||'',
        giornoFine: qs('leg-gf')?.value||'',
        oraInizio: qs('leg-oi')?.value||'',
        oraFine: qs('leg-of')?.value||'',
        destinazione: qs('leg-dest')?.value||'',
        cellulareTop: qs('leg-cell')?.value||'',
        email: qs('leg-email')?.value||'',
        nomeA1: qs('leg-nome')?.value||''
      };
      const btn = qs('legacy-save'); if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvo…'; }
      try {
        const resp = await callAPI('aggiornaStatoPrenotazione', payload);
        if(resp?.success){ window.showToast?.('✅ Prenotazione aggiornata', 'success'); modal.hide(); loadLegacy(); }
        else { window.showToast?.(`❌ ${resp?.message||'Errore aggiornamento'}`, 'error'); }
      } finally { if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i>Salva'; } }
    });
  }

  // =============================
  // CLIENTI SECTION (NEW)
  // =============================
  async function loadClienti(){
    window.showLoader?.(false);
    const root = qs('admin-root');
    root.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="h5 fw-bold mb-1">Clienti</h2>
          <p class="text-muted mb-0">Anagrafica clienti e patente</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" id="clienti-add"><i class="fas fa-plus me-1"></i>Aggiungi</button>
          <button class="btn btn-outline-secondary btn-sm" id="clienti-refresh"><i class="fas fa-sync-alt me-1"></i>Ricarica</button>
          <button class="btn btn-primary btn-sm" id="clienti-sync"><i class="fas fa-user-plus me-1"></i>Sincronizza da Prenotazioni</button>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="row g-3 mb-3 admin-form-grid">
            <div class="admin-form-group" style="grid-column: span 2;">
              <label class="form-label">Ricerca</label>
              <input type="text" id="clienti-search" class="form-control-modern" placeholder="Nome, CF, telefono, email">
            </div>
            <div class="admin-form-group">
              <label class="form-label">Scadenza patente entro</label>
              <select id="clienti-filter-scadenza" class="form-select">
                <option value="">Tutte</option>
                <option value="3">3 mesi</option>
                <option value="6">6 mesi</option>
                <option value="12">12 mesi</option>
              </select>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-dark table-hover align-middle" id="clienti-table">
              <thead>
                <tr id="clienti-thead"></tr>
              </thead>
              <tbody id="clienti-tbody">
                <tr><td colspan="99" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-2"></i>Caricamento clienti…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Bind actions
    qs('clienti-add')?.addEventListener('click', () => openClienteModal(''));
    qs('clienti-refresh')?.addEventListener('click', fetchAndRenderClienti);
    qs('clienti-sync')?.addEventListener('click', syncClienti);
    qs('clienti-search')?.addEventListener('input', () => renderClienti(window._clientiData||[]));
    qs('clienti-filter-scadenza')?.addEventListener('change', () => renderClienti(window._clientiData||[]));

    // First load
    await fetchAndRenderClienti();
  }

  async function fetchAndRenderClienti(){
    try{
      const resp = await callAPI('getSheet', { name: 'CLIENTI' });
      if(resp.success){
        window._clientiData = Array.isArray(resp.data) ? resp.data : [];
        renderClienti(window._clientiData);
      } else {
        qs('clienti-tbody').innerHTML = `<tr><td colspan="6" class="text-center text-danger">${resp.message||'Errore caricamento clienti'}</td></tr>`;
      }
    } catch(err){
      qs('clienti-tbody').innerHTML = `<tr><td colspan="6" class="text-center text-danger">${String(err.message||err)}</td></tr>`;
    }
  }

  function matchesSearch(c, term){
    if(!term) return true;
    term = term.toLowerCase();
    const keys = window._clientiHeaders || Object.keys(c);
    return keys.some(k => String(c[k]||'').toLowerCase().includes(term));
  }

  function findKey(headers, pattern){
    const rx = new RegExp(pattern, 'i');
    return headers.find(h => rx.test(h)) || null;
  }

  // Parsing robusto di date da Date, ISO o 'gg/mm/aaaa'
  function parseDateFlexible(val){
    if(!val) return null;
    if(val instanceof Date && !isNaN(val.getTime())) return val;
    if(typeof val === 'string'){
      // dd/mm/yyyy
      const mIT = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if(mIT) {
        const d = new Date(parseInt(mIT[3],10), parseInt(mIT[2],10)-1, parseInt(mIT[1],10));
        return isNaN(d.getTime()) ? null : d;
      }
      // yyyy-mm-dd
      const mISO = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if(mISO) {
        const d = new Date(parseInt(mISO[1],10), parseInt(mISO[2],10)-1, parseInt(mISO[3],10));
        return isNaN(d.getTime()) ? null : d;
      }
      // ISO con tempo
      const d2 = new Date(val);
      return isNaN(d2.getTime()) ? null : d2;
    }
    return null;
  }

  function withinExpiryFilter(c, months){
    if(!months) return true;
    const headers = window._clientiHeaders || Object.keys(c);
    const expKey = window._clientiExpiryKey || (window._clientiExpiryKey = findKey(headers, 'SCADENZA.*PATENTE|SCADENZA'));
    if(!expKey) return true;
    const raw = c[expKey] ?? c[expKey+'Formatted'];
    const d = parseDateFlexible(raw);
    if(!d || isNaN(d.getTime())) return false;
    const limit = new Date();
    limit.setMonth(limit.getMonth() + parseInt(months,10));
    return d <= limit;
  }

  function renderClienti(data){
    const tbody = qs('clienti-tbody'); const thead = qs('clienti-thead'); if(!tbody || !thead) return;
    const term = qs('clienti-search')?.value?.trim()||'';
    const months = qs('clienti-filter-scadenza')?.value||'';
    const rawHeaders = (data && data.length) ? Object.keys(data[0]) : (window._clientiHeaders||[]);
    // Nascondi colonne duplicate '...Formatted' ma mantieni i valori formattati per la visualizzazione
    const headers = (window._clientiHeaders = rawHeaders.filter(h => !/formatted$/i.test(h)));
    // Header pari al foglio + Azioni
    thead.innerHTML = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '<th class="text-end">Azioni</th>';

    const cfKey = window._clientiCFKey || (window._clientiCFKey = findKey(headers, 'CODICE.*FISCALE|CF'));

    const rows = (data||[])
      .filter(c => headers.some(h => String(c[h]||'').trim() !== ''))
      .filter(c => matchesSearch(c, term))
      .filter(c => withinExpiryFilter(c, months))
      .map(c => {
        const tds = headers.map(h => {
          const fmtKey = h + 'Formatted';
          const value = c[fmtKey] ?? c[h];
          // Se non esiste il campo formattato, prova a formattare la data in italiano
          const display = (() => {
            const out = value;
            const asDate = parseDateFlexible(out);
            if(asDate){ 
              const f = window.formatDateIT?.(asDate) || '-';
              return f === '-' ? '' : f;
            }
            return out ?? '';
          })();
          return `<td>${escapeHtml(display)}</td>`;
        }).join('');
        const cf = cfKey ? String(c[cfKey]||'') : '';
        return `<tr>${tds}<td class="text-end"><button class="btn btn-sm btn-outline-light" data-action="edit" data-cf="${escapeHtml(cf)}"><i class="fas fa-edit me-1"></i>Modifica</button></td></tr>`;
      }).join('');
    tbody.innerHTML = rows || `<tr><td colspan="${headers.length+1}" class="text-center text-muted">Nessun cliente</td></tr>`;
    // Bind edit buttons
    tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openClienteModal(btn.dataset.cf)));
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"\']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

  async function syncClienti(){
    const btn = qs('clienti-sync'); if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sincronizzo…'; }
    try{
      const resp = await callAPI('sincronizzaClienti', {});
      if(resp.success){
        window.showToast?.(`✅ Sincronizzazione completata (creati: ${resp.created}, aggiornati: ${resp.updated})`, 'success');
        await fetchAndRenderClienti();
      } else {
        window.showToast?.(`❌ ${resp.message||'Errore sincronizzazione'}`, 'error');
      }
    } finally {
      if(btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus me-1"></i>Sincronizza da Prenotazioni'; }
    }
  }

  async function openClienteModal(cf){
    try{
      const cliente = (window._clientiData||[]).find(c => String(c['CODICE_FISCALE']||'').trim().toUpperCase() === String(cf||'').trim().toUpperCase());
      const nome = cliente?.['NOME'] || '';
      const telefono = cliente?.['CELLULARE'] || '';
      const email = cliente?.['EMAIL'] || '';
      const via = cliente?.['VIA_RESIDENZA'] || '';
      const civico = cliente?.['CIVICO_RESIDENZA'] || '';
      const comune = cliente?.['COMUNE_RESIDENZA'] || '';
      const numeroPatente = cliente?.['NUMERO_PATENTE'] || '';
      const inizioPatente = cliente?.['DATA_INIZIO_PATENTE'] || cliente?.['DATA_INIZIO_PATENTEFormatted'] || '';
      const scadenzaPatente = cliente?.['SCADENZA_PATENTE'] || cliente?.['SCADENZA_PATENTEFormatted'] || '';
      const toISO = (v) => { const d = parseDateFlexible(v); return d ? d.toISOString().slice(0,10) : ''; };

      const modalHtml = `
        <div class="modal fade" id="clienteModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-user me-2"></i>${cliente ? 'Modifica Cliente' : 'Nuovo Cliente'}${cliente ? ' — <code>'+escapeHtml(cf)+'</code>' : ''}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="admin-form-grid">
                  <div class="admin-form-group">
                    <label class="form-label">Codice Fiscale</label>
                    <input type="text" id="cli-cf" class="form-control-modern" value="${escapeHtml(cf||'')}" ${cliente ? 'readonly' : ''} placeholder="16 caratteri">
                  </div>
                  <div class="admin-form-group" style="grid-column: span 2;">
                    <label class="form-label">Nome</label>
                    <input type="text" id="cli-nome" class="form-control-modern" value="${escapeHtml(nome)}">
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">Telefono</label>
                    <input type="tel" id="cli-telefono" class="form-control-modern" value="${escapeHtml(telefono)}">
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="cli-email" class="form-control-modern" value="${escapeHtml(email)}">
                  </div>
                  <div class="admin-form-group" style="grid-column: span 2;">
                    <label class="form-label">Via</label>
                    <input type="text" id="cli-via" class="form-control-modern" value="${escapeHtml(via)}">
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">Civico</label>
                    <input type="text" id="cli-civico" class="form-control-modern" value="${escapeHtml(civico)}">
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">Comune</label>
                    <input type="text" id="cli-comune" class="form-control-modern" value="${escapeHtml(comune)}">
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">N. Patente</label>
                    <input type="text" id="cli-patente" class="form-control-modern" value="${escapeHtml(numeroPatente)}">
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">Inizio Patente</label>
                    <input type="date" id="cli-inizio-patente" class="form-control-modern" value="${toISO(inizioPatente)}">
                  </div>
                  <div class="admin-form-group">
                    <label class="form-label">Scadenza Patente</label>
                    <input type="date" id="cli-scadenza-patente" class="form-control-modern" value="${toISO(scadenzaPatente)}">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                <button class="btn btn-success" id="cli-salva"><i class="fas fa-save me-1"></i>Salva</button>
              </div>
            </div>
          </div>
        </div>`;
      const wrapper = document.createElement('div'); wrapper.innerHTML = modalHtml; document.body.appendChild(wrapper);
      const modalEl = wrapper.querySelector('#clienteModal');
      const modal = new bootstrap.Modal(modalEl); modal.show();
      modalEl.addEventListener('hidden.bs.modal', () => wrapper.remove());
      qs('cli-salva')?.addEventListener('click', () => saveCliente(cf, modal));
    } catch(err){ window.showToast?.('Errore apertura cliente: ' + (err.message||err), 'error'); }
  }

  async function saveCliente(cf, modal){
    const codiceFiscaleInput = qs('cli-cf')?.value || cf || '';
    const normalizedCF = String(codiceFiscaleInput||'').trim().toUpperCase();
    const payload = {
      codiceFiscale: normalizedCF,
      nomeCompleto: qs('cli-nome')?.value||'',
      comuneResidenza: qs('cli-comune')?.value||'',
      viaResidenza: qs('cli-via')?.value||'',
      civicoResidenza: qs('cli-civico')?.value||'',
      numeroPatente: qs('cli-patente')?.value||'',
      dataInizioPatente: qs('cli-inizio-patente')?.value||'',
      scadenzaPatente: qs('cli-scadenza-patente')?.value||'',
      cellulare: qs('cli-telefono')?.value||'',
      email: qs('cli-email')?.value||''
    };

    const btn = qs('cli-salva'); if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvo…'; }
    try{
      const existsIdx = (window._clientiData||[]).findIndex(c => String(c['CODICE_FISCALE']||'').trim().toUpperCase() === normalizedCF);
      const action = existsIdx >= 0 ? 'aggiornaCliente' : 'creaCliente';
      const resp = await callAPI(action, payload);
      if(resp.success){
        window.showToast?.(action === 'creaCliente' ? '✅ Cliente creato' : '✅ Cliente aggiornato', 'success');
        // Aggiornamento ottimistico
        if(existsIdx >= 0){
          const item = window._clientiData[existsIdx];
          item['NOME'] = payload.nomeCompleto;
          item['COMUNE_RESIDENZA'] = payload.comuneResidenza;
          item['VIA_RESIDENZA'] = payload.viaResidenza;
          item['CIVICO_RESIDENZA'] = payload.civicoResidenza;
          item['NUMERO_PATENTE'] = payload.numeroPatente;
          item['DATA_INIZIO_PATENTE'] = payload.dataInizioPatente ? new Date(payload.dataInizioPatente) : '';
          item['SCADENZA_PATENTE'] = payload.scadenzaPatente ? new Date(payload.scadenzaPatente) : '';
          item['SCADENZA_PATENTEFormatted'] = payload.scadenzaPatente ? window.formatDateIT?.(payload.scadenzaPatente) : '';
          item['CELLULARE'] = payload.cellulare;
          item['EMAIL'] = payload.email;
        } else {
          const newItem = {
            'NOME': payload.nomeCompleto,
            'CODICE_FISCALE': payload.codiceFiscale,
            'CELLULARE': payload.cellulare,
            'EMAIL': payload.email,
            'COMUNE_RESIDENZA': payload.comuneResidenza,
            'VIA_RESIDENZA': payload.viaResidenza,
            'CIVICO_RESIDENZA': payload.civicoResidenza,
            'NUMERO_PATENTE': payload.numeroPatente,
            'DATA_INIZIO_PATENTE': payload.dataInizioPatente ? new Date(payload.dataInizioPatente) : '',
            'SCADENZA_PATENTE': payload.scadenzaPatente ? new Date(payload.scadenzaPatente) : '',
            'SCADENZA_PATENTEFormatted': payload.scadenzaPatente ? window.formatDateIT?.(payload.scadenzaPatente) : ''
          };
          window._clientiData = [...(window._clientiData||[]), newItem];
        }
        renderClienti(window._clientiData||[]);
        modal?.hide();
      } else {
        window.showToast?.(`❌ ${resp.message||'Errore aggiornamento'}`, 'error');
      }
    } finally {
      if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i>Salva'; }
    }
  }
  
  async function loadFlotta() {
    const root = qs('admin-root'); if(!root) return;
    root.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 fw-bold mb-1">Gestione Flotta</h2>
        <p class="text-muted mb-0">Inserisci e gestisci i pulmini; modifica manutenzioni</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-glass btn-glass-success" id="btn-add-vehicle"><i class="fas fa-plus me-2"></i>Aggiungi Veicolo</button>
        <button class="btn btn-glass btn-glass-primary" id="btn-reload-flotta"><i class="fas fa-sync me-2"></i>Aggiorna Lista</button>
      </div>
    </div>
    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-sm align-middle text-white-50" id="flotta-table">
            <thead><tr>
              <th class="text-white-50">Targa</th>
              <th class="text-white-50">Marca/Modello</th>
              <th class="text-white-50">Posti</th>
              <th class="text-white-50">Stato</th>
              <th class="text-white-50">Manutenzione</th>
              <th class="text-white-50 text-end">Azioni</th>
            </tr></thead>
            <tbody id="flotta-tbody"><tr><td colspan="6" class="text-center py-4">Caricamento flotta…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

    async function fetchFlotta(){
      window.showLoader?.(true,'Caricamento flotta…');
      try{
        const resp = await callAPI('getVeicoli');
        const data = resp?.success ? (resp.data || []) : [];
        renderFlottaTable(data);
      }catch(e){
        const tb = document.getElementById('flotta-tbody'); if(tb) tb.innerHTML = `<tr><td colspan="6" class="text-danger">Errore: ${e.message}</td></tr>`;
      }finally{ window.showLoader?.(false); }
    }

    function renderFlottaTable(flotta){
      const tb = document.getElementById('flotta-tbody'); if(!tb) return;
      if(!flotta?.length){ tb.innerHTML = `<tr><td colspan="6" class="text-center py-4">Nessun veicolo in flotta</td></tr>`; return; }
      tb.innerHTML = flotta.map(v => {
        const stato = v.InManutenzioneOggi ? 'In manutenzione' : 'Disponibile';
        const statoBadge = v.InManutenzioneOggi
          ? '<span class="pill-action pill-danger">Manutenzione attiva</span>'
          : '<span class="pill-action pill-success">Disponibile</span>';
        const manInfo = v.StatoManutenzione && v.StatoManutenzione !== '-' 
          ? `<span class="chip chip-muted"><i class="fas fa-tools me-1"></i>${v.StatoManutenzione}</span>`
          : `<span class="text-muted small">—</span>`;
        return `<tr>
          <td class="fw-semibold text-white">${v.Targa}</td>
          <td>${v.Marca} ${v.Modello}</td>
          <td>${v.Posti}</td>
          <td>${statoBadge}</td>
          <td>${manInfo}</td>
          <td class="text-end">
            <button class="btn action-btn action-secondary me-1" data-action="manutenzioni" data-targa="${v.Targa}" title="Gestisci manutenzioni"><i class="fas fa-tools"></i></button>
            <button class="btn action-btn action-warning me-1" data-action="modifica" data-targa="${v.Targa}" title="Modifica veicolo"><i class="fas fa-edit"></i></button>
            <button class="btn action-btn action-danger" data-action="elimina" data-targa="${v.Targa}" title="Elimina veicolo"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
      }).join('');

      // bind azioni
      tb.querySelectorAll('button[data-action]').forEach(btn => {
        const act = btn.getAttribute('data-action');
        const targa = btn.getAttribute('data-targa');
        if(act==='modifica') btn.addEventListener('click',()=> openVehicleModal(targa));
        if(act==='elimina') btn.addEventListener('click',()=> deleteVehicle(targa));
        if(act==='manutenzioni') btn.addEventListener('click',()=> openMaintenanceModal(targa));
      });
    }

    function openVehicleModal(targa){
      const modalId = 'vehicleModal';
      if(!qs(modalId)){
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="${modalId}" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-van-shuttle me-2"></i>Veicolo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-md-4"><label class="form-label">Targa *</label><input id="veh-targa" class="form-control" maxlength="10"></div>
                  <div class="col-md-4"><label class="form-label">Marca</label><input id="veh-marca" class="form-control"></div>
                  <div class="col-md-4"><label class="form-label">Modello</label><input id="veh-modello" class="form-control"></div>
                  <div class="col-md-4"><label class="form-label">Posti</label><input id="veh-posti" type="number" min="1" max="20" class="form-control" value="9"></div>
                  <div class="col-md-4"><label class="form-label">Stato</label>
                    <select id="veh-stato" class="form-select">
                      <option>Disponibile</option>
                      <option>Attivo</option>
                      <option>Non disponibile</option>
                    </select>
                  </div>
                  <div class="col-12"><label class="form-label">Note</label><textarea id="veh-note" class="form-control" rows="2"></textarea></div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-glass btn-glass-secondary" data-bs-dismiss="modal">Annulla</button>
                <button class="btn btn-glass btn-glass-success" id="veh-save"><i class="fas fa-check me-2"></i>Salva</button>
              </div>
            </div>
          </div>
        </div>`);
      }
      const modal = new bootstrap.Modal(qs(modalId));
      // se targa presente, precompila
      (async function prefill(){
        if(!targa){
          qs('veh-targa').value=''; qs('veh-marca').value=''; qs('veh-modello').value='';
          qs('veh-posti').value='9'; qs('veh-stato').value='Disponibile'; qs('veh-note').value='';
          return;
        }
        try{
          const resp = await callAPI('getVeicoli');
          const v = (resp?.data||[]).find(x=>x.Targa===targa);
          if(v){
            qs('veh-targa').value = v.Targa;
            qs('veh-marca').value = v.Marca || '';
            qs('veh-modello').value = v.Modello || '';
            qs('veh-posti').value = v.Posti || 9;
            qs('veh-stato').value = (v.Disponibile?'Disponibile':'Non disponibile');
            qs('veh-note').value = v.Note || '';
          }
        }catch(e){ console.warn('Prefill veicolo errore', e); }
      })();
      qs('veh-save').onclick = async () => {
        const payload = {
          targa: qs('veh-targa').value.trim().toUpperCase(),
          marca: qs('veh-marca').value.trim(),
          modello: qs('veh-modello').value.trim(),
          posti: parseInt(qs('veh-posti').value,10)||9,
          stato: qs('veh-stato').value,
          note: qs('veh-note').value.trim()
        };
        if(!payload.targa) { window.showToast?.('Targa obbligatoria','warning'); return; }
        window.showLoader?.(true,'Salvataggio veicolo…');
        try{
          const resp = await callAPI('setVeicolo', payload);
          if(resp?.success){ window.showToast?.('✅ Veicolo salvato','success'); modal.hide(); fetchFlotta(); }
          else { window.showToast?.('❌ ' + (resp?.message||'Errore salvataggio'),'error'); }
        }catch(e){ window.showToast?.('❌ Errore rete','error'); } finally { window.showLoader?.(false); }
      };
      modal.show();
    }

    async function deleteVehicle(targa){
      if(!targa) return;
      if(!confirm(`Eliminare il veicolo ${targa}?`)) return;
      window.showLoader?.(true,'Eliminazione veicolo…');
      try{
        const resp = await callAPI('eliminaVeicolo', { targa });
        if(resp?.success){ window.showToast?.('🗑️ Veicolo eliminato','info'); fetchFlotta(); }
        else { window.showToast?.('❌ ' + (resp?.message||'Errore eliminazione'),'error'); }
      }catch(e){ window.showToast?.('❌ Errore rete','error'); } finally { window.showLoader?.(false); }
    }

    function openMaintenanceModal(targa){
      const modalId = 'maintenanceModal';
      if(!qs(modalId)){
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="${modalId}" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-tools me-2"></i>Manutenzioni — <span id="man-title-targa"></span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div class="form-text">Inserisci o modifica manutenzioni del veicolo</div>
                  <button class="btn btn-glass btn-glass-success" id="man-add"><i class="fas fa-plus me-2"></i>Aggiungi Manutenzione</button>
                </div>
                <div id="man-list" class="table-responsive">
                  <table class="table table-sm align-middle">
                    <thead><tr>
                      <th>Periodo</th>
                      <th>Stato</th>
                      <th class="text-end">Costo</th>
                      <th>Note</th>
                      <th class="text-end">Azioni</th>
                    </tr></thead>
                    <tbody id="man-tbody"><tr><td colspan="5" class="text-center py-3">Caricamento…</td></tr></tbody>
                  </table>
                </div>
                 <div id="man-form" class="d-none">
                   <hr>
                   <div class="admin-form-grid">
                    <div class="admin-form-group"><label class="form-label">Stato</label>
                      <select id="man-stato" class="form-select form-control-modern">
                         <option>Programmata</option>
                         <option>In corso</option>
                         <option>Completata</option>
                       </select>
                     </div>
                    <div class="admin-form-group"><label class="form-label">Inizio</label><input id="man-inizio" type="date" class="form-control-modern"></div>
                    <div class="admin-form-group"><label class="form-label">Fine</label><input id="man-fine" type="date" class="form-control-modern"></div>
                    <div class="admin-form-group"><label class="form-label">Costo (€)</label><input id="man-costo" type="number" min="0" step="0.01" inputmode="decimal" class="form-control-modern" placeholder="0"></div>
                    <div class="admin-form-group" style="grid-column: 1 / -1"><label class="form-label">Note</label><textarea id="man-note" rows="2" class="form-control-modern" placeholder="Aggiungi note opzionali"></textarea></div>
                   </div>
                 </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-glass btn-glass-secondary" data-bs-dismiss="modal">Chiudi</button>
                <button class="btn btn-glass btn-glass-secondary d-none" id="man-cancel">Annulla</button>
                <button class="btn btn-glass btn-glass-success d-none" id="man-save"><i class="fas fa-check me-2"></i>Salva</button>
              </div>
            </div>
          </div>
        </div>`);
      }
      const modal = new bootstrap.Modal(qs(modalId));
      qs('man-title-targa').textContent = targa;

      let editRow = 0; // per aggiornare una riga esistente
      const fmtDateIT = (d) => {
        if (!d) return '';
        // Se è già in formato italiano (gg/mm/aaaa), normalizza e restituisci
        if (typeof d === 'string' && d.includes('/')) {
          const p = d.split('/');
          if (p.length === 3) {
            const gg = String(p[0]).padStart(2,'0');
            const mm = String(p[1]).padStart(2,'0');
            const aa = String(p[2]).replace(/[^0-9]/g,'');
            return `${gg}/${mm}/${aa}`;
          }
          return d;
        }
        // Per qualsiasi altro formato stringa (ISO, ISO con orario), usa Date
        try {
          const date = new Date(d);
          if (isNaN(date.getTime())) return String(d||'');
          return date.toLocaleDateString('it-IT');
        } catch { return String(d||''); }
      };
      const toISODate = (val) => { // converte input eterogenei -> yyyy-mm-dd (locale)
        if(!val) return '';
        const s = String(val);
        if (s.includes('/')) {
          const p = s.split('/');
          if (p.length === 3) return `${p[2].replace(/[^0-9]/g,'')}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        }
        // Gestisce ISO puro o ISO con tempo
        try {
          const d = new Date(s.includes('T') ? s : s);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth()+1).padStart(2,'0');
            const dd = String(d.getDate()).padStart(2,'0');
            return `${y}-${m}-${dd}`;
          }
        } catch {}
        // Se è già yyyy-mm-dd
        if (s.includes('-')) {
          const first = s.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(first)) return first;
        }
        return '';
      };

      // Helpers per chiavi variabili del foglio MANUTENZIONI
      const getFirstOf = (obj, keys) => { for (const k of keys) { if (k in obj && obj[k]) return obj[k]; } return ''; };
      const fmtCosto = (v) => { if (v === null || typeof v === 'undefined' || v === '') return '-'; const n = Number(v); return isNaN(n) ? String(v) : n.toLocaleString('it-IT', { minimumFractionDigits: 0 }); };
      const statoClass = (s) => { const v = String(s||'').toLowerCase(); if (v.includes('in corso')) return 'pill-warning'; if (v.includes('completata')) return 'pill-success'; return 'pill-primary'; };

      let editMatchInizio = '';
      let editMatchFine = '';
      async function loadManList(){
        const tb = document.getElementById('man-tbody'); if(!tb) return;
        tb.innerHTML = '<tr><td colspan="5" class="text-center py-3">Caricamento…</td></tr>';
        try{
          const resp = await callAPI('getSheet', { name: 'MANUTENZIONI' });
          const rows = resp?.success ? (resp.data||[]) : [];
          const list = rows.filter(r => (getFirstOf(r,['Targa','targa'])||'').toString().toUpperCase() === targa.toUpperCase());
          if(!list.length) { tb.innerHTML = '<tr><td colspan="5" class="text-center py-3">Nessuna manutenzione</td></tr>'; return; }
          tb.innerHTML = list.map((r) => {
            const stato = getFirstOf(r,['Stato','STATO']) || '-';
            const di = getFirstOf(r,['Data Inizio Manutenzione','Data Inizio','DataInizio','DATA_INIZIO']);
            const df = getFirstOf(r,['Data Fine Manutenzione','Data Fine','DataFine','DATA_FINE']);
            const costo = getFirstOf(r,['Costo','COSTO']);
            const note = getFirstOf(r,['Note','NOTE']);
            const diISO = toISODate(di);
            const dfISO = toISODate(df);
            return `<tr>
              <td><span class="pill pill-primary badge-period">${fmtDateIT(di)} → ${fmtDateIT(df)}</span></td>
              <td><span class="pill ${statoClass(stato)}">${stato}</span></td>
              <td class="text-end">${fmtCosto(costo)}</td>
              <td>${note || '—'}</td>
              <td class="text-end">
                <button class="btn action-btn action-warning me-1 man-edit" title="Modifica"><i class="fas fa-edit"></i></button>
              </td>
            </tr>`;
          }).join('');
          // bind edit
          tb.querySelectorAll('.man-edit').forEach((btn) => {
            btn.addEventListener('click', () => {
              const tr = btn.closest('tr');
              // Estrai valori dalla riga
              const cells = tr.querySelectorAll('td');
              const periodo = cells[0].textContent;
              const stato = cells[1].textContent.trim();
              const costo = cells[2].textContent.trim();
              const note = cells[3].textContent.trim();
              const parts = periodo.split('→');
              const di = parts[0].trim(); const df = parts[1].trim();
              editMatchInizio = di; editMatchFine = df; editRow = 0;
              qs('man-stato').value = stato || 'Programmata';
              // Usa conversione esplicita dd/mm -> yyyy-mm-dd per evitare inversioni
              const toISOFromIT = (s) => {
                const m = String(s||'').match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/);
                if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
                return toISODate(s);
              };
              qs('man-inizio').value = toISOFromIT(di);
              qs('man-fine').value  = toISOFromIT(df);
              qs('man-costo').value = costo === '-' ? '' : costo;
              qs('man-note').value = note === '-' ? '' : note;
              qs('man-form').classList.remove('d-none');
              qs('man-save').classList.remove('d-none');
              qs('man-cancel').classList.remove('d-none');
              qs('man-list').classList.add('d-none');
            });
          });
        }catch(e){ tb.innerHTML = `<tr><td colspan="5" class="text-danger">Errore: ${e.message}</td></tr>`; }
      }

      qs('man-add').onclick = () => {
        editRow = 0;
        qs('man-stato').value = 'Programmata';
        qs('man-inizio').value = '';
        qs('man-fine').value = '';
        qs('man-costo').value = '';
        qs('man-note').value = '';
        qs('man-form').classList.remove('d-none');
        qs('man-save').classList.remove('d-none');
        qs('man-cancel').classList.remove('d-none');
        qs('man-list').classList.add('d-none');
      };
      // Annulla modifica/aggiunta
      const cancelBtn = qs('man-cancel');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          qs('man-form').classList.add('d-none');
          qs('man-save').classList.add('d-none');
          qs('man-cancel').classList.add('d-none');
          qs('man-list').classList.remove('d-none');
        };
      }

      qs('man-save').onclick = async () => {
        const inizioISO = qs('man-inizio').value; const fineISO = qs('man-fine').value;
        if(!inizioISO || !fineISO) { window.showToast?.('Date obbligatorie','warning'); return; }
        const diIT = fmtDateIT(inizioISO);
        const dfIT = fmtDateIT(fineISO);
        const payload = {
          targa,
          stato: qs('man-stato').value,
          dataInizio: diIT,
          dataFine: dfIT,
          costo: qs('man-costo').value,
          note: qs('man-note').value,
          row: editRow || undefined,
          matchDataInizio: editRow ? undefined : editMatchInizio,
          matchDataFine: editRow ? undefined : editMatchFine
        };
        window.showLoader?.(true,'Salvataggio manutenzione…');
        try{
          const resp = await callAPI('setManutenzione', payload);
          if(resp?.success){ window.showToast?.('✅ Manutenzione salvata','success'); qs('man-form').classList.add('d-none'); qs('man-save').classList.add('d-none'); qs('man-cancel').classList.add('d-none'); qs('man-list').classList.remove('d-none'); loadManList(); fetchFlotta(); }
          else { window.showToast?.('❌ ' + (resp?.message||'Errore salvataggio'),'error'); }
        }catch(e){ window.showToast?.('❌ Errore rete','error'); } finally { window.showLoader?.(false); }
      };

      modal.show();
      loadManList();
    }

    // Bind header buttons
    qs('btn-add-vehicle').onclick = ()=> openVehicleModal('');
    qs('btn-reload-flotta').onclick = ()=> fetchFlotta();
    fetchFlotta();
  }
  async function loadManutenzioni() { window.showLoader?.(false); const root = qs('admin-root'); root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Manutenzioni</h5><p class="text-muted">Sezione in costruzione</p></div></div>'; }

  // Expose globals
  window.loadAdminSection = loadAdminSection;
  window.handleAdminCheckAvailability = handleAdminCheckAvailability;
  
  console.log(`[ADMIN-SCRIPTS] v${ADMIN_CONFIG.VERSION} loaded - Authorization header fixed`);
})();
