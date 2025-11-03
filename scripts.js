/**
 * IMBRIANI STEFANO NOLEGGIO - SCRIPTS v8.4
 * Homepage: percorsi Nuovi Clienti (5 step) e Clienti Esistenti
 */

// Preserve existing variables/flows
let selectedVehicle = window.selectedVehicle || null;
let searchParams = window.searchParams || {};
let vehicleModal = window.vehicleModal || null;
let contactVerified = window.contactVerified || false;

// Public hooks used by index.html
window.startNewCustomerFlow = function(){
  const modalEl = document.getElementById('newFlowModal');
  if(!modalEl){ console.warn('newFlowModal mancante'); return; }
  const modal = new bootstrap.Modal(modalEl);
  let step = 0; // 0:disponibilità,1:veicolo,2:preventivo,3:autisti,4:conferma
  const title = document.getElementById('newFlowTitle');
  const body = document.getElementById('newFlowBody');
  const prevBtn = document.getElementById('newPrev');
  const nextBtn = document.getElementById('newNext');
  const emailWrap = document.getElementById('emailOptinWrap');

  function render(){
    prevBtn.disabled = step===0;
    emailWrap.classList.toggle('d-none', step!==4);
    nextBtn.textContent = step===4? 'Conferma' : 'Avanti';
    if(step===0){
      title.textContent='Verifica disponibilità';
      body.innerHTML=`
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label">Data inizio</label><input id="nfStart" type="date" class="form-control" required></div>
          <div class="col-md-6"><label class="form-label">Data fine</label><input id="nfEnd" type="date" class="form-control" required></div>
          <div class="col-12"><label class="form-label">Destinazione</label><input id="nfDest" class="form-control" placeholder="Es. Bari → Lecce"></div>
        </div>`;
    }
    if(step===1){
      title.textContent='Seleziona pulmino';
      body.innerHTML=`<div id="vehiclesContainer" class="row g-3"></div>`;
      loadVehiclesForModal();
    }
    if(step===2){
      title.textContent='Richiesta preventivo';
      body.innerHTML=`<div class="alert alert-info">Verrà generato un riepilogo per la richiesta di preventivo.</div>`;
    }
    if(step===3){
      title.textContent='Dati autisti (1–3)';
      body.innerHTML=`
        <div id="driversContainer"></div>
        <button id="addDriver" class="btn btn-outline-primary btn-sm mt-2" type="button">Aggiungi Autista</button>`;
      initDriversModal();
    }
    if(step===4){
      title.textContent='Conferma';
      body.innerHTML=`<p>Controlla i dati e conferma l'invio della richiesta.</p>`;
    }
  }

  async function loadVehiclesForModal(){
    try{
      const res = await callAPI('disponibilita', searchParams||{});
      const cont = document.getElementById('vehiclesContainer');
      if(!res||!Array.isArray(res?.veicoli)){ cont.innerHTML='<div class="col-12 text-muted">Nessun veicolo disponibile</div>'; return; }
      cont.innerHTML = res.veicoli.map(v=>`<div class='col-md-6'><div class='card h-100 p-3'><h6 class='fw-bold'>${v.nome||v.modello}</h6><button class='btn btn-outline-primary btn-sm mt-2 selV' data-id='${v.id}'>Seleziona</button></div></div>`).join('');
      cont.querySelectorAll('.selV').forEach(b=>b.onclick=()=>{ window._selectedVehicle=b.dataset.id; step=2; render(); });
    }catch(e){ console.error(e); }
  }

  function initDriversModal(){
    const cont = document.getElementById('driversContainer');
    const add=(i)=>cont.insertAdjacentHTML('beforeend',`<div class='border rounded p-2 mb-2'>Autista ${i}<div class='row g-2 mt-1'><div class='col-md-6'><input class='form-control' placeholder='Nome Cognome' required></div><div class='col-md-6'><input class='form-control' placeholder='Codice Fiscale' maxlength='16' style='text-transform:uppercase' required></div></div></div>`);
    add(1);
    document.getElementById('addDriver').onclick=()=>{ const n=cont.querySelectorAll('.border.rounded').length; if(n<3) add(n+1); };
  }

  prevBtn.onclick = ()=>{ if(step>0){ step--; render(); }};
  nextBtn.onclick = async ()=>{
    if(step===0){
      const dr=document.getElementById('nfStart').value; const dc=document.getElementById('nfEnd').value; const de=document.getElementById('nfDest').value||'';
      if(!dr||!dc){ showToast?.('Seleziona le date','warning'); return; }
      searchParams={...(searchParams||{}), dataInizio:dr, dataFine:dc, destinazione:de};
      step=1; render(); return;
    }
    if(step<4){ step++; render(); return; }
    // Conferma
    const emailOptin = document.getElementById('emailOptin').checked;
    await callAPI('creaPrenotazione',{ vehicle: window._selectedVehicle, emailOptin });
    modal.hide(); showToast?.('Richiesta inviata','success');
  };

  render(); modal.show();
};

window.openPersonalArea = function(){
  const cf = (localStorage.getItem('USER_CF')||'').trim();
  if(!cf){ new bootstrap.Modal('#loginModal').show(); return; }
  document.getElementById('personalArea')?.classList.remove('d-none');
};

window.doLogin = async function(){
  const cf=(document.getElementById('codiceFiscale')?.value||'').toUpperCase();
  if(cf.length!==16){ showToast?.('CF non valido','danger'); return; }
  localStorage.setItem('USER_CF', cf);
  bootstrap.Modal.getInstance(document.getElementById('loginModal'))?.hide();
  openPersonalArea();
};

// Shared secured API (delegates to shared-utils.js)
async function callAPI(action, params){
  if(typeof window.secureGet==='function') return await window.secureGet(action, params);
  const url = `${window.API_URL}?action=${encodeURIComponent(action)}`;
  return fetch(url).then(r=>r.json());
}
