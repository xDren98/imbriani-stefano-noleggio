// scripts.js v9.0 - Complete flow: 08-22h slots + real availability + autocomplete + booking
(function(){
  window.addEventListener('error', (ev)=>{
    try{ if((ev?.filename||'').includes('content_script.js')) { ev.preventDefault?.(); return false; } }catch(e){}
  }, true);

  function qs(id){ return document.getElementById(id); }
  async function callAPI(action, params={}){
    console.log(`[API] ${action}:`, params);
    if(typeof window.secureGet==='function') {
      const result = await window.secureGet(action, params);
      console.log(`[API] ${action} result:`, result);
      return result;
    }
    return { success:false, message:'secureGet missing' };
  }

  const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  function initTimeSelectors(){
    ['new-ora-ritiro', 'new-ora-consegna'].forEach(id => {
      const sel = qs(id); if(!sel) return;
      sel.innerHTML = TIME_SLOTS.map(t => `<option value="${t}">${t}</option>`).join('');
      if(id === 'new-ora-ritiro') sel.value = '08:00';
      if(id === 'new-ora-consegna') sel.value = '20:00';
    });
  }

  window.doLogin = function(){
    const input = qs('cf-input') || qs('codiceFiscale');
    const cf = (input?.value||'').toUpperCase();
    if(cf.length!==16){ window.showToast?.('CF non valido','error'); return; }
    localStorage.setItem('USER_CF', cf);
    try{ bootstrap.Modal.getInstance(qs('loginModal'))?.hide(); }catch(e){}
    window.openPersonalArea?.();
  };

  window.openPersonalArea = function(){
    const cf = (localStorage.getItem('USER_CF')||'').trim();
    if(!cf){ try{ new bootstrap.Modal('#loginModal').show(); }catch(e){} return; }
    qs('personalArea')?.classList.remove('d-none');
  };

  window.handleCheckAvailability = async function(){
    const dr=qs('new-data-ritiro')?.value, dc=qs('new-data-consegna')?.value;
    const or=qs('new-ora-ritiro')?.value||'08:00', oc=qs('new-ora-consegna')?.value||'20:00';
    const de=qs('new-destinazione')?.value?.trim()||''; const posti=qs('new-posti')?.value||'9';
    
    if(!dr||!dc){ window.showToast?.('Seleziona date ritiro e consegna','warning'); return; }
    if(!TIME_SLOTS.includes(or) || !TIME_SLOTS.includes(oc)){
      window.showToast?.('Orari non validi (solo fasce 08:00-22:00)','warning'); return;
    }
    
    window.searchParams={dataInizio:dr,dataFine:dc,oraInizio:or,oraFine:oc,destinazione:de,posti};
    
    try{
      const modal = new bootstrap.Modal(qs('vehicleModal'));
      modal.show(); 
      await loadVehicles();
    }catch(e){ console.error('[FLOW] Modal error:', e); }
  };

  async function loadVehicles(){
    try{
      window.selectedVehicle=null;
      const grid = qs('vehicles-grid'); 
      if(!grid) return;
      grid.innerHTML = '<div class="col-12 text-white-50">🔄 Verifico disponibilità reale…</div>';
      
      const [flottaResp, dispResp] = await Promise.all([
        callAPI('flotta',{method:'get'}), 
        callAPI('disponibilita', window.searchParams||{})
      ]);
      
      const flotta = flottaResp?.success ? flottaResp.data : [];
      const dispData = dispResp?.success ? dispResp.data : {};
      const disponibili = dispData.disponibili || [];
      const suggerimenti = dispData.suggerimenti || [];
      
      if(!flotta?.length) {
        grid.innerHTML = '<div class="col-12 text-white-50">Nessun veicolo in flotta</div>';
        return;
      }
      
      if(suggerimenti.length > 0 && disponibili.length === 0) {
        showSuggestions(suggerimenti, grid);
        return;
      }
      
      renderVehicles(flotta, disponibili.map(v => v.Targa));
    }catch(e){ 
      console.error('[VEHICLES] Error:', e);
      const grid = qs('vehicles-grid');
      if(grid) grid.innerHTML = '<div class="col-12 text-danger">Errore: ' + e.message + '</div>';
    }
  }

  function showSuggestions(suggestions, grid){
    const suggHtml = suggestions.map(s => 
      `<div class="col-md-6"><div class="glass-card p-3 border-warning">
          <h6 class="text-warning">💡 ${s.marca} ${s.modello} (${s.targa})</h6>
          <p class="small mb-2">${s.motivoOriginale}</p>
          <p class="small mb-2"><strong>Proposta:</strong><br>📅 ${s.dataInizioSuggerita} ${s.oraInizioSuggerita} → ${s.dataFineSuggerita} ${s.oraFineSuggerita}</p>
          <button class="btn btn-outline-warning btn-sm w-100 use-suggestion" 
                  data-start-date="${s.dataInizioSuggerita}" data-start-time="${s.oraInizioSuggerita}"
                  data-end-date="${s.dataFineSuggerita}" data-end-time="${s.oraFineSuggerita}">✅ Usa questa fascia</button>
        </div></div>`
    ).join('');
    
    grid.innerHTML = `<div class="col-12 mb-3"><div class="alert alert-warning">
          <h6>⚠️ Nessun veicolo disponibile nella fascia richiesta</h6>
          <p class="mb-0">Ecco alcune alternative vicine:</p></div></div>${suggHtml}`;
    
    grid.querySelectorAll('.use-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const b = e.target;
        qs('new-data-ritiro').value = b.dataset.startDate;
        qs('new-ora-ritiro').value = b.dataset.startTime;
        qs('new-data-consegna').value = b.dataset.endDate;
        qs('new-ora-consegna').value = b.dataset.endTime;
        window.showToast?.('Fascia aggiornata! Riprova la ricerca.', 'success');
        bootstrap.Modal.getInstance(qs('vehicleModal'))?.hide();
      });
    });
  }

  function renderVehicles(flotta, availableTags){
    const grid = qs('vehicles-grid'); if(!grid) return;
    const availableSet = new Set(availableTags);
    const available = flotta.filter(v => availableSet.has(v.Targa));
    const unavailable = flotta.filter(v => !availableSet.has(v.Targa));
    
    if(available.length === 0) {
      grid.innerHTML = '<div class="col-12 text-white-50">Nessun veicolo disponibile in questa fascia</div>';
      updateVehicleCount(0, flotta.length); return;
    }
    
    const renderVehicle = (v, isAvailable) => {
      const badges = [isAvailable ? '<span class="badge bg-success">Disponibile</span>' : '<span class="badge bg-secondary">Occupato/Manutenzione</span>'];
      const passoLungo = v.PassoLungo || v.Targa === 'EC787NM';
      if(passoLungo) badges.push('<span class="badge bg-warning">Passo Lungo</span>');
      
      return `<div class='col-md-6 col-xl-4'><div class='vehicle-card glass-card p-3 h-100 ${!isAvailable?'disabled':''}' data-targa='${v.Targa}' data-vehicle='${encodeURIComponent(JSON.stringify(v))}'>
        <div class='d-flex justify-content-between align-items-start mb-2'><h6 class='fw-bold mb-0'>${v.Marca} ${v.Modello}</h6><div class='d-flex flex-wrap gap-1'>${badges.join('')}</div></div>
        <div class='text-muted small mb-2'><i class='fas fa-id-badge me-1'></i>Targa: ${v.Targa}</div>
        <div class='text-muted small mb-3'><i class='fas fa-users me-1'></i>${v.Posti} posti</div>
        <div class='d-grid'><button class='btn ${isAvailable?'btn-outline-primary':'btn-outline-secondary'} btn-sm vehicle-select' ${!isAvailable?'disabled':''}>${isAvailable?'<i class="fas fa-check me-1"></i>Seleziona':'<i class="fas fa-ban me-1"></i>Non disponibile'}</button></div>
      </div></div>`;
    };
    
    grid.innerHTML = [...available.map(v => renderVehicle(v, true)),...unavailable.map(v => renderVehicle(v, false))].join('');
    
    grid.querySelectorAll('.vehicle-card .vehicle-select:not([disabled])').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const card = ev.target.closest('.vehicle-card');
        if(!card || card.classList.contains('disabled')) return;
        grid.querySelectorAll('.vehicle-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        try{ window.selectedVehicle = JSON.parse(decodeURIComponent(card.dataset.vehicle)); }catch(e){ window.selectedVehicle=null; }
        bindContinue(true);
      });
    });
    updateVehicleCount(available.length, flotta.length);
    bindContinue(false);
  }

  function updateVehicleCount(available, total){
    const el = qs('vehicles-count'); if(!el) return;
    el.textContent = `${available} disponibili su ${total} veicoli totali`;
  }

  function bindContinue(enable){
    const btn = qs('continue-selection'); if(!btn) return;
    btn.disabled = !enable;
    btn.onclick = ()=>{
      if(!window.selectedVehicle) return;
      try{ bootstrap.Modal.getInstance(qs('vehicleModal'))?.hide(); }catch(e){}
      showQuoteStep();
    };
  }

  window.showQuoteStep = function(){
    const info = qs('veicolo-selezionato'); const stepPrev=qs('step-preventivo');
    if(!window.selectedVehicle||!info||!stepPrev) return; 
    const v=window.selectedVehicle; 
    const badge = (v.PassoLungo||v.Targa==='EC787NM')? ' <span class="badge bg-warning">Passo Lungo</span>':'';
    info.innerHTML = `<strong>Veicolo selezionato:</strong><br><i class='fas fa-car me-1'></i>${v.Marca} ${v.Modello} (${v.Targa})${badge}`;
    stepPrev.classList.remove('d-none'); 
    stepPrev.scrollIntoView({behavior:'smooth'});
    setupWhatsAppLink();
    bindContactActions();
  };

  function setupWhatsAppLink(){
    const nomeEl=qs('nuovo-nome'); const cognEl=qs('nuovo-cognome'); const wa=qs('cta-whatsapp');
    if(!nomeEl||!cognEl||!wa||!window.selectedVehicle) return;
    const update=()=>{
      const v=window.selectedVehicle; const phone='393286589618';
      const sp = window.searchParams || {};
      const lines=['Richiesta preventivo — Imbriani Stefano Noleggio',`Nome: ${nomeEl.value||''} ${cognEl.value||''}`,`Ritiro: ${sp.dataInizio||''} ${sp.oraInizio||''}`,`Consegna: ${sp.dataFine||''} ${sp.oraFine||''}`,`Destinazione: ${sp.destinazione||''}`,`Veicolo: ${v.Marca} ${v.Modello} (${v.Targa})${(v.PassoLungo||v.Targa==='EC787NM')?' - Passo Lungo':''}`];
      wa.setAttribute('href', `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`);
    };
    nomeEl.oninput = update; cognEl.oninput = update; update();
  }

  function bindContactActions(){
    const waBtn = qs('cta-whatsapp'); const telBtn = qs('cta-telefono');
    const unlockDrivers = () => {
      console.log('[CONTACT] Contact made, unlocking drivers');
      localStorage.setItem('CONTACT_DONE', '1');
      showDriversStep();
    };
    if(waBtn) waBtn.addEventListener('click', unlockDrivers);
    if(telBtn) telBtn.addEventListener('click', unlockDrivers);
  }

  window.showDriversStep = function(){
    const stepDrivers = qs('step-autisti');
    if(!stepDrivers) return; 
    stepDrivers.classList.remove('d-none');
    stepDrivers.scrollIntoView({behavior:'smooth'});
    ['cf-driver1', 'cf-driver2', 'cf-driver3'].forEach(bindAutocomplete);
    const confirmBtn = qs('confirm-booking');
    if(confirmBtn) confirmBtn.onclick = handleBookingConfirm;
  };

  function bindAutocomplete(fieldId){
    const cfField = qs(fieldId); if(!cfField) return;
    cfField.addEventListener('blur', async () => {
      const cf = cfField.value.toUpperCase().trim();
      if(cf.length !== 16) return;
      window.showLoader?.(true, 'Caricamento dati cliente...');
      try{
        const resp = await callAPI('autocompletaCliente', {cf});
        if(resp.success && resp.data) {
          const d = resp.data; const prefix = fieldId.replace('cf-', '');
          const fields = {[`nome-${prefix}`]: d.Nome,[`data-nascita-${prefix}`]: d.DataNascita,[`luogo-nascita-${prefix}`]: d.LuogoNascita,[`comune-${prefix}`]: d.ComuneResidenza,[`via-${prefix}`]: d.ViaResidenza,[`civico-${prefix}`]: d.CivicoResidenza,[`patente-${prefix}`]: d.NumeroPatente,[`inizio-patente-${prefix}`]: d.DataInizioPatente,[`scadenza-patente-${prefix}`]: d.ScadenzaPatente,[`telefono-${prefix}`]: d.Cellulare,[`email-${prefix}`]: d.Email};
          Object.entries(fields).forEach(([id, value]) => { const el = qs(id); if(el && value) el.value = value; });
          window.showToast?.('Cliente trovato e dati compilati automaticamente', 'success');
        } else {
          window.showToast?.('Cliente non trovato - compila manualmente', 'info');
        }
      } catch(e) {
        window.showToast?.('Errore ricerca cliente', 'error');
      } finally {
        window.showLoader?.(false);
      }
    });
  }

  async function handleBookingConfirm(){
    const cf1 = qs('cf-driver1')?.value?.toUpperCase()?.trim();
    const nome1 = qs('nome-driver1')?.value?.trim();
    const patente1 = qs('patente-driver1')?.value?.trim();
    
    if(!cf1 || cf1.length !== 16) {
      window.showToast?.('CF primo autista non valido', 'error');
      qs('cf-driver1')?.focus(); return;
    }
    if(!nome1) {
      window.showToast?.('Nome primo autista obbligatorio', 'error');
      qs('nome-driver1')?.focus(); return;
    }
    if(!patente1) {
      window.showToast?.('Numero patente primo autista obbligatorio', 'error');
      qs('patente-driver1')?.focus(); return;
    }
    
    const drivers = [];
    ['driver1', 'driver2', 'driver3'].forEach(prefix => {
      const cf = qs(`cf-${prefix}`)?.value?.toUpperCase()?.trim();
      if(!cf || cf.length !== 16) return;
      drivers.push({cf,nome: qs(`nome-${prefix}`)?.value?.trim() || '',dataNascita: qs(`data-nascita-${prefix}`)?.value || '',luogoNascita: qs(`luogo-nascita-${prefix}`)?.value?.trim() || '',comune: qs(`comune-${prefix}`)?.value?.trim() || '',via: qs(`via-${prefix}`)?.value?.trim() || '',civico: qs(`civico-${prefix}`)?.value?.trim() || '',patente: qs(`patente-${prefix}`)?.value?.trim() || '',inizioPatente: qs(`inizio-patente-${prefix}`)?.value || '',scadenzaPatente: qs(`scadenza-patente-${prefix}`)?.value || '',telefono: qs(`telefono-${prefix}`)?.value?.trim() || '',email: qs(`email-${prefix}`)?.value?.trim() || ''});
    });
    
    if(drivers.length === 0) {
      window.showToast?.('Inserire almeno un autista', 'error'); return;
    }
    
    const payload = {targa: window.selectedVehicle?.Targa,dataInizio: window.searchParams?.dataInizio,dataFine: window.searchParams?.dataFine,oraInizio: window.searchParams?.oraInizio,oraFine: window.searchParams?.oraFine,destinazione: window.searchParams?.destinazione};
    
    drivers.forEach((driver, idx) => {
      const prefix = `drv${idx + 1}_`;
      payload[`${prefix}CF`] = driver.cf;
      payload[`${prefix}Nome`] = driver.nome;
      payload[`${prefix}DataNascita`] = driver.dataNascita;
      payload[`${prefix}LuogoNascita`] = driver.luogoNascita;
      payload[`${prefix}ComuneResidenza`] = driver.comune;
      payload[`${prefix}ViaResidenza`] = driver.via;
      payload[`${prefix}CivicoResidenza`] = driver.civico;
      payload[`${prefix}NumeroPatente`] = driver.patente;
      payload[`${prefix}DataInizioPatente`] = driver.inizioPatente;
      payload[`${prefix}ScadenzaPatente`] = driver.scadenzaPatente;
      payload[`${prefix}Cellulare`] = driver.telefono;
      payload[`${prefix}Email`] = driver.email;
    });
    
    window.showLoader?.(true, 'Creazione prenotazione...');
    
    try {
      const resp = await callAPI('creaPrenotazione', payload);
      if(resp.success) {
        const bookingId = resp.data?.id;
        window.showToast?.(`✅ Prenotazione creata: ${bookingId}`, 'success', 6000);
        const email1 = drivers[0]?.email;
        if(email1) {
          try {
            const emailResp = await callAPI('inviaRiepilogo', {idPrenotazione: bookingId,email: email1});
            if(emailResp.success) window.showToast?.('📧 Email riepilogo inviata con link area personale', 'info');
          } catch(e) {}
        }
        setTimeout(() => location.reload(), 3000);
      } else {
        window.showToast?.('❌ Errore: ' + (resp.message || 'Prenotazione fallita'), 'error');
      }
    } catch(e) {
      window.showToast?.('❌ Errore di rete', 'error');
    } finally {
      window.showLoader?.(false);
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initTimeSelectors();
    ['new-data-ritiro','new-data-consegna','new-destinazione','nuovo-nome','nuovo-cognome','cf-input'].forEach(id=>{
      const el=qs(id); if(el){ el.setAttribute('autocomplete','off'); el.setAttribute('autocorrect','off'); el.setAttribute('autocapitalize','off'); el.setAttribute('spellcheck','false'); }
    });
    const checkBtn = qs('check-disponibilita');
    if(checkBtn) checkBtn.addEventListener('click', (e)=>{ e.preventDefault(); try{ handleCheckAvailability(); }catch(err){ console.error(err); } });
    const loginBtn = qs('login-btn');
    if(loginBtn) loginBtn.addEventListener('click', (e)=>{ e.preventDefault(); try{ doLogin(); }catch(err){ console.error(err); } });
  });
  
  console.log('[SCRIPTS] v9.0 loaded - Complete step-by-step flow');
})();