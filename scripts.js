/**
 * IMBRIANI STEFANO NOLEGGIO - SCRIPTS v8.3
 * - Data italiana nel messaggio WhatsApp
 * - Step 3 autisti separato e sblocco dopo contatto (WA/call)
 */

let selectedVehicle = null;
let searchParams = {};
let vehicleModal = null;
let contactVerified = false;

document.addEventListener('DOMContentLoaded', init);

function init(){
  console.log('🚀 Inizializzazione Imbriani Noleggio v8.3...');
  safeSetupNetworkHandlers();
  setupVehicleModal();
  setupLogin();
  bindContactButtons();
}

function safeSetupNetworkHandlers(){
  if(typeof window.onNetworkChange!=='function'){
    window.onNetworkChange=function(online){ if(window.showToast) showToast(`Sei ${online?'online':'offline'}`, online?'success':'warning', 2000); };
  }
  window.addEventListener('online',()=>onNetworkChange(true));
  window.addEventListener('offline',()=>onNetworkChange(false));
}

function bindContactButtons(){
  const wa=document.getElementById('cta-whatsapp');
  const call=document.querySelector('a[href^="tel:"]');
  const proceed=()=>{ contactVerified=true; showDriversStep(); };
  wa?.addEventListener('click', ()=>{ setTimeout(proceed,1500); });
  call?.addEventListener('click', ()=>{ setTimeout(proceed,1500); });
}

async function handleCheckAvailability(){
  const dr=document.getElementById('new-data-ritiro')?.value;
  const or=document.getElementById('new-ora-ritiro')?.value||'08:00';
  const dc=document.getElementById('new-data-consegna')?.value;
  const oc=document.getElementById('new-ora-consegna')?.value||'20:00';
  const de=document.getElementById('new-destinazione')?.value?.trim()||'';
  const posti=document.getElementById('new-posti')?.value||'9';
  if(!dr||!dc){ showToast('Seleziona date ritiro e consegna','warning'); return; }
  searchParams={dataInizio:dr,dataFine:dc,oraInizio:or,oraFine:oc,destinazione:de,posti};
  saveToStorage('searchParams',searchParams);
  if(!vehicleModal){ const el=document.getElementById('vehicleModal'); vehicleModal=new bootstrap.Modal(el); }
  vehicleModal.show();
  await loadVehicles();
}

async function loadVehicles(){
  showLoader(true,'Caricamento veicoli...');
  try{
    const [flottaResp, dispResp] = await Promise.all([
      callAPI('flotta',{method:'get'}),
      callAPI('disponibilita', searchParams)
    ]);
    const flotta=flottaResp.success?flottaResp.data:[];
    const disponibili=dispResp.success?(dispResp.data.disponibili||dispResp.data||[]):[];
    const targheDisponibili=new Set(disponibili.map(v=>v.Targa));
    flotta.forEach(v=>v.DisponibileDate=targheDisponibili.has(v.Targa));
    renderVehicles(flotta); updateVehicleCount(flotta);
  }catch(e){ console.error(e); document.getElementById('vehicles-grid').innerHTML='<div class="col-12"><div class="alert alert-danger">Errore caricamento veicoli</div></div>'; }
  finally{ showLoader(false); }
}

function renderVehicles(vehicles){
  const grid=document.getElementById('vehicles-grid'); if(!grid) return;
  if(!vehicles||vehicles.length===0){ grid.innerHTML='<div class="col-12"><div class="alert alert-warning">Nessun veicolo trovato.</div></div>'; return; }
  grid.innerHTML=vehicles.map(v=>{ const available=v.DisponibileDate&&v.Disponibile; const pl=v.PassoLungo||v.Targa==='EC787NM'; const badges=[]; if(pl) badges.push('<span class="badge bg-warning">🚐 Passo Lungo</span>'); badges.push(`<span class="badge ${available?'bg-success':'bg-secondary'}">${available?'Disponibile':'Manutenzione'}</span>`); return `<div class="col-md-6 col-xl-4"><div class="vehicle-card glass-card p-3 h-100 ${!available?'disabled':''}" data-targa="${v.Targa}" data-vehicle='${JSON.stringify(v).replace(/'/g,"&#39;")}'> <div class="d-flex justify-content-between align-items-start mb-2"><h6 class="fw-bold mb-0">${v.Marca} ${v.Modello}</h6><div class="d-flex flex-wrap gap-1">${badges.join('')}</div></div> <div class="text-muted small mb-2"><i class="fas fa-id-badge me-1"></i>Targa: ${v.Targa}</div> <div class="text-muted small mb-3"><i class="fas fa-users me-1"></i>${v.Posti} posti</div> ${v.Note?`<div class=\"small text-muted mb-2\">${v.Note}</div>`:''} <div class="d-grid"><button class="btn ${available?'btn-outline-primary':'btn-outline-secondary'} btn-sm vehicle-select" ${!available?'disabled':''} data-targa="${v.Targa}">${available?'<i class=\"fas fa-check me-1\"></i>Seleziona':'<i class=\"fas fa-ban me-1\"></i>Non disponibile'}</button></div> </div></div>`; }).join('');
  document.querySelectorAll('.vehicle-select').forEach(btn=>btn.addEventListener('click',()=>{ if(!btn.disabled) selectVehicle(btn.dataset.targa); }));
}

function selectVehicle(targa){ selectedVehicle=null; document.querySelectorAll('.vehicle-card').forEach(card=>{ card.classList.remove('selected'); if(card.dataset.targa===targa){ card.classList.add('selected'); try{ selectedVehicle=JSON.parse(card.dataset.vehicle.replace(/&#39;/g,"'")); }catch(e){ console.error(e); } }}); document.getElementById('continue-selection').disabled=!selectedVehicle; }

function updateVehicleCount(vehicles){ const el=document.getElementById('vehicles-count'); if(!el||!vehicles) return; const total=vehicles.length; const available=vehicles.filter(v=>v.DisponibileDate&&v.Disponibile).length; el.textContent=`${available} disponibili su ${total} veicoli totali`; }

function showQuoteStep(){ const stepPrev=document.getElementById('step-preventivo'); const info=document.getElementById('veicolo-selezionato'); if(!selectedVehicle||!stepPrev||!info) return; const pl=selectedVehicle.PassoLungo||selectedVehicle.Targa==='EC787NM'; const badge=pl?' <span class="badge bg-warning">Passo Lungo</span>':''; info.innerHTML=`<strong>Veicolo selezionato:</strong><br><i class="fas fa-car me-1"></i>${selectedVehicle.Marca} ${selectedVehicle.Modello} (${selectedVehicle.Targa})${badge}`; stepPrev.classList.remove('d-none'); stepPrev.scrollIntoView({behavior:'smooth'}); setupWhatsAppLink(); }

function setupWhatsAppLink(){ const nomeEl=document.getElementById('nuovo-nome'); const cognEl=document.getElementById('nuovo-cognome'); const waEl=document.getElementById('cta-whatsapp'); if(!nomeEl||!cognEl||!waEl) return; const updateWA=()=>{ if(!selectedVehicle) return; const nome=nomeEl.value||''; const cognome=cognEl.value||''; const pl=selectedVehicle.PassoLungo||selectedVehicle.Targa==='EC787NM'; const phone='393286589618'; const ritiro=formatItalianDateTime(searchParams.dataInizio, searchParams.oraInizio); const consegna=formatItalianDateTime(searchParams.dataFine, searchParams.oraFine); const lines=['Richiesta preventivo — Imbriani Stefano Noleggio',`Nome: ${nome} ${cognome}`,`Ritiro: ${ritiro}`,`Consegna: ${consegna}`,`Destinazione: ${searchParams.destinazione}`,`Veicolo: ${selectedVehicle.Marca} ${selectedVehicle.Modello} (${selectedVehicle.Targa})${pl?' - Passo Lungo':''}`]; waEl.setAttribute('href', `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`); }; nomeEl.addEventListener('input', updateWA); cognEl.addEventListener('input', updateWA); updateWA(); }

function showDriversStep(){ let driversSection=document.getElementById('step-drivers'); if(!driversSection){ const container=document.querySelector('.glass-card'); const html=`<div id=\"step-drivers\" class=\"mt-4\"><h6 class=\"fw-bold mb-2\"><span class=\"badge bg-info me-2\">3</span> Dati autisti</h6><div class=\"row g-3\"><div class=\"col-md-6\"><label class=\"form-label fw-semibold\">Numero autisti</label><select id=\"drivers-count\" class=\"form-select form-control-modern\"><option value=\"1\">1</option><option value=\"2\">2</option><option value=\"3\">3</option></select></div></div><div id=\"drivers-forms\" class=\"mt-3\"></div><div class=\"d-grid mt-3\"><button id=\"create-booking\" class=\"btn btn-premium\">Prosegui con la prenotazione</button></div></div>`; container.insertAdjacentHTML('beforeend', html); bindDriversForm(); } }

function bindDriversForm(){ const countSel=document.getElementById('drivers-count'); const formsContainer=document.getElementById('drivers-forms'); const render=()=>{ const n=parseInt(countSel.value)||1; const blocks=[]; for(let i=1;i<=n;i++){ blocks.push(`<div class=\"glass-card p-3 mb-3\"><h6 class=\"mb-2\">Autista ${i}</h6><div class=\"row g-3\"><div class=\"col-md-6\"><label class=\"form-label\">Nome e Cognome</label><input type=\"text\" class=\"form-control form-control-modern\" id=\"drv${i}-nome\" placeholder=\"Mario Rossi\"></div><div class=\"col-md-3\"><label class=\"form-label\">Data di nascita</label><input type=\"date\" class=\"form-control form-control-modern\" id=\"drv${i}-nascita\"></div><div class=\"col-md-3\"><label class=\"form-label\">Patente (scadenza)</label><input type=\"date\" class=\"form-control form-control-modern\" id=\"drv${i}-scadenza\"></div></div></div>`);} formsContainer.innerHTML=blocks.join(''); }; render(); countSel.addEventListener('change', render); document.getElementById('create-booking').addEventListener('click', submitBooking); }

async function submitBooking(){ showToast('Raccolta dati autisti completata. Endpoint prenotazione in arrivo.','info'); }

async function handleLogin(){ const cf=document.getElementById('cf-input')?.value?.trim()?.toUpperCase(); if(!cf){showToast('Inserisci il CF','error');return;} const v=validateCodiceFiscale(cf); if(!v.valid){showToast(v.message,'error');return;} showLoader(true,'Accesso in corso...'); try{const res=await callAPI('login',{cf}); if(res.success){showToast(`Benvenuto, ${res.data.nome}!`,'success');} else {showToast(res.message||'Errore login','error');}}catch{showToast('Errore di connessione','error')}finally{showLoader(false)} }

window.handleCheckAvailability=handleCheckAvailability;
