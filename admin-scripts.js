/**
 * IMBRIANI STEFANO NOLEGGIO - ADMIN SCRIPTS v8.0
 * Gestione dashboard, flotta e manutenzioni
 */

const ADMIN_CONFIG = {
  VERSION: '8.0',
  REFRESH_INTERVAL: 30000,
  ITEMS_PER_PAGE: 50
};

let adminData = {
  prenotazioni: [],
  clienti: [],
  flotta: [],
  manutenzioni: [],
  stats: {}
};

// Navigation and section management
function loadAdminSection(section) {
  const root = document.getElementById('admin-root');
  if (!root) return;
  
  showLoader(true, `Caricamento ${section}...`);
  
  switch (section) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'prenotazioni':
      loadPrenotazioni();
      break;
    case 'clienti':
      loadClienti();
      break;
    case 'flotta':
      loadFlotta();
      break;
    case 'manutenzioni':
      loadManutenzioni();
      break;
    case 'statistiche':
      loadStatistiche();
      break;
    case 'settings':
      loadSettings();
      break;
    default:
      loadDashboard();
  }
}

// Gestione Flotta
async function loadFlotta() {
  try {
    const response = await callAPI('flotta', { method: 'get' });
    adminData.flotta = response.success ? response.data : [];
    renderFlottaSection();
  } catch (error) {
    console.error('Errore caricamento flotta:', error);
    showToast('Errore caricamento flotta', 'error');
  } finally {
    showLoader(false);
  }
}

function renderFlottaSection() {
  const root = document.getElementById('admin-root');
  
  root.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 fw-bold mb-1">Gestione Flotta</h2>
        <p class="text-muted mb-0">${adminData.flotta.length} veicoli registrati</p>
      </div>
      <button class="btn btn-primary" onclick="showAddVehicleModal()"><i class="fas fa-plus me-2"></i>Aggiungi Veicolo</button>
    </div>
    
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Targa</th>
                <th>Marca</th>
                <th>Modello</th>
                <th>Posti</th>
                <th>Stato</th>
                <th>Note</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="flotta-tbody">
              ${adminData.flotta.map(renderFlottaRow).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Modal Aggiungi/Modifica Veicolo -->
    <div class="modal fade" id="vehicleFormModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Aggiungi/Modifica Veicolo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="vehicle-form">
              <div class="mb-3">
                <label class="form-label">Targa *</label>
                <input type="text" id="vehicle-targa" class="form-control" maxlength="7" placeholder="AB123CD" required>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Marca *</label>
                  <input type="text" id="vehicle-marca" class="form-control" placeholder="Fiat" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Modello *</label>
                  <input type="text" id="vehicle-modello" class="form-control" placeholder="Ducato" required>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Posti</label>
                  <input type="number" id="vehicle-posti" class="form-control" value="9" min="1" max="50">
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Stato</label>
                  <select id="vehicle-stato" class="form-select">
                    <option value="Disponibile">Disponibile</option>
                    <option value="Occupato">Occupato</option>
                    <option value="Manutenzione">Manutenzione</option>
                    <option value="Fuori servizio">Fuori servizio</option>
                  </select>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Note</label>
                <textarea id="vehicle-note" class="form-control" rows="3" placeholder="Note aggiuntive..."></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary" onclick="saveVehicle()">Salva Veicolo</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFlottaRow(vehicle) {
  const passoLungo = isPassoLungo(vehicle);
  const badges = getVehicleBadges(vehicle);
  const badgeHTML = badges.map(b => `<span class="badge ${b.class} me-1">${b.text}</span>`).join('');
  
  return `
    <tr>
      <td><code class="small">${vehicle.Targa}</code></td>
      <td>${vehicle.Marca}</td>
      <td>${vehicle.Modello}${passoLungo ? ' <small class="text-warning">(Passo Lungo)</small>' : ''}</td>
      <td><i class="fas fa-users me-1"></i>${vehicle.Posti}</td>
      <td>${badgeHTML}</td>
      <td><small class="text-muted">${vehicle.Note || '-'}</small></td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="editVehicle('${vehicle.Targa}')" title="Modifica">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteVehicle('${vehicle.Targa}')" title="Elimina">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// Gestione Manutenzioni
async function loadManutenzioni() {
  try {
    const response = await callAPI('manutenzioni', { method: 'list' });
    adminData.manutenzioni = response.success ? response.data : [];
    renderManutenzioniSection();
  } catch (error) {
    console.error('Errore caricamento manutenzioni:', error);
    showToast('Errore caricamento manutenzioni', 'error');
  } finally {
    showLoader(false);
  }
}

function renderManutenzioniSection() {
  const root = document.getElementById('admin-root');
  
  root.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 fw-bold mb-1">Registro Manutenzioni</h2>
        <p class="text-muted mb-0">${adminData.manutenzioni.length} manutenzioni registrate</p>
      </div>
      <button class="btn btn-warning" onclick="showAddMaintenanceModal()"><i class="fas fa-plus me-2"></i>Nuova Manutenzione</button>
    </div>
    
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Targa</th>
                <th>Veicolo</th>
                <th>Stato</th>
                <th>Data Inizio</th>
                <th>Data Fine</th>
                <th>Costo</th>
                <th>Note</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              ${adminData.manutenzioni.map(renderMaintenanceRow).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Modal Manutenzione -->
    <div class="modal fade" id="maintenanceFormModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Nuova/Modifica Manutenzione</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="maintenance-form">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Targa *</label>
                  <input type="text" id="maint-targa" class="form-control" maxlength="7" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Stato</label>
                  <select id="maint-stato" class="form-select">
                    <option value="Programmata">Programmata</option>
                    <option value="In corso">In corso</option>
                    <option value="Completata">Completata</option>
                    <option value="Annullata">Annullata</option>
                  </select>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Data Inizio *</label>
                  <input type="date" id="maint-data-inizio" class="form-control" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Data Fine</label>
                  <input type="date" id="maint-data-fine" class="form-control">
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Costo Manutenzione (€)</label>
                <input type="number" id="maint-costo" class="form-control" step="0.01" min="0" placeholder="0.00">
              </div>
              <div class="mb-3">
                <label class="form-label">Note</label>
                <textarea id="maint-note" class="form-control" rows="3" placeholder="Descrizione manutenzione..."></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-warning" onclick="saveMaintenance()">Salva Manutenzione</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMaintenanceRow(maint) {
  const statusColor = getMaintenanceStatusColor(maint.Stato);
  const costFormatted = formatCurrency(maint.Costo);
  
  return `
    <tr>
      <td><code class="small">${maint.Targa}</code></td>
      <td>${maint.Marca} ${maint.Modello}${maint.Targa === 'EC787NM' ? ' <small class="text-warning">(Passo Lungo)</small>' : ''}</td>
      <td><span class="badge bg-${statusColor}">${maint.Stato}</span></td>
      <td>${formatDateForDisplay(maint.DataInizio)}</td>
      <td>${maint.DataFine ? formatDateForDisplay(maint.DataFine) : '-'}</td>
      <td>${costFormatted}</td>
      <td><small class="text-muted">${maint.Note || '-'}</small></td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="editMaintenance(${maint.ID})" title="Modifica">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteMaintenance(${maint.ID})" title="Elimina">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// CRUD Veicoli
function showAddVehicleModal() {
  const modal = new bootstrap.Modal(document.getElementById('vehicleFormModal'));
  clearVehicleForm();
  modal.show();
}

function editVehicle(targa) {
  const vehicle = adminData.flotta.find(v => v.Targa === targa);
  if (!vehicle) return;
  
  document.getElementById('vehicle-targa').value = vehicle.Targa;
  document.getElementById('vehicle-marca').value = vehicle.Marca || '';
  document.getElementById('vehicle-modello').value = vehicle.Modello || '';
  document.getElementById('vehicle-posti').value = vehicle.Posti || 9;
  document.getElementById('vehicle-stato').value = vehicle.Stato || 'Disponibile';
  document.getElementById('vehicle-note').value = vehicle.Note || '';
  
  const modal = new bootstrap.Modal(document.getElementById('vehicleFormModal'));
  modal.show();
}

async function saveVehicle() {
  const targa = document.getElementById('vehicle-targa').value.trim().toUpperCase();
  const marca = document.getElementById('vehicle-marca').value.trim();
  const modello = document.getElementById('vehicle-modello').value.trim();
  const posti = parseInt(document.getElementById('vehicle-posti').value) || 9;
  const stato = document.getElementById('vehicle-stato').value;
  const note = document.getElementById('vehicle-note').value.trim();
  
  const validation = validateTarga(targa);
  if (!validation.valid) {
    showToast(validation.message, 'error');
    return;
  }
  
  if (!marca || !modello) {
    showToast('Marca e modello sono obbligatori', 'error');
    return;
  }
  
  showLoader(true, 'Salvataggio veicolo...');
  
  try {
    const response = await callAPI('flotta', {
      method: 'upsert',
      targa, marca, modello, posti, stato, note
    });
    
    if (response.success) {
      showToast('Veicolo salvato con successo', 'success');
      bootstrap.Modal.getInstance(document.getElementById('vehicleFormModal')).hide();
      await loadFlotta();
    } else {
      showToast(response.message || 'Errore salvataggio veicolo', 'error');
    }
  } catch (error) {
    showToast('Errore di rete', 'error');
  } finally {
    showLoader(false);
  }
}

async function deleteVehicle(targa) {
  if (!confirm(`Eliminare definitivamente il veicolo ${targa}?`)) return;
  
  showLoader(true, 'Eliminazione veicolo...');
  
  try {
    const response = await callAPI('flotta', {
      method: 'delete',
      targa
    });
    
    if (response.success) {
      showToast('Veicolo eliminato con successo', 'success');
      await loadFlotta();
    } else {
      showToast(response.message || 'Errore eliminazione veicolo', 'error');
    }
  } catch (error) {
    showToast('Errore di rete', 'error');
  } finally {
    showLoader(false);
  }
}

function clearVehicleForm() {
  document.getElementById('vehicle-targa').value = '';
  document.getElementById('vehicle-marca').value = '';
  document.getElementById('vehicle-modello').value = '';
  document.getElementById('vehicle-posti').value = '9';
  document.getElementById('vehicle-stato').value = 'Disponibile';
  document.getElementById('vehicle-note').value = '';
}

// CRUD Manutenzioni
function showAddMaintenanceModal() {
  const modal = new bootstrap.Modal(document.getElementById('maintenanceFormModal'));
  clearMaintenanceForm();
  modal.show();
}

function editMaintenance(id) {
  const maint = adminData.manutenzioni.find(m => m.ID === id);
  if (!maint) return;
  
  document.getElementById('maint-targa').value = maint.Targa || '';
  document.getElementById('maint-stato').value = maint.Stato || 'Programmata';
  document.getElementById('maint-data-inizio').value = formatDateForInput(maint.DataInizio);
  document.getElementById('maint-data-fine').value = formatDateForInput(maint.DataFine);
  document.getElementById('maint-costo').value = maint.Costo || '';
  document.getElementById('maint-note').value = maint.Note || '';
  
  // Store ID for update
  document.getElementById('maintenance-form').dataset.id = id;
  
  const modal = new bootstrap.Modal(document.getElementById('maintenanceFormModal'));
  modal.show();
}

async function saveMaintenance() {
  const id = document.getElementById('maintenance-form').dataset.id || '';
  const targa = document.getElementById('maint-targa').value.trim().toUpperCase();
  const stato = document.getElementById('maint-stato').value;
  const dataInizio = document.getElementById('maint-data-inizio').value;
  const dataFine = document.getElementById('maint-data-fine').value;
  const costo = parseFloat(document.getElementById('maint-costo').value) || 0;
  const note = document.getElementById('maint-note').value.trim();
  
  const validation = validateTarga(targa);
  if (!validation.valid) {
    showToast(validation.message, 'error');
    return;
  }
  
  if (!dataInizio) {
    showToast('Data inizio è obbligatoria', 'error');
    return;
  }
  
  showLoader(true, 'Salvataggio manutenzione...');
  
  try {
    // Get vehicle info for auto-completion
    const vehicle = adminData.flotta.find(v => v.Targa === targa) || {};
    
    const response = await callAPI('manutenzioni', {
      method: 'upsert',
      id,
      targa,
      marca: vehicle.Marca || '',
      modello: vehicle.Modello || '',
      posti: vehicle.Posti || 9,
      stato,
      dataInizio,
      dataFine,
      costo,
      note
    });
    
    if (response.success) {
      showToast('Manutenzione salvata con successo', 'success');
      bootstrap.Modal.getInstance(document.getElementById('maintenanceFormModal')).hide();
      await loadManutenzioni();
    } else {
      showToast(response.message || 'Errore salvataggio manutenzione', 'error');
    }
  } catch (error) {
    showToast('Errore di rete', 'error');
  } finally {
    showLoader(false);
  }
}

async function deleteMaintenance(id) {
  if (!confirm('Eliminare definitivamente questa manutenzione?')) return;
  
  showLoader(true, 'Eliminazione manutenzione...');
  
  try {
    const response = await callAPI('manutenzioni', {
      method: 'delete',
      id
    });
    
    if (response.success) {
      showToast('Manutenzione eliminata con successo', 'success');
      await loadManutenzioni();
    } else {
      showToast(response.message || 'Errore eliminazione manutenzione', 'error');
    }
  } catch (error) {
    showToast('Errore di rete', 'error');
  } finally {
    showLoader(false);
  }
}

function clearMaintenanceForm() {
  document.getElementById('maint-targa').value = '';
  document.getElementById('maint-stato').value = 'Programmata';
  document.getElementById('maint-data-inizio').value = '';
  document.getElementById('maint-data-fine').value = '';
  document.getElementById('maint-costo').value = '';
  document.getElementById('maint-note').value = '';
  document.getElementById('maintenance-form').removeAttribute('data-id');
}

// Existing sections (simplified for space)
async function loadDashboard() {
  showLoader(false);
  const root = document.getElementById('admin-root');
  root.innerHTML = `
    <div class="row g-4 mb-4">
      <div class="col-md-3"><div class="card border-0 text-center"><div class="card-body"><h3 class="text-primary">${adminData.prenotazioni.length}</h3><p class="mb-0">Prenotazioni</p></div></div></div>
      <div class="col-md-3"><div class="card border-0 text-center"><div class="card-body"><h3 class="text-success">${adminData.flotta.length}</h3><p class="mb-0">Veicoli in Flotta</p></div></div></div>
      <div class="col-md-3"><div class="card border-0 text-center"><div class="card-body"><h3 class="text-warning">${adminData.manutenzioni.filter(m => m.Stato === 'In corso').length}</h3><p class="mb-0">Manutenzioni Attive</p></div></div></div>
      <div class="col-md-3"><div class="card border-0 text-center"><div class="card-body"><h3 class="text-info">${adminData.flotta.filter(v => isPassoLungo(v)).length}</h3><p class="mb-0">Passo Lungo</p></div></div></div>
    </div>
    <div class="card"><div class="card-body text-center py-5"><h5 class="text-muted">Dashboard in costruzione</h5><p class="text-muted">Seleziona una sezione dal menu laterale</p></div></div>
  `;
}

async function loadPrenotazioni() {
  showLoader(false);
  const root = document.getElementById('admin-root');
  root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Prenotazioni</h5><p class="text-muted">Sezione in costruzione</p></div></div>';
}

async function loadClienti() {
  showLoader(false);
  const root = document.getElementById('admin-root');
  root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Clienti</h5><p class="text-muted">Sezione in costruzione</p></div></div>';
}

async function loadStatistiche() {
  showLoader(false);
  const root = document.getElementById('admin-root');
  root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Statistiche</h5><p class="text-muted">Sezione in costruzione</p></div></div>';
}

async function loadSettings() {
  showLoader(false);
  const root = document.getElementById('admin-root');
  root.innerHTML = '<div class="card"><div class="card-body text-center py-5"><h5>Impostazioni</h5><p class="text-muted">Sezione in costruzione</p></div></div>';
}

// Expose functions globally
window.loadAdminSection = loadAdminSection;
window.showAddVehicleModal = showAddVehicleModal;
window.editVehicle = editVehicle;
window.saveVehicle = saveVehicle;
window.deleteVehicle = deleteVehicle;
window.showAddMaintenanceModal = showAddMaintenanceModal;
window.editMaintenance = editMaintenance;
window.saveMaintenance = saveMaintenance;
window.deleteMaintenance = deleteMaintenance;

console.log(`📈 Admin Scripts v${ADMIN_CONFIG.VERSION} loaded - Flotta & Manutenzioni ready`);