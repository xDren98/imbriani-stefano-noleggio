// admin-prenotazioni.js v3.9 - Fix formato date patenti/nascita con formatDateIT
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
// ... codice invariato ...
  window.mostraDettaglioPrenotazione = function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    if (!prenotazione) {
      window.showToast('❌ Prenotazione non trovata', 'error');
      return;
    }

    const p = prenotazione;
    const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
    const dataInizio = window.formatDateIT ? window.formatDateIT(p.giornoInizio) : '-';
    const dataFine = window.formatDateIT ? window.formatDateIT(p.giornoFine) : '-';

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
                      <p class="mb-1"><strong>Scadenza Patente:</strong> ${window.formatDateIT(p.scadenzaPatenteAutista2)}</p>
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
                      <p class="mb-1"><strong>Scadenza Patente:</strong> ${window.formatDateIT(p.scadenzaPatenteAutista3)}</p>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
// ...resto invariato ...
