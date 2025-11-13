import { arrow } from './admin-validation.js';

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

export { setLegacySort, setFlottaSort, setClientiSort, setDashBookingSort, setDashLicenseSort };

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
export { initAdminUIBindings };

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
export { showICSImportModal, showCSVImportModal };
