// admin-prenotazioni.js v3.2.1 - Fix tasto CONFERMA su 'In attesa', azioni card
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
  let currentView = 'card';

  // ... (resto invariato)

  window.showToast = function(message, type = 'info') { /* ...invariato... */ };
  window.loadPrenotazioniSection = async function() { /* ...invariato... */ };
  async function caricaPrenotazioni() { /* ...invariato... */ }
  function showSkeletonLoading() { /* ...invariato... */ }
  function renderQuickStats() { /* ...invariato... */ }
  window.quickStatFilter = function(stato) { /* ...invariato... */ };
  function switchView(type) { /* ...invariato... */ }
  function renderPrenotazioni() { if(currentView === 'card') renderPrenotazioniCard(); else renderPrenotazioniTable(); }

  function renderPrenotazioniCard() {
    const container = document.getElementById('cards-or-table-prenotazioni');
    if (!container) return;
    if (filteredPrenotazioni.length === 0) { /* ...empty state... */ return; }
    const sorted = [...filteredPrenotazioni].sort((a, b) => new Date(b.giornoInizio) - new Date(a.giornoInizio));
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
                ${p.stato === 'In attesa' ? `
                  <button class="btn btn-success w-100 mt-3" onclick="window.confermaPrenotazione('${p.idPrenotazione || p.id}')">
                    <i class="fas fa-check-circle me-1"></i>Conferma
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('') + '</div>';
  }
  // ...table rendering invariato...
  function renderPrenotazioniTable() { /* ...invariato... */ }
  function aggiornaFiltri() { /* ...invariato... */ }
  window.applicaFiltriPrenotazioni = function() { /* ...invariato... */ };

  window.confermaPrenotazione = async function(idPrenotazione) {
    try {
      window.showLoader?.(true, 'Conferma in corso...');
      // Chiamata backend: cambiare in base al tuo servizio reale!
      const res = await window.securePost?.('confermaPrenotazione', { idPrenotazione });
      if (res?.success) {
        window.showToast('✅ Prenotazione confermata!', 'success');
        await caricaPrenotazioni();
      } else {
        throw new Error(res?.message || 'Errore conferma');
      }
    } catch (error) {
      window.showToast(`❌ Errore conferma: ${error.message}`, 'error');
    } finally {
      window.showLoader?.(false);
    }
  };
  // Funzioni azioni placeholder invariati
  window.modificaPrenotazione = async function(idPrenotazione) { window.showToast('⚙️ Funzione modifica in sviluppo', 'info'); };
  window.eliminaPrenotazione = async function(idPrenotazione) { if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return; window.showToast('⚙️ Funzione elimina in sviluppo', 'warning'); };
  window.mostraDettaglioPrenotazione = function(idPrenotazione) { const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione); if (!prenotazione) { window.showToast('❌ Prenotazione non trovata', 'error'); return; } window.showToast('⚙️ Funzione dettaglio in sviluppo', 'info'); };
  function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; }
  console.log('[ADMIN-PRENOTAZIONI] v3.2.1 loaded - Fix conferma su carta, azioni! 🚦');
})();
