// admin-prenotazioni.js v1.0 - Gestione completa prenotazioni admin
(function(){
  const STATI_COLORI = {
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

  window.loadPrenotazioniSection = async function() {
    const root = document.getElementById('admin-root');
    if (!root) return;

    root.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="h4 fw-bold mb-1">📅 Gestione Prenotazioni</h2>
          <p class="text-muted mb-0">Visualizza e gestisci tutte le prenotazioni</p>
        </div>
        <button class="btn btn-success" onclick="showNewBookingModal()">
          <i class="fas fa-plus me-2"></i>Nuova Prenotazione
        </button>
      </div>

      <!-- Filtri -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label fw-semibold">Filtra per Stato</label>
              <select id="filter-stato" class="form-select">
                <option value="tutti">Tutti gli stati</option>
                <option value="In attesa">In attesa</option>
                <option value="Confermata">Confermata</option>
                <option value="Programmata">Programmata</option>
                <option value="In corso">In corso</option>
                <option value="Completata">Completata</option>
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

      <!-- Statistiche rapide -->
      <div class="row g-3 mb-4" id="stats-cards"></div>

      <!-- Tabella prenotazioni -->
      <div class="card">
        <div class="card-header bg-white">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0 fw-bold">Lista Prenotazioni</h6>
            <span id="count-prenotazioni" class="badge bg-primary">0</span>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0" id="table-prenotazioni">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Veicolo</th>
                  <th>Date</th>
                  <th>Destinazione</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody id="tbody-prenotazioni">
                <tr>
                  <td colspan="7" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Caricamento...</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Bind eventi
    document.getElementById('filter-stato')?.addEventListener('change', aggiornaFiltri);
    document.getElementById('filter-ricerca')?.addEventListener('input', debounce(aggiornaFiltri, 300));

    // Carica dati
    await caricaPrenotazioni();
  };

  async function caricaPrenotazioni() {
    try {
      window.showLoader?.(true, 'Caricamento prenotazioni...');
      
      const response = await window.securePost?.('getPrenotazioni', {});
      
      if (response?.success && response.data) {
        allPrenotazioni = response.data;
        filteredPrenotazioni = [...allPrenotazioni];
        
        renderStatistiche();
        renderPrenotazioni();
        
        window.showToast?.(`✅ ${allPrenotazioni.length} prenotazioni caricate`, 'success');
      } else {
        throw new Error(response?.message || 'Errore caricamento prenotazioni');
      }
      
    } catch (error) {
      console.error('Errore caricamento prenotazioni:', error);
      document.getElementById('tbody-prenotazioni').innerHTML = `
        <tr><td colspan="7" class="text-center text-danger py-4">
          ❌ Errore: ${error.message}
        </td></tr>`;
      window.showToast?.('❌ Errore caricamento prenotazioni', 'error');
    } finally {
      window.showLoader?.(false);
    }
  }

  function renderStatistiche() {
    const statsContainer = document.getElementById('stats-cards');
    if (!statsContainer) return;

    const inAttesa = allPrenotazioni.filter(p => p.stato === 'In attesa').length;
    const confermate = allPrenotazioni.filter(p => p.stato === 'Confermata' || p.stato === 'Programmata').length;
    const inCorso = allPrenotazioni.filter(p => p.stato === 'In corso').length;
    
    // Partenze oggi
    const oggi = new Date().toISOString().split('T')[0];
    const partenzeOggi = allPrenotazioni.filter(p => {
      const dataInizio = new Date(p.giornoInizio).toISOString().split('T')[0];
      return dataInizio === oggi;
    }).length;

    statsContainer.innerHTML = `
      <div class="col-md-3">
        <div class="card border-warning">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">In Attesa</h6>
                <h3 class="mb-0 fw-bold text-warning">${inAttesa}</h3>
              </div>
              <div class="fs-1 text-warning opacity-25">
                <i class="fas fa-clock"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-success">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">Confermate</h6>
                <h3 class="mb-0 fw-bold text-success">${confermate}</h3>
              </div>
              <div class="fs-1 text-success opacity-25">
                <i class="fas fa-check-circle"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-primary">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">In Corso</h6>
                <h3 class="mb-0 fw-bold text-primary">${inCorso}</h3>
              </div>
              <div class="fs-1 text-primary opacity-25">
                <i class="fas fa-car"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-info">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">Partenze Oggi</h6>
                <h3 class="mb-0 fw-bold text-info">${partenzeOggi}</h3>
              </div>
              <div class="fs-1 text-info opacity-25">
                <i class="fas fa-calendar-day"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPrenotazioni() {
    const tbody = document.getElementById('tbody-prenotazioni');
    const countBadge = document.getElementById('count-prenotazioni');
    
    if (!tbody) return;

    if (filteredPrenotazioni.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7" class="text-center text-muted py-4">
          Nessuna prenotazione trovata
        </td></tr>`;
      if (countBadge) countBadge.textContent = '0';
      return;
    }

    // Ordina per data inizio (più recenti prima)
    const sorted = [...filteredPrenotazioni].sort((a, b) => {
      return new Date(b.giornoInizio) - new Date(a.giornoInizio);
    });

    tbody.innerHTML = sorted.map(p => {
      const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
      const dataInizio = p.giornoInizio ? new Date(p.giornoInizio).toLocaleDateString('it-IT') : '-';
      const dataFine = p.giornoFine ? new Date(p.giornoFine).toLocaleDateString('it-IT') : '-';
      
      return `
        <tr>
          <td><strong>${p.idPrenotazione || p.id}</strong></td>
          <td>
            <div>${p.nomeAutista1 || '-'}</div>
            <small class="text-muted">${p.cellulare || '-'}</small>
          </td>
          <td><span class="badge bg-secondary">${p.targa || '-'}</span></td>
          <td>
            <div><small><strong>Dal:</strong> ${dataInizio} ${p.oraInizio || ''}</small></div>
            <div><small><strong>Al:</strong> ${dataFine} ${p.oraFine || ''}</small></div>
          </td>
          <td><small>${p.destinazione || '-'}</small></td>
          <td>
            ${p.stato === 'In attesa' ? `
              <div class="dropdown">
                <button class="btn btn-sm btn-${statoConfig.bg} dropdown-toggle" type="button" 
                  data-bs-toggle="dropdown">
                  <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item text-success" href="#" 
                    onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}', 'Confermata')">
                    <i class="fas fa-check me-2"></i>Conferma
                  </a></li>
                  <li><a class="dropdown-item text-danger" href="#" 
                    onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}', 'Rifiutata')">
                    <i class="fas fa-times me-2"></i>Rifiuta
                  </a></li>
                </ul>
              </div>
            ` : `
              <span class="badge bg-${statoConfig.bg}">
                <i class="fas fa-${statoConfig.icon} me-1"></i>${p.stato}
              </span>
            `}
          </td>
          <td>
            <button class="btn btn-sm btn-outline-primary" 
              onclick="window.mostraDettaglioPrenotazione('${p.idPrenotazione || p.id}')">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (countBadge) countBadge.textContent = filteredPrenotazioni.length;
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
      // Filtro stato
      if (currentFilters.stato !== 'tutti' && p.stato !== currentFilters.stato) {
        return false;
      }
      
      // Filtro ricerca
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
  };

  window.cambiaStatoPrenotazione = async function(idPrenotazione, nuovoStato) {
    if (!confirm(`Confermi il cambio stato a "${nuovoStato}"?`)) return;
    
    try {
      window.showLoader?.(true, `Aggiornamento stato a ${nuovoStato}...`);
      
      const payload = {
        action: 'aggiornaStato',
        idPrenotazione: idPrenotazione,
        nuovoStato: nuovoStato
      };
      
      // Se conferma, chiedi importo
      if (nuovoStato === 'Confermata') {
        const importo = prompt('Inserisci importo preventivo (€):');
        if (importo && !isNaN(parseFloat(importo))) {
          payload.importo = parseFloat(importo);
        }
      }
      
      const response = await window.securePost?.('aggiornaStato', payload);
      
      if (response?.success) {
        window.showToast?.(`✅ Stato aggiornato a: ${nuovoStato}`, 'success');
        
        if (nuovoStato === 'Confermata') {
          window.showToast?.('📧 Email di conferma inviata al cliente', 'info');
        }
        
        // Ricarica lista
        await caricaPrenotazioni();
      } else {
        throw new Error(response?.message || 'Errore aggiornamento stato');
      }
      
    } catch (error) {
      console.error('Errore cambio stato:', error);
      window.showToast?.(`❌ Errore: ${error.message}`, 'error');
    } finally {
      window.showLoader?.(false);
    }
  };

  window.mostraDettaglioPrenotazione = function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => 
      (p.idPrenotazione || p.id) === idPrenotazione
    );
    
    if (!prenotazione) {
      window.showToast?.('Prenotazione non trovata', 'error');
      return;
    }
    
    // TODO: Aprire modal dettaglio (Sprint 2)
    alert('Modal dettaglio in arrivo nello Sprint 2!\n\n' + JSON.stringify(prenotazione, null, 2));
  };

  // Utility: debounce
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

  console.log('[ADMIN-PRENOTAZIONI] v1.0 loaded');
})();
