// admin-prenotazioni.js v1.2 - Stats cards with colored borders + enhanced icons
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
                  <th class="text-end">Azioni</th>
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

    document.getElementById('filter-stato')?.addEventListener('change', aggiornaFiltri);
    document.getElementById('filter-ricerca')?.addEventListener('input', debounce(aggiornaFiltri, 300));

    await caricaPrenotazioni();
  };

  async function caricaPrenotazioni() {
    try {
      window.showLoader?.(true, 'Caricamento prenotazioni...');
      
      const response = await window.secureGet?.('getPrenotazioni', {});
      
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
    
    const oggi = new Date().toISOString().split('T')[0];
    const partenzeOggi = allPrenotazioni.filter(p => {
      const dataInizio = new Date(p.giornoInizio).toISOString().split('T')[0];
      return dataInizio === oggi;
    }).length;

    statsContainer.innerHTML = `
      <div class="col-md-3">
        <div class="card stats-card card-warning">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">In Attesa</h6>
                <h3 class="mb-0 fw-bold text-warning fs-1">${inAttesa}</h3>
              </div>
              <div class="stats-card-icon text-warning opacity-25">
                <i class="fas fa-clock"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card card-success">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">Confermate</h6>
                <h3 class="mb-0 fw-bold text-success fs-1">${confermate}</h3>
              </div>
              <div class="stats-card-icon text-success opacity-25">
                <i class="fas fa-check-circle"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card card-primary">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">In Corso</h6>
                <h3 class="mb-0 fw-bold text-primary fs-1">${inCorso}</h3>
              </div>
              <div class="stats-card-icon text-primary opacity-25">
                <i class="fas fa-car"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stats-card card-info">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-1">Partenze Oggi</h6>
                <h3 class="mb-0 fw-bold text-info fs-1">${partenzeOggi}</h3>
              </div>
              <div class="stats-card-icon text-info opacity-25">
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
          <td class="text-end">
            <div class="btn-group btn-group-sm" role="group">
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
                <a href="${p.pdfUrl}" target="_blank" class="btn btn-outline-secondary" title="Visualizza PDF">
                  <i class="fas fa-file-pdf"></i>
                </a>
              ` : ''}
            </div>
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
  };

  window.cambiaStatoPrenotazione = async function(idPrenotazione, nuovoStato) {
    if (!confirm(`Confermi il cambio stato a "${nuovoStato}"?`)) return;
    
    try {
      window.showLoader?.(true, `Aggiornamento stato a ${nuovoStato}...`);
      
      const payload = {
        idPrenotazione: idPrenotazione,
        nuovoStato: nuovoStato
      };
      
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
          window.showToast?.('📧 Email di conferma inviata', 'info');
          if (response.pdfGenerato) {
            window.showToast?.('📄 PDF contratto generato', 'success');
          }
        }
        
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

  // ═════════════════════════════════════════════════════════
  // MODIFICA PRENOTAZIONE
  // ═════════════════════════════════════════════════════════

  window.modificaPrenotazione = async function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    
    if (!prenotazione) {
      window.showToast?.('Prenotazione non trovata', 'error');
      return;
    }

    // Crea modal
    const modalHtml = `
      <div class="modal fade" id="modalModificaPrenotazione" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="fas fa-edit me-2"></i>Modifica Prenotazione</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="form-modifica-prenotazione">
                <input type="hidden" id="edit-id" value="${prenotazione.idPrenotazione || prenotazione.id}">
                
                <div class="alert alert-info">
                  <i class="fas fa-info-circle me-2"></i>
                  ${prenotazione.stato !== 'In attesa' ? '📄 Modificando questa prenotazione, il PDF verrà rigenerato automaticamente.' : 'Questa prenotazione è in attesa di conferma.'}
                </div>

                <h6 class="fw-bold mb-3">🚗 Dati Noleggio</h6>
                <div class="row g-3 mb-3">
                  <div class="col-md-4">
                    <label class="form-label">Targa</label>
                    <input type="text" class="form-control" id="edit-targa" value="${prenotazione.targa || ''}" required>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Data Inizio</label>
                    <input type="date" class="form-control" id="edit-giornoInizio" 
                      value="${prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toISOString().split('T')[0] : ''}" required>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Ora Inizio</label>
                    <input type="time" class="form-control" id="edit-oraInizio" value="${prenotazione.oraInizio || ''}" required>
                  </div>
                </div>

                <div class="row g-3 mb-3">
                  <div class="col-md-4">
                    <label class="form-label">Data Fine</label>
                    <input type="date" class="form-control" id="edit-giornoFine" 
                      value="${prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toISOString().split('T')[0] : ''}" required>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Ora Fine</label>
                    <input type="time" class="form-control" id="edit-oraFine" value="${prenotazione.oraFine || ''}" required>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Importo (€)</label>
                    <input type="number" class="form-control" id="edit-importo" value="${prenotazione.importo || ''}" step="0.01">
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Destinazione</label>
                  <input type="text" class="form-control" id="edit-destinazione" value="${prenotazione.destinazione || ''}">
                </div>

                <h6 class="fw-bold mb-3">👤 Contatti Cliente</h6>
                <div class="row g-3 mb-3">
                  <div class="col-md-6">
                    <label class="form-label">Cellulare</label>
                    <input type="tel" class="form-control" id="edit-cellulare" value="${prenotazione.cellulare || ''}">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" id="edit-email" value="${prenotazione.email || ''}">
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
              <button type="button" class="btn btn-primary" onclick="window.salvaModificaPrenotazione()">
                <i class="fas fa-save me-2"></i>Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Rimuovi modal esistente e inserisci nuovo
    document.getElementById('modalModificaPrenotazione')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Mostra modal
    const modal = new bootstrap.Modal(document.getElementById('modalModificaPrenotazione'));
    modal.show();
  };

  window.salvaModificaPrenotazione = async function() {
    try {
      window.showLoader?.(true, 'Salvataggio modifiche...');

      const payload = {
        idPrenotazione: document.getElementById('edit-id').value,
        targa: document.getElementById('edit-targa').value,
        giornoInizio: document.getElementById('edit-giornoInizio').value,
        giornoFine: document.getElementById('edit-giornoFine').value,
        oraInizio: document.getElementById('edit-oraInizio').value,
        oraFine: document.getElementById('edit-oraFine').value,
        destinazione: document.getElementById('edit-destinazione').value,
        cellulare: document.getElementById('edit-cellulare').value,
        email: document.getElementById('edit-email').value,
        importo: document.getElementById('edit-importo').value
      };

      const response = await window.securePost?.('aggiornaPrenotazione', payload);

      if (response?.success) {
        window.showToast?.('✅ Prenotazione aggiornata', 'success');
        
        if (response.pdfRigenerato) {
          window.showToast?.('📄 PDF rigenerato automaticamente', 'info');
        }

        // Chiudi modal
        bootstrap.Modal.getInstance(document.getElementById('modalModificaPrenotazione'))?.hide();

        // Ricarica lista
        await caricaPrenotazioni();
      } else {
        throw new Error(response?.message || 'Errore salvataggio');
      }

    } catch (error) {
      console.error('Errore salvataggio:', error);
      window.showToast?.(`❌ Errore: ${error.message}`, 'error');
    } finally {
      window.showLoader?.(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // ELIMINA PRENOTAZIONE
  // ═════════════════════════════════════════════════════════

  window.eliminaPrenotazione = async function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    
    if (!prenotazione) {
      window.showToast?.('Prenotazione non trovata', 'error');
      return;
    }

    const conferma = confirm(
      `⚠️ ATTENZIONE: Stai per eliminare definitivamente la prenotazione:\n\n` +
      `ID: ${idPrenotazione}\n` +
      `Cliente: ${prenotazione.nomeAutista1}\n` +
      `Targa: ${prenotazione.targa}\n\n` +
      `Questa azione è IRREVERSIBILE e eliminerà anche il PDF associato (se presente).\n\n` +
      `Confermi l'eliminazione?`
    );

    if (!conferma) return;

    try {
      window.showLoader?.(true, 'Eliminazione prenotazione...');

      const response = await window.securePost?.('eliminaPrenotazione', {
        idPrenotazione: idPrenotazione
      });

      if (response?.success) {
        window.showToast?.('✅ Prenotazione eliminata', 'success');
        await caricaPrenotazioni();
      } else {
        throw new Error(response?.message || 'Errore eliminazione');
      }

    } catch (error) {
      console.error('Errore eliminazione:', error);
      window.showToast?.(`❌ Errore: ${error.message}`, 'error');
    } finally {
      window.showLoader?.(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // DETTAGLIO PRENOTAZIONE
  // ═════════════════════════════════════════════════════════

  window.mostraDettaglioPrenotazione = function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    
    if (!prenotazione) {
      window.showToast?.('Prenotazione non trovata', 'error');
      return;
    }
    
    const statoConfig = STATI_COLORI[prenotazione.stato] || STATI_COLORI['In attesa'];
    const dataInizio = prenotazione.giornoInizio ? new Date(prenotazione.giornoInizio).toLocaleDateString('it-IT') : '-';
    const dataFine = prenotazione.giornoFine ? new Date(prenotazione.giornoFine).toLocaleDateString('it-IT') : '-';

    const modalHtml = `
      <div class="modal fade" id="modalDettaglioPrenotazione" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-info-circle me-2"></i>Dettaglio Prenotazione ${prenotazione.idPrenotazione || prenotazione.id}
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-12">
                  <span class="badge bg-${statoConfig.bg} fs-6">
                    <i class="fas fa-${statoConfig.icon} me-1"></i>${prenotazione.stato}
                  </span>
                </div>

                <div class="col-md-6">
                  <h6 class="fw-bold">👤 Cliente Principale</h6>
                  <p class="mb-1"><strong>Nome:</strong> ${prenotazione.nomeAutista1 || '-'}</p>
                  <p class="mb-1"><strong>CF:</strong> ${prenotazione.codiceFiscaleAutista1 || '-'}</p>
                  <p class="mb-1"><strong>Tel:</strong> ${prenotazione.cellulare || '-'}</p>
                  <p class="mb-1"><strong>Email:</strong> ${prenotazione.email || '-'}</p>
                </div>

                <div class="col-md-6">
                  <h6 class="fw-bold">🚗 Noleggio</h6>
                  <p class="mb-1"><strong>Veicolo:</strong> ${prenotazione.targa || '-'}</p>
                  <p class="mb-1"><strong>Dal:</strong> ${dataInizio} ${prenotazione.oraInizio || ''}</p>
                  <p class="mb-1"><strong>Al:</strong> ${dataFine} ${prenotazione.oraFine || ''}</p>
                  <p class="mb-1"><strong>Destinazione:</strong> ${prenotazione.destinazione || '-'}</p>
                  ${prenotazione.importo ? `<p class="mb-1"><strong>Importo:</strong> € ${prenotazione.importo}</p>` : ''}
                </div>

                ${prenotazione.nomeAutista2 ? `
                  <div class="col-12">
                    <h6 class="fw-bold">👤 Autista 2</h6>
                    <p class="mb-1">${prenotazione.nomeAutista2} - ${prenotazione.codiceFiscaleAutista2 || '-'}</p>
                  </div>
                ` : ''}

                ${prenotazione.nomeAutista3 ? `
                  <div class="col-12">
                    <h6 class="fw-bold">👤 Autista 3</h6>
                    <p class="mb-1">${prenotazione.nomeAutista3} - ${prenotazione.codiceFiscaleAutista3 || '-'}</p>
                  </div>
                ` : ''}

                ${prenotazione.pdfUrl ? `
                  <div class="col-12">
                    <h6 class="fw-bold">📄 Contratto PDF</h6>
                    <a href="${prenotazione.pdfUrl}" target="_blank" class="btn btn-outline-primary btn-sm">
                      <i class="fas fa-file-pdf me-2"></i>Visualizza PDF
                    </a>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
              <button type="button" class="btn btn-warning" 
                onclick="bootstrap.Modal.getInstance(document.getElementById('modalDettaglioPrenotazione')).hide(); window.modificaPrenotazione('${prenotazione.idPrenotazione || prenotazione.id}');">
                <i class="fas fa-edit me-2"></i>Modifica
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modalDettaglioPrenotazione')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = new bootstrap.Modal(document.getElementById('modalDettaglioPrenotazione'));
    modal.show();
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

  console.log('[ADMIN-PRENOTAZIONI] v1.2 loaded - Enhanced UI with colored stats cards');
})();