// admin-prenotazioni.js v3.12 - Pulsanti Conferma/Rifiuta solo per "In attesa"
(function(){
// ...definizioni iniziali e variabili globali invariati...

// MOD: funzione card con pulsanti conferma/rifiuta
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
      </div>`;
    return;
  }
  const sorted = [...filteredPrenotazioni].sort((a, b) => {
    return new Date(b.giornoInizio) - new Date(a.giornoInizio);
  });
  container.innerHTML = `<div class="row g-3">` +
    sorted.map(p => {
      const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
      const dataInizio = p.giornoInizio ? window.formatDateIT(p.giornoInizio) : '-';
      const dataFine = p.giornoFine ? window.formatDateIT(p.giornoFine) : '-';
      const oraInizio = p.oraInizio || '';
      const oraFine = p.oraFine || '';
      let actionBtns = `<div class="btn-group btn-group-sm">`;
      if(p.stato === 'In attesa') {
        actionBtns += `
          <button class="btn btn-outline-success" title="Conferma" onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Confermata');event.stopPropagation();">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-outline-danger" title="Rifiuta" onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Rifiutata');event.stopPropagation();">
            <i class="fas fa-times"></i>
          </button>`;
      }
      actionBtns += `
        <button class="btn btn-outline-warning" title="Modifica" onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}');event.stopPropagation();">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-outline-danger" title="Elimina" onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}');event.stopPropagation();">
          <i class="fas fa-trash"></i>
        </button>`;
      if(p.pdfUrl) {
        actionBtns += `<a href="${p.pdfUrl}" target="_blank" class="btn btn-outline-secondary" title="PDF" onclick="event.stopPropagation();">
          <i class="fas fa-file-pdf"></i>
        </a>`;
      }
      actionBtns += '</div>';
      return `
        <div class="col-md-4">
          <div class="card glass-card mb-3 shadow-sm border-0 prenotazione-clickable" 
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
                ${actionBtns}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') + '</div>';
}
// MODALE dettaglio: Conferma/Rifiuta in attesa
window.mostraDettaglioPrenotazione = function(idPrenotazione) {
  const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
  if (!prenotazione) {
    window.showToast('❌ Prenotazione non trovata', 'error');
    return;
  }
  const p = prenotazione;
  const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
  const dataInizio = p.giornoInizio ? window.formatDateIT(p.giornoInizio) : '-';
  const dataFine = p.giornoFine ? window.formatDateIT(p.giornoFine) : '-';
  let modal = document.getElementById('dettaglioPrenotazioneModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dettaglioPrenotazioneModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    document.body.appendChild(modal);
  }
  let modalBtns = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>`;
  if(p.stato === 'In attesa') {
    modalBtns += `<button type="button" class="btn btn-success" onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Confermata')"><i class="fas fa-check me-2"></i>Conferma</button>`;
    modalBtns += `<button type="button" class="btn btn-danger" onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Rifiutata')"><i class="fas fa-times me-2"></i>Rifiuta</button>`;
  }
  modalBtns += `<button type="button" class="btn btn-warning" onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')"><i class="fas fa-edit me-2"></i>Modifica</button>`;
  modalBtns += `<button type="button" class="btn btn-danger" onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')"><i class="fas fa-trash me-2"></i>Elimina</button>`;
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
          <div class="row g-3"> ...dettaglio invariato... </div>
        </div>
        <div class="modal-footer">${modalBtns}</div>
      </div>
    </div>`;
  const bsModal = new bootstrap.Modal(modal); bsModal.show();
};
// esporta
window.renderPrenotazioniCard = renderPrenotazioniCard;
// ...il resto resta invariato...
})();
