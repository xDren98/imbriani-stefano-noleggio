function showLoader(show, message){
  const el = document.getElementById('spinner');
  const msg = document.getElementById('loader-message');
  if (!el) return;
  if (typeof message === 'string' && msg) msg.textContent = message;
  el.classList.toggle('d-none', !show);
}

function showAdminGate(show){
  const gate = document.getElementById('admin-login-gate');
  if (!gate) return;
  if (show) { gate.classList.remove('d-none'); gate.classList.add('d-flex'); }
  else { gate.classList.add('d-none'); gate.classList.remove('d-flex'); }
}

let __adminSessionValid = false;
let __currentSection = 'dashboard';
async function checkAdminSession(){
  try {
    const res = await (window.secureGet ? window.secureGet('debugAuth', {}) : Promise.resolve({ success:false }));
    __adminSessionValid = !!(res && res.success && res.sessionValid);
    showAdminGate(!__adminSessionValid);
    return __adminSessionValid;
  } catch(_){ __adminSessionValid = false; showAdminGate(true); return false; }
}

function hasAdminSessionPresent(){ return __adminSessionValid; }

async function handleAdminLogin(){
  const name = document.getElementById('admin-name')?.value || 'Admin';
  const otp = document.getElementById('admin-otp')?.value?.trim() || '';
  if (!otp){ window.showToast?.('Inserisci OTP','warning'); return; }
  showLoader(true, 'Accesso admin…');
  const res = await window.adminApi.callAPI('adminLogin', { name, otp });
  showLoader(false);
  if (res && res.success){ window.showToast?.('Accesso effettuato','success'); await checkAdminSession(); loadAdminSection('dashboard'); }
  else { window.showToast?.('OTP non valido','danger'); }
}

async function handleAdminDevLogin(){
  const name = document.getElementById('admin-name')?.value || 'DevAdmin';
  showLoader(true, 'Accesso sviluppo…');
  const res = await window.adminApi.callAPI('devLogin', { name, originLocal:'1' });
  showLoader(false);
  if (res && res.success){ window.showToast?.('Accesso sviluppo effettuato','success'); await checkAdminSession(); loadAdminSection('dashboard'); }
  else { window.showToast?.('Dev login non consentito','danger'); }
}

async function handleAdminLogout(){
  try {
    showLoader(true, 'Logout…');
    await window.adminApi.callAPI('revokeSession', {});
  } finally {
    showLoader(false);
    __adminSessionValid = false;
    showAdminGate(true);
  }
}

function bindAdminGate(){
  document.getElementById('admin-request-otp')?.addEventListener('click', async () => {
    const name = document.getElementById('admin-name')?.value || 'Admin';
    const res = await window.adminApi.callAPI('requestAdminOTP', { name });
    if (res && res.success){ window.showToast?.('OTP inviato su Telegram','info'); }
    else { window.showToast?.('Errore invio OTP','danger'); }
  });
  document.getElementById('admin-login-btn')?.addEventListener('click', handleAdminLogin);
  document.getElementById('admin-dev-login-btn')?.addEventListener('click', handleAdminDevLogin);
  document.getElementById('admin-logout-btn')?.addEventListener('click', handleAdminLogout);
}

function ensureSectionRoot(html){
  const root = document.getElementById('admin-root');
  if (!root) return null;
  root.innerHTML = html;
  return root;
}

async function loadAdminSection(section){
  const sec = section || 'dashboard';
  __currentSection = sec;
  if (!hasAdminSessionPresent()){ showAdminGate(true); window.showToast?.('Effettua il login admin','warning'); return; }
  showLoader(true, 'Carico sezione…');
  try {
    if (sec === 'dashboard'){
      const html = `<div class="row g-3 mb-3">
        <div class="col-md-3"><div class="card"><div class="card-body"><h6 class="fw-bold mb-1">Prenotazioni settimana</h6><div id="dash-upcoming" class="display-6">-</div></div></div></div>
        <div class="col-md-3"><div class="card"><div class="card-body"><h6 class="fw-bold mb-1">In attesa</h6><div id="dash-pending" class="display-6">-</div></div></div></div>
        <div class="col-md-3"><div class="card"><div class="card-body"><h6 class="fw-bold mb-1">Veicoli in manutenzione</h6><div id="dash-maint" class="display-6">-</div></div></div></div>
        <div class="col-md-3"><div class="card"><div class="card-body"><h6 class="fw-bold mb-1">Occupazione (7gg)</h6><div id="dash-occup" class="display-6">-</div></div></div></div>
      </div>
      <div class="card mb-3"><div class="card-body"><h6 class="fw-bold mb-2">Prossime prenotazioni</h6><div id="dash-next-list" class="small text-muted">(caricamento…)</div></div></div>
      `;
      ensureSectionRoot(html);
      const pren = await window.adminStore.loadPrenotazioni();
      const vei = await window.adminStore.loadVeicoli();
      const today = new Date(); const in7 = new Date(today.getTime()+7*24*60*60*1000);
      const toDate = (s) => { try{ const d = new Date(s); return isNaN(d)?null:d; }catch(_){ return null; } };
      const upcoming = (pren||[]).filter(p => { const d = toDate(p.giornoInizio || p.giornoInizioFormatted); return d && d>=today && d<=in7; });
      const pending = (pren||[]).filter(p => /attesa|confermata/i.test(String(p.stato||''))).length;
      const maint = (vei||[]).filter(v => v.InManutenzioneOggi).length;
      const totalV = (vei||[]).length || 1; const occTarghe = new Set(upcoming.map(p => String(p.targa||''))).size; const occupPerc = Math.round((occTarghe/totalV)*100);
      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
      setText('dash-upcoming', upcoming.length);
      setText('dash-pending', pending);
      setText('dash-maint', maint);
      setText('dash-occup', `${occupPerc}%`);
      const nextList = document.getElementById('dash-next-list');
      if (nextList){
        const fmt = (d) => window.formatDateIT?.(d)||d;
        const esc = (s) => window.escapeHtml ? escapeHtml(String(s||'')) : String(s||'');
        const items = upcoming.slice(0,5).map(p => {
          const cliente = p.cliente || p.nomeAutista1 || p.nomeAutista2 || p.nomeAutista3 || p.nome1 || (p.autista1 && p.autista1.nomeCompleto) || '';
          const targa = esc(p.targa||'');
          const dest = esc(p.destinazione||'');
          const oi = String(p.oraInizio||'').trim();
          return `<a href="#" class="next-link d-block mb-1" data-id="${String(p.id||p.ID||'')}"><i class="fas fa-calendar-day me-1"></i>${fmt(p.giornoInizio || p.giornoInizioFormatted)}${oi?(' '+oi):''} — <span class="text-white">${targa}</span> <span class="text-muted">${cliente?('• '+esc(cliente)):''}</span> <span class="text-muted">→ ${dest}</span></a>`;
        }).join('');
        nextList.innerHTML = items || '(nessuna)';
        nextList.querySelectorAll('.next-link').forEach(el => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            const id = el.getAttribute('data-id');
            window.prenFilters = { id };
            loadAdminSection('prenotazioni');
          });
        });
      }
      return;
    }
    if (sec === 'prenotazioni'){ await window.loadPrenotazioniSection?.(); return; }
    if (sec === 'legacy'){
      const html = `<div class="alert alert-warning"><i class="fas fa-hourglass-half me-2"></i>Sezione Legacy in aggiornamento</div>`;
      ensureSectionRoot(html);
      return;
    }
    if (sec === 'clienti'){
      const html = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="h5 fw-bold mb-1">Clienti</h2><p class="text-muted mb-0">Elenco clienti</p></div><div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" id="clienti-refresh"><i class="fas fa-sync-alt me-1"></i>Ricarica</button></div></div><div class="card"><div class="card-body"><div class="table-responsive"><table class="table table-dark table-hover align-middle"><thead id="clienti-thead"></thead><tbody id="clienti-tbody"></tbody></table></div></div></div>`;
      ensureSectionRoot(html);
      const data = await window.adminStore.loadClienti();
      window.renderClienti?.(data);
      document.getElementById('clienti-refresh')?.addEventListener('click', async ()=>{ const d = await window.adminStore.loadClienti(); window.renderClienti?.(d); });
      return;
    }
    if (sec === 'flotta'){
      const html = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="h5 fw-bold mb-1">Flotta</h2><p class="text-muted mb-0">Veicoli in flotta</p></div><div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" id="btn-reload-flotta"><i class="fas fa-sync-alt me-1"></i>Ricarica</button></div></div><div class="card"><div class="card-body"><div class="table-responsive"><table class="table table-dark table-hover align-middle"><thead><tr><th onclick="setFlottaSort('targa')">Targa</th><th onclick="setFlottaSort('mm')">Marca/Modello</th><th onclick="setFlottaSort('posti')">Posti</th><th onclick="setFlottaSort('stato')">Stato</th><th onclick="setFlottaSort('man')">Manutenzione</th><th class="text-end">Azioni</th></tr></thead><tbody id="flotta-tbody"></tbody></table></div></div></div><div class="mt-3"><h6 class="fw-bold">Disponibilità immediata</h6><div id="admin-vehicles-count" class="small text-muted mb-2"></div><div id="admin-vehicles-grid" class="row g-3"></div></div>`;
      ensureSectionRoot(html);
      const flotta = await window.adminStore.loadVeicoli();
      window.renderFlottaTable?.(flotta);
      const targheDisponibili = (flotta||[]).filter(v => !v.InManutenzioneOggi).map(v => v.Targa);
      window.renderAdminVehicles?.(flotta||[], targheDisponibili);
      document.getElementById('btn-reload-flotta')?.addEventListener('click', async ()=>{ const f = await window.adminStore.loadVeicoli(); window.renderFlottaTable?.(f); const t = (f||[]).filter(v => !v.InManutenzioneOggi).map(v => v.Targa); window.renderAdminVehicles?.(f||[], t); });
      return;
    }
    if (sec === 'statistiche'){
      const html = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="h5 fw-bold mb-1">Statistiche</h2><p class="text-muted mb-0">Panoramica sintetica</p></div><div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" id="stats-refresh"><i class="fas fa-sync-alt me-1"></i>Ricarica</button></div></div><div class="row g-3"><div class="col-md-4"><div class="card"><div class="card-body"><h6 class="fw-bold">Prenotazioni</h6><div id="stat-pren" class="display-6">-</div></div></div></div><div class="col-md-4"><div class="card"><div class="card-body"><h6 class="fw-bold">Clienti</h6><div id="stat-cli" class="display-6">-</div></div></div></div><div class="col-md-4"><div class="card"><div class="card-body"><h6 class="fw-bold">Veicoli</h6><div id="stat-vei" class="display-6">-</div></div></div></div></div><div class="card mt-3"><div class="card-body"><h6 class="fw-bold mb-2">Filtri rapidi stato prenotazioni</h6><div id="stat-filters" class="d-flex flex-wrap gap-2"></div></div></div>`;
      ensureSectionRoot(html);
      const pren = await window.adminStore.loadPrenotazioni();
      const cli = await window.adminStore.loadClienti();
      const vei = await window.adminStore.loadVeicoli();
      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(Array.isArray(v)?v.length:v||0); };
      setText('stat-pren', pren);
      setText('stat-cli', cli);
      setText('stat-vei', vei);
      const filtersBox = document.getElementById('stat-filters');
      if (filtersBox){
        const statuses = Array.from(new Set((pren||[]).map(p => String(p.stato||'').trim()).filter(s => s.length))).sort();
        const makeBtn = (label, value) => `<button class="btn btn-sm ${value?'btn-outline-primary':'btn-outline-secondary'}" data-stato="${value||''}">${label}</button>`;
        filtersBox.innerHTML = [makeBtn('Tutte','')].concat(statuses.map(s => makeBtn(s, s))).join('');
        filtersBox.querySelectorAll('button[data-stato]').forEach(btn => {
          btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-stato');
            if (v){ window.prenFilters = { stato: v }; }
            else { window.prenFilters = null; }
            loadAdminSection('prenotazioni');
          });
        });
      }
      document.getElementById('stats-refresh')?.addEventListener('click', async ()=>{ const p=await window.adminStore.loadPrenotazioni(); const c=await window.adminStore.loadClienti(); const v=await window.adminStore.loadVeicoli(); setText('stat-pren', p); setText('stat-cli', c); setText('stat-vei', v); });
      return;
    }
    if (sec === 'settings'){
      const html = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="h5 fw-bold mb-1">Impostazioni</h2><p class="text-muted mb-0">Proprietà backend (Script Properties)</p></div></div><div class="card"><div class="card-body"><form id="settings-form" class="row g-3"><div class="col-md-6"><label class="form-label">Telegram Bot Token</label><input type="text" class="form-control-modern" name="TELEGRAM_BOT_TOKEN"></div><div class="col-md-6"><label class="form-label">Telegram Chat ID</label><input type="text" class="form-control-modern" name="TELEGRAM_CHAT_ID"></div><div class="col-md-6"><label class="form-label">Email mittente</label><input type="email" class="form-control-modern" name="EMAIL_FROM_EMAIL"></div><div class="col-md-6"><label class="form-label">Nome mittente</label><input type="text" class="form-control-modern" name="EMAIL_FROM_NAME" value="Imbriani Stefano Noleggio"></div><div class="col-md-6"><label class="form-label">Session TTL (min)</label><input type="number" class="form-control-modern" name="SESSION_TTL_MINUTES" value="120"></div><div class="col-md-12"><button type="submit" class="btn btn-primary"><i class="fas fa-save me-1"></i>Salva</button> <button type="button" id="btn-config-status" class="btn btn-outline-secondary ms-2"><i class="fas fa-info-circle me-1"></i>Stato Config</button></div></form><div id="config-status" class="small text-muted mt-3"></div></div></div>`;
      ensureSectionRoot(html);
      const form = document.getElementById('settings-form');
      form?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(form);
        const payload = {};
        for (const [k,v] of fd.entries()) { payload[k] = String(v||''); }
        showLoader(true, 'Salvataggio impostazioni…');
        const res = await window.adminApi.callAPI('setConfigProps', payload);
        showLoader(false);
        if (res && res.success){ window.showToast?.('Impostazioni salvate','success'); }
        else { window.showToast?.('Salvataggio fallito','danger'); }
      });
      document.getElementById('btn-config-status')?.addEventListener('click', async ()=>{
        const st = await window.adminApi.callAPI('configStatus', {});
        const el = document.getElementById('config-status');
        el.innerHTML = st && st.success ? JSON.stringify(st.status, null, 2) : 'Errore lettura stato';
      });
      return;
    }
    // Dashboard default: mostra riepilogo flotta+prenotazioni sintetico
    await window.loadPrenotazioniSection?.();
  } finally { showLoader(false); }
}

window.showLoader = showLoader;
window.showAdminGate = showAdminGate;
window.hasAdminSessionPresent = hasAdminSessionPresent;
window.loadAdminSection = loadAdminSection;

document.addEventListener('DOMContentLoaded', async () => {
  bindAdminGate();
  try { window.initAdminUIBindings?.(); } catch(_){}
  await checkAdminSession();
  if (hasAdminSessionPresent()) { loadAdminSection('dashboard'); }
  document.getElementById('refresh-all')?.addEventListener('click', ()=> loadAdminSection(__currentSection));
});

export {};
