// admin-prenotazioni.js v3.11 - Pulsanti Conferma/Rifiuta solo su prenotazioni "In attesa"
(function(){
  // ...tutto invariato sopra...

  // Sostituisco la funzione renderPrenotazioniCard per aggiungere i pulsanti
  function renderPrenotazioniCard() {
    const container = document.getElementById('cards-or-table-prenotazioni');
    if (!container) return;
    if (filteredPrenotazioni.length === 0) {
      container.innerHTML = /* ...come sopra... */``;
      return;
    }
    const sorted = [...filteredPrenotazioni].sort((a, b) => {
      return new Date(b.giornoInizio) - new Date(a.giornoInizio);
    });
    container.innerHTML = `<div class="row g-3">` +
      sorted.map(p => {
        const statoConfig = STATI_COLORI[p.stato] || STATI_COLORI['In attesa'];
        // ...estrai date, orari...
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
            <div class="card glass-card mb-3 shadow-sm border-0 prenotazione-clickable" onclick="window.mostraDettaglioPrenotazione('${p.idPrenotazione || p.id}')">
              <div class="card-body">
                <!-- Resto invariato... -->
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

  // Anche nel dettaglio modale aggiungo i pulsanti se stato = 'In attesa'
  window.mostraDettaglioPrenotazione = function(idPrenotazione) {
    const prenotazione = allPrenotazioni.find(p => (p.idPrenotazione || p.id) === idPrenotazione);
    if (!prenotazione) {
      window.showToast('❌ Prenotazione non trovata', 'error');
      return;
    }
    const p = prenotazione;
    // ...come prima...
    let modalBtns = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>`;
    if(p.stato === 'In attesa') {
      modalBtns += `<button type="button" class="btn btn-success" onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Confermata')"><i class="fas fa-check me-2"></i>Conferma</button>`;
      modalBtns += `<button type="button" class="btn btn-danger" onclick="window.cambiaStatoPrenotazione('${p.idPrenotazione || p.id}','Rifiutata')"><i class="fas fa-times me-2"></i>Rifiuta</button>`;
    }
    modalBtns += `<button type="button" class="btn btn-warning" onclick="window.modificaPrenotazione('${p.idPrenotazione || p.id}')"><i class="fas fa-edit me-2"></i>Modifica</button>`;
    modalBtns += `<button type="button" class="btn btn-danger" onclick="window.eliminaPrenotazione('${p.idPrenotazione || p.id}')"><i class="fas fa-trash me-2"></i>Elimina</button>`;
    modal.innerHTML = /* ...resto invariato... */
      `<div class="modal-dialog modal-lg"><div class="modal-content">...<div class="modal-footer">${modalBtns}</div></div></div>`;
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  };

  // ...tutto invariato sotto...

  window.renderPrenotazioniCard = renderPrenotazioniCard;
  // ...resto invariato...
})();
