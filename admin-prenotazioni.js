;(function(){
  // HTML escaping function
  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }
  
  // Fallback: definisci callAPI se non presente
  if (!window.callAPI && window.adminApi && typeof window.adminApi.callAPI === 'function') {
    window.callAPI = window.adminApi.callAPI;
  }
  async function loadPrenotazioniSection(){
    const root = document.getElementById('admin-root');
    if (!root) return;
    if (window.showLoader) window.showLoader(true, 'Carico prenotazioni…');
    try{
      const apiFn = (typeof window.callAPI === 'function') ? window.callAPI : (window.adminApi && typeof window.adminApi.callAPI === 'function' ? window.adminApi.callAPI : null);
      let resp = await (apiFn ? apiFn('getPrenotazioni', { nocache:'1' }) : Promise.resolve({ success:false }));
      let arrAll = resp && resp.success ? (resp.data||resp.rows||resp.prenotazioni||[]) : [];
      let statuses = Array.from(new Set(arrAll.map(p => String(p.stato||'').trim()).filter(s => s.length))).sort();
      let targheAll = Array.from(new Set(arrAll.map(p => String(p.targa||'').trim()).filter(s => s.length))).sort();
      let arr = arrAll;
      const f = window.prenFilters || null;
      if (f && f.id) { arr = arr.filter(p => String(p.id||p.ID||'') === String(f.id)); }
      if (f && f.stato) { arr = arr.filter(p => String(p.stato||'').trim().toLowerCase() === String(f.stato||'').trim().toLowerCase()); }
      if (f && typeof f.term === 'string' && f.term.trim().length){
        const q = f.term.trim().toLowerCase();
        arr = arr.filter(p => {
          const cliente = (p.cliente || p.nomeAutista1 || p.nomeAutista2 || p.nomeAutista3 || p.nome1 || (p.autista1 && p.autista1.nomeCompleto) || '');
          const fields = [String(p.id||p.ID||''), String(p.targa||''), String(cliente||''), String(p.destinazione||''), String(p.stato||'')].map(s => s.toLowerCase());
          return fields.some(s => s.includes(q));
        });
      }
      const parseIT = (s) => { const m = String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return null; return new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10)); };
      const getStart = (p) => { const v = p.giornoInizio || p.giornoInizioFormatted || ''; return parseIT(v) || (v ? new Date(v) : null); };
      const getEnd = (p) => { const v = p.giornoFine || p.giornoFineFormatted || ''; return parseIT(v) || (v ? new Date(v) : null); };
      if (f && (f.dateStart || f.dateEnd)){
        const ds = f.dateStart ? parseIT(f.dateStart) : null;
        const de = f.dateEnd ? parseIT(f.dateEnd) : null;
        arr = arr.filter(p => { const s = getStart(p); const e = getEnd(p); if(!s || !e) return false; let ok=true; if (ds) ok = ok && (e >= ds); if (de) ok = ok && (s <= de); return ok; });
      }
      if (f && f.targa) { arr = arr.filter(p => String(p.targa||'').trim().toLowerCase() === String(f.targa||'').trim().toLowerCase()); }
      if (!arr || arr.length === 0) {
        const snap = apiFn ? await apiFn('search', { entity:'prenotazioni', q:'', limit:200, offset:0, nocache:'1' }) : { success:false };
        if (snap && snap.success) arr = snap.data || [];
      }
      if (!statuses.length && Array.isArray(arr) && arr.length) {
        statuses = Array.from(new Set(arr.map(p => String(p.stato||'').trim()).filter(s => s.length))).sort();
        targheAll = Array.from(new Set(arr.map(p => String(p.targa||'').trim()).filter(s => s.length))).sort();
      }
      const fmtIT = (d) => { const f = window.formatDateIT?.(d) || '-'; return f === '-' ? '' : f; };
      root.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="h5 fw-bold mb-1">Prenotazioni</h2>
          <p class="text-muted mb-0">Elenco prenotazioni correnti</p>
        </div>
        <div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" id="pren-refresh"><i class="fas fa-sync-alt me-1"></i>Ricarica</button></div>
      </div>
      <div class="card mb-3"><div class="card-body filter-bar">
        <div class="d-flex flex-wrap gap-2" id="pren-filters"></div>
        <div class="row g-2 mt-2 align-items-end">
          <div class="col-md-4"><label class="form-label">Da</label><input type="text" id="pren-date-start" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
          <div class="col-md-4"><label class="form-label">A</label><input type="text" id="pren-date-end" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
          <div class="col-md-4"><label class="form-label">Targa</label><select id="pren-targa" class="form-select"><option value="">Tutte</option>${targheAll.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div>
        </div>
        <div class="input-group mt-3" style="max-width: 520px;">
          <input type="text" id="pren-search" class="form-control-modern" placeholder="Cerca per ID, cliente, targa, destinazione">
          <button class="btn btn-primary btn-sm" id="pren-search-go"><i class="fas fa-search me-1"></i>Cerca</button>
          <button class="btn btn-outline-secondary btn-sm" id="pren-search-clear">Pulisci</button>
        </div>
      </div></div>
      <div class="card"><div class="card-body"><div class="table-responsive">
        <table class="table table-dark table-hover align-middle"><thead><tr>
          <th>ID</th><th>Cliente</th><th>Targa</th><th>Inizio</th><th>Fine</th><th>Stato</th><th class="text-end">Azioni</th>
        </tr></thead><tbody id="pren-tbody">
        ${arr.length ? arr.map(p => {
          const cliente = escapeHtml(p.cliente || p.nomeAutista1 || p.nomeAutista2 || p.nomeAutista3 || p.nome1 || (p.autista1 && p.autista1.nomeCompleto) || '-');
          const di = fmtIT(p.giornoInizio || p.giornoInizioFormatted);
          const df = fmtIT(p.giornoFine || p.giornoFineFormatted);
          const oi = escapeHtml(String(p.oraInizio||'').trim());
          const of = escapeHtml(String(p.oraFine||'').trim());
          const inizio = `${di}${oi ? ' ' + oi : ''}`;
          const fine = `${df}${of ? ' ' + of : ''}`;
          const stNorm = escapeHtml(String(p.stato||'-').trim().toLowerCase().replace(/\s+/g,' '));
          return `<tr>
            <td>${escapeHtml(String(p.id||p.ID||'-'))}</td>
            <td>${cliente}</td>
            <td>${escapeHtml(String(p.targa||'-'))}</td>
            <td>${inizio}</td>
            <td>${fine}</td>
            <td><span class="badge-status status-${stNorm.replace(' ','-')}">${escapeHtml(String(p.stato||'-'))}</span></td>
           <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1 btn-action" data-action="edit" data-id="${escapeHtml(String(p.idPrenotazione||p.id||p.ID||''))}" data-stato="${escapeHtml(String(p.stato||''))}" data-targa="${escapeHtml(String(p.targa||''))}" data-di="${escapeHtml(String(p.giornoInizio||p.giornoInizioFormatted||''))}" data-df="${escapeHtml(String(p.giornoFine||p.giornoFineFormatted||''))}" data-oi="${escapeHtml(String(p.oraInizio||''))}" data-of="${escapeHtml(String(p.oraFine||''))}" data-dest="${escapeHtml(String(p.destinazione||''))}" data-email="${escapeHtml(String(p.email||''))}" data-cell="${escapeHtml(String(p.cellulare||''))}" data-nome1="${escapeHtml(String(p.nomeAutista1||''))}" data-cf1="${escapeHtml(String(p.codiceFiscaleAutista1||''))}" data-nome2="${escapeHtml(String(p.nomeAutista2||''))}" data-cf2="${escapeHtml(String(p.codiceFiscaleAutista2||''))}" data-nome3="${escapeHtml(String(p.nomeAutista3||''))}" data-cf3="${escapeHtml(String(p.codiceFiscaleAutista3||''))}" data-importo="${escapeHtml(String(p.importoPreventivo||p.importo||''))}"
              data-nascita1="${escapeHtml(String(p.dataNascitaAutista1||''))}" data-luogo1="${escapeHtml(String(p.luogoNascitaAutista1||''))}" data-comune1="${escapeHtml(String(p.comuneResidenzaAutista1||''))}" data-via1="${escapeHtml(String(p.viaResidenzaAutista1||''))}" data-civico1="${escapeHtml(String(p.civicoResidenzaAutista1||''))}" data-patente1="${escapeHtml(String(p.numeroPatenteAutista1||''))}" data-patente-inizio1="${escapeHtml(String(p.dataInizioPatente||p.autista1?.dataInizioPatente||''))}" data-patente-scad1="${escapeHtml(String(p.scadenzaPatente||p.autista1?.scadenzaPatente||''))}"
              data-nascita2="${escapeHtml(String(p.dataNascitaAutista2||''))}" data-luogo2="${escapeHtml(String(p.luogoNascitaAutista2||''))}" data-comune2="${escapeHtml(String(p.comuneResidenzaAutista2||''))}" data-via2="${escapeHtml(String(p.viaResidenzaAutista2||''))}" data-civico2="${escapeHtml(String(p.civicoResidenzaAutista2||''))}" data-patente2="${escapeHtml(String(p.numeroPatenteAutista2||''))}" data-patente-inizio2="${escapeHtml(String(p.autista2?.dataInizioPatente||''))}" data-patente-scad2="${escapeHtml(String(p.autista2?.scadenzaPatente||''))}"
              data-nascita3="${escapeHtml(String(p.dataNascitaAutista3||''))}" data-luogo3="${escapeHtml(String(p.luogoNascitaAutista3||''))}" data-comune3="${escapeHtml(String(p.comuneResidenzaAutista3||''))}" data-via3="${escapeHtml(String(p.viaResidenzaAutista3||''))}" data-civico3="${escapeHtml(String(p.civicoResidenzaAutista3||''))}" data-patente3="${escapeHtml(String(p.numeroPatenteAutista3||''))}" data-patente-inizio3="${escapeHtml(String(p.autista3?.dataInizioPatente||''))}" data-patente-scad3="${escapeHtml(String(p.autista3?.scadenzaPatente||''))}"
              data-contratto="${escapeHtml(String(p.dataContratto||''))}" data-pdfurl="${escapeHtml(String(p.pdfUrl||p.pdfURL||''))}"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger me-1 btn-action" data-action="delete" data-id="${escapeHtml(String(p.idPrenotazione||p.id||p.ID||''))}"><i class="fas fa-trash"></i></button>
              <button class="btn btn-sm btn-outline-secondary btn-action" data-action="pdf" data-pdf="${escapeHtml(String(p.pdfUrl||p.pdfURL||''))}"><i class="fas fa-file-pdf"></i></button>
            </td>
           </tr>`;
        }).join('') : '<tr><td colspan="6" class="text-center text-muted py-4">Nessuna prenotazione</td></tr>'}
        </tbody></table>
      </div></div></div>`;
      const filtersBox = document.getElementById('pren-filters');
      if (filtersBox){
        const makeBtn = (label, value, active) => `<button class="btn btn-sm ${value?'btn-outline-primary':'btn-outline-secondary'} btn-filter ${active?'active':''}" data-stato="${escapeHtml(value||'')}">${escapeHtml(label)}</button>`;
        const fixed = ['In attesa','Completata','In corso','Legacy','Programmata'];
        const allStatuses = Array.from(new Set(['In attesa'].concat(fixed).concat(statuses)));
        const cur = (window.prenFilters && window.prenFilters.stato) ? String(window.prenFilters.stato).trim().toLowerCase() : '';
        const btns = [makeBtn('Tutte','', !cur)].concat(allStatuses.map(s => makeBtn(s, s, cur === s.trim().toLowerCase())));
        filtersBox.innerHTML = btns.join('');
        const updateActive = (target) => {
          filtersBox.querySelectorAll('button[data-stato]').forEach(b => b.classList.remove('active'));
          target.classList.add('active');
        };
        filtersBox.querySelectorAll('button[data-stato]').forEach(btn => {
          btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-stato');
            if (v){ window.prenFilters = { stato: v }; }
            else { window.prenFilters = null; }
            updateActive(btn);
            loadPrenotazioniSection();
          });
        });
      }
      const searchInput = document.getElementById('pren-search');
      const searchGo = document.getElementById('pren-search-go');
      const searchClear = document.getElementById('pren-search-clear');
      searchGo?.addEventListener('click', () => { const term = String(searchInput?.value||''); window.prenFilters = { ...(window.prenFilters||{}), term }; loadPrenotazioniSection(); });
      searchClear?.addEventListener('click', () => { if (searchInput) searchInput.value=''; window.prenFilters = null; loadPrenotazioniSection(); });
      searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ const term = String(searchInput?.value||''); window.prenFilters = { ...(window.prenFilters||{}), term }; loadPrenotazioniSection(); }});
      const dsEl = document.getElementById('pren-date-start');
      const deEl = document.getElementById('pren-date-end');
      const tgEl = document.getElementById('pren-targa');
      const maskDate = (el)=>{ if(!el) return; el.addEventListener('input',()=>{ let v=el.value.replace(/[^0-9]/g,''); if(v.length>2&&v.length<=4) v=v.slice(0,2)+'/'+v.slice(2); if(v.length>4) v=v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4,8); el.value=v; }); };
      maskDate(dsEl); maskDate(deEl);
      if (window.prenFilters && window.prenFilters.dateStart) dsEl.value = window.prenFilters.dateStart;
      if (window.prenFilters && window.prenFilters.dateEnd) deEl.value = window.prenFilters.dateEnd;
      if (window.prenFilters && window.prenFilters.targa) tgEl.value = window.prenFilters.targa;
      const applyFilters = ()=>{ const dateStart = dsEl?.value||''; const dateEnd = deEl?.value||''; const targa = tgEl?.value||''; window.prenFilters = { ...(window.prenFilters||{}), dateStart, dateEnd, targa }; loadPrenotazioniSection(); };
      dsEl?.addEventListener('blur', applyFilters); deEl?.addEventListener('blur', applyFilters); tgEl?.addEventListener('change', applyFilters);
      const btn = document.getElementById('pren-refresh');
      if (btn) btn.addEventListener('click', () => { window.prenFilters = null; loadPrenotazioniSection(); });

      let modalEl = document.getElementById('pren-edit-modal');
      if (!modalEl){
        const options = statuses.map(s => `<option value="${s}">${s}</option>`).join('');
        const html = `
          <div class="modal fade" id="pren-edit-modal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title"><i class="fas fa-edit me-2"></i>Modifica prenotazione</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-4"><label class="form-label">Stato</label><select id="pren-edit-stato" class="form-select">${options}</select></div>
                <div class="col-md-4"><label class="form-label">Targa</label><input type="text" id="pren-edit-targa" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Destinazione</label><input type="text" id="pren-edit-dest" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">Inizio</label><div class="date-wrap"><div class="input-group"><input type="text" id="pren-edit-di" class="form-control-modern" placeholder="gg/mm/aaaa"><button class="btn btn-outline-secondary btn-sm" type="button" id="btn-di-calendar"><i class="fas fa-calendar"></i></button></div><div class="input-mask-hint">Formato: gg/mm/aaaa</div></div></div>
                <div class="col-md-6"><label class="form-label">Fine</label><div class="date-wrap"><div class="input-group"><input type="text" id="pren-edit-df" class="form-control-modern" placeholder="gg/mm/aaaa"><button class="btn btn-outline-secondary btn-sm" type="button" id="btn-df-calendar"><i class="fas fa-calendar"></i></button></div><div class="input-mask-hint">Formato: gg/mm/aaaa</div></div></div>
                <div class="col-md-6"><label class="form-label">Ora inizio</label><input type="text" id="pren-edit-oi" class="form-control-modern" placeholder="HH:MM"></div>
                <div class="col-md-6"><label class="form-label">Ora fine</label><input type="text" id="pren-edit-of" class="form-control-modern" placeholder="HH:MM"></div>
                <div class="col-md-4"><label class="form-label">Importo preventivo (€)</label><input type="number" step="0.01" id="pren-edit-importo" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Email</label><input type="email" id="pren-edit-email" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Cellulare</label><input type="text" id="pren-edit-cell" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Data contratto</label><input type="text" id="pren-edit-contratto" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-8"><label class="form-label">PDF URL</label><input type="text" id="pren-edit-pdfurl" class="form-control-modern" readonly></div>
                <div class="col-md-6"><label class="form-label">Nome autista 1</label><input type="text" id="pren-edit-nome1" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">CF autista 1</label><input type="text" id="pren-edit-cf1" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Data nascita A1</label><input type="text" id="pren-edit-nascita1" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-4"><label class="form-label">Luogo nascita A1</label><input type="text" id="pren-edit-luogo1" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Comune residenza A1</label><input type="text" id="pren-edit-comune1" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">Via residenza A1</label><input type="text" id="pren-edit-via1" class="form-control-modern"></div>
                <div class="col-md-2"><label class="form-label">Civico A1</label><input type="text" id="pren-edit-civico1" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Numero patente A1</label><input type="text" id="pren-edit-patente1" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Inizio validità patente A1</label><input type="text" id="pren-edit-patenteInizio1" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-4"><label class="form-label">Scadenza patente A1</label><input type="text" id="pren-edit-patenteScad1" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-6"><label class="form-label">Nome autista 2</label><input type="text" id="pren-edit-nome2" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">CF autista 2</label><input type="text" id="pren-edit-cf2" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Data nascita A2</label><input type="text" id="pren-edit-nascita2" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-4"><label class="form-label">Luogo nascita A2</label><input type="text" id="pren-edit-luogo2" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Comune residenza A2</label><input type="text" id="pren-edit-comune2" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">Via residenza A2</label><input type="text" id="pren-edit-via2" class="form-control-modern"></div>
                <div class="col-md-2"><label class="form-label">Civico A2</label><input type="text" id="pren-edit-civico2" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Numero patente A2</label><input type="text" id="pren-edit-patente2" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Inizio validità patente A2</label><input type="text" id="pren-edit-patenteInizio2" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-4"><label class="form-label">Scadenza patente A2</label><input type="text" id="pren-edit-patenteScad2" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-6"><label class="form-label">Nome autista 3</label><input type="text" id="pren-edit-nome3" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">CF autista 3</label><input type="text" id="pren-edit-cf3" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Data nascita A3</label><input type="text" id="pren-edit-nascita3" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-4"><label class="form-label">Luogo nascita A3</label><input type="text" id="pren-edit-luogo3" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Comune residenza A3</label><input type="text" id="pren-edit-comune3" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">Via residenza A3</label><input type="text" id="pren-edit-via3" class="form-control-modern"></div>
                <div class="col-md-2"><label class="form-label">Civico A3</label><input type="text" id="pren-edit-civico3" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Numero patente A3</label><input type="text" id="pren-edit-patente3" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Inizio validità patente A3</label><input type="text" id="pren-edit-patenteInizio3" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-4"><label class="form-label">Scadenza patente A3</label><input type="text" id="pren-edit-patenteScad3" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-12"><label class="form-label">test</label><input type="text" id="pren-edit-test" class="form-control-modern"></div>
              </div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button><button class="btn btn-outline-success" id="pren-edit-confirm"><i class="fas fa-check me-1"></i>Conferma</button><button class="btn btn-primary" id="pren-edit-save"><i class="fas fa-save me-1"></i>Salva</button></div>
          </div></div></div>`;
        const wrapper = document.createElement('div'); wrapper.innerHTML = html; document.body.appendChild(wrapper); modalEl = document.getElementById('pren-edit-modal');
      }
      let currentEditId = null;
      document.querySelectorAll('.btn-action[data-action]').forEach(b => {
        b.addEventListener('click', async () => {
          const act = b.getAttribute('data-action');
          if (act === 'pdf'){
            const url = b.getAttribute('data-pdf');
            if (url && url.startsWith('http')) { window.open(url, '_blank'); }
            else { window.showToast?.('PDF non disponibile', 'warning'); }
            return;
          }
          if (act === 'delete'){
            const id = b.getAttribute('data-id');
            const ok = confirm('Confermi eliminazione prenotazione?');
            if (!ok) return;
            try {
              try { await apiFn('eliminaPDFPrenotazione', { idPrenotazione: id }); } catch(__){}
              const res = await apiFn('eliminaPrenotazione', { idPrenotazione: id });
              if (res?.success) { window.showToast?.('Prenotazione eliminata', 'success'); loadPrenotazioniSection(); } else { window.showToast?.('Eliminazione fallita', 'danger'); }
            } catch(_){ window.showToast?.('Errore eliminazione', 'danger'); }
            return;
          }
          if (act === 'edit'){
            currentEditId = b.getAttribute('data-id');
            const stato = b.getAttribute('data-stato')||'';
            const sel = document.getElementById('pren-edit-stato'); if (sel) sel.value = stato;
            document.getElementById('pren-edit-targa').value = b.getAttribute('data-targa')||'';
            document.getElementById('pren-edit-dest').value = b.getAttribute('data-dest')||'';
            document.getElementById('pren-edit-di').value = (window.formatDateIT?.(b.getAttribute('data-di')))||(b.getAttribute('data-di')||'');
            document.getElementById('pren-edit-df').value = (window.formatDateIT?.(b.getAttribute('data-df')))||(b.getAttribute('data-df')||'');
            document.getElementById('pren-edit-oi').value = b.getAttribute('data-oi')||'';
            document.getElementById('pren-edit-of').value = b.getAttribute('data-of')||'';
            document.getElementById('pren-edit-email').value = b.getAttribute('data-email')||'';
            document.getElementById('pren-edit-cell').value = b.getAttribute('data-cell')||'';
            document.getElementById('pren-edit-nome1').value = b.getAttribute('data-nome1')||'';
            document.getElementById('pren-edit-cf1').value = b.getAttribute('data-cf1')||'';
            document.getElementById('pren-edit-nascita1').value = b.getAttribute('data-nascita1')||'';
            document.getElementById('pren-edit-luogo1').value = b.getAttribute('data-luogo1')||'';
            document.getElementById('pren-edit-comune1').value = b.getAttribute('data-comune1')||'';
            document.getElementById('pren-edit-via1').value = b.getAttribute('data-via1')||'';
            document.getElementById('pren-edit-civico1').value = b.getAttribute('data-civico1')||'';
            document.getElementById('pren-edit-patente1').value = b.getAttribute('data-patente1')||'';
            document.getElementById('pren-edit-patenteInizio1').value = b.getAttribute('data-patente-inizio1')||'';
            document.getElementById('pren-edit-patenteScad1').value = b.getAttribute('data-patente-scad1')||'';
            const n2 = document.getElementById('pren-edit-nome2'); if (n2) n2.value = b.getAttribute('data-nome2')||'';
            const c2 = document.getElementById('pren-edit-cf2'); if (c2) c2.value = b.getAttribute('data-cf2')||'';
            const nascita2 = document.getElementById('pren-edit-nascita2'); if (nascita2) nascita2.value = b.getAttribute('data-nascita2')||'';
            const luogo2 = document.getElementById('pren-edit-luogo2'); if (luogo2) luogo2.value = b.getAttribute('data-luogo2')||'';
            const comune2 = document.getElementById('pren-edit-comune2'); if (comune2) comune2.value = b.getAttribute('data-comune2')||'';
            const via2 = document.getElementById('pren-edit-via2'); if (via2) via2.value = b.getAttribute('data-via2')||'';
            const civico2 = document.getElementById('pren-edit-civico2'); if (civico2) civico2.value = b.getAttribute('data-civico2')||'';
            const patente2 = document.getElementById('pren-edit-patente2'); if (patente2) patente2.value = b.getAttribute('data-patente2')||'';
            const patenteInizio2 = document.getElementById('pren-edit-patenteInizio2'); if (patenteInizio2) patenteInizio2.value = b.getAttribute('data-patente-inizio2')||'';
            const patenteScad2 = document.getElementById('pren-edit-patenteScad2'); if (patenteScad2) patenteScad2.value = b.getAttribute('data-patente-scad2')||'';
            const n3 = document.getElementById('pren-edit-nome3'); if (n3) n3.value = b.getAttribute('data-nome3')||'';
            const c3 = document.getElementById('pren-edit-cf3'); if (c3) c3.value = b.getAttribute('data-cf3')||'';
            const nascita3 = document.getElementById('pren-edit-nascita3'); if (nascita3) nascita3.value = b.getAttribute('data-nascita3')||'';
            const luogo3 = document.getElementById('pren-edit-luogo3'); if (luogo3) luogo3.value = b.getAttribute('data-luogo3')||'';
            const comune3 = document.getElementById('pren-edit-comune3'); if (comune3) comune3.value = b.getAttribute('data-comune3')||'';
            const via3 = document.getElementById('pren-edit-via3'); if (via3) via3.value = b.getAttribute('data-via3')||'';
            const civico3 = document.getElementById('pren-edit-civico3'); if (civico3) civico3.value = b.getAttribute('data-civico3')||'';
            const patente3 = document.getElementById('pren-edit-patente3'); if (patente3) patente3.value = b.getAttribute('data-patente3')||'';
            const patenteInizio3 = document.getElementById('pren-edit-patenteInizio3'); if (patenteInizio3) patenteInizio3.value = b.getAttribute('data-patente-inizio3')||'';
            const patenteScad3 = document.getElementById('pren-edit-patenteScad3'); if (patenteScad3) patenteScad3.value = b.getAttribute('data-patente-scad3')||'';
            const imp = document.getElementById('pren-edit-importo'); if (imp) imp.value = b.getAttribute('data-importo')||'';
            const contratto = document.getElementById('pren-edit-contratto'); if (contratto) contratto.value = b.getAttribute('data-contratto')||'';
            const pdfurl = document.getElementById('pren-edit-pdfurl'); if (pdfurl) pdfurl.value = b.getAttribute('data-pdfurl')||'';
            const modal = new bootstrap.Modal(document.getElementById('pren-edit-modal')); modal.show();
            const mask = (id)=>{ const el = document.getElementById(id); if(!el) return; el.addEventListener('input',()=>{ let v=el.value.replace(/[^0-9]/g,''); if(v.length>2&&v.length<=4) v=v.slice(0,2)+'/'+v.slice(2); if(v.length>4) v=v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4,8); el.value=v; }); el.addEventListener('blur',()=>{ const m=el.value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if(m){ const dd=m[1].padStart(2,'0'); const mm=m[2].padStart(2,'0'); const yyyy=m[3].length===2?('20'+m[3]):m[3]; el.value=`${dd}/${mm}/${yyyy}`; } }); };
            mask('pren-edit-di'); mask('pren-edit-df'); mask('pren-edit-contratto'); mask('pren-edit-nascita1'); mask('pren-edit-patenteInizio1'); mask('pren-edit-patenteScad1'); mask('pren-edit-nascita2'); mask('pren-edit-patenteInizio2'); mask('pren-edit-patenteScad2'); mask('pren-edit-nascita3'); mask('pren-edit-patenteInizio3'); mask('pren-edit-patenteScad3');
            const buildCalendar = (dateStr)=>{
              const now = (function(){ const m = String(dateStr||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if(m){ return new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10)); } return new Date(); })();
              return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
            };
            const renderCalendar = (wrap, txt)=>{
              const sel = buildCalendar(txt.value);
              const pad = (n)=> String(n).padStart(2,'0');
              const container = document.createElement('div');
              container.className = 'cal-panel';
              const head = document.createElement('div'); head.className='cal-head';
              const prev = document.createElement('button'); prev.className='btn btn-outline-secondary btn-sm'; prev.innerHTML='\u2039';
              const title = document.createElement('div'); title.className='cal-title'; title.textContent = new Date(sel.y, sel.m, 1).toLocaleDateString('it-IT', { month:'long', year:'numeric' });
              const next = document.createElement('button'); next.className='btn btn-outline-secondary btn-sm'; next.innerHTML='\u203A';
              head.appendChild(prev); head.appendChild(title); head.appendChild(next);
              const grid = document.createElement('div'); grid.className='cal-grid';
              ['lu','ma','me','gi','ve','sa','do'].forEach(d=>{ const c=document.createElement('div'); c.className='cal-dow'; c.textContent=d; grid.appendChild(c); });
              const firstDow = (function(){ const wd = new Date(sel.y, sel.m, 1).getDay(); return wd===0?6:wd-1; })();
              for(let i=0;i<firstDow;i++){ const s=document.createElement('div'); s.className='cal-cell'; s.style.visibility='hidden'; grid.appendChild(s); }
              const days = new Date(sel.y, sel.m+1, 0).getDate();
              for(let d=1; d<=days; d++){ const cell=document.createElement('div'); cell.className='cal-cell'+(d===sel.d?' cal-selected':''); cell.textContent=String(d); cell.addEventListener('click',()=>{ txt.value = `${pad(d)}/${pad(sel.m+1)}/${sel.y}`; wrap.removeChild(container); txt.dispatchEvent(new Event('input')); }); grid.appendChild(cell); }
              container.appendChild(head); container.appendChild(grid);
              wrap.appendChild(container);
              const rerender = (delta)=>{ sel.m += delta; if(sel.m<0){ sel.m=11; sel.y--; } if(sel.m>11){ sel.m=0; sel.y++; } wrap.removeChild(container); renderCalendar(wrap, txt); };
              prev.addEventListener('click', ()=> rerender(-1)); next.addEventListener('click', ()=> rerender(1));
            };
            const attachCalendar = (textId, btnId)=>{
              const txt = document.getElementById(textId); const btn = document.getElementById(btnId);
              if(!txt||!btn) return;
              btn.addEventListener('click', (ev)=>{ ev.preventDefault(); ev.stopPropagation(); const wrap = btn.closest('.date-wrap'); if(!wrap) return; const existing = wrap.querySelector('.cal-panel'); if (existing) { wrap.removeChild(existing); } renderCalendar(wrap, txt); });
            };
            attachCalendar('pren-edit-di','btn-di-calendar'); attachCalendar('pren-edit-df','btn-df-calendar');
          }
        });
      });
      const saveBtn = document.getElementById('pren-edit-save');
      const normalizeItalianDate = (s) => {
        const v = String(s||'').trim();
        const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return null;
        const dd = m[1].padStart(2,'0');
        const mm = m[2].padStart(2,'0');
        const yyyy = m[3];
        return `${dd}/${mm}/${yyyy}`;
      };
      saveBtn?.addEventListener('click', async () => {
        const sel = document.getElementById('pren-edit-stato');
        const stato = sel ? sel.value : '';
        if (!currentEditId) return;
        const diRaw = document.getElementById('pren-edit-di').value||'';
        const dfRaw = document.getElementById('pren-edit-df').value||'';
        const diNorm = normalizeItalianDate(diRaw);
        const dfNorm = normalizeItalianDate(dfRaw);
        if (!diNorm || !dfNorm) { window.showToast?.('Inserisci date in formato gg/mm/aaaa','warning'); return; }
        const payload = {
          idPrenotazione: currentEditId,
          stato,
          targa: document.getElementById('pren-edit-targa').value||'',
          destinazione: document.getElementById('pren-edit-dest').value||'',
          giornoInizio: diNorm,
          giornoFine: dfNorm,
          oraInizio: document.getElementById('pren-edit-oi').value||'',
          oraFine: document.getElementById('pren-edit-of').value||'',
          dataContratto: (function(){ const s=document.getElementById('pren-edit-contratto')?.value||''; const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}` : ''; })(),
          email: document.getElementById('pren-edit-email').value||'',
          cellulare: document.getElementById('pren-edit-cell').value||'',
          nomeAutista1: document.getElementById('pren-edit-nome1').value||'',
          codiceFiscaleAutista1: document.getElementById('pren-edit-cf1').value||'',
          dataNascitaAutista1: document.getElementById('pren-edit-nascita1')?.value||'',
          luogoNascitaAutista1: document.getElementById('pren-edit-luogo1')?.value||'',
          comuneResidenzaAutista1: document.getElementById('pren-edit-comune1')?.value||'',
          viaResidenzaAutista1: document.getElementById('pren-edit-via1')?.value||'',
          civicoResidenzaAutista1: document.getElementById('pren-edit-civico1')?.value||'',
          numeroPatenteAutista1: document.getElementById('pren-edit-patente1')?.value||'',
          nomeAutista2: (document.getElementById('pren-edit-nome2')?.value)||'',
          codiceFiscaleAutista2: (document.getElementById('pren-edit-cf2')?.value)||'',
          dataNascitaAutista2: (document.getElementById('pren-edit-nascita2')?.value)||'',
          luogoNascitaAutista2: (document.getElementById('pren-edit-luogo2')?.value)||'',
          comuneResidenzaAutista2: (document.getElementById('pren-edit-comune2')?.value)||'',
          viaResidenzaAutista2: (document.getElementById('pren-edit-via2')?.value)||'',
          civicoResidenzaAutista2: (document.getElementById('pren-edit-civico2')?.value)||'',
          numeroPatenteAutista2: (document.getElementById('pren-edit-patente2')?.value)||'',
          nomeAutista3: (document.getElementById('pren-edit-nome3')?.value)||'',
          codiceFiscaleAutista3: (document.getElementById('pren-edit-cf3')?.value)||'',
          dataNascitaAutista3: (document.getElementById('pren-edit-nascita3')?.value)||'',
          luogoNascitaAutista3: (document.getElementById('pren-edit-luogo3')?.value)||'',
          comuneResidenzaAutista3: (document.getElementById('pren-edit-comune3')?.value)||'',
          viaResidenzaAutista3: (document.getElementById('pren-edit-via3')?.value)||'',
          civicoResidenzaAutista3: (document.getElementById('pren-edit-civico3')?.value)||'',
          numeroPatenteAutista3: (document.getElementById('pren-edit-patente3')?.value)||'',
          importo: (function(){ const v = document.getElementById('pren-edit-importo')?.value||''; const n = parseFloat(v); return isNaN(n)?undefined:n; })(),
          autista1: { dataInizioPatente: document.getElementById('pren-edit-patenteInizio1')?.value||'', inizioValiditaPatente: document.getElementById('pren-edit-patenteInizio1')?.value||'', scadenzaPatente: document.getElementById('pren-edit-patenteScad1')?.value||'' },
          autista2: { dataInizioPatente: (document.getElementById('pren-edit-patenteInizio2')?.value)||'', inizioValiditaPatente: (document.getElementById('pren-edit-patenteInizio2')?.value)||'', scadenzaPatente: (document.getElementById('pren-edit-patenteScad2')?.value)||'' },
          autista3: { dataInizioPatente: (document.getElementById('pren-edit-patenteInizio3')?.value)||'', inizioValiditaPatente: (document.getElementById('pren-edit-patenteInizio3')?.value)||'', scadenzaPatente: (document.getElementById('pren-edit-patenteScad3')?.value)||'' },
          test: document.getElementById('pren-edit-test')?.value||''
        };
        try { const res = await apiFn('aggiornaPrenotazioneCompleta', payload); if (res?.success){ try { if (String(stato).trim().toLowerCase()==='confermata'){ await apiFn('generaPDFContratto', { idPrenotazione: currentEditId }); } } catch(__){} window.showToast?.('Prenotazione aggiornata', 'success'); bootstrap.Modal.getInstance(document.getElementById('pren-edit-modal'))?.hide(); loadPrenotazioniSection(); } else { window.showToast?.('Aggiornamento fallito', 'danger'); } } catch(_){ window.showToast?.('Errore aggiornamento', 'danger'); }
      });
      const confirmBtn = document.getElementById('pren-edit-confirm');
      confirmBtn?.addEventListener('click', () => { const sel = document.getElementById('pren-edit-stato'); if (sel) sel.value = 'Confermata'; saveBtn?.click(); });
    }catch(e){
      root.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Errore caricamento prenotazioni</div>`;
      console.error('[Prenotazioni] Errore', e);
    }finally{ if (window.showLoader) window.showLoader(false); }
  }
  window.loadPrenotazioniSection = loadPrenotazioniSection;
  window.loadPrenotazioni = loadPrenotazioniSection;
})();
