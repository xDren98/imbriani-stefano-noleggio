;(function(){
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
      const statuses = Array.from(new Set(arrAll.map(p => String(p.stato||'').trim()).filter(s => s.length))).sort();
      let arr = arrAll;
      const f = window.prenFilters || null;
      if (f && f.id) { arr = arr.filter(p => String(p.id||p.ID||'') === String(f.id)); }
      if (f && f.stato) { arr = arr.filter(p => String(p.stato||'').trim() === String(f.stato||'').trim()); }
      if (f && typeof f.term === 'string' && f.term.trim().length){
        const q = f.term.trim().toLowerCase();
        arr = arr.filter(p => {
          const cliente = (p.cliente || p.nomeAutista1 || p.nomeAutista2 || p.nomeAutista3 || p.nome1 || (p.autista1 && p.autista1.nomeCompleto) || '');
          const fields = [String(p.id||p.ID||''), String(p.targa||''), String(cliente||''), String(p.destinazione||''), String(p.stato||'')].map(s => s.toLowerCase());
          return fields.some(s => s.includes(q));
        });
      }
      if (!arr || arr.length === 0) {
        const snap = apiFn ? await apiFn('search', { entity:'prenotazioni', q:'', limit:200, offset:0, nocache:'1' }) : { success:false };
        if (snap && snap.success) arr = snap.data || [];
      }
      const fmtIT = (d) => { const f = window.formatDateIT?.(d) || '-'; return f === '-' ? '' : f; };
      root.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="h5 fw-bold mb-1">Prenotazioni</h2>
          <p class="text-muted mb-0">Elenco prenotazioni correnti</p>
        </div>
        <div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" id="pren-refresh"><i class="fas fa-sync-alt me-1"></i>Ricarica</button></div>
      </div>
      <div class="card mb-3"><div class="card-body">
        <div class="d-flex flex-wrap gap-2" id="pren-filters"></div>
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
          const cliente = (p.cliente || p.nomeAutista1 || p.nomeAutista2 || p.nomeAutista3 || p.nome1 || (p.autista1 && p.autista1.nomeCompleto) || '-');
          const di = fmtIT(p.giornoInizio || p.giornoInizioFormatted);
          const df = fmtIT(p.giornoFine || p.giornoFineFormatted);
          const oi = String(p.oraInizio||'').trim();
          const of = String(p.oraFine||'').trim();
          const inizio = `${di}${oi ? ' ' + oi : ''}`;
          const fine = `${df}${of ? ' ' + of : ''}`;
           return `<tr>
             <td>${String(p.id||p.ID||'-')}</td>
             <td>${String(cliente)}</td>
             <td>${String(p.targa||'-')}</td>
             <td>${inizio}</td>
             <td>${fine}</td>
             <td>${String(p.stato||'-')}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1 btn-action" data-action="edit" data-id="${String(p.idPrenotazione||p.id||p.ID||'')}" data-stato="${String(p.stato||'')}" data-targa="${String(p.targa||'')}" data-di="${String(p.giornoInizio||p.giornoInizioFormatted||'')}" data-df="${String(p.giornoFine||p.giornoFineFormatted||'')}" data-oi="${String(p.oraInizio||'')}" data-of="${String(p.oraFine||'')}" data-dest="${String(p.destinazione||'')}" data-email="${String(p.email||'')}" data-cell="${String(p.cellulare||'')}" data-nome1="${String(p.nomeAutista1||'')}" data-cf1="${String(p.codiceFiscaleAutista1||'')}" data-nome2="${String(p.nomeAutista2||'')}" data-cf2="${String(p.codiceFiscaleAutista2||'')}" data-nome3="${String(p.nomeAutista3||'')}" data-cf3="${String(p.codiceFiscaleAutista3||'')}" data-importo="${String(p.importoPreventivo||p.importo||'')}"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger me-1 btn-action" data-action="delete" data-id="${String(p.idPrenotazione||p.id||p.ID||'')}"><i class="fas fa-trash"></i></button>
              <button class="btn btn-sm btn-outline-secondary btn-action" data-action="pdf" data-pdf="${String(p.pdfUrl||p.pdfURL||'')}"><i class="fas fa-file-pdf"></i></button>
            </td>
           </tr>`;
        }).join('') : '<tr><td colspan="6" class="text-center text-muted py-4">Nessuna prenotazione</td></tr>'}
        </tbody></table>
      </div></div></div>`;
      const filtersBox = document.getElementById('pren-filters');
      if (filtersBox){
        const makeBtn = (label, value) => `<button class="btn btn-sm ${value?'btn-outline-primary':'btn-outline-secondary'}" data-stato="${value||''}">${label}</button>`;
        filtersBox.innerHTML = [makeBtn('Tutte','')].concat(statuses.map(s => makeBtn(s, s))).join('');
        filtersBox.querySelectorAll('button[data-stato]').forEach(btn => {
          btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-stato');
            if (v){ window.prenFilters = { stato: v }; }
            else { window.prenFilters = null; }
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
                <div class="col-md-6"><label class="form-label">Inizio</label><input type="text" id="pren-edit-di" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-6"><label class="form-label">Fine</label><input type="text" id="pren-edit-df" class="form-control-modern" placeholder="gg/mm/aaaa"></div>
                <div class="col-md-6"><label class="form-label">Ora inizio</label><input type="text" id="pren-edit-oi" class="form-control-modern" placeholder="HH:MM"></div>
                <div class="col-md-6"><label class="form-label">Ora fine</label><input type="text" id="pren-edit-of" class="form-control-modern" placeholder="HH:MM"></div>
                <div class="col-md-4"><label class="form-label">Importo preventivo (€)</label><input type="number" step="0.01" id="pren-edit-importo" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Email</label><input type="email" id="pren-edit-email" class="form-control-modern"></div>
                <div class="col-md-4"><label class="form-label">Cellulare</label><input type="text" id="pren-edit-cell" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">Nome autista 1</label><input type="text" id="pren-edit-nome1" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">CF autista 1</label><input type="text" id="pren-edit-cf1" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">Nome autista 2</label><input type="text" id="pren-edit-nome2" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">CF autista 2</label><input type="text" id="pren-edit-cf2" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">Nome autista 3</label><input type="text" id="pren-edit-nome3" class="form-control-modern"></div>
                <div class="col-md-6"><label class="form-label">CF autista 3</label><input type="text" id="pren-edit-cf3" class="form-control-modern"></div>
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
            try { const res = await apiFn('eliminaPrenotazione', { idPrenotazione: id }); if (res?.success) { window.showToast?.('Prenotazione eliminata', 'success'); loadPrenotazioniSection(); } else { window.showToast?.('Eliminazione fallita', 'danger'); } } catch(_){ window.showToast?.('Errore eliminazione', 'danger'); }
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
            const n2 = document.getElementById('pren-edit-nome2'); if (n2) n2.value = b.getAttribute('data-nome2')||'';
            const c2 = document.getElementById('pren-edit-cf2'); if (c2) c2.value = b.getAttribute('data-cf2')||'';
            const n3 = document.getElementById('pren-edit-nome3'); if (n3) n3.value = b.getAttribute('data-nome3')||'';
            const c3 = document.getElementById('pren-edit-cf3'); if (c3) c3.value = b.getAttribute('data-cf3')||'';
            const imp = document.getElementById('pren-edit-importo'); if (imp) imp.value = b.getAttribute('data-importo')||'';
            const modal = new bootstrap.Modal(document.getElementById('pren-edit-modal')); modal.show();
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
          email: document.getElementById('pren-edit-email').value||'',
          cellulare: document.getElementById('pren-edit-cell').value||'',
          nomeAutista1: document.getElementById('pren-edit-nome1').value||'',
          codiceFiscaleAutista1: document.getElementById('pren-edit-cf1').value||'',
          nomeAutista2: (document.getElementById('pren-edit-nome2')?.value)||'',
          codiceFiscaleAutista2: (document.getElementById('pren-edit-cf2')?.value)||'',
          nomeAutista3: (document.getElementById('pren-edit-nome3')?.value)||'',
          codiceFiscaleAutista3: (document.getElementById('pren-edit-cf3')?.value)||'',
          importo: (function(){ const v = document.getElementById('pren-edit-importo')?.value||''; const n = parseFloat(v); return isNaN(n)?undefined:n; })()
        };
        try { const res = await apiFn('aggiornaPrenotazioneCompleta', payload); if (res?.success){ window.showToast?.('Prenotazione aggiornata', 'success'); bootstrap.Modal.getInstance(document.getElementById('pren-edit-modal'))?.hide(); loadPrenotazioniSection(); } else { window.showToast?.('Aggiornamento fallito', 'danger'); } } catch(_){ window.showToast?.('Errore aggiornamento', 'danger'); }
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
