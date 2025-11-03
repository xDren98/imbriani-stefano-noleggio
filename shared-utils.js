/**
 * IMBRIANI STEFANO NOLEGGIO - SHARED UTILITIES v8.2
 * secureGet with HMAC + retry/timeout + utility functions
 */

const SHARED_CONFIG = {
  VERSION: '8.2',
  API_BASE_URL: window.API_URL || 'https://imbriani-proxy.dreenhd.workers.dev',
  TOKEN: window.API_TOKEN || 'imbriani_secret_2025',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  DEBUG: true,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 800,
  VEHICLE_TYPES: { PASSO_LUNGO_TARGA: 'EC787NM', STATI_VALIDI: ['Disponibile','Occupato','Manutenzione','Fuori servizio'] }
};

window.SHARED_CONFIG = SHARED_CONFIG;

// STORAGE HELPERS
function getFromStorage(key, fallback = ''){
  try{ const v = localStorage.getItem(key); if(v===null||v===undefined) return fallback; try{ return JSON.parse(v) }catch{ return v } }catch{ return fallback }
}
function saveToStorage(key, value){ try{ const v = (typeof value==='string')?value:JSON.stringify(value); localStorage.setItem(key, v) }catch{} }
function removeFromStorage(key){ try{ localStorage.removeItem(key) }catch{} }

// HMAC UTILITY
function hmacSHA256(message, key){
  try{
    const enc = new TextEncoder();
    const data = enc.encode(message);
    const k = enc.encode(key);
    return window.crypto.subtle.importKey('raw', k, {name:'HMAC', hash:'SHA-256'}, false, ['sign'])
      .then(key => window.crypto.subtle.sign('HMAC', key, data))
      .then(sig => {
        const bytes = new Uint8Array(sig);
        let hex = '';
        for (let b of bytes) hex += b.toString(16).padStart(2,'0');
        return hex;
      });
  } catch(e) { 
    console.warn('[HMAC] SubtleCrypto not available, using token auth only');
    return Promise.resolve(null); 
  }
}

function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

// SECURE API CALL WITH HMAC + RETRY
async function doSecureFetch(action, params){
  const body = JSON.stringify({ action, ...params });
  const ts = Date.now().toString();
  
  let signature = null;
  try { signature = await hmacSHA256(body, SHARED_CONFIG.TOKEN); } catch(e) { signature = null; }

  const headers = { 'Content-Type': 'application/json' };
  if(SHARED_CONFIG.TOKEN) headers['X-Auth-Token'] = SHARED_CONFIG.TOKEN;
  if(signature) {
    headers['X-Signature'] = signature;
    headers['X-Timestamp'] = ts;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHARED_CONFIG.TIMEOUT);
  
  try {
    const res = await fetch(SHARED_CONFIG.API_BASE_URL, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return { success: false, message: `HTTP ${res.status}: ${errorText}`, status: res.status };
    }
    
    const json = await res.json().catch(() => ({ success: false, message: `Invalid JSON response` }));
    return json;
  } catch(e) {
    if (e.name === 'AbortError') {
      return { success: false, message: 'Request timeout' };
    }
    return { success: false, message: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// SECURE GET WITH RETRY
async function secureGet(action, params = {}){
  if (SHARED_CONFIG.DEBUG) console.log(`[SECURE] Calling ${action} with:`, params);
  
  for(let attempt = 0; attempt <= SHARED_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const resp = await doSecureFetch(action, params);
      
      if (SHARED_CONFIG.DEBUG) console.log(`[SECURE] Response for ${action} (attempt ${attempt + 1}):`, resp);
      
      if(resp && (resp.success === true || resp.data)) {
        return resp;
      }
      
      // If not successful and we have retries left
      if(attempt < SHARED_CONFIG.RETRY_ATTEMPTS) {
        const delay = SHARED_CONFIG.RETRY_DELAY * (attempt + 1);
        if (SHARED_CONFIG.DEBUG) console.log(`[SECURE] Retrying ${action} in ${delay}ms...`);
        await sleep(delay);
      }
    } catch(e) {
      console.error(`[SECURE] Error on attempt ${attempt + 1}:`, e);
      if(attempt < SHARED_CONFIG.RETRY_ATTEMPTS) {
        await sleep(SHARED_CONFIG.RETRY_DELAY * (attempt + 1));
      }
    }
  }
  
  return { success: false, message: `secureGet failed after ${SHARED_CONFIG.RETRY_ATTEMPTS + 1} attempts` };
}

// LEGACY CALLAPI (for backward compatibility)
async function callAPI(action, params = {}){
  return await secureGet(action, params);
}

// VEHICLE HELPERS
function isPassoLungo(vehicle){ 
  if(!vehicle) return false; 
  return vehicle.Targa === 'EC787NM' || vehicle.PassoLungo === true || 
    (vehicle.Marca?.toLowerCase().includes('fiat') && 
     vehicle.Modello?.toLowerCase().includes('ducato') && 
     vehicle.Targa === 'EC787NM')
}

function getVehicleBadges(vehicle){ 
  const badges = [];
  if(isPassoLungo(vehicle)) badges.push({text:'🚐 Passo Lungo', class:'bg-warning'});
  if(vehicle.Disponibile) badges.push({text:'Disponibile', class:'bg-success'});
  else if((vehicle.Stato||'').toLowerCase().includes('manutenzione')) badges.push({text:'Manutenzione', class:'bg-secondary'});
  else badges.push({text: vehicle.Stato || 'Non disponibile', class:'bg-warning'});
  return badges;
}

function formatVehicleForWhatsApp(vehicle, searchParams){ 
  const pl = isPassoLungo(vehicle);
  const v = `${vehicle.Marca} ${vehicle.Modello} (${vehicle.Targa})${pl ? ' - Passo Lungo' : ''}`;
  return [
    'Richiesta preventivo — Imbriani Stefano Noleggio',
    `Veicolo richiesto: ${v}`,
    `Ritiro: ${searchParams.dataInizio} ${searchParams.oraInizio}`,
    `Consegna: ${searchParams.dataFine} ${searchParams.oraFine}`,
    `Destinazione: ${searchParams.destinazione || 'Da specificare'}`,
    `Posti: ${vehicle.Posti}`
  ].join('\n');
}

// LOADER + TOAST
function showLoader(show, message = 'Caricamento...'){
  try {
    const spinner = document.getElementById('spinner');
    const messageEl = document.getElementById('loader-message');
    if(!spinner) return;
    
    if(show) {
      spinner.classList.remove('d-none');
      if(messageEl) messageEl.textContent = message;
    } else {
      spinner.classList.add('d-none');
    }
  } catch(e) {
    console.warn('[LOADER] Error:', e);
  }
}

function showToast(message, type = 'info', duration = 4000){
  try {
    const container = getOrCreateToastContainer();
    const id = 'toast-' + Date.now();
    const bg = {success:'bg-success', warning:'bg-warning', error:'bg-danger', info:'bg-info'}[type] || 'bg-info';
    const icon = {success:'fas fa-check-circle', warning:'fas fa-exclamation-triangle', error:'fas fa-times-circle', info:'fas fa-info-circle'}[type] || 'fas fa-info-circle';
    
    const html = `<div id="${id}" class="toast align-items-center text-white ${bg} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body"><i class="${icon} me-2"></i>${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
    
    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, {delay: duration});
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  } catch(e) {
    // Fallback to console
    console.log(`[TOAST][${type}]`, message);
  }
}

function getOrCreateToastContainer(){
  let container = document.getElementById('toast-container');
  if(!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
}

// DATE/FORMAT HELPERS
function formatDateForInput(d){ 
  if(!d) return ''; 
  try { 
    const date = new Date(d); 
    return date.toISOString().split('T')[0]; 
  } catch { 
    return ''; 
  } 
}

function formatDateForDisplay(d){ 
  if(!d) return ''; 
  try { 
    const date = new Date(d); 
    return date.toLocaleDateString('it-IT', {year:'numeric', month:'2-digit', day:'2-digit'}); 
  } catch { 
    return d; 
  } 
}

function formatCurrency(amount){ 
  if(!amount || isNaN(amount)) return '0,00 €'; 
  return new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'}).format(parseFloat(amount)); 
}

// EXPORT GLOBALS
window.secureGet = secureGet;
window.callAPI = callAPI;
window.showLoader = showLoader;
window.showToast = showToast;
window.isPassoLungo = isPassoLungo;
window.getVehicleBadges = getVehicleBadges;
window.formatVehicleForWhatsApp = formatVehicleForWhatsApp;
window.formatDateForInput = formatDateForInput;
window.formatDateForDisplay = formatDateForDisplay;
window.formatCurrency = formatCurrency;
window.getFromStorage = getFromStorage;
window.saveToStorage = saveToStorage;
window.removeFromStorage = removeFromStorage;

function logInfo(msg){ 
  if(SHARED_CONFIG.DEBUG) console.log(`[SHARED] ${new Date().toISOString()}: ${msg}`); 
}

logInfo(`🚀 Shared Utils v${SHARED_CONFIG.VERSION} loaded (secureGet + HMAC + retry)`);
logInfo(`API Base URL: ${SHARED_CONFIG.API_BASE_URL}`);
