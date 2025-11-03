// scripts.js v8.6 - debug API calls to find backend issue
(function(){
  // Global safe guard for noisy extensions
  window.addEventListener('error', (ev)=>{
    try{ if((ev?.filename||'').includes('content_script.js')) { ev.preventDefault?.(); return false; } }catch(e){}
  }, true);

  // Helpers
  function qs(id){ return document.getElementById(id); }
  async function callAPI(action, params={}){
    console.log(`[API DEBUG] Calling ${action} with:`, params);
    if(typeof window.secureGet==='function') {
      const result = await window.secureGet(action, params);
      console.log(`[API DEBUG] Response for ${action}:`, result);
      return result;
    }
    console.warn('[API DEBUG] secureGet missing, using fallback');
    return { success:false, message:'secureGet missing' };
  }

  // Unified login
  window.doLogin = function(){
    const input = qs('cf-input') || qs('codiceFiscale');
    const cf = (input?.value||'').toUpperCase();
    if(cf.length!==16){ window.showToast?.('CF non valido','danger'); return; }
    localStorage.setItem('USER_CF', cf);
    try{ bootstrap.Modal.getInstance(qs('loginModal'))?.hide(); }catch(e){}
    window.openPersonalArea?.();
  };

  window.openPersonalArea = function(){
    const cf = (localStorage.getItem('USER_CF')||'').trim();
    if(!cf){ try{ new bootstrap.Modal('#loginModal').show(); }catch(e){} return; }
    qs('personalArea')?.classList.remove('d-none');
  };

  // Availability flow with debug
  window.handleCheckAvailability = async function(){
    console.log('[FLOW] handleCheckAvailability started');
    const dr=qs('new-data-ritiro')?.value, dc=qs('new-data-consegna')?.value;
    const or=qs('new-ora-ritiro')?.value||'08:00', oc=qs('new-ora-consegna')?.value||'20:00';
    const de=qs('new-destinazione')?.value?.trim()||''; const posti=qs('new-posti')?.value||'9';
    console.log('[FLOW] Form values:', {dr,dc,or,oc,de,posti});
    if(!dr||!dc){ window.showToast?.('Seleziona date ritiro e consegna','warning'); return; }
    window.searchParams={dataInizio:dr,dataFine:dc,oraInizio:or,oraFine:oc,destinazione:de,posti};
    console.log('[FLOW] searchParams set:', window.searchParams);
    try{
      const modal = new bootstrap.Modal(qs('vehicleModal'));
      console.log('[FLOW] Modal created, showing...');
      modal.show(); 
      console.log('[FLOW] Modal shown, loading vehicles...');
      await loadVehicles();
    }catch(e){ console.error('[FLOW] Modal error:', e); }
  };

  async function loadVehicles(){
    console.log('[VEHICLES] loadVehicles started');
    try{
      window.selectedVehicle=null;
      const grid = document.getElementById('vehicles-grid'); 
      if(!grid) { console.error('[VEHICLES] vehicles-grid not found'); return; }
      grid.innerHTML = '<div class="col-12 text-white-50">Caricamento veicoli…</div>';
      
      console.log('[VEHICLES] Making API calls...');
      const [flottaResp, dispResp] = await Promise.all([
        callAPI('flotta',{method:'get'}), 
        callAPI('disponibilita', window.searchParams||{})
      ]);
      
      console.log('[VEHICLES] Flotta response:', flottaResp);
      console.log('[VEHICLES] Disponibilita response:', dispResp);
      
      const flotta=flottaResp?.success?flottaResp.data:[];
      const disponibili=dispResp?.success?(dispResp.data?.disponibili||dispResp.data||[]):[];
      
      console.log('[VEHICLES] Processed flotta:', flotta);
      console.log('[VEHICLES] Processed disponibili:', disponibili);
      
      if(!flotta || flotta.length === 0) {
        console.warn('[VEHICLES] No vehicles in flotta');
        grid.innerHTML = '<div class="col-12 text-white-50">Nessun veicolo in flotta configurata</div>';
        updateVehicleCount(0, 0);
        return;
      }
      
      const targhe=new Set(disponibili.map(v=>v.Targa));
      console.log('[VEHICLES] Available targhe:', Array.from(targhe));
      
      flotta.forEach(v=>v.DisponibileDate=targhe.has(v.Targa));
      renderVehicles(flotta);
    }catch(e){ 
      console.error('[VEHICLES] Error:', e); 
      const grid = document.getElementById('vehicles-grid');
      if(grid) grid.innerHTML = '<div class="col-12 text-danger">Errore caricamento veicoli: ' + e.message + '</div>';
    }
  }

  function renderVehicles(list){
    console.log('[RENDER] renderVehicles with:', list);
    const grid = document.getElementById('vehicles-grid'); if(!grid) return;
    if(!list?.length){ 
      grid.innerHTML='<div class="col-12 text-white-50">Nessun veicolo trovato</div>'; 
      updateVehicleCount(0, 0);
      bindContinue(false); return; 
    }
    
    const availableCount = list.filter(v => v.DisponibileDate && v.Disponibile).length;
    console.log('[RENDER] Available vehicles:', availableCount, 'Total:', list.length);
    
    grid.innerHTML = list.map(v=>{
      const available=v.DisponibileDate&&v.Disponibile;
      const badges=[available?'<span class="badge bg-success">Disponibile</span>':'<span class="badge bg-secondary">Manutenzione</span>'];
      const passoLungo = v.PassoLungo || v.Targa === 'EC787NM';
      if(passoLungo) badges.push('<span class="badge bg-warning">Passo Lungo</span>');
      
      return `<div class='col-md-6 col-xl-4'><div class='vehicle-card glass-card p-3 h-100 ${!available?'disabled':''}' data-targa='${v.Targa}' data-vehicle='${encodeURIComponent(JSON.stringify(v))}'>
        <div class='d-flex justify-content-between align-items-start mb-2'><h6 class='fw-bold mb-0'>${v.Marca} ${v.Modello}</h6><div class='d-flex flex-wrap gap-1'>${badges.join('')}</div></div>
        <div class='text-muted small mb-2'><i class='fas fa-id-badge me-1'></i>Targa: ${v.Targa}</div>
        <div class='text-muted small mb-3'><i class='fas fa-users me-1'></i>${v.Posti} posti</div>
        ${v.Note ? `<div class='small text-muted mb-2'>${v.Note}</div>` : ''}
        <div class='d-grid'><button class='btn ${available?'btn-outline-primary':'btn-outline-secondary'} btn-sm vehicle-select' ${!available?'disabled':''}>${available?'<i class="fas fa-check me-1"></i>Seleziona':'<i class="fas fa-ban me-1"></i>Non disponibile'}</button></div>
      </div></div>`;
    }).join('');
    
    grid.querySelectorAll('.vehicle-card .vehicle-select').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const card = ev.target.closest('.vehicle-card'); if(!card||card.classList.contains('disabled')) return;
        grid.querySelectorAll('.vehicle-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        try{ 
          window.selectedVehicle = JSON.parse(decodeURIComponent(card.dataset.vehicle)); 
          console.log('[SELECT] Vehicle selected:', window.selectedVehicle);
        }catch(e){ 
          console.error('[SELECT] Parse error:', e);
          window.selectedVehicle=null; 
        }
        bindContinue(true);
      });
    });
    
    updateVehicleCount(availableCount, list.length);
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
      console.log('[CONTINUE] Continue clicked, selectedVehicle:', window.selectedVehicle);
      if(!window.selectedVehicle) return;
      try{ bootstrap.Modal.getInstance(qs('vehicleModal'))?.hide(); }catch(e){}
      showQuoteStep();
    };
  }

  window.showQuoteStep = function(){
    console.log('[QUOTE] showQuoteStep started');
    const info = qs('veicolo-selezionato'); const stepPrev=qs('step-preventivo');
    if(!window.selectedVehicle||!info||!stepPrev) { 
      console.error('[QUOTE] Missing elements or selectedVehicle');
      return; 
    }
    const v=window.selectedVehicle; const badge = (v.PassoLungo||v.Targa==='EC787NM')? ' <span class="badge bg-warning">Passo Lungo</span>':'';
    info.innerHTML = `<strong>Veicolo selezionato:</strong><br><i class='fas fa-car me-1'></i>${v.Marca} ${v.Modello} (${v.Targa})${badge}`;
    stepPrev.classList.remove('d-none'); stepPrev.scrollIntoView({behavior:'smooth'});
    console.log('[QUOTE] Quote step shown, setting up WhatsApp...');
    setupWhatsAppLink();
  };

  function setupWhatsAppLink(){
    const nomeEl=qs('nuovo-nome'); const cognEl=qs('nuovo-cognome'); const wa=qs('cta-whatsapp');
    if(!nomeEl||!cognEl||!wa||!window.selectedVehicle) return;
    const update=()=>{
      const v=window.selectedVehicle; const phone='393286589618';
      const ritiro = (window.formatItalianDateTime)? formatItalianDateTime(window.searchParams?.dataInizio, window.searchParams?.oraInizio): `${window.searchParams?.dataInizio} ${window.searchParams?.oraInizio}`;
      const consegna = (window.formatItalianDateTime)? formatItalianDateTime(window.searchParams?.dataFine, window.searchParams?.oraFine): `${window.searchParams?.dataFine} ${window.searchParams?.oraFine}`;
      const lines=[
        'Richiesta preventivo — Imbriani Stefano Noleggio',
        `Nome: ${nomeEl.value||''} ${cognEl.value||''}`,
        `Ritiro: ${ritiro}`,
        `Consegna: ${consegna}`,
        `Destinazione: ${window.searchParams?.destinazione||''}`,
        `Veicolo: ${v.Marca} ${v.Modello} (${v.Targa})${(v.PassoLungo||v.Targa==='EC787NM')?' - Passo Lungo':''}`
      ];
      wa.setAttribute('href', `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`);
    };
    nomeEl.oninput = update; cognEl.oninput = update; update();
  }

  // Bind events on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    console.log('[INIT] DOM loaded, binding events...');
    // Anti-extension safeguards
    ['new-data-ritiro','new-data-consegna','new-destinazione','nuovo-nome','nuovo-cognome','cf-input'].forEach(id=>{
      const el=qs(id); if(el){ 
        el.setAttribute('autocomplete','off'); el.setAttribute('autocorrect','off'); 
        el.setAttribute('autocapitalize','off'); el.setAttribute('spellcheck','false'); 
      }
    });
    
    // Main buttons
    const checkBtn = qs('check-disponibilita');
    if(checkBtn) {
      console.log('[INIT] check-disponibilita button found, binding...');
      checkBtn.addEventListener('click', (e)=>{ 
        e.preventDefault(); 
        console.log('[CLICK] Verifica disponibilità clicked');
        try{ handleCheckAvailability(); }catch(err){ console.error('[CLICK] Error:', err); } 
      });
    } else {
      console.error('[INIT] check-disponibilita button NOT found');
    }
    
    const loginBtn = qs('login-btn');
    if(loginBtn) {
      console.log('[INIT] login-btn found, binding...');
      loginBtn.addEventListener('click', (e)=>{ 
        e.preventDefault(); 
        console.log('[CLICK] Login clicked');
        try{ doLogin(); }catch(err){ console.error('[CLICK] Login error:', err); } 
      });
    } else {
      console.error('[INIT] login-btn NOT found');
    }
    
    console.log('[INIT] Event binding complete');
  });
  
  console.log('[SCRIPTS] v8.6 loaded with debug');
})();
