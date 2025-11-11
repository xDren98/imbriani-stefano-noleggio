// admin-prenotazioni.js v3.11 - Card cliccabile + Modale Modifica Funzionante!
(function(){
  const STATI_TABELLA = ['Tutte', 'In attesa', 'Programmata', 'In corso', 'Completata', 'Legacy'];
  const STATI_COLORI = {
    'Tutte': { bg: 'secondary', icon: 'list', text: 'white' },
    'In attesa': { bg: 'warning', icon: 'clock', text: 'dark' },
    'Confermata': { bg: 'success', icon: 'check-circle', text: 'white' },
    'Programmata': { bg: 'info', icon: 'calendar-check', text: 'white' },
    'In corso': { bg: 'primary', icon: 'car', text: 'white' },
    'Completata': { bg: 'secondary', icon: 'flag-checkered', text: 'white' },
    'Rifiutata': { bg: 'danger', icon: 'times-circle', text: 'white' },
    'Legacy': { bg: 'dark', icon: 'hourglass-half', text: 'white' }
  };

  // Classe CSS per badge stato uniforme “pill”
  function badgeClassForStatus(stato) {
    switch (stato) {
      case 'In attesa': return 'badge-attesa';
      case 'Programmata': return 'badge-programmata';
      case 'In corso': return 'badge-in-corso';
      case 'Completata': return 'badge-completata';
      case 'Confermata': return 'badge-confermata';
      case 'Rifiutata': return 'badge-rifiutata';
      default: return 'badge-attesa';
    }
  }

  // Iniziali per avatar (es: "Andrea Fioschini" -> "AF")
  function getInitials(name) {
    if (!name || typeof name !== 'string') return '–';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).toUpperCase();
  }

  let allPrenotazioni = [];
  let filteredPrenotazioni = [];
  let currentFilters = { stato: 'tutti', ricerca: '' };
  let currentView = 'card'; // 'card' or 'table'
  let prenotazioniSort = { key: 'date', dir: 'desc' }; // default ordinamento cronologico decrescente

  function getId(p){
    const v = p.idPrenotazione || p.id || '';
    const n = Number(String(v).replace(/\D/g,''));
    return isNaN(n) ? String(v) : n;
  }

  function parseDateSafe(s){
    const d = (window.parseDateAny ? parseDateAny(s) : new Date(s));
    return d && !isNaN(d.getTime()) ? d : null;
  }

  function compareValues(a, b, type){
    if(type === 'number'){
      const na = Number(a) || 0; const nb = Number(b) || 0;
      return na - nb;
    } else if(type === 'date'){
      const da = parseDateSafe(a); const db = parseDateSafe(b);
      const ta = da ? da.getTime() : 0; const tb = db ? db.getTime() : 0;
      return ta - tb;
    } else {
      const sa = (a||'').toString().toLowerCase();
      const sb = (b||'').toString().toLowerCase();
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    }
  }

  function sortPrenotazioni(list){
    const dir = prenotazioniSort.dir === 'asc' ? 1 : -1;
    const key = prenotazioniSort.key;
    return [...list].sort((a,b) => {
      let cmp = 0;
      switch(key){
        case 'id':
          cmp = compareValues(getId(a), getId(b), typeof getId(a) === 'number' && typeof getId(b) === 'number' ? 'number' : 'string');
          break;
        case 'cliente':
          cmp = compareValues(a.nomeAutista1, b.nomeAutista1, 'string');
          break;
        case 'veicolo':
          cmp = compareValues(a.targa, b.targa, 'string');
          break;
        case 'date':
          cmp = compareValues(a.giornoInizio, b.giornoInizio, 'date');
          if(cmp === 0) cmp = compareValues(a.giornoFine, b.giornoFine, 'date');
          break;
        case 'orari':
          cmp = compareValues(a.oraInizio, b.oraInizio, 'string');
          if(cmp === 0) cmp = compareValues(a.oraFine, b.oraFine, 'string');
          break;
        case 'destinazione':
          cmp = compareValues(a.destinazione, b.destinazione, 'string');
          break;
        case 'stato':
          cmp = compareValues(a.stato, b.stato, 'string');
          break;
        default:
          cmp = compareValues(a.giornoInizio, b.giornoInizio, 'date');
          if(cmp === 0) cmp = compareValues(a.giornoFine, b.giornoFine, 'date');
      }
      return cmp * dir;
    });
  }

  window.setPrenotazioniSort = function(key){
    if(prenotazioniSort.key === key){
      prenotazioniSort.dir = prenotazioniSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      prenotazioniSort.key = key;
      prenotazioniSort.dir = (key === 'date' || key === 'orari' || key === 'id') ? 'desc' : 'asc';
    }
    renderPrenotazioni();
  };

  // Sistema toast migliorato v3.2
  window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const iconMap = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="fas fa-${iconMap[type] || 'info-circle'}" style="font-size:20px;"></i>
        <span style="flex:1;">${message}</span>
      </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-slide-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Esporta anche l'alias legacy per compatibilità con admin-scripts
  window.loadPrenotazioniSection = async function() {
    const root = document.getElementById('admin-root');
    if (!root) return;
    
    // Header con breadcrumb v3.2
    root.innerHTML = `
      <div class="breadcrumb mb-3">
        <a href="#" onclick="window.loadAdminSection?.('dashboard'); return false;">Dashboard</a>
        <span class="mx-2">/</span>
        <span>Prenotazioni</span>
      </div>

      <div class="glass-header mb-4"> 
        <div class="d-flex justify-content-between align-items-center flex-wrap">
           <div>
             <h2 class="h4 fw-bold mb-1">📅 Gestione Prenotazioni</h2>
             <p class="text-muted mb-0">Visualizza e gestisci tutte le prenotazioni</p>
           </div>
           <div class="mt-2 mt-md-0">
             <button class="switch-view-btn switch-view-btn-active" id="btn-view-grid">
               <i class="fas fa-th-large"></i> Griglia
             </button>
             <button class="switch-view-btn" id="btn-view-list">
               <i class="fas fa-list"></i> Elenco
             </button>
             <button class="btn btn-glass btn-glass-success ms-3" onclick="window.showNewBookingModal?.()">
               <i class="fas fa-plus me-2"></i>Nuova Prenotazione
             </button>
           </div>
        </div>
      </div>

      <div class="mb-3" id="quick-stats"></div>

      <!-- Filtri (solo ricerca) -->
      <div class="card mb-3" style="border-radius:14px;">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Ricerca</label>
              <input type="text" id="filter-ricerca" class="form-control" 
                     placeholder="Cerca per ID, CF, Nome, Targa...">
            </div>
          </div>
        </div>
      </div>

      <div id="cards-or-table-prenotazioni" class="mb-4"></div>
    `;

    // Stato rimosso dalla UI: mantenuto via quick stats
    document.getElementById('filter-stato')?.addEventListener('change', aggiornaFiltri);
    document.getElementById('filter-ricerca')?.addEventListener('input', debounce(aggiornaFiltri, 300));
    document.getElementById('btn-view-grid').onclick = () => switchView('card');
    document.getElementById('btn-view-list').onclick = () => switchView('table');
    
    await caricaPrenotazioni();
  };

  // Alias legacy usato in alcune versioni di admin-scripts
  window.caricaSezionePrenotazioni = window.loadPrenotazioniSection;

  async function caricaPrenotazioni() {
    try {
      showSkeletonLoading();
      
      const response = await window.secureGet?.('getPrenotazioni', {});
      
      if (response?.success && response.data) {
        allPrenotazioni = response.data;
        filteredPrenotazioni = [...allPrenotazioni];
        renderQuickStats();
        renderPrenotazioni();
        window.showToast(`✅ ${allPrenotazioni.length} prenotazioni caricate`, 'success');
      } else {
        throw new Error(response?.message || 'Errore caricamento prenotazioni');
      }
    } catch (error) {
      document.getElementById('cards-or-table-prenotazioni').innerHTML = 
        `<div class='alert alert-danger'>❌ Errore: ${error.message}</div>`;
      window.showToast('❌ Errore caricamento prenotazioni', 'error');
    }
  }

  function showSkeletonLoading() {
    const container = document.getElementById('cards-or-table-prenotazioni');
    if (!container) return;
    
    const skeletons = Array(6).fill(0).map(() => 
      '<div class="col-md-4"><div class="skeleton-card"></div></div>'
    ).join('');
    
    container.innerHTML = `<div class="row g-3">${skeletons}</div>`;
  }

  function renderQuickStats() {
    const statsDiv = document.getElementById('quick-stats');
    if(!statsDiv) return;
    
    const statiCount = {
      'Tutte': allPrenotazioni.length,
      'In attesa': allPrenotazioni.filter(p => p.stato === 'In attesa').length,
      'Programmata': allPrenotazioni.filter(p => p.stato === 'Programmata').length,
      'In corso': allPrenotazioni.filter(p => p.stato === 'In corso').length,
      'Completata': allPrenotazioni.filter(p => p.stato === 'Completata').length,
      'Legacy': allPrenotazioni.filter(p => String(p.stato||'') === 'Legacy').length
    };
    
    statsDiv.innerHTML = STATI_TABELLA.map(stato => {
      const active = (currentFilters.stato === stato || 
                     (stato === 'Tutte' && (currentFilters.stato === 'tutti' || !currentFilters.stato))) 
                     ? 'btn-quickfilter-active' : '';
      const color = STATI_COLORI[stato].bg;
      const icon = STATI_COLORI[stato].icon;
      return `<button class="btn-quickfilter ${active} bg-${color}" 
                      onclick="window.quickStatFilter('${stato}')">
        <i class="fas fa-${icon} me-1"></i> ${stato}: <b>${statiCount[stato]}</b>
      </button>`;
    }).join('');
  }

  window.quickStatFilter = function(stato) {
    currentFilters.stato = stato === 'Tutte' ? 'tutti' : stato;
    const fs = document.getElementById('filter-stato');
    if (fs) fs.value = stato === 'Tutte' ? 'tutti' : stato;
    window.applicaFiltriPrenotazioni();
    renderQuickStats();
  };

  function switchView(type) {
    currentView = type;
    document.getElementById('btn-view-grid').classList.toggle('switch-view-btn-active', type === 'card');
    document.getElementById('btn-view-list').classList.toggle('switch-view-btn-active', type === 'table');
    renderPrenotazioni();
  }

  function renderPrenotazioni() {
    if(currentView === 'card') renderPrenotazioniCard(); 
    else renderPrenotazioniTable();
  }

  function renderPrenotazioniCard() {
    const container = document.getElementById('cards-or-table-prenotazioni');
    if (!container) return;
    
    if (filteredPrenotazioni.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-calendar-times"></i>
          </div>
          <div class="empty-state-title">Nessuna prenotazione trovata</div>
          <div class="empty-state-text">
            ${currentFilters.stato !== 'tutti' || currentFilters.ricerca 
              ? 'Prova a modificare i filtri di ricerca' 
              : 'Non ci sono prenotazioni al momento'}
          </div>
          ${currentFilters.stato !== 'tutti' || currentFilters.ricerca 
            ? '<button class="btn btn-glass btn-glass-primary" onclick="window.quickStatFilter(\'Tutte\')">Mostra Tutte</button>' 
            : '<button class="btn btn-glass btn-glass-success" onclick="window.showNewBookingModal?.()"><i class="fas fa-plus me-2"></i>Crea Prenotazione</button>'}
        </div>
      `;
      return;
    }
    
    const sorted = sortPrenotazioni(filteredPrenotazioni);
    
    container.innerHTML = `<div class="row g-3">` +
      sorted.map(p => {
        const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
        const dataInizio = p.giornoInizio ? window.formatDateIT ? window.formatDateIT(p.giornoInizio) : '-' : '-';
        const dataFine = p.giornoFine ? window.formatDateIT ? window.formatDateIT(p.giornoFine) : '-' : '-';
        const oraInizio = p.oraInizio || '';
        const oraFine = p.oraFine || '';
        
        return `
          <div class="col-md-4">
            <div class="card glass-card mb-3 shadow-sm border-0 prenotazione-clickable" 
                 style="cursor:pointer;transition:transform 0.2s ease,box-shadow 0.2s ease;"
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 16px rgba(0,0,0,0.15)';"
                 onmouseout="this.style.transform='';this.style.boxShadow='';"
                 onclick="window.mostraDettaglioPrenotazione('${p.idPrenotazione || p.id}')">
              <div class="card-body">
                <div class="d-flex align-items-center mb-2 gap-3">
                  <span class="badge badge-status ${badgeClassForStatus(p.stato)}">
                    <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
                  </span>
                  <span class="ms-auto chip chip-muted">
                    <i class="fa-regular fa-calendar"></i>${dataInizio} → ${dataFine}
                  </span>
                </div>

                <div class="d-flex align-items-center mb-1 gap-3">
                  <div class="avatar-initials" aria-hidden="true">${getInitials(p.nomeAutista1)}</div>
                  <div class="card-prenotazione-nome">${window.escapeHtml ? escapeHtml(p.nomeAutista1 || '-') : (p.nomeAutista1 || '-')}</div>
                </div>
                
                <div class="mb-2 d-flex align-items-center gap-2 flex-wrap">
                  <span class="chip chip-secondary"><i class="fas fa-car-side"></i>${window.escapeHtml ? escapeHtml(p.targa || '-') : (p.targa || '-')}</span>
                  ${p.destinazione ? `<span class="chip chip-info"><i class="fas fa-map-marker-alt"></i>${window.escapeHtml ? escapeHtml(p.destinazione) : p.destinazione}</span>` : ''}
                </div>
                <div class="mb-1 text-muted fw-normal small">
                  <i class="fas fa-phone me-1"></i>${window.escapeHtml ? escapeHtml(p.cellulare || '-') : (p.cellulare || '-')}</div>
                <div class="mb-1 text-muted fw-normal small">
                  <i class="fas fa-envelope me-1"></i>${window.escapeHtml ? escapeHtml(p.email || '-') : (p.email || '-')}</div>
                <div class="mb-1 text-info fw-semibold small">
                  <i class="fas fa-clock me-1"></i>
                  <strong>Dal:</strong> ${dataInizio} ${oraInizio} <strong>- Al:</strong> ${dataFine} ${oraFine}
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2 gap-2 flex-wrap" onclick="event.stopPropagation()">
                  <span class="small text-primary"><b>${p.idPrenotazione || p.id}</b></span>
                  ${p.stato === 'In attesa' ? `
                    <button class="pill-action pill-success me-1" title="Conferma" 
                            onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Confermata');event.stopPropagation();">
                      <i class="fas fa-check"></i>Conferma
                    </button>
                    <button class="pill-action pill-danger me-1" title="Rifiuta" 
                            onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Rifiutata');event.stopPropagation();">
                      <i class="fas fa-times"></i>Rifiuta
                    </button>
                  ` : ''}
                  <div class="btn-group btn-group-sm">
                    <button class="btn action-btn action-warning" title="Modifica" 
                            onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}'); event.stopPropagation();">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn action-btn action-danger" title="Elimina" 
                            onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}'); event.stopPropagation();">
                      <i class="fas fa-trash"></i>
                    </button>
                    ${p.pdfUrl ? `<a href="${p.pdfUrl}" target="_blank" 
                         class="btn action-btn action-secondary" title="PDF"
                         onclick="event.stopPropagation();">
                         <i class="fas fa-file-pdf"></i>
                       </a>` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('') + '</div>';
  }

  function renderPrenotazioniTable() {
    const container = document.getElementById('cards-or-table-prenotazioni');
    if (!container) return;
    
    if (filteredPrenotazioni.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-calendar-times"></i>
          </div>
          <div class="empty-state-title">Nessuna prenotazione trovata</div>
          <div class="empty-state-text">
            ${currentFilters.stato !== 'tutti' || currentFilters.ricerca 
              ? 'Prova a modificare i filtri di ricerca' 
              : 'Non ci sono prenotazioni al momento'}
          </div>
          ${currentFilters.stato !== 'tutti' || currentFilters.ricerca 
            ? '<button class="btn btn-glass btn-glass-primary" onclick="window.quickStatFilter(\'Tutte\')">Mostra Tutte</button>' 
            : '<button class="btn btn-glass btn-glass-success" onclick="window.showNewBookingModal?.()"><i class="fas fa-plus me-2"></i>Crea Prenotazione</button>'}
        </div>
      `;
      return;
    }
    
    const sorted = sortPrenotazioni(filteredPrenotazioni);
    
    container.innerHTML = `
      <div class="card">
        <div class="card-header">Lista Prenotazioni</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th style="cursor:pointer" onclick="window.setPrenotazioniSort('id')">ID ${prenotazioniSort.key==='id' ? (prenotazioniSort.dir==='asc'?'▲':'▼') : ''}</th>
                  <th style="cursor:pointer" onclick="window.setPrenotazioniSort('cliente')">Cliente ${prenotazioniSort.key==='cliente' ? (prenotazioniSort.dir==='asc'?'▲':'▼') : ''}</th>
                  <th style="cursor:pointer" onclick="window.setPrenotazioniSort('veicolo')">Veicolo ${prenotazioniSort.key==='veicolo' ? (prenotazioniSort.dir==='asc'?'▲':'▼') : ''}</th>
                  <th style="cursor:pointer" onclick="window.setPrenotazioniSort('date')">Date ${prenotazioniSort.key==='date' ? (prenotazioniSort.dir==='asc'?'▲':'▼') : ''}</th>
                  <th style="cursor:pointer" onclick="window.setPrenotazioniSort('orari')">Orari ${prenotazioniSort.key==='orari' ? (prenotazioniSort.dir==='asc'?'▲':'▼') : ''}</th>
                  <th style="cursor:pointer" onclick="window.setPrenotazioniSort('destinazione')">Destinazione ${prenotazioniSort.key==='destinazione' ? (prenotazioniSort.dir==='asc'?'▲':'▼') : ''}</th>
                  <th style="cursor:pointer" onclick="window.setPrenotazioniSort('stato')">Stato ${prenotazioniSort.key==='stato' ? (prenotazioniSort.dir==='asc'?'▲':'▼') : ''}</th>
                  <th class="text-end">Azioni</th>
                </tr>
              </thead>
              <tbody>
                ${sorted.map(p => {
                  const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
                  const dataInizio = p.giornoInizio ? window.formatDateIT ? window.formatDateIT(p.giornoInizio) : '-' : '-';
                  const dataFine = p.giornoFine ? window.formatDateIT ? window.formatDateIT(p.giornoFine) : '-' : '-';
                  const oraInizio = p.oraInizio || '';
                  const oraFine = p.oraFine || '';
                  
                  return `
                    <tr style="cursor:pointer;" onclick="window.mostraDettaglioPrenotazione('${p.idPrenotazione || p.id}')">
                      <td><strong>${p.idPrenotazione || p.id}</strong></td>
                      <td>
                        <span class="card-prenotazione-nome">${p.nomeAutista1 || '-'}</span><br>
                        <small class="text-muted">
                          <i class="fas fa-phone me-1"></i>${p.cellulare || '-'}
                        </small>
                      </td>
                      <td><span class="badge bg-secondary">${p.targa || '-'}</span></td>
                      <td>${dataInizio} → ${dataFine}</td>
                      <td>${oraInizio && oraFine ? oraInizio + ' → ' + oraFine : '-'}</td>
                      <td>${p.destinazione || '-'}</td>
                      <td>
                        <span class="badge badge-status ${badgeClassForStatus(p.stato)}">
                          <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
                        </span>
                      </td>
                      <td class="text-end" onclick="event.stopPropagation()">
                        <div class="btn-group btn-group-sm">
                          <button class="btn action-btn action-warning" title="Modifica" 
                                  onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn action-btn action-danger" title="Elimina" 
                                  onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')">
                            <i class="fas fa-trash"></i>
                          </button>
                          ${p.pdfUrl ? `<a href="${p.pdfUrl}" target="_blank" 
                               class="btn action-btn action-secondary" title="PDF">
                              <i class="fas fa-file-pdf"></i>
                            </a>` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function aggiornaFiltri() {
    const statoSelect = document.getElementById('filter-stato');
    const ricercaInput = document.getElementById('filter-ricerca');
    if (statoSelect) currentFilters.stato = statoSelect.value;
    currentFilters.ricerca = ricercaInput?.value?.toLowerCase()?.trim() || '';
    window.applicaFiltriPrenotazioni();
  }

  window.applicaFiltriPrenotazioni = function() {
    filteredPrenotazioni = allPrenotazioni.filter(p => {
      if (currentFilters.stato !== 'tutti' && p.stato !== currentFilters.stato) {
        return false;
      }
      if (currentFilters.ricerca) {
        const searchText = [
          p.idPrenotazione,
          p.nomeAutista1,
          p.codiceFiscaleAutista1,
          p.targa,
          p.destinazione,
          p.cellulare,
          p.email
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchText.includes(currentFilters.ricerca)) {
          return false;
        }
      }
      return true;
    });
    renderPrenotazioni();
    renderQuickStats();
  };

  // MODALE DETTAGLIO COMPLETA
  window.mostraDettaglioPrenotazione = async function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    if (!prenotazione) {
      window.showToast('❌ Prenotazione non trovata', 'error');
      return;
    }

    const p = prenotazione;
    const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
    const dataInizio = p.giornoInizio ? window.formatDateIT ? window.formatDateIT(p.giornoInizio) : '-' : '-';
    const dataFine = p.giornoFine ? window.formatDateIT ? window.formatDateIT(p.giornoFine) : '-' : '-';
    // Genera token autisti per link pubblico
    let tokenAutisti = null;
    try {
      const tokRes = await window.securePost?.('generaTokenAutisti', { idPrenotazione: (p.idPrenotazione || p.id) });
      if (tokRes?.success && tokRes.token) tokenAutisti = tokRes.token;
    } catch (e) {
      console.warn('[mostraDettaglioPrenotazione] Impossibile generare token autisti:', e);
    }
    // Costruisci URL robusto con API URL
    const baseUrl = new URL('dati-autisti', window.location.href);
    baseUrl.searchParams.set('idPrenotazione', String(p.idPrenotazione || p.id));
    if (tokenAutisti) baseUrl.searchParams.set('t', tokenAutisti);
    const linkAutisti = baseUrl.toString();

    // Crea modale se non esiste
    let modal = document.getElementById('dettaglioPrenotazioneModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dettaglioPrenotazioneModal';
      modal.className = 'modal fade';
      modal.tabIndex = -1;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-info-circle me-2"></i>Dettaglio Prenotazione
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><strong>ID:</strong> ${p.idPrenotazione || p.id}</h6>
                <span class="badge badge-status ${badgeClassForStatus(p.stato)}">
                  <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
                </span>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <div class="card">
                  <div class="card-body">
                    <h6 class="card-title text-primary mb-3">
                      <i class="fas fa-user me-2"></i>Primo Autista
                    </h6>
                    <p class="mb-1"><strong>Nome:</strong> ${p.nomeAutista1 || '-'}</p>
                    <p class="mb-1"><strong>CF:</strong> ${p.codiceFiscaleAutista1 || '-'}</p>
                    <p class="mb-1"><strong>Data Nascita:</strong> ${window.formatDateIT(p.dataNascitaAutista1)}</p>
                    <p class="mb-1"><strong>Luogo Nascita:</strong> ${p.luogoNascitaAutista1 || '-'}</p>
                    <p class="mb-1"><strong>Residenza:</strong> ${[p.viaResidenzaAutista1, p.civicoResidenzaAutista1, p.comuneResidenzaAutista1].filter(Boolean).join(', ') || '-'}</p>
                    <p class="mb-1"><strong>Patente:</strong> ${p.numeroPatenteAutista1 || '-'}</p>
                    <p class="mb-1"><strong>Scadenza Patente:</strong> ${window.formatDateIT(p.scadenzaPatenteAutista1)}</p>
                    <p class="mb-1"><strong>Cellulare:</strong> ${p.cellulare || '-'}</p>
                    <p class="mb-0"><strong>Email:</strong> ${p.email || '-'}</p>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card mb-3">
                  <div class="card-body">
                    <h6 class="card-title text-success mb-3">
                      <i class="fas fa-car me-2"></i>Veicolo
                    </h6>
                    <p class="mb-1"><strong>Targa:</strong> ${p.targa || '-'}</p>
                    <p class="mb-0"><strong>Posti:</strong> 9</p>
                  </div>
                </div>

                <div class="card">
                  <div class="card-body">
                    <h6 class="card-title text-info mb-3">
                      <i class="fas fa-calendar-alt me-2"></i>Periodo
                    </h6>
                    <p class="mb-1"><strong>Dal:</strong> ${dataInizio} ore ${p.oraInizio || '-'}</p>
                    <p class="mb-1"><strong>Al:</strong> ${dataFine} ore ${p.oraFine || '-'}</p>
                    <p class="mb-0"><strong>Destinazione:</strong> ${p.destinazione || '-'}</p>
                  </div>
                </div>
              </div>

              ${p.nomeAutista2 ? `
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title text-secondary mb-3">
                        <i class="fas fa-user me-2"></i>Secondo Autista
                      </h6>
                      <p class="mb-1"><strong>Nome:</strong> ${p.nomeAutista2}</p>
                      <p class="mb-1"><strong>CF:</strong> ${p.codiceFiscaleAutista2 || '-'}</p>
                      <p class="mb-0"><strong>Patente:</strong> ${p.numeroPatenteAutista2 || '-'}</p>
                    </div>
                  </div>
                </div>
              ` : ''}

              ${p.nomeAutista3 ? `
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title text-secondary mb-3">
                        <i class="fas fa-user me-2"></i>Terzo Autista
                      </h6>
                      <p class="mb-1"><strong>Nome:</strong> ${p.nomeAutista3}</p>
                      <p class="mb-1"><strong>CF:</strong> ${p.codiceFiscaleAutista3 || '-'}</p>
                      <p class="mb-0"><strong>Patente:</strong> ${p.numeroPatenteAutista3 || '-'}</p>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>

            ${p.importoPreventivo ? `
              <div class="alert alert-success mt-3">
                <strong>💰 Importo Preventivo:</strong> € ${p.importoPreventivo}
              </div>
            ` : ''}

            ${p.pdfUrl ? `
              <div class="alert alert-info mt-3">
                <i class="fas fa-file-pdf me-2"></i>
                <a href="${p.pdfUrl}" target="_blank" class="alert-link">Visualizza Contratto PDF</a>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-glass btn-glass-secondary" data-bs-dismiss="modal">Chiudi</button>
            <a class="btn btn-glass btn-glass-primary" target="_blank" href="${linkAutisti}">
              <i class="fas fa-external-link-alt me-2"></i>Apri link autisti
            </a>
            <button type="button" class="btn btn-glass btn-glass-info" onclick="window.copiaLinkAutisti('${p.idPrenotazione || p.id}')">
              <i class="fas fa-link me-2"></i>Copia link autisti
            </button>
            <button type="button" class="btn btn-glass btn-glass-warning" onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')">
              <i class="fas fa-edit me-2"></i>Modifica
            </button>
            <button type="button" class="btn btn-glass btn-glass-danger" onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')">
              <i class="fas fa-trash me-2"></i>Elimina
            </button>
          </div>
        </div>
      </div>
    `;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  };

  // FUNZIONE ELIMINA CON API REALE
  window.eliminaPrenotazione = async function(idPrenotazione) {
    if (!confirm(`Sei sicuro di voler eliminare la prenotazione ${idPrenotazione}? Questa azione è irreversibile.`)) {
      return;
    }

    try {
      window.showLoader?.(true, 'Eliminazione in corso...');
      
      const response = await window.securePost?.('eliminaPrenotazione', { 
        idPrenotazione: idPrenotazione 
      });
      
      if (response?.success) {
        window.showToast('✅ Prenotazione eliminata con successo', 'success');
        
        // Chiudi modale se aperta
        const modal = document.getElementById('dettaglioPrenotazioneModal');
        if (modal) {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        }
        
        // Ricarica prenotazioni
        await caricaPrenotazioni();
      } else {
        throw new Error(response?.message || 'Errore durante eliminazione');
      }
    } catch (error) {
      console.error('[ELIMINA] Errore:', error);
      window.showToast(`❌ Errore eliminazione: ${error.message}`, 'error');
    } finally {
      window.showLoader?.(false);
    }
  };

  // FUNZIONE MODIFICA COMPLETA - Modale con form editabile
  window.modificaPrenotazione = async function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    if (!prenotazione) {
      window.showToast('❌ Prenotazione non trovata', 'error');
      return;
    }

    const p = prenotazione;
    
    // Crea modale modifica se non esiste
    let modalModifica = document.getElementById('modificaPrenotazioneModal');
    if (!modalModifica) {
      modalModifica = document.createElement('div');
      modalModifica.id = 'modificaPrenotazioneModal';
      modalModifica.className = 'modal fade';
      modalModifica.tabIndex = -1;
      document.body.appendChild(modalModifica);
    }

    // Formatta date per input date (YYYY-MM-DD)
    const formatDateForInput = (dateStr) => {
      if (!dateStr) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      const d = (window.parseDateAny ? parseDateAny(dateStr) : new Date(dateStr));
      if (!d || isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    };

    modalModifica.innerHTML = `
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="fas fa-edit me-2"></i>Modifica Prenotazione #${p.idPrenotazione || p.id}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body">
            <form id="formModificaPrenotazione">
              
              <!-- Veicolo e Periodo -->
              <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                  <i class="fas fa-car me-2"></i>Veicolo e Periodo
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Targa Veicolo <span class="text-danger">*</span></label>
                      <select class="form-select" id="edit-targa" required>
                        <option value="">Seleziona targa…</option>
                      </select>
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Data Inizio <span class="text-danger">*</span></label>
                      <input type="date" class="form-control" id="edit-dataInizio" 
                             value="${formatDateForInput(p.giornoInizio)}" required>
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Ora Inizio</label>
                      <input type="time" class="form-control" id="edit-oraInizio" value="${p.oraInizio || ''}">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Data Fine <span class="text-danger">*</span></label>
                      <input type="date" class="form-control" id="edit-dataFine" 
                             value="${formatDateForInput(p.giornoFine)}" required>
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Ora Fine</label>
                      <input type="time" class="form-control" id="edit-oraFine" value="${p.oraFine || ''}">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Stato</label>
                      <select class="form-select" id="edit-stato" required>
                        <option value="In attesa" ${p.stato === 'In attesa' ? 'selected' : ''}>In attesa</option>
                        <option value="Confermata" ${p.stato === 'Confermata' ? 'selected' : ''}>Confermata</option>
                        <option value="Programmata" ${p.stato === 'Programmata' ? 'selected' : ''}>Programmata</option>
                        <option value="In corso" ${p.stato === 'In corso' ? 'selected' : ''}>In corso</option>
                        <option value="Completata" ${p.stato === 'Completata' ? 'selected' : ''}>Completata</option>
                        <option value="Rifiutata" ${p.stato === 'Rifiutata' ? 'selected' : ''}>Rifiutata</option>
                      </select>
                    </div>
                    
                    <div class="col-md-8">
                      <label class="form-label fw-semibold">Destinazione</label>
                      <input type="text" class="form-control" id="edit-destinazione" 
                             value="${p.destinazione || ''}" placeholder="Città o luogo di destinazione">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Importo Preventivo (€)</label>
                      <input type="number" step="0.01" class="form-control" id="edit-importo" 
                             value="${p.importoPreventivo || ''}" placeholder="0.00">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Primo Autista -->
              <div class="card mb-3">
                <div class="card-header bg-success text-white">
                  <i class="fas fa-user me-2"></i>Primo Autista (Principale)
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Nome Completo <span class="text-danger">*</span></label>
                      <input type="text" class="form-control" id="edit-nomeAutista1" 
                             value="${p.nomeAutista1 || ''}" required>
                    </div>
                    
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Codice Fiscale <span class="text-danger">*</span></label>
                      <input type="text" class="form-control" id="edit-cfAutista1" 
                             value="${p.codiceFiscaleAutista1 || ''}" maxlength="16" required>
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Data Nascita</label>
                      <input type="date" class="form-control" id="edit-dataNascitaAutista1" 
                             value="${formatDateForInput(p.dataNascitaAutista1)}">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Luogo Nascita</label>
                      <input type="text" class="form-control" id="edit-luogoNascitaAutista1" 
                             value="${p.luogoNascitaAutista1 || ''}">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Numero Patente</label>
                      <input type="text" class="form-control" id="edit-patenteAutista1" 
                             value="${p.numeroPatenteAutista1 || ''}">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Scadenza Patente</label>
                      <input type="date" class="form-control" id="edit-scadenzaPatenteAutista1" 
                             value="${formatDateForInput(p.scadenzaPatenteAutista1)}">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Cellulare <span class="text-danger">*</span></label>
                      <input type="tel" class="form-control" id="edit-cellulare" 
                             value="${p.cellulare || ''}" required>
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Email <span class="text-danger">*</span></label>
                      <input type="email" class="form-control" id="edit-email" 
                             value="${p.email || ''}" required>
                    </div>
                    
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Comune Residenza</label>
                      <input type="text" class="form-control" id="edit-comuneResAutista1" 
                             value="${p.comuneResidenzaAutista1 || ''}">
                    </div>
                    
                    <div class="col-md-4">
                      <label class="form-label fw-semibold">Via Residenza</label>
                      <input type="text" class="form-control" id="edit-viaResAutista1" 
                             value="${p.viaResidenzaAutista1 || ''}">
                    </div>
                    
                    <div class="col-md-2">
                      <label class="form-label fw-semibold">Civico</label>
                      <input type="text" class="form-control" id="edit-civicoResAutista1" 
                             value="${p.civicoResidenzaAutista1 || ''}">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Secondo Autista (Opzionale) -->
              <div class="card mb-3">
                <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                  <span><i class="fas fa-user me-2"></i>Secondo Autista (Opzionale)</span>
                  <button type="button" class="btn btn-sm btn-light" onclick="document.getElementById('secondoAutistaFields').classList.toggle('d-none')">
                    <i class="fas fa-chevron-down"></i>
                  </button>
                </div>
                <div class="card-body ${p.nomeAutista2 ? '' : 'd-none'}" id="secondoAutistaFields">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Nome Completo</label>
                      <input type="text" class="form-control" id="edit-nomeAutista2" 
                             value="${p.nomeAutista2 || ''}">
                    </div>
                    
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Codice Fiscale</label>
                      <input type="text" class="form-control" id="edit-cfAutista2" 
                             value="${p.codiceFiscaleAutista2 || ''}" maxlength="16">
                    </div>
                    
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Numero Patente</label>
                      <input type="text" class="form-control" id="edit-patenteAutista2" 
                             value="${p.numeroPatenteAutista2 || ''}">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Terzo Autista (Opzionale) -->
              <div class="card mb-3">
                <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                  <span><i class="fas fa-user me-2"></i>Terzo Autista (Opzionale)</span>
                  <button type="button" class="btn btn-sm btn-light" onclick="document.getElementById('terzoAutistaFields').classList.toggle('d-none')">
                    <i class="fas fa-chevron-down"></i>
                  </button>
                </div>
                <div class="card-body ${p.nomeAutista3 ? '' : 'd-none'}" id="terzoAutistaFields">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Nome Completo</label>
                      <input type="text" class="form-control" id="edit-nomeAutista3" 
                             value="${p.nomeAutista3 || ''}">
                    </div>
                    
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Codice Fiscale</label>
                      <input type="text" class="form-control" id="edit-cfAutista3" 
                             value="${p.codiceFiscaleAutista3 || ''}" maxlength="16">
                    </div>
                    
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Numero Patente</label>
                      <input type="text" class="form-control" id="edit-patenteAutista3" 
                             value="${p.numeroPatenteAutista3 || ''}">
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-glass btn-glass-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>Annulla
            </button>
            <button type="button" class="btn btn-glass btn-glass-success" onclick="window.salvaModificaPrenotazione('${p.idPrenotazione || p.id}')">
              <i class="fas fa-save me-2"></i>Salva Modifiche
            </button>
          </div>
        </div>
      </div>
    `;

    const bsModal = new bootstrap.Modal(modalModifica);
    bsModal.show();

    // Popola menu targhe dalla flotta
    try {
      const selTarga = modalModifica.querySelector('#edit-targa');
      if (selTarga) {
        selTarga.disabled = true;
        selTarga.innerHTML = '<option value="">Caricamento targhe…</option>';
        const res = await window.securePost?.('getVeicoli');
        const lista = Array.isArray(res?.data) ? res.data : [];
        const opts = ['<option value="">Seleziona targa…</option>'].concat(
          lista.map(v => {
            const t = v.Targa || '';
            const label = [v.Targa, v.Marca, v.Modello].filter(Boolean).join(' - ');
            const selected = t && t === (p.targa || '') ? ' selected' : '';
            return `<option value="${t}"${selected}>${label}</option>`;
          })
        ).join('');
        selTarga.innerHTML = opts;
        selTarga.disabled = false;
      }
    } catch (e) {
      console.warn('[modificaPrenotazione] Errore caricamento targhe:', e);
      const selTarga = modalModifica.querySelector('#edit-targa');
      if (selTarga) {
        const current = p.targa || '';
        const label = current || 'N/D';
        selTarga.innerHTML = `<option value="${current}" selected>${label}</option>`;
        selTarga.disabled = false;
      }
    }
    
    // Chiudi modale dettaglio se aperto
    const modalDettaglio = document.getElementById('dettaglioPrenotazioneModal');
    if (modalDettaglio) {
      const bsModalDettaglio = bootstrap.Modal.getInstance(modalDettaglio);
      if (bsModalDettaglio) bsModalDettaglio.hide();
    }
  };

  // FUNZIONE SALVA MODIFICHE - Invia dati modificati al backend
 window.salvaModificaPrenotazione = async function(idPrenotazione) {
    const form = document.getElementById('formModificaPrenotazione');
    if (!form.checkValidity()) {
      form.reportValidity();
      window.showToast('⚠️ Compila tutti i campi obbligatori', 'warning');
      return;
    }

    // Raccogli dati dal form
    const datiModificati = {
      idPrenotazione: idPrenotazione,
      targa: document.getElementById('edit-targa').value.trim(),
      giornoInizio: document.getElementById('edit-dataInizio').value,
      oraInizio: document.getElementById('edit-oraInizio').value,
      giornoFine: document.getElementById('edit-dataFine').value,
      oraFine: document.getElementById('edit-oraFine').value,
      stato: document.getElementById('edit-stato').value,
      destinazione: document.getElementById('edit-destinazione').value.trim(),
      importoPreventivo: document.getElementById('edit-importo').value,
      nomeAutista1: document.getElementById('edit-nomeAutista1').value.trim(),
      codiceFiscaleAutista1: document.getElementById('edit-cfAutista1').value.trim().toUpperCase(),
      dataNascitaAutista1: document.getElementById('edit-dataNascitaAutista1').value,
      luogoNascitaAutista1: document.getElementById('edit-luogoNascitaAutista1').value.trim(),
      numeroPatenteAutista1: document.getElementById('edit-patenteAutista1').value.trim(),
      scadenzaPatenteAutista1: document.getElementById('edit-scadenzaPatenteAutista1').value,
      cellulare: document.getElementById('edit-cellulare').value.trim(),
      email: document.getElementById('edit-email').value.trim(), // email NON obbligatoria
      comuneResidenzaAutista1: document.getElementById('edit-comuneResAutista1').value.trim(),
      viaResidenzaAutista1: document.getElementById('edit-viaResAutista1').value.trim(),
      civicoResidenzaAutista1: document.getElementById('edit-civicoResAutista1').value.trim(),
      nomeAutista2: document.getElementById('edit-nomeAutista2').value.trim(),
      codiceFiscaleAutista2: document.getElementById('edit-cfAutista2').value.trim().toUpperCase(),
      numeroPatenteAutista2: document.getElementById('edit-patenteAutista2').value.trim(),
      nomeAutista3: document.getElementById('edit-nomeAutista3').value.trim(),
      codiceFiscaleAutista3: document.getElementById('edit-cfAutista3').value.trim().toUpperCase(),
      numeroPatenteAutista3: document.getElementById('edit-patenteAutista3').value.trim(),
    };
    try {
      window.showLoader?.(true, 'Salvataggio modifiche in corso...');
      // Chiamata nuova API backend
      const response = await window.securePost?.('aggiornaPrenotazioneCompleta', datiModificati);
      if (response?.success) {
        window.showToast('✅ Prenotazione modificata con successo!', 'success');
        const modal = document.getElementById('modificaPrenotazioneModal');
        if (modal) {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        }
        await caricaPrenotazioni();
      } else {
        throw new Error(response?.message || 'Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('[SALVA MODIFICA] Errore:', error);
      window.showToast(`❌ Errore salvataggio: ${error.message}`, 'error');
    } finally {
      window.showLoader?.(false);
    }
  };

  // Copia link pubblico per compilazione autisti
  window.copiaLinkAutisti = async function(idPren) {
    // Costruisci URL robusto con API URL
    const baseUrl = new URL('dati-autisti', window.location.href);
    baseUrl.searchParams.set('idPrenotazione', String(idPren));
    try {
      const tokRes = await window.securePost?.('generaTokenAutisti', { idPrenotazione: idPren });
      if (tokRes?.success && tokRes.token) {
        baseUrl.searchParams.set('t', tokRes.token);
      }
    } catch(e) {
      console.warn('[copiaLinkAutisti] Impossibile generare token autisti:', e);
    }
    const url = baseUrl.toString();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(()=> window.showToast('🔗 Link autisti copiato negli appunti', 'success'))
        .catch(()=> {
          try {
            const ok = window.prompt('Copia il link autisti:', url);
            if (ok !== null) window.showToast('🔗 Link disponibile', 'info');
          } catch(_) {
            window.showToast('⚠️ Impossibile copiare automaticamente. Usa copia manuale.', 'warning');
          }
        });
    } else {
      try {
        const ok = window.prompt('Copia il link autisti:', url);
        if (ok !== null) window.showToast('🔗 Link disponibile', 'info');
      } catch(_) {
        window.showToast('⚠️ Impossibile copiare automaticamente. Usa copia manuale.', 'warning');
      }
    }
  };
  // Rendi email non obbligatoria anche lato DOM
  document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.querySelector('#edit-email')) {
            node.querySelector('#edit-email').removeAttribute('required');
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.cambiaStatoPrenotazione = async function(idPrenotazione, nuovoStato) {
    try {
      window.showLoader?.(true, 'Aggiornamento stato...');
      
      const response = await window.securePost?.('aggiornaStato', { 
        idPrenotazione: idPrenotazione,
        nuovoStato: nuovoStato
      });
      
      if (response?.success) {
        window.showToast(`✅ Stato aggiornato a: ${nuovoStato}`, 'success');
        await caricaPrenotazioni();
      } else {
        throw new Error(response?.message || 'Errore aggiornamento stato');
      }
    } catch (error) {
      window.showToast(`❌ Errore: ${error.message}`, 'error');
    } finally {
      window.showLoader?.(false);
    }
  };

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ========================================
  // EXPORT GLOBALI per admin-scripts.js
  // ========================================
  
  window.loadPrenotazioniSection = loadPrenotazioniSection;
  window.caricaSezionePrenotazioni = loadPrenotazioniSection;
  window.renderPrenotazioniCard = renderPrenotazioniCard;
  window.renderPrenotazioniTable = renderPrenotazioniTable;

  console.log('[ADMIN-PRENOTAZIONI] v3.11 loaded - Modale Modifica Completo Funzionante! 🎉✨');
})();
