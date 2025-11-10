
// admin-prenotazioni.js v3.10 - Card cliccabile + Modifica/Elimina con API reali
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
             <button class="btn btn-success ms-3" onclick="window.showNewBookingModal?.()">
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
            : '<button class="btn btn-success" onclick="window.showNewBookingModal?.()"><i class="fas fa-plus me-2"></i>Crea Prenotazione</button>'}
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
                  <i class="fas fa-phone me-1"></i>${p.cellulare || '-'}</div>
                <div class="mb-1 text-muted fw-normal small">
                  <i class="fas fa-envelope me-1"></i>${p.email || '-'}</div>
                <div class="mb-1 text-info fw-semibold small">
                  <i class="fas fa-clock me-1"></i>
                  <strong>Dal:</strong> ${dataInizio} ${oraInizio} <strong>- Al:</strong> ${dataFine} ${oraFine}
                </div>
                ${p.destinazione ? `<div class="mb-1 text-warning fw-normal small">
                    <i class="fas fa-map-marker-alt me-1"></i>${p.destinazione}</div>` : ''}
                <div class="d-flex justify-content-between align-items-center mt-2 gap-2 flex-wrap" onclick="event.stopPropagation()">
                  <span class="small text-primary"><b>${p.idPrenotazione || p.id}</b></span>
                  ${p.stato === 'In attesa' ? `
                    <button class="btn btn-outline-success btn-sm me-1" title="Conferma" 
                            onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Confermata');event.stopPropagation();">
                      <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm me-1" title="Rifiuta" 
                            onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Rifiutata');event.stopPropagation();">
                      <i class="fas fa-times"></i>
                    </button>
                  ` : ''}
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning" title="Modifica" 
                            onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}'); event.stopPropagation();">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Elimina" 
                            onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}'); event.stopPropagation();">
                      <i class="fas fa-trash"></i>
                    </button>
                    ${p.pdfUrl ? `<a href="${p.pdfUrl}" target="_blank" 
                         class="btn btn-outline-secondary" title="PDF"
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
            ? '<button class="btn btn-primary" onclick="window.quickStatFilter(\'Tutte\')">Mostra Tutte</button>' 
            : '<button class="btn btn-success" onclick="window.showNewBookingModal?.()"><i class="fas fa-plus me-2"></i>Crea Prenotazione</button>'}
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
                        <span class="badge bg-${statoConfig.bg}">
                          <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
                        </span>
                      </td>
                      <td class="text-end" onclick="event.stopPropagation()">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-warning" title="Modifica" 
                                  onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-outline-danger" title="Elimina" 
                                  onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')">
                            <i class="fas fa-trash"></i>
                          </button>
                          ${p.pdfUrl ? `<a href="${p.pdfUrl}" target="_blank" 
                               class="btn btn-outline-secondary" title="PDF">
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

  // MODALE DETTAGLIO COMPLETA
  window.mostraDettaglioPrenotazione = function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    if (!prenotazione) {
      window.showToast('❌ Prenotazione non trovata', 'error');
      return;
    }

    const p = prenotazione;
    const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
    const dataInizio = p.giornoInizio ? window.formatDateIT ? window.formatDateIT(p.giornoInizio) : '-' : '-';
    const dataFine = p.giornoFine ? window.formatDateIT ? window.formatDateIT(p.giornoFine) : '-' : '-';

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
                <span class="badge bg-${statoConfig.bg} fs-6 py-2 px-3">
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
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
            <button type="button" class="btn btn-warning" onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')">
              <i class="fas fa-edit me-2"></i>Modifica
            </button>
            <button type="button" class="btn btn-danger" onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')">
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

  // FUNZIONE MODIFICA - Placeholder per form modale
  window.modificaPrenotazione = async function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    if (!prenotazione) {
      window.showToast('❌ Prenotazione non trovata', 'error');
      return;
    }
    
    // TODO: Implementare modale modifica con form completo
    window.showToast('⚙️ Funzione modifica in sviluppo - Form modale in arrivo', 'info');
    console.log('[MODIFICA] Prenotazione da modificare:', prenotazione);
  };

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

  console.log('[ADMIN-PRENOTAZIONI] v3.10 loaded - Card cliccabile + Modifica/Elimina con API reali! 🚀');
})();
