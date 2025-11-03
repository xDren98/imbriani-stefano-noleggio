/**
 * IMBRIANI STEFANO NOLEGGIO - SHARED UTILITIES v8.1
 * Aggiunte utility storage sicure + export globale
 */

const SHARED_CONFIG = {
  VERSION: '8.1',
  API_BASE_URL: window.API_URL || 'https://imbriani-proxy.dreenhd.workers.dev',
  TOKEN: 'imbriani_secret_2025',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  DEBUG: true,
  VEHICLE_TYPES: { PASSO_LUNGO_TARGA: 'EC787NM', STATI_VALIDI: ['Disponibile','Occupato','Manutenzione','Fuori servizio'] }
};

window.SHARED_CONFIG = SHARED_CONFIG;

// STORAGE HELPERS
function getFromStorage(key, fallback = ''){
  try{ const v = localStorage.getItem(key); if(v===null||v===undefined) return fallback; try{ return JSON.parse(v) }catch{ return v } }catch{ return fallback }
}
function saveToStorage(key, value){ try{ const v = (typeof value==='string')?value:JSON.stringify(value); localStorage.setItem(key, v) }catch{} }
function removeFromStorage(key){ try{ localStorage.removeItem(key) }catch{} }

// API CALL
async function callAPI(action, params = {}){
  const timestamp = Date.now();
  const payload = { action, token: SHARED_CONFIG.TOKEN, ts: timestamp.toString(), ...params };
  if (SHARED_CONFIG.DEBUG) console.log(`🚀 API Call: ${action}`, payload);
  try{
    const url = new URL(SHARED_CONFIG.API_BASE_URL);
    Object.entries(payload).forEach(([k,v])=>{ if(v!==undefined&&v!==null) url.searchParams.append(k, String(v)) });
    const res = await fetch(url.toString(), { method:'GET', headers:{ 'Accept':'application/json' } });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (SHARED_CONFIG.DEBUG) console.log(`✅ API Response: ${action}`, data);
    return data;
  }catch(err){ console.error(`❌ API Error: ${action}`, err); return { success:false, data:null, message:`Errore di rete: ${err.message}`, timestamp:new Date().toISOString() } }
}

// VEHICLE HELPERS
function isPassoLungo(vehicle){ if(!vehicle) return false; return vehicle.Targa==='EC787NM'||vehicle.PassoLungo===true||(vehicle.Marca?.toLowerCase().includes('fiat')&&vehicle.Modello?.toLowerCase().includes('ducato')&&vehicle.Targa==='EC787NM') }
function getVehicleBadges(vehicle){ const badges=[]; if(isPassoLungo(vehicle)) badges.push({text:'🚐 Passo Lungo',class:'bg-warning'}); if(vehicle.Disponibile) badges.push({text:'Disponibile',class:'bg-success'}); else if((vehicle.Stato||'').toLowerCase().includes('manutenzione')) badges.push({text:'Manutenzione',class:'bg-secondary'}); else badges.push({text:vehicle.Stato||'Non disponibile',class:'bg-warning'}); return badges }
function formatVehicleForWhatsApp(vehicle, searchParams){ const pl=isPassoLungo(vehicle); const v=`${vehicle.Marca} ${vehicle.Modello} (${vehicle.Targa})${pl?' - Passo Lungo':''}`; return ['Richiesta preventivo — Imbriani Stefano Noleggio',`Veicolo richiesto: ${v}`,`Ritiro: ${searchParams.dataInizio} ${searchParams.oraInizio}`,`Consegna: ${searchParams.dataFine} ${searchParams.oraFine}`,`Destinazione: ${searchParams.destinazione||'Da specificare'}`,`Posti: ${vehicle.Posti}`].join('\n') }

// LOADER + TOAST
function showLoader(show,message='Caricamento...'){ const s=document.getElementById('spinner'); const m=document.getElementById('loader-message'); if(!s) return; if(show){ s.classList.remove('d-none'); if(m) m.textContent=message } else s.classList.add('d-none') }
function showToast(message,type='info',duration=4000){ const c=getOrCreateToastContainer(); const id='toast-'+Date.now(); const bg={success:'bg-success',warning:'bg-warning',error:'bg-danger',info:'bg-info'}[type]||'bg-info'; const ic={success:'fas fa-check-circle',warning:'fas fa-exclamation-triangle',error:'fas fa-times-circle',info:'fas fa-info-circle'}[type]||'fas fa-info-circle'; const html=`<div id="${id}" class="toast align-items-center text-white ${bg} border-0" role="alert"><div class="d-flex"><div class="toast-body"><i class="${ic} me-2"></i>${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`; c.insertAdjacentHTML('beforeend',html); const el=document.getElementById(id); const t=new bootstrap.Toast(el,{delay:duration}); t.show(); el.addEventListener('hidden.bs.toast',()=>el.remove()) }
function getOrCreateToastContainer(){ let c=document.getElementById('toast-container'); if(!c){ c=document.createElement('div'); c.id='toast-container'; c.className='toast-container position-fixed top-0 end-0 p-3'; c.style.zIndex='9999'; document.body.appendChild(c) } return c }

// DATE/FORMAT
function formatDateForInput(d){ if(!d) return ''; try{ const x=new Date(d); return x.toISOString().split('T')[0] }catch{ return '' } }
function formatDateForDisplay(d){ if(!d) return ''; try{ const x=new Date(d); return x.toLocaleDateString('it-IT',{year:'numeric',month:'2-digit',day:'2-digit'}) }catch{ return d } }
function formatCurrency(a){ if(!a||isNaN(a)) return '0,00 €'; return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(parseFloat(a)) }

// EXPORT GLOBAL
window.callAPI=callAPI; window.showLoader=showLoader; window.showToast=showToast; window.isPassoLungo=isPassoLungo; window.getVehicleBadges=getVehicleBadges; window.formatVehicleForWhatsApp=formatVehicleForWhatsApp; window.formatDateForInput=formatDateForInput; window.formatDateForDisplay=formatDateForDisplay; window.formatCurrency=formatCurrency; window.getFromStorage=getFromStorage; window.saveToStorage=saveToStorage; window.removeFromStorage=removeFromStorage;

function logInfo(msg){ if(SHARED_CONFIG.DEBUG) console.log(`[SHARED] ${new Date().toISOString()}: ${msg}`) }
logInfo(`🚀 Shared Utils v${SHARED_CONFIG.VERSION} loaded (CORS via config API_URL)`); logInfo(`API Base URL: ${SHARED_CONFIG.API_BASE_URL}`);