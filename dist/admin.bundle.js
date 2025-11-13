// admin-validation.js
function parseDateAnySafe(val){
  if(!val) return null;
  if(val instanceof Date && !isNaN(val.getTime())) return val;
  if(typeof window.parseDateAny === 'function'){
    const d = window.parseDateAny(val); return (d && !isNaN(d.getTime())) ? d : null;
  }
  const d2 = new Date(val); return isNaN(d2.getTime()) ? null : d2;
}

function cmpStr(a,b){
  const sa = String(a||'').toLowerCase(); const sb = String(b||'').toLowerCase();
  if(sa < sb) return -1; if(sa > sb) return 1; return 0;
}

function cmpNum(a,b){
  const na = Number(a)||0; const nb = Number(b)||0; return na - nb;
}

function cmpDate(a,b){
  const da = parseDateAnySafe(a); const db = parseDateAnySafe(b);
  const ta = da ? da.getTime() : 0; const tb = db ? db.getTime() : 0; return ta - tb;
}

function arrow(dir){ return dir==='asc' ? '▲' : '▼'; }

window.adminValidation = { parseDateAnySafe, cmpStr, cmpNum, cmpDate, arrow };

const POST_ACTIONS = new Set([
  'setManutenzione','setVeicolo','eliminaVeicolo','creaPrenotazione','aggiornaPrenotazione','aggiornaPrenotazioneCompleta','eliminaPrenotazione','aggiornaStato','confermaPrenotazione','aggiornaCliente','creaCliente','importaPrenotazioniICS','importaPrenotazioniCSV','aggiornaStatoPrenotazione','setConfigProps',
  // Sessione/admin
  'requestAdminOTP','adminLogin','devLogin','revokeSession'
]);

async function callAPI(action, params={}){
  const isWrite = POST_ACTIONS.has(action);
  try {
    if (isWrite) {
      if (typeof window.securePost === 'function') {
        const result = await window.securePost(action, params);
        return result;
      }
      if (typeof window.api?.call === 'function') {
        const result = await window.api.call({ action, ...params });
        return result;
      }
      return { success:false, message:'securePost missing' };
    } else {
      if (typeof window.secureGet === 'function') {
        const result = await window.secureGet(action, params);
        return result;
      }
      if (typeof window.api?.call === 'function') {
        const result = await window.api.call({ action, ...params });
        return result;
      }
      return { success:false, message:'secureGet missing' };
    }
  } catch (err) {
    return { success:false, message: String(err && err.message || err) };
  }
}

window.adminApi = { callAPI, POST_ACTIONS };
window.callAPI = callAPI;

function createStore(name, initial){
  let state = initial;
  const subs = new Set();
  const get = () => state;
  const set = (next) => { state = next; subs.forEach(fn => { try{ fn(state); }catch(_){} }); try{ window.dispatchEvent(new CustomEvent('store:'+name+':update', { detail: state })); }catch(_){} };
  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  return { get, set, subscribe };
}
async function loadWith(action, params){
  if (window.adminApi && typeof window.adminApi.callAPI === 'function'){
    const res = await window.adminApi.callAPI(action, params||{});
    return res && res.success ? (res.data||res.rows||res.prenotazioni||[]) : [];
  }
  return [];
}
const adminStore = {
  prenotazioni: createStore('prenotazioni', []),
  veicoli: createStore('veicoli', []),
  clienti: createStore('clienti', []),
  async loadPrenotazioni(){ const data = await loadWith('getPrenotazioni', {}); adminStore.prenotazioni.set(Array.isArray(data)?data:[]); return adminStore.prenotazioni.get(); },
  async loadVeicoli(){ const data = await loadWith('getVeicoli', {}); adminStore.veicoli.set(Array.isArray(data)?data:[]); return adminStore.veicoli.get(); },
  async loadClienti(){ const data = await loadWith('getSheet', { name:'CLIENTI' }); adminStore.clienti.set(Array.isArray(data)?data:[]); return adminStore.clienti.get(); }
};
const events = {
  on(ev, fn){ window.addEventListener(ev, fn); },
  off(ev, fn){ window.removeEventListener(ev, fn); },
  emit(ev, detail){ try{ window.dispatchEvent(new CustomEvent(ev, { detail })); }catch(_){} }
};
window.adminStore = adminStore;
window.events = events;

function qs(id){ return document.getElementById(id); }
const escapeHtml = (s) => (typeof window.escapeHtml === 'function') ? window.escapeHtml(s) : String(s||'');
const parseDateFlexible = (val) => (typeof window.parseDateAny === 'function') ? window.parseDateAny(val) : null;
function findKey(headers, pattern){ const rx = new RegExp(pattern, 'i'); return headers.find(h => rx.test(h)) || null; }
function matchesSearch(c, term){ if(!term) return true; term = term.toLowerCase(); const keys = window._clientiHeaders || Object.keys(c); return keys.some(k => String(c[k]||'').toLowerCase().includes(term)); }
function withinExpiryFilter(c, months){ if(!months) return true; const headers = window._clientiHeaders || Object.keys(c); const expKey = window._clientiExpiryKey || (window._clientiExpiryKey = findKey(headers, 'SCADENZA.*PATENTE|SCADENZA')); if(!expKey) return true; const raw = c[expKey] ?? c[expKey+'Formatted']; const d = parseDateFlexible(raw); if(!d || isNaN(d.getTime())) return false; const limit = new Date(); limit.setMonth(limit.getMonth() + parseInt(months,10)); return d <= limit; }
function renderClienti(data){ const tbody = qs('clienti-tbody'); const thead = qs('clienti-thead'); if(!tbody || !thead) return; const term = qs('clienti-search')?.value?.trim()||''; const months = qs('clienti-filter-scadenza')?.value||''; const rawHeaders = (data && data.length) ? Object.keys(data[0]) : (window._clientiHeaders||[]); const headers = (window._clientiHeaders = rawHeaders.filter(h => !/formatted$/i.test(h))); thead.innerHTML = headers.map(h => `<th style="cursor:pointer" data-key="${escapeHtml(h)}">${escapeHtml(h)} ${window._clientiSort?.key===h ? (window.adminValidation?.arrow?.(window._clientiSort.dir) || '') : ''}</th>`).join('') + '<th class="text-end">Azioni</th>'; const cfKey = window._clientiCFKey || (window._clientiCFKey = findKey(headers, 'CODICE.*FISCALE|CF')); let rowsData = (data||[]).filter(c => headers.some(h => String(c[h]||'').trim() !== '')) .filter(c => matchesSearch(c, term)) .filter(c => withinExpiryFilter(c, months)); if(window._clientiSort && window._clientiSort.key){ const key = window._clientiSort.key; const dir = window._clientiSort.dir==='asc'?1:-1; const cmpDate = window.adminValidation?.cmpDate || (()=>0); const cmpNum = window.adminValidation?.cmpNum || (()=>0); const cmpStr = window.adminValidation?.cmpStr || (()=>0); rowsData = rowsData.sort((a,b) => { const av = a[key+'Formatted'] ?? a[key]; const bv = b[key+'Formatted'] ?? b[key]; const dcmp = cmpDate(av,bv); if(dcmp !== 0) return dcmp * dir; const ncmp = cmpNum(av,bv); if(ncmp !== 0) return ncmp * dir; return cmpStr(av,bv) * dir; }); }
 tbody.innerHTML = ''; if (!rowsData.length) { tbody.innerHTML = `<tr><td colspan="${headers.length+1}" class="text-center text-muted">Nessun cliente</td></tr>`; } else { const chunkSize = 200; let index = 0; const renderChunk = () => { const frag = document.createDocumentFragment(); for (let i = 0; i < chunkSize && index < rowsData.length; i++, index++) { const c = rowsData[index]; const tr = document.createElement('tr'); let html = ''; for (let h of headers) { const fmtKey = h + 'Formatted'; const value = c[fmtKey] ?? c[h]; const asDate = parseDateFlexible(value); const display = asDate ? (window.formatDateIT?.(asDate) || '') : (value ?? ''); html += `<td>${escapeHtml(display)}</td>`; } const cf = cfKey ? String(c[cfKey]||'') : ''; html += `<td class="text-end"><button class="btn btn-sm btn-outline-light" data-action="edit" data-cf="${escapeHtml(cf)}"><i class="fas fa-edit me-1"></i>Modifica</button></td>`; tr.innerHTML = html; frag.appendChild(tr); } tbody.appendChild(frag); if (index < rowsData.length) { requestAnimationFrame(renderChunk); } else { tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => window.openClienteModal?.(btn.dataset.cf))); } }; requestAnimationFrame(renderChunk); }
 thead.querySelectorAll('th[data-key]').forEach(th => { th.addEventListener('click', () => window.setClientiSort?.(th.dataset.key)); }); }
function renderFlottaTable(flotta){ const tb = document.getElementById('flotta-tbody'); if(!tb) return; if(!flotta?.length){ tb.innerHTML = `<tr><td colspan="6" class="text-center py-4">Nessun veicolo in flotta</td></tr>`; return; } const flottaSort = window.flottaSort || { key:'targa', dir:'asc' }; const cmpStr = window.adminValidation?.cmpStr || (()=>0); const cmpNum = window.adminValidation?.cmpNum || (()=>0); const dir = flottaSort.dir==='asc'?1:-1; const sorted = [...flotta].sort((a,b) => { let cmp = 0; switch(flottaSort.key){ case 'targa': cmp = cmpStr(a.Targa, b.Targa); break; case 'mm': cmp = cmpStr(`${a.Marca||''} ${a.Modello||''}`, `${b.Marca||''} ${b.Modello||''}`); break; case 'posti': cmp = cmpNum(a.Posti, b.Posti); break; case 'stato': { const sa = a.InManutenzioneOggi ? 'In manutenzione' : 'Disponibile'; const sb = b.InManutenzioneOggi ? 'In manutenzione' : 'Disponibile'; cmp = cmpStr(sa, sb); break; } case 'man': cmp = cmpStr(a.StatoManutenzione, b.StatoManutenzione); break; default: cmp = cmpStr(a.Targa, b.Targa); } return cmp * dir; }); tb.innerHTML = sorted.map(v => { const statoBadge = v.InManutenzioneOggi ? '<span class="pill-action pill-danger">Manutenzione attiva</span>' : '<span class="pill-action pill-success">Disponibile</span>'; const manInfo = v.StatoManutenzione && v.StatoManutenzione !== '-' ? `<span class="chip chip-muted"><i class="fas fa-tools me-1"></i>${v.StatoManutenzione}</span>` : `<span class="text-muted small">—</span>`; return `<tr>
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
        </tr>`; }).join(''); tb.querySelectorAll('button[data-action]').forEach(btn => { const act = btn.getAttribute('data-action'); const targa = btn.getAttribute('data-targa'); if(act==='modifica') btn.addEventListener('click',()=> window.openVehicleModal?.(targa)); if(act==='elimina') btn.addEventListener('click',()=> window.deleteVehicle?.(targa)); if(act==='manutenzioni') btn.addEventListener('click',()=> window.openMaintenanceModal?.(targa)); }); }
function renderAdminVehicles(flotta, availableTags){ const grid = qs('admin-vehicles-grid'); if(!grid) return; const availableSet = new Set(availableTags); const available = flotta.filter(v => availableSet.has(v.Targa)); if(available.length === 0) { grid.innerHTML = '<div class="text-center text-muted p-3">Nessun veicolo disponibile</div>'; return; } grid.innerHTML = available.map(v => { const badges = ['<span class="badge bg-success">Disponibile</span>']; const passoLungo = v.PassoLungo || v.Targa === 'EC787NM'; if(passoLungo) badges.push('<span class="badge bg-warning">Passo Lungo</span>'); return `<div class="mb-3 p-3 border rounded"><div class="d-flex justify-content-between align-items-start mb-2">
          <div><h6 class="fw-bold mb-1">${escapeHtml(String(v.Marca||''))} ${escapeHtml(String(v.Modello||''))}</h6><div class="small text-muted">Targa: ${escapeHtml(String(v.Targa||''))} | ${escapeHtml(String(v.Posti||''))} posti</div></div>
          <div class="d-flex flex-wrap gap-1">${badges.join('')}</div></div>
        <button class="btn btn-sm btn-primary admin-vehicle-select" data-targa="${escapeHtml(String(v.Targa||''))}" data-vehicle='${encodeURIComponent(JSON.stringify(v))}'>
          <i class="fas fa-check me-1"></i>Seleziona per prenotazione</button></div>`; }).join(''); const countEl = qs('admin-vehicles-count'); if(countEl) countEl.textContent = `${available.length} disponibili su ${flotta.length} totali`; grid.querySelectorAll('.admin-vehicle-select').forEach(btn=>{ btn.addEventListener('click', (ev)=>{ try{ window.adminSelectedVehicle = JSON.parse(decodeURIComponent(ev.currentTarget.dataset.vehicle)); window.showAdminQuoteStep?.(); }catch(e){ window.adminSelectedVehicle=null; } }); }); }
const adminRenderer = { renderClienti, renderFlottaTable, renderAdminVehicles };
window.adminRenderer = adminRenderer;
window.renderClienti = renderClienti;

function setLegacySort(key){
  const legacySort = window.legacySort || { key:'di', dir:'desc' };
  if(legacySort.key === key){ legacySort.dir = legacySort.dir === 'asc' ? 'desc' : 'asc'; }
  else { legacySort.key = key; legacySort.dir = (key==='di' || key==='df') ? 'desc' : 'asc'; }
  window.legacySort = legacySort;
  try{ localStorage.setItem('imbriani_sort_legacy', JSON.stringify(legacySort)); }catch(_){ }
  if(typeof window.loadLegacy === 'function'){ window.loadLegacy(); }
}

function setFlottaSort(key){
  const flottaSort = window.flottaSort || { key:'targa', dir:'asc' };
  if(flottaSort.key === key){ flottaSort.dir = flottaSort.dir === 'asc' ? 'desc' : 'asc'; }
  else { flottaSort.key = key; flottaSort.dir = (key==='posti') ? 'desc' : 'asc'; }
  window.flottaSort = flottaSort;
  try{ localStorage.setItem('imbriani_sort_flotta', JSON.stringify(flottaSort)); }catch(_){ }
  const btn = document.getElementById('btn-reload-flotta'); btn?.click();
}

function setClientiSort(key){
  const s = window._clientiSort || { key:null, dir:'asc' };
  if(s.key === key){ s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
  else { s.key = key; s.dir = 'asc'; }
  window._clientiSort = s;
  try{ localStorage.setItem('imbriani_sort_clienti', JSON.stringify(s)); }catch(_){ }
  if(typeof window.renderClienti === 'function'){ window.renderClienti(window._clientiData||[]); }
}

function setDashBookingSort(key){
  const s = window.dashBookingSort || { key:'data', dir:'asc' };
  if(s.key === key){ s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
  else { s.key = key; s.dir = 'asc'; }
  window.dashBookingSort = s;
  try{ localStorage.setItem('imbriani_sort_dash_bookings', JSON.stringify(s)); }catch(_){ }
  if(typeof window.loadDashboard === 'function'){ window.loadDashboard(); }
}

function setDashLicenseSort(key){
  const s = window.dashLicenseSort || { key:'scadenza', dir:'asc' };
  if(s.key === key){ s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
  else { s.key = key; s.dir = 'asc'; }
  window.dashLicenseSort = s;
  try{ localStorage.setItem('imbriani_sort_dash_licenses', JSON.stringify(s)); }catch(_){ }
  if(typeof window.loadDashboard === 'function'){ window.loadDashboard(); }
}

window.setLegacySort = setLegacySort;
window.setFlottaSort = setFlottaSort;
window.setClientiSort = setClientiSort;
window.setDashBookingSort = setDashBookingSort;
window.setDashLicenseSort = setDashLicenseSort;

function initAdminUIBindings(){
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    if (window.innerWidth < 992){
      sidebar.classList.toggle('show');
    } else {
      const collapsed = sidebar.classList.toggle('collapsed');
      main.classList.toggle('collapsed', collapsed);
      try{ localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0'); }catch(_){}
    }
  });
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const titles = { dashboard:'Dashboard', prenotazioni:'Gestione Prenotazioni', legacy:'Prenotazioni Legacy', clienti:'Gestione Clienti', flotta:'Gestione Flotta', statistiche:'Statistiche', settings:'Impostazioni' };
      const titleEl = document.getElementById('page-title'); if (titleEl) titleEl.textContent = titles[link.dataset.section] || 'Dashboard';
      const hasSession = typeof window.hasAdminSessionPresent === 'function' ? window.hasAdminSessionPresent() : true;
      if (typeof window.loadAdminSection === 'function' && hasSession){ window.loadAdminSection(link.dataset.section); }
      else { window.showToast?.('Effettua il login admin per accedere','warning'); window.showAdminGate?.(true); }
      if (window.innerWidth < 992){ document.getElementById('sidebar')?.classList.remove('show'); }
    });
  });
}

window.initAdminUIBindings = initAdminUIBindings;

async function showICSImportModal(veicoliList){
  try{
    let veicoli = Array.isArray(veicoliList) ? veicoliList : [];
    if (!veicoli.length) {
      const vResp = await window.adminApi.callAPI('getVeicoli');
      veicoli = vResp?.success ? (vResp.data||[]) : [];
    }
    const targhe = veicoli.map(v => v.Targa || v.targa).filter(Boolean);
    const modalId = 'icsImportModal';
    if (!document.getElementById(modalId)){
      const optionsTarghe = ['<option value="">(deduci da evento)</option>'].concat(targhe.map(t => `<option value="${window.escapeHtml(t)}">${window.escapeHtml(t)}</option>`)).join('');
      const html = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
          <div class="modal-dialog modal-lg"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title"><i class="fas fa-file-import me-2"></i>Importa prenotazioni da iCal (ICS)</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body"><div class="row g-3 admin-form-grid">
              <div class="admin-form-group" style="grid-column: span 2;"><label class="form-label">URL ICS (opzionale)</label><input type="url" id="ics-url" class="form-control-modern" placeholder="https://…/calendar.ics"><div class="form-text">Se presente, verrà usato al posto del testo incollato.</div></div>
              <div class="admin-form-group" style="grid-column: span 2;"><label class="form-label">Testo ICS (incolla qui)</label><textarea id="ics-text" rows="6" class="form-control-modern" placeholder="BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20250115T090000Z\nDTEND:20250115T170000Z\nSUMMARY:DN391FW — Cliente Rossi\nLOCATION:Roma\nEND:VEVENT\nEND:VCALENDAR"></textarea></div>
              <div class="admin-form-group"><label class="form-label">Targa di default</label><select id="ics-targa" class="form-select">${optionsTarghe}</select><div class="form-text">Se non trovata nel testo evento, userò questa.</div></div>
              <div class="admin-form-group"><label class="form-label">Ora inizio default</label><input type="time" id="ics-ora-inizio" class="form-control-modern" value="08:00"></div>
              <div class="admin-form-group"><label class="form-label">Ora fine default</label><input type="time" id="ics-ora-fine" class="form-control-modern" value="22:00"></div>
            </div></div>
            <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button><button class="btn btn-primary" id="ics-import-go"><i class="fas fa-file-import me-2"></i>Importa</button></div>
          </div></div>
        </div>`;
      const wrapper = document.createElement('div'); wrapper.innerHTML = html; document.body.appendChild(wrapper);
    }
    const modalEl = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalEl); modal.show();
    document.getElementById('ics-import-go').onclick = async () => {
      const payload = {
        icsUrl: document.getElementById('ics-url')?.value?.trim() || '',
        icsText: document.getElementById('ics-text')?.value?.trim() || '',
        defaultTarga: document.getElementById('ics-targa')?.value || '',
        defaultOraInizio: document.getElementById('ics-ora-inizio')?.value || '08:00',
        defaultOraFine: document.getElementById('ics-ora-fine')?.value || '22:00'
      };
      if (!payload.icsUrl && !payload.icsText){ window.showToast?.('Inserisci URL o testo ICS', 'warning'); return; }
      try{
        window.showLoader?.(true, 'Importo prenotazioni ICS…');
        const resp = await window.adminApi.callAPI('importaPrenotazioniICS', payload);
        window.showLoader?.(false);
        if (resp?.success){ window.showToast?.(`✅ Import completato — creati ${resp.created}, duplicati ${resp.duplicates}`, 'success'); modal.hide(); if (typeof window.loadDashboard === 'function') window.loadDashboard(); }
        else { window.showToast?.(`❌ Import fallito: ${resp?.message||'errore'}`, 'danger'); }
      } catch(err){ window.showLoader?.(false); window.showToast?.('Errore import ICS', 'danger'); }
    };
  } catch(e){ window.showToast?.('Errore apertura modale ICS', 'danger'); }
}

function showCSVImportModal(){
  const modalId = 'csvImportModal';
  if (!document.getElementById(modalId)){
    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title"><i class="fas fa-table me-2"></i>Importa prenotazioni da Excel/CSV</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><div class="row g-3 admin-form-grid">
          <div class="admin-form-group" style="grid-column: span 2;"><label class="form-label">Carica file CSV</label><input type="file" id="csv-file" class="form-control-modern" accept=".csv,text/csv"><div class="form-text">Suggerito separatore ";". In alternativa incolla il contenuto sotto.</div></div>
          <div class="admin-form-group" style="grid-column: span 2;"><label class="form-label">Oppure incolla CSV</label><textarea id="csv-text" rows="6" class="form-control-modern" placeholder="targa;data_inizio;ora_inizio;data_fine;ora_fine;destinazione;cliente"></textarea></div>
          <div class="admin-form-group"><label class="form-label">Anteprima righe</label><div id="csv-preview" class="small text-muted">(nessuna)</div></div>
        </div></div>
        <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button><button class="btn btn-warning" id="csv-import-go"><i class="fas fa-upload me-2"></i>Importa</button></div>
      </div></div></div>`;
    const wrapper = document.createElement('div'); wrapper.innerHTML = html; document.body.appendChild(wrapper);
  }
  const modalEl = document.getElementById(modalId); const modal = new bootstrap.Modal(modalEl); modal.show();
  const parseCSV = (text) => { if (!text) return { headers: [], rows: [] }; const raw = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l => l.trim().length); if (!raw.length) return { headers: [], rows: [] }; const delim = raw[0].indexOf(';')>=0 ? ';' : ','; const headers = raw[0].split(delim).map(h => h.trim()); const rows = raw.slice(1).map(line => line.split(delim).map(c => c.trim())); return { headers, rows }; };
  const mapRow = (headers, values) => { const H = headers.map(h => h.toLowerCase()); const idx = (names) => { for (let n of names){ const i = H.findIndex(h => h.includes(n)); if (i>=0) return i; } return -1; }; const idTarga = idx(['targa','plate','veicolo']); const idGI = idx(['startdate','giorno_inizio','data_inizio','inizio','start','dal','data']); const idGF = idx(['enddate','giorno_fine','data_fine','fine','end','al']); const idOI = idx(['starttime','ora_inizio','orario_inizio','from','inizio']); const idOF = idx(['endtime','ora_fine','orario_fine','to','fine']); const idDest = idx(['location','destinazione','luogo','meta']); const idCli = idx(['title','cliente','autista','nome']); return { targa: idTarga>=0 ? values[idTarga] : '', giornoInizio: idGI>=0 ? values[idGI] : '', giornoFine: idGF>=0 ? values[idGF] : values[idGI], oraInizio: idOI>=0 ? values[idOI] : '', oraFine: idOF>=0 ? values[idOF] : '', destinazione: idDest>=0 ? values[idDest] : '', nomeAutista: idCli>=0 ? values[idCli] : '' }; };
  const previewEl = document.getElementById('csv-preview');
  const updatePreview = (parsed) => { const { headers, rows } = parsed; if (!rows.length){ previewEl.textContent = '(nessuna riga)'; return; } const sample = rows.slice(0,5).map(r => JSON.stringify(mapRow(headers, r))).join('\n'); previewEl.textContent = sample; };
  document.getElementById('csv-file')?.addEventListener('change', (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const parsed = parseCSV(reader.result); updatePreview(parsed); modalEl.dataset.csvParsed = JSON.stringify(parsed); }; reader.readAsText(file); });
  document.getElementById('csv-text')?.addEventListener('input', (e) => { const parsed = parseCSV(e.target.value); updatePreview(parsed); modalEl.dataset.csvParsed = JSON.stringify(parsed); });
  document.getElementById('csv-import-go').onclick = async () => { try { const parsed = modalEl.dataset.csvParsed ? JSON.parse(modalEl.dataset.csvParsed) : { headers:[], rows:[] }; const rows = parsed.rows.map(r => mapRow(parsed.headers, r)).filter(x => x.targa && x.giornoInizio); if (!rows.length){ window.showToast?.('CSV vuoto o colonne non riconosciute', 'warning'); return; } window.showLoader?.(true, 'Importo prenotazioni CSV…'); const resp = await window.adminApi.callAPI('importaPrenotazioniCSV', { rows }); window.showLoader?.(false); if (resp?.success){ window.showToast?.(`✅ Import CSV completato — creati ${resp.created}, duplicati ${resp.duplicates}, saltati ${resp.skipped}`, 'success'); modal.hide(); if (typeof window.loadDashboard === 'function') window.loadDashboard(); } else { window.showToast?.(`❌ Import CSV fallito: ${resp?.message||'errore'}`, 'danger'); } } catch(err){ window.showLoader?.(false); window.showToast?.('Errore import CSV', 'danger'); } };
}

window.showICSImportModal = showICSImportModal;
window.showCSVImportModal = showCSVImportModal;

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
        const esc = (s) => (window.escapeHtml ? window.escapeHtml(String(s||'')) : String(s||''));
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
