/* 🚐 IMBRIANI NOLEGGIO - Main Scripts v6.0 - Production Ready */

'use strict';

// Application state
let CURRENT_CF = '';
let SELECTED_VEHICLE = null;
let DRIVERS = [];
let BOOKING_CACHE = {
  bookings: [],
  vehicles: [],
  lastUpdate: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

// Initialize application
function init() {
  console.log('🚀 Inizializzazione Imbriani Noleggio v6.0...');
  
  setupNetworkHandlers();
  loadSavedState();
  setupEventListeners();
  initializeDrivers();
  updateUI();
  
  console.log('✅ App inizializzata correttamente');
}

// Network status handling
function setupNetworkHandlers() {
  onNetworkChange((online) => {
    if (online) {
      showToast('🌐 Connessione ristabilita', 'success');
      refreshDataIfNeeded();
    } else {
      showToast('⚠️ Sei offline', 'warning', 8000);
    }
  });
}

// Load saved application state
function loadSavedState() {
  const savedCF = getFromStorage('cf', '');
  if (isValidCF(savedCF)) {
    const input = document.getElementById('cf-input');
    if (input) {
      input.value = savedCF;
    }
  }
  
  // Load booking draft if exists
  const draft = getFromStorage('booking_draft');
  if (draft) {
    restoreBookingDraft(draft);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Login
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  
  const cfInput = document.getElementById('cf-input');
  if (cfInput) {
    cfInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
    cfInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }
  
  // Booking form
  const addDriverBtn = document.getElementById('add-driver');
  if (addDriverBtn) {
    addDriverBtn.addEventListener('click', addDriver);
  }
  
  const confermaBtn = document.getElementById('conferma');
  if (confermaBtn) {
    confermaBtn.addEventListener('click', createBooking);
  }
  
  // Form field listeners for live updates
  const formFields = ['data-ritiro', 'ora-ritiro', 'data-consegna', 'ora-consegna', 'destinazione'];
  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('change', updateSummary);
      field.addEventListener('input', updateSummary);
      field.addEventListener('change', saveBookingDraft);
    }
  });
}

// Initialize drivers array
function initializeDrivers() {
  if (DRIVERS.length === 0) {
    DRIVERS = [createEmptyDriver()];
  }
  renderDrivers();
  updateSummary();
}

// Create empty driver object
function createEmptyDriver() {
  return {
    Nome: '',
    Cognome: '',
    CF: '',
    DataNascita: '',
    NumeroPatente: '',
    ScadenzaPatente: ''
  };
}

// Handle login process
async function handleLogin() {
  const cfInput = document.getElementById('cf-input');
  if (!cfInput) return;
  
  const cf = cfInput.value.toUpperCase().trim();
  
  if (!isValidCF(cf)) {
    showToast('❌ CF non valido (16 caratteri alfanumerici)', 'error');
    cfInput.focus();
    return;
  }
  
  showLoader(true, 'Verifica credenziali...');
  
  try {
    const response = await callAPI('login', {
      cf: cf
    });
    
    if (response.success) {
      CURRENT_CF = cf;
      saveToStorage('cf', cf);
      saveToStorage('last_login', Date.now());
      
      // Switch UI
      const loginSection = document.getElementById('login-section');
      const areaPersonale = document.getElementById('area-personale');
      
      if (loginSection) loginSection.classList.add('d-none');
      if (areaPersonale) areaPersonale.classList.remove('d-none');
      
      showToast(`✅ Benvenuto! Login effettuato`, 'success');
      
      // Load user data
      await loadUserData();
      
    } else {
      showToast(`❌ ${response.message || 'Errore durante il login'}`, 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('❌ Errore di connessione. Riprova.', 'error');
  } finally {
    showLoader(false);
  }
}

// Load user data (bookings + availability)
async function loadUserData() {
  showLoader(true, 'Caricamento dati...');
  
  try {
    // Carica prenotazioni e disponibilità in parallelo
    const [bookingsResult, availabilityResult] = await Promise.all([
      loadBookings(),
      loadAvailability()
    ]);
    
    if (bookingsResult || availabilityResult) {
      BOOKING_CACHE.lastUpdate = Date.now();
    }
    
  } catch (error) {
    console.error('Load user data error:', error);
    showToast('⚠️ Alcuni dati potrebbero non essere aggiornati', 'warning');
  } finally {
    showLoader(false);
  }
}

// Load bookings for current user
async function loadBookings() {
  if (!CURRENT_CF) return false;
  
  try {
    const response = await callAPI('recuperaPrenotazioni', {
      cf: CURRENT_CF
    });
    
    if (response.success && Array.isArray(response.data)) {
      BOOKING_CACHE.bookings = response.data;
      renderBookings(response.data);
      return true;
    } else {
      console.warn('No bookings data:', response);
      renderBookings([]);
    }
  } catch (error) {
    console.error('Load bookings error:', error);
    renderBookings([]);
  }
  
  return false;
}

// Load vehicle availability
async function loadAvailability() {
  try {
    const response = await callAPI('disponibilita', {
      dataInizio: formatDateForAPI(new Date()),
      dataFine: formatDateForAPI(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // +30 giorni
    });
    
    if (response.success && Array.isArray(response.data)) {
      BOOKING_CACHE.vehicles = response.data;
      renderVehicles(response.data);
      return true;
    } else {
      console.warn('No vehicles data:', response);
      renderVehicles([]);
    }
  } catch (error) {
    console.error('Load availability error:', error);
    renderVehicles([]);
  }
  
  return false;
}

// Render bookings list
function renderBookings(bookings) {
  const list = document.getElementById('lista-prenotazioni');
  if (!list) return;
  
  if (!bookings || bookings.length === 0) {
    list.innerHTML = `
      <div class="list-group-item text-center text-muted py-4">
        <i class="fas fa-calendar-alt fa-2x mb-2"></i>
        <p class="mb-0">Nessuna prenotazione trovata</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = '';
  bookings.forEach(booking => {
    const item = createBookingListItem(booking);
    list.appendChild(item);
  });
}

// Create booking list item
function createBookingListItem(booking) {
  const div = document.createElement('div');
  div.className = 'list-group-item list-group-item-action';
  
  const emoji = getStatoEmoji(booking.Stato);
  const color = getStatoColor(booking.Stato);
  const dataRitiro = formatDate(booking.DataRitiro);
  const dataConsegna = formatDate(booking.DataConsegna);
  
  div.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div class="booking-info">
        <h6 class="mb-1">
          <span class="booking-id">${booking.ID || 'N/A'}</span>
          <span class="badge" style="background-color: ${color}; margin-left: 8px;">
            ${emoji} ${booking.Stato || 'Da confermare'}
          </span>
        </h6>
        <p class="mb-1">
          <strong>📅 Periodo:</strong> ${dataRitiro} ${booking.OraRitiro || ''} → ${dataConsegna} ${booking.OraConsegna || ''}
        </p>
        <p class="mb-0">
          <strong>🚐 Veicolo:</strong> ${booking.Targa || 'Da assegnare'} | 
          <strong>📍 Dest:</strong> ${booking.Destinazione || '-'}
        </p>
      </div>
    </div>
  `;
  
  return div;
}

// Render available vehicles
function renderVehicles(vehicles) {
  const container = document.getElementById('lista-veicoli');
  if (!container) return;
  
  const availableVehicles = vehicles.filter(v => 
    v.Posti >= 9 && (v.Disponibile === true || v.Stato === 'Disponibile')
  );
  
  if (availableVehicles.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning text-center">
          <i class="fas fa-exclamation-triangle mb-2"></i>
          <p class="mb-0">Nessun veicolo disponibile al momento</p>
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  availableVehicles.forEach(vehicle => {
    const col = createVehicleCard(vehicle);
    container.appendChild(col);
  });
}

// Create vehicle card
function createVehicleCard(vehicle) {
  const col = document.createElement('div');
  col.className = 'col-md-4 col-sm-6';
  
  const card = document.createElement('div');
  card.className = 'vehicle card h-100';
  card.style.cursor = 'pointer';
  
  card.innerHTML = `
    <div class="card-body text-center">
      <h5 class="card-title">🚐 ${vehicle.Targa}</h5>
      <p class="card-text">
        <strong>${vehicle.Marca} ${vehicle.Modello}</strong><br>
        <small class="text-muted">${vehicle.Posti} posti</small><br>
        <small class="text-muted">${vehicle.Colore || ''}</small>
      </p>
    </div>
  `;
  
  card.addEventListener('click', () => selectVehicle(vehicle, card));
  
  col.appendChild(card);
  return col;
}

// Select vehicle
function selectVehicle(vehicle, cardElement) {
  // Reset previous selection
  document.querySelectorAll('#lista-veicoli .vehicle').forEach(el => {
    el.classList.remove('border-primary', 'bg-light');
  });
  
  // Highlight selected
  cardElement.classList.add('border-primary', 'bg-light');
  
  SELECTED_VEHICLE = vehicle;
  updateSummary();
  saveBookingDraft();
  
  showToast(`✅ Selezionato: ${vehicle.Targa}`, 'success', 2000);
}

// Add new driver
function addDriver() {
  if (DRIVERS.length >= 3) {
    showToast('❌ Massimo 3 autisti consentiti', 'warning');
    return;
  }
  
  DRIVERS.push(createEmptyDriver());
  renderDrivers();
  updateSummary();
  saveBookingDraft();
}

// Remove driver
function removeDriver(index) {
  if (DRIVERS.length <= 1) {
    showToast('❌ Serve almeno un autista', 'warning');
    return;
  }
  
  DRIVERS.splice(index, 1);
  renderDrivers();
  updateSummary();
  saveBookingDraft();
}

// Render drivers form
function renderDrivers() {
  const container = document.getElementById('drivers-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  DRIVERS.forEach((driver, index) => {
    const driverRow = createDriverRow(index, driver);
    container.appendChild(driverRow);
  });
}

// Create driver form row
function createDriverRow(index, driver) {
  const div = document.createElement('div');
  div.className = 'driver-row mb-3 p-3 border rounded';
  div.dataset.index = index;
  
  div.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">👥 Autista ${index + 1}</h6>
      ${DRIVERS.length > 1 ? `<button type="button" class="btn btn-sm btn-outline-danger remove-driver" data-index="${index}">✖</button>` : ''}
    </div>
    
    <div class="row g-2">
      <div class="col-md-6">
        <input type="text" class="form-control driver-nome" placeholder="Nome" value="${driver.Nome || ''}" data-field="Nome">
      </div>
      <div class="col-md-6">
        <input type="text" class="form-control driver-cognome" placeholder="Cognome" value="${driver.Cognome || ''}" data-field="Cognome">
      </div>
      <div class="col-md-4">
        <input type="text" class="form-control driver-cf" placeholder="Codice Fiscale" maxlength="16" value="${driver.CF || ''}" data-field="CF">
      </div>
      <div class="col-md-4">
        <input type="date" class="form-control driver-data" placeholder="Data Nascita" value="${driver.DataNascita || ''}" data-field="DataNascita">
      </div>
      <div class="col-md-4">
        <input type="text" class="form-control driver-patente" placeholder="N. Patente" value="${driver.NumeroPatente || ''}" data-field="NumeroPatente">
      </div>
    </div>
  `;
  
  // Event listeners
  div.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => updateDriverData(index, e.target));
    input.addEventListener('change', saveBookingDraft);
  });
  
  const removeBtn = div.querySelector('.remove-driver');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => removeDriver(index));
  }
  
  return div;
}

// Update driver data
function updateDriverData(index, input) {
  if (!DRIVERS[index]) return;
  
  const field = input.dataset.field;
  let value = input.value;
  
  // Normalize CF
  if (field === 'CF') {
    value = value.toUpperCase().trim();
    input.value = value;
  }
  
  DRIVERS[index][field] = value;
  updateSummary();
}

// Update booking summary
function updateSummary() {
  const summaryEl = document.getElementById('riepilogo');
  if (!summaryEl) return;
  
  const dataRitiro = document.getElementById('data-ritiro')?.value || '';
  const oraRitiro = document.getElementById('ora-ritiro')?.value || '';
  const dataConsegna = document.getElementById('data-consegna')?.value || '';
  const oraConsegna = document.getElementById('ora-consegna')?.value || '';
  const destinazione = document.getElementById('destinazione')?.value || '';
  
  const veicolo = SELECTED_VEHICLE ? `${SELECTED_VEHICLE.Targa} (${SELECTED_VEHICLE.Marca} ${SELECTED_VEHICLE.Modello})` : 'Nessuno selezionato';
  const autistiCount = DRIVERS.filter(d => d.Nome && d.Cognome).length;
  
  summaryEl.innerHTML = `
    <div class="summary-content">
      <div class="summary-item mb-2">
        <strong>📅 Ritiro:</strong><br>
        <span class="text-muted">${dataRitiro ? formatDate(dataRitiro) : 'Non selezionata'} ${oraRitiro}</span>
      </div>
      
      <div class="summary-item mb-2">
        <strong>📅 Consegna:</strong><br>
        <span class="text-muted">${dataConsegna ? formatDate(dataConsegna) : 'Non selezionata'} ${oraConsegna}</span>
      </div>
      
      <div class="summary-item mb-2">
        <strong>📍 Destinazione:</strong><br>
        <span class="text-muted">${destinazione || 'Non inserita'}</span>
      </div>
      
      <div class="summary-item mb-2">
        <strong>🚐 Veicolo:</strong><br>
        <span class="text-muted">${veicolo}</span>
      </div>
      
      <div class="summary-item">
        <strong>👥 Autisti:</strong><br>
        <span class="text-muted">${autistiCount}/${DRIVERS.length} compilati</span>
      </div>
    </div>
  `;
}

// Create booking
async function createBooking() {
  // Validation
  const validation = validateBookingForm();
  if (!validation.valid) {
    showToast(`❌ ${validation.message}`, 'error');
    return;
  }
  
  const bookingData = collectBookingData();
  
  showLoader(true, 'Invio prenotazione...');
  
  try {
    const response = await callAPI('creaPrenotazione', bookingData);
    
    if (response.success) {
      showToast('✅ Prenotazione inviata con successo! Ti contatteremo presto.', 'success', 6000);
      
      // Reset form
      resetBookingForm();
      
      // Refresh data
      await loadBookings();
      
    } else {
      showToast(`❌ ${response.message || 'Errore durante la prenotazione'}`, 'error');
    }
  } catch (error) {
    console.error('Create booking error:', error);
    showToast('❌ Errore di connessione. Riprova.', 'error');
  } finally {
    showLoader(false);
  }
}

// Validate booking form
function validateBookingForm() {
  const dataRitiro = document.getElementById('data-ritiro')?.value;
  const dataConsegna = document.getElementById('data-consegna')?.value;
  const destinazione = document.getElementById('destinazione')?.value?.trim();
  
  if (!dataRitiro || !dataConsegna || !destinazione) {
    return {
      valid: false,
      message: 'Compila tutti i campi obbligatori: date e destinazione'
    };
  }
  
  if (!SELECTED_VEHICLE) {
    return {
      valid: false,
      message: 'Seleziona un veicolo dalla lista'
    };
  }
  
  if (DRIVERS.length === 0) {
    return {
      valid: false,
      message: 'Aggiungi almeno un autista'
    };
  }
  
  // Validate dates
  const ritiro = new Date(dataRitiro);
  const consegna = new Date(dataConsegna);
  
  if (consegna <= ritiro) {
    return {
      valid: false,
      message: 'La data di consegna deve essere successiva al ritiro'
    };
  }
  
  // Validate drivers
  for (let i = 0; i < DRIVERS.length; i++) {
    const driver = DRIVERS[i];
    if (!driver.Nome || !driver.Cognome || !driver.CF) {
      return {
        valid: false,
        message: `Completa i dati dell'autista ${i + 1}`
      };
    }
    if (!isValidCF(driver.CF)) {
      return {
        valid: false,
        message: `CF non valido per l'autista ${i + 1}`
      };
    }
  }
  
  return { valid: true };
}

// Collect booking data for API
function collectBookingData() {
  return {
    cf: CURRENT_CF,
    dataRitiro: document.getElementById('data-ritiro').value,
    oraRitiro: document.getElementById('ora-ritiro').value,
    dataConsegna: document.getElementById('data-consegna').value,
    oraConsegna: document.getElementById('ora-consegna').value,
    targa: SELECTED_VEHICLE.Targa,
    destinazione: document.getElementById('destinazione').value.trim(),
    numAutisti: DRIVERS.length.toString(),
    drivers: JSON.stringify(DRIVERS.filter(d => d.Nome && d.Cognome))
  };
}

// Reset booking form
function resetBookingForm() {
  document.getElementById('data-ritiro').value = '';
  document.getElementById('ora-ritiro').value = '08:00';
  document.getElementById('data-consegna').value = '';
  document.getElementById('ora-consegna').value = '20:00';
  document.getElementById('destinazione').value = '';
  
  SELECTED_VEHICLE = null;
  DRIVERS = [createEmptyDriver()];
  
  renderDrivers();
  renderVehicles(BOOKING_CACHE.vehicles);
  updateSummary();
  
  clearStorage('booking_draft');
}

// Save booking draft
function saveBookingDraft() {
  const draft = {
    dataRitiro: document.getElementById('data-ritiro')?.value || '',
    oraRitiro: document.getElementById('ora-ritiro')?.value || '',
    dataConsegna: document.getElementById('data-consegna')?.value || '',
    oraConsegna: document.getElementById('ora-consegna')?.value || '',
    destinazione: document.getElementById('destinazione')?.value || '',
    selectedVehicle: SELECTED_VEHICLE,
    drivers: DRIVERS,
    timestamp: Date.now()
  };
  
  saveToStorage('booking_draft', draft);
}

// Restore booking draft
function restoreBookingDraft(draft) {
  if (!draft || Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
    clearStorage('booking_draft');
    return;
  }
  
  if (draft.dataRitiro) document.getElementById('data-ritiro').value = draft.dataRitiro;
  if (draft.oraRitiro) document.getElementById('ora-ritiro').value = draft.oraRitiro;
  if (draft.dataConsegna) document.getElementById('data-consegna').value = draft.dataConsegna;
  if (draft.oraConsegna) document.getElementById('ora-consegna').value = draft.oraConsegna;
  if (draft.destinazione) document.getElementById('destinazione').value = draft.destinazione;
  
  if (draft.selectedVehicle) {
    SELECTED_VEHICLE = draft.selectedVehicle;
  }
  
  if (draft.drivers && Array.isArray(draft.drivers)) {
    DRIVERS = draft.drivers;
  }
}

// Format date for API (YYYY-MM-DD)
function formatDateForAPI(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

// Refresh data if cache is stale
function refreshDataIfNeeded() {
  if (CURRENT_CF && Date.now() - BOOKING_CACHE.lastUpdate > CACHE_DURATION) {
    loadUserData();
  }
}

// Update UI based on application state
function updateUI() {
  updateSummary();
  
  // Update any other UI elements based on state
  const loginSection = document.getElementById('login-section');
  const areaPersonale = document.getElementById('area-personale');
  
  if (CURRENT_CF) {
    if (loginSection) loginSection.classList.add('d-none');
    if (areaPersonale) areaPersonale.classList.remove('d-none');
  } else {
    if (loginSection) loginSection.classList.remove('d-none');
    if (areaPersonale) areaPersonale.classList.add('d-none');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for global access
window.IMBRIANI_APP = {
  init,
  handleLogin,
  createBooking,
  addDriver,
  removeDriver,
  selectVehicle,
  refreshDataIfNeeded,
  CURRENT_CF: () => CURRENT_CF,
  SELECTED_VEHICLE: () => SELECTED_VEHICLE,
  DRIVERS: () => DRIVERS
};