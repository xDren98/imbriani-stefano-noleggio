// scripts.js v8.5 - robust event binding + unified login + safe guards
(function(){
  // Global safe guard for noisy extensions
  window.addEventListener('error', (ev)=>{
    try{ if((ev?.filename||'').includes('content_script.js')) { ev.preventDefault?.(); return false; } }catch(e){}
  }, true);

  // Helpers
  function qs(id){ return document.getElementById(id); }
  async function callAPI(action, params={}){
    if(typeof window.secureGet==='function') return await window.secureGet(action, params);
    return { success:false, message:'secureGet missing' };
  }

  // Unified login (home + modal)
  window.doLogin = function(){
    const input = qs('cf-input') || qs('codiceFiscale');
    const cf = (input?.value||'').toUpperCase();
    if(cf.length!==16){ window.showToast?.('CF non valido','danger'); return; }
    localStorage.setItem('USER_CF', cf);
    try{ bootstrap.Modal.getInstance(qs('loginModal'))?.hide(); }catch(e){}
    window.openPersonalArea?.();
  };

  // Open personal area
  window.openPersonalArea = function(){
    const cf = (localStorage.getItem('USER_CF')||'').trim();
    if(!cf){ try{ new bootstrap.Modal('#loginModal').show(); }catch(e){} return; }
    qs('personalArea')?.classList.remove('d-none');
  };

  // Availability flow
  window.handleCheckAvailability = async function(){
    const dr=qs('new-data-ritiro')?.value, dc=qs('new-data-consegna')?.value;
    const or=qs('new-ora-ritiro')?.value||'08:00', oc=qs('new-ora-consegna')?.value||'20:00';
    const de=qs('new-destinazione')?.value?.trim()||''; const posti=qs('new-posti')?.value||'9';
    if(!dr||!dc){ window.showToast?.('Seleziona date ritiro e consegna','warning'); return; }
    window.searchParams={dataInizio:dr,dataFine:dc,oraInizio:or,oraFine:oc,destinazione:de,posti};
    try{
      const modal = new bootstrap.Modal(qs('vehicleModal'));
      modal.show(); await loadVehicles();
    }catch(e){ console.error(e); }
  };

  async function loadVehicles(){
    try{
      window.selectedVehicle=null;
      const grid = document.getElementById('vehicles-grid'); if(!grid) return;
      grid.innerHTML = '<div class="col-12 text-white-50">Caricamento veicoli…</div>';
      const [flottaResp, dispResp] = await Promise.all([
        callAPI('flotta',{method:'get'}), callAPI('disponibilita', window.searchParams||{})
      ]);
      const flotta=flottaResp?.success?flottaResp.data:[];
      const disponibili=dispResp?.success?(dispResp.data?.disponibili||dispResp.data||[]):[];
      const targhe=new Set(disponibili.map(v=>v.Targa));
      flotta.forEach(v=>v.DisponibileDate=targhe.has(v.Targa));
      renderVehicles(flotta);
    }catch(e){ console.error(e); }
  }

  function renderVehicles(list){
    const grid = document.getElementById('vehicles-grid'); if(!grid) return;
    if(!list?.length){ grid.innerHTML='<div class="col-12 text-white-50">Nessun veicolo disponibile</div>'; bindContinue(false); return; }
    grid.innerHTML = list.map(v=>{
      const available=v.DisponibileDate&&v.Disponibile;
      const badges=[available?'<span class="badge bg-success">Disponibile</span>':'<span class="badge bg-secondary">Manutenzione</span>'];
      return `<div class='col-md-6 col-xl-4'><div class='vehicle-card glass-card p-3 h-100 ${!available?'disabled':''}' data-targa='${v.Targa}' data-vehicle='${encodeURIComponent(JSON.stringify(v))}'>
        <div class='d-flex justify-content-between align-items-start mb-2'><h6 class='fw-bold mb-0'>${v.Marca} ${v.Modello}</h6><div class='d-flex flex-wrap gap-1'>${badges.join('')}</div></div>
        <div class='text-muted small mb-2'><i class='fas fa-id-badge me-1'></i>Targa: ${v.Targa}</div>
        <div class='text-muted small mb-3'><i class='fas fa-users me-1'></i>${v.Posti} posti</div>
        <div class='d-grid'><button class='btn ${available?'btn-outline-primary':'btn-outline-secondary'} btn-sm vehicle-select' ${!available?'disabled':''}>${available?'Seleziona':'Non disponibile'}</button></div>
      </div></div>`;
    }).join('');
    grid.querySelectorAll('.vehicle-card .vehicle-select').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const card = ev.target.closest('.vehicle-card'); if(!card||card.classList.contains('disabled')) return;
        grid.querySelectorAll('.vehicle-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        try{ window.selectedVehicle = JSON.parse(decodeURIComponent(card.dataset.vehicle)); }catch(e){ window.selectedVehicle=null; }
        bindContinue(true);
      });
    });
    bindContinue(false);
  }

  function bindContinue(enable){
    const btn = document.getElementById('continue-selection'); if(!btn) return;
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
    const v=window.selectedVehicle; const badge = (v.PassoLungo||v.Targa==='EC787NM')? ' <span class="badge bg-warning">Passo Lungo</span>':'';
    info.innerHTML = `<strong>Veicolo selezionato:</strong><br><i class='fas fa-car me-1'></i>${v.Marca} ${v.Modello} (${v.Targa})${badge}`;
    stepPrev.classList.remove('d-none'); stepPrev.scrollIntoView({behavior:'smooth'});
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

  // Bind events on DOM ready (robust)
  document.addEventListener('DOMContentLoaded', ()=>{
    // Inputs: reduce 3rd-party interference
    ['new-data-ritiro','new-data-consegna','new-destinazione','nuovo-nome','nuovo-cognome','cf-input'].forEach(id=>{
      const el=qs(id); if(el){ el.setAttribute('autocomplete','off'); el.setAttribute('autocorrect','off'); el.setAttribute('autocapitalize','off'); el.setAttribute('spellcheck','false'); }
    });
    qs('check-disponibilita')?.addEventListener('click', (e)=>{ e.preventDefault(); try{ handleCheckAvailability(); }catch(err){ console.error(err); } });
    qs('login-btn')?.addEventListener('click', (e)=>{ e.preventDefault(); try{ doLogin(); }catch(err){ console.error(err); } });
  });
})();
