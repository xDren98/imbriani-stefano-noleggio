// admin-prenotazioni.js v3.6 - Export globali fix + full logic
(function(){
  const STATI_TABELLA = ['Tutte', 'In attesa', 'Programmata', 'In corso', 'Completata'];
  const STATI_COLORI = {
    'Tutte': { bg: 'secondary', icon: 'list', text: 'white' },
    'In attesa': { bg: 'warning', icon: 'clock', text: 'dark' },
    'Confermata': { bg: 'success', icon: 'check-circle', text: 'white' },
    'Programmata': { bg: 'info', icon: 'calendar-check', text: 'white' },
    'In corso': { bg: 'primary', icon: 'car', text: 'white' },
    'Completata': { bg: 'secondary', icon: 'flag-checkered', text: 'white' },
    'Rifiutata': { bg: 'danger', icon: 'times-circle', text: 'white' }
  };

  let allPrenotazioni = [];
  let filteredPrenotazioni = [];
  let currentFilters = { stato: 'tutti', ricerca: '' };
  let currentView = 'card'; // 'card' or 'table'

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

  window.loadPrenotazioniSection = async function() {
    const root = document.getElementById('admin-root');
    if (!root) return;
    
    // Header con breadcrumb v3.2
    root.innerHTML = `
      <div class="breadcrumb mb-3">
        <a href="#" onclick="window.loadDashboard?.(); return false;">Dashboard</a>
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
             <button class="btn btn-success ms-3" onclick="showNewBookingModal()">
               <i class="fas fa-plus me-2"></i>Nuova Prenotazione
             </button>
           </div>
        </div>
      </div>

      <div class="mb-3" id="quick-stats"></div>

      <!-- Filtri -->
      <div class="card mb-3" style="border-radius:14px;">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label fw-semibold">Filtra per Stato</label>
              <select id="filter-stato" class="form-select">
                <option value="tutti">Tutti gli stati</option>
                <option value="In attesa">In attesa</option>
                <option value="Programmata">Programmata</option>
                <option value="In corso">In corso</option>
                <option value="Completata">Completata</option>
                <option value="Confermata">Confermata</option>
                <option value="Rifiutata">Rifiutata</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Ricerca</label>
              <input type="text" id="filter-ricerca" class="form-control" 
                     placeholder="Cerca per ID, CF, Nome, Targa...">
            </div>
            <div class="col-md-3">
              <button class="btn btn-primary w-100" onclick="window.applicaFiltriPrenotazioni()">
                <i class="fas fa-filter me-2"></i>Applica Filtri
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="cards-or-table-prenotazioni" class="mb-4"></div>
    `;

    document.getElementById('filter-stato')?.addEventListener('change', aggiornaFiltri);
    document.getElementById('filter-ricerca')?.addEventListener('input', debounce(aggiornaFiltri, 300));
    document.getElementById('btn-view-grid').onclick = () => switchView('card');
    document.getElementById('btn-view-list').onclick = () => switchView('table');
    
    await caricaPrenotazioni();
  };

  async function caricaPrenotazioni() {
    try {
      // Mostra skeleton loading v3.2
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

  // Skeleton loading v3.2
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
      'Completata': allPrenotazioni.filter(p => p.stato === 'Completata').length
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
    document.getElementById('filter-stato').value = stato === 'Tutte' ? 'tutti' : stato;
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
    
    // Empty state v3.2
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
            ? '<button class="btn btn-primary" onclick="window.quickStatFilter(\'Tutte\')">Mostra Tutte</button>' 
            : '<button class="btn btn-success" onclick="showNewBookingModal()"><i class="fas fa-plus me-2"></i>Crea Prenotazione</button>'}
        </div>
      `;
      return;
    }
    
    const sorted = [...filteredPrenotazioni].sort((a, b) => {
      return new Date(b.giornoInizio) - new Date(a.giornoInizio);
    });
    
    container.innerHTML = `<div class="row g-3">` +
      sorted.map(p => {
        const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
        const dataInizio = p.giornoInizio ? new Date(p.giornoInizio).toLocaleDateString('it-IT') : '-';
        const dataFine = p.giornoFine ? new Date(p.giornoFine).toLocaleDateString('it-IT') : '-';
        const oraInizio = p.oraInizio || '';
        const oraFine = p.oraFine || '';
        
        return `
          <div class="col-md-4">
            <div class="card glass-card mb-3 shadow-sm border-0">
              <div class="card-body">
                <div class="d-flex align-items-center mb-2 gap-3">
                  <span class="badge bg-${statoConfig.bg} fs-6 py-2 px-3">
                    <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
                  </span>
                  <span class="badge bg-secondary fs-6">${p.targa || '-'}</span>
                  <span class="ms-auto text-muted small">
                    <i class="fa-regular fa-calendar me-1"></i>${dataInizio} → ${dataFine}
                  </span>
                </div>
                
                <div class="card-prenotazione-nome mb-1">${p.nomeAutista1 || '-'}</div>
                <div class="mb-1 text-muted fw-normal small">
                  <i class="fas fa-phone me-1"></i>${p.cellulare || '-'}
                </div>
                <div class="mb-1 text-muted fw-normal small">
                  <i class="fas fa-envelope me-1"></i>${p.email || '-'}
                </div>
                
                <!-- Informazioni complete v3.2 -->
                <div class="mb-1 text-info fw-semibold small">
                  <i class="fas fa-clock me-1"></i>
                  <strong>Dal:</strong> ${dataInizio} ${oraInizio} 
                  <strong>- Al:</strong> ${dataFine} ${oraFine}
                </div>
                
                ${p.destinazione ? `
                  <div class="mb-1 text-warning fw-normal small">
                    <i class="fas fa-map-marker-alt me-1"></i>${p.destinazione}
                  </div>
                ` : ''}
                
                <div class="d-flex justify-content-between align-items-center mt-2 gap-2 flex-wrap">
                  <span class="small text-primary"><b>${p.idPrenotazione || p.id}</b></span>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" title="Dettagli" 
                            onclick="window.mostraDettaglioPrenotazione('${p.idPrenotazione || p.id}')">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-warning" title="Modifica" 
                            onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Elimina" 
                            onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                    ${p.pdfUrl ? `
                      <a href="${p.pdfUrl}" target="_blank" 
                         class="btn btn-outline-secondary" title="PDF">
                        <i class="fas fa-file-pdf"></i>
                      </a>
                    ` : ''}
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
    
    // Empty state per tabella v3.2
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
            ? '<button class="btn btn-primary" onclick="window.quickStatFilter(\'Tutte\')">Mostra Tutte</button>' 
            : '<button class="btn btn-success" onclick="showNewBookingModal()"><i class="fas fa-plus me-2"></i>Crea Prenotazione</button>'}
        </div>
      `;
      return;
    }
    
    const sorted = [...filteredPrenotazioni].sort((a, b) => {
      return new Date(b.giornoInizio) - new Date(a.giornoInizio);
    });
    
    container.innerHTML = `
      <div class="card">
        <div class="card-header">Lista Prenotazioni</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Veicolo</th>
                  <th>Date</th>
                  <th>Orari</th>
                  <th>Destinazione</th>
                  <th>Stato</th>
                  <th class="text-end">Azioni</th>
                </tr>
              </thead>
              <tbody>
                ${sorted.map(p => {
                  const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
                  const dataInizio = p.giornoInizio ? new Date(p.giornoInizio).toLocaleDateString('it-IT') : '-';
                  const dataFine = p.giornoFine ? new Date(p.giornoFine).toLocaleDateString('it-IT') : '-';
                  const oraInizio = p.oraInizio || '';
                  const oraFine = p.oraFine || '';
                  
                  return `
                    <tr>
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
                        <span class="badge bg-${statoConfig.bg}">
                          <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
                        </span>
                      </td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" title="Dettagli" 
                                  onclick="window.mostraDettaglioPrenotazione('${p.idPrenotazione || p.id}')">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-outline-warning" title="Modifica" 
                                  onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-outline-danger" title="Elimina" 
                                  onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')">
                            <i class="fas fa-trash"></i>
                          </button>
                          ${p.pdfUrl ? `
                            <a href="${p.pdfUrl}" target="_blank" 
                               class="btn btn-outline-secondary" title="PDF">
                              <i class="fas fa-file-pdf"></i>
                            </a>
                          ` : ''}
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
    currentFilters.stato = statoSelect?.value || 'tutti';
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

  // Funzioni placeholder per azioni
  window.cambiaStatoPrenotazione = async function(idPrenotazione, nuovoStato) {
    window.showToast('⚙️ Funzione cambio stato in sviluppo', 'info');
  };

  window.modificaPrenotazione = async function(idPrenotazione) {
    window.showToast('⚙️ Funzione modifica in sviluppo', 'info');
  };

  window.eliminaPrenotazione = async function(idPrenotazione) {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;
    window.showToast('⚙️ Funzione elimina in sviluppo', 'warning');
  };

  window.mostraDettaglioPrenotazione = function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    if (!prenotazione) {
      window.showToast('❌ Prenotazione non trovata', 'error');
      return;
    }
    window.showToast('⚙️ Funzione dettaglio in sviluppo', 'info');
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

  // Espone la funzione principale per il caricamento della sezione
  window.loadPrenotazioniSection = loadPrenotazioniSection;
  window.caricaSezionePrenotazioni = loadPrenotazioniSection;

  // Espone funzioni di rendering (per chiamate esterne se necessario)
  window.renderPrenotazioniCard = renderPrenotazioniCard;
  window.renderPrenotazioniTable = renderPrenotazioniTable;

  console.log('[ADMIN-PRENOTAZIONI] v3.6 loaded - Export globali fix + full logic! 🚀');
})();
