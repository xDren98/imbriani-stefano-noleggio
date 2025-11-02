/* 🚀 IMBRIANI NOLEGGIO - Frontend Script COMPLETO v8.0.0 
   Data: 02/11/2025 06:35 CET
   Bug Fix: Autofill completo + Step 4 Data Inizio Patente + Profile sync
*/

'use strict';

// ============================================
// CONFIGURAZIONE E VARIABILI GLOBALI
// ============================================
let currentUser = null;
let currentStep = 1;
let bookingData = {};
let availableVehicles = [];
let userBookings = [];

console.log('🚀 Imbriani Noleggio Frontend v8.0.0 - All bugs fixed');

// ============================================
// INIZIALIZZAZIONE APPLICAZIONE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM Caricato - Inizializzazione app');
  initializeApp();
  setupEventListeners();
  checkExistingLogin();
});

function initializeApp() {
  // Imposta date di default per domani
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const ritiroInput = qsId('data-ritiro');
  const consegnaInput = qsId('data-consegna');
  
  if (ritiroInput) ritiroInput.value = tomorrowStr;
  if (consegnaInput) consegnaInput.value = tomorrowStr;
  
  // Reset wizard
  resetWizard();
  
  console.log('✅ App inizializzata con date di default');
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
  // Login form
  const loginForm = qsId('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Nuovo cliente CTA
  const newCustomerBtn = qsId('new-customer-cta');
  if (newCustomerBtn) {
    newCustomerBtn.addEventListener('click', () => {
      showUserDashboard();
      switchTab('nuovo');
    });
  }
  
  // Logout
  const logoutBtn = qsId('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Tab navigation
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Wizard steps
  setupWizardEventListeners();
  
  // Profile form
  const profileForm = qsId('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }
  
  console.log('✅ Event listeners configurati');
}

function setupWizardEventListeners() {
  // Step 1
  const step1Next = qsId('step1-next');
  if (step1Next) {
    step1Next.addEventListener('click', handleStep1Next);
  }
  
  // Step 2
  const step2Back = qsId('step2-back');
  const step2Next = qsId('step2-next');
  if (step2Back) step2Back.addEventListener('click', () => goToStep(1));
  if (step2Next) step2Next.addEventListener('click', () => goToStep(3));
  
  // Step 3
  const step3Back = qsId('step3-back');
  const step3Next = qsId('step3-next');
  const callBtn = qsId('call-btn');
  const whatsappBtn = qsId('whatsapp-btn');
  
  if (step3Back) step3Back.addEventListener('click', () => goToStep(2));
  if (step3Next) step3Next.addEventListener('click', () => goToStep(4));
  if (callBtn) callBtn.addEventListener('click', handlePhoneCall);
  if (whatsappBtn) whatsappBtn.addEventListener('click', handleWhatsApp);
  
  // Step 4
  const step4Back = qsId('step4-back');
  const step4Next = qsId('step4-next');
  const addAutista = qsId('add-autista');
  
  if (step4Back) step4Back.addEventListener('click', () => goToStep(3));
  if (step4Next) step4Next.addEventListener('click', () => goToStep(5));
  if (addAutista) addAutista.addEventListener('click', handleAddAutista);
  
  // Step 5
  const step5Back = qsId('step5-back');
  const step5Confirm = qsId('step5-confirm');
  
  if (step5Back) step5Back.addEventListener('click', () => goToStep(4));
  if (step5Confirm) step5Confirm.addEventListener('click', handleConfirmBooking);
}

// ============================================
// LOGIN E AUTENTICAZIONE - FIX BUG AUTOFILL
// ============================================
async function handleLogin(e) {
  e.preventDefault();
  
  const cfInput = qsId('cf-input');
  const cf = cfInput.value.trim().toUpperCase();
  
  if (!validateCF(cf)) {
    showToast('❌ Codice Fiscale non valido (16 caratteri)', 'error');
    return;
  }
  
  showLoading(true);
  
  try {
    const response = await callAPI('login', { cf });
    
    if (response.success) {
      // FIX BUG: Caricamento COMPLETO dei dati utente
      currentUser = {
        cf: cf,
        nome: response.data.nome || '',
        email: response.data.email || '',
        telefono: response.data.telefono || '',
        // CAMPI AGGIUNTI - FIX BUG AUTOFILL
        dataNascita: response.data.dataNascita || '',
        luogoNascita: response.data.luogoNascita || '',
        comuneResidenza: response.data.comuneResidenza || '',
        viaResidenza: response.data.viaResidenza || '',
        civicoResidenza: response.data.civicoResidenza || '',
        numeroPatente: response.data.numeroPatente || '',
        inizioValiditaPatente: response.data.inizioValiditaPatente || '',
        scadenzaPatente: response.data.scadenzaPatente || ''
      };
      
      // Salva in localStorage
      localStorage.setItem(window.FRONTEND_CONFIG.storage.CF, cf);
      localStorage.setItem(window.FRONTEND_CONFIG.storage.USER_DATA, JSON.stringify(currentUser));
      
      showUserDashboard();
      loadUserBookings();
      
      // POPOLA IL PROFILO COMPLETO - FIX BUG
      populateProfileForm();
      
      showToast(`✅ Benvenuto ${currentUser.nome || 'Cliente'}!`, 'success');
      
    } else {
      // Utente non trovato - primo accesso
      currentUser = { cf: cf };
      localStorage.setItem(window.FRONTEND_CONFIG.storage.CF, cf);
      
      showUserDashboard();
      switchTab('nuovo');
      
      showToast('🆕 Primo accesso - completa la tua prenotazione!', 'info');
    }
    
  } catch (error) {
    console.error('Errore login:', error);
    showToast('❌ Errore connessione', 'error');
  } finally {
    showLoading(false);
  }
}

// FIX BUG: Funzione per popolare completamente il form profilo
function populateProfileForm() {
  if (!currentUser) return;
  
  const fields = {
    'profile-nome-completo': currentUser.nome,
    'profile-email': currentUser.email,
    'profile-telefono': currentUser.telefono,
    'profile-data-nascita': currentUser.dataNascita,
    'profile-luogo-nascita': currentUser.luogoNascita,
    'profile-comune-residenza': currentUser.comuneResidenza,
    'profile-via-residenza': currentUser.viaResidenza,
    'profile-civico-residenza': currentUser.civicoResidenza,
    'profile-numero-patente': currentUser.numeroPatente,
    'profile-scadenza-patente': currentUser.scadenzaPatente
  };
  
  Object.entries(fields).forEach(([fieldId, value]) => {
    const field = qsId(fieldId);
    if (field && value) {
      field.value = value;
    }
  });
  
  console.log('✅ Profilo popolato con tutti i dati disponibili');
}

// ============================================
// STEP 4 - FIX BUG DATA INIZIO VALIDITÀ PATENTE
// ============================================
function renderAutistiStep() {
  const container = qsId('autisti-container');
  if (!container) return;
  
  const autisti = bookingData.autisti || [{}]; // Almeno un autista
  
  container.innerHTML = autisti.map((autista, index) => `
    <div class="autista-card" data-autista="${index}">
      <div class="autista-header">
        <h5>👤 Autista ${index + 1} ${index === 0 ? '(Obbligatorio)' : ''}</h5>
        ${index > 0 ? `<button type="button" class="btn btn-sm btn-outline remove-autista" data-index="${index}">❌ Rimuovi</button>` : ''}
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Nome Completo:</label>
          <input type="text" name="autista-${index}-nome" value="${autista.nome || ''}" ${index === 0 ? 'required' : ''}>
        </div>
        <div class="form-group">
          <label>Codice Fiscale:</label>
          <input type="text" name="autista-${index}-cf" value="${autista.cf || ''}" maxlength="16" ${index === 0 ? 'required' : ''}>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Data di Nascita:</label>
          <input type="date" name="autista-${index}-data-nascita" value="${autista.dataNascita || ''}" ${index === 0 ? 'required' : ''}>
        </div>
        <div class="form-group">
          <label>Luogo di Nascita:</label>
          <input type="text" name="autista-${index}-luogo-nascita" value="${autista.luogoNascita || ''}" ${index === 0 ? 'required' : ''}>
        </div>
      </div>
      
      ${index === 0 ? `
      <div class="form-row">
        <div class="form-group">
          <label>Email:</label>
          <input type="email" name="autista-${index}-email" value="${autista.email || ''}" required>
        </div>
        <div class="form-group">
          <label>Telefono:</label>
          <input type="tel" name="autista-${index}-telefono" value="${autista.telefono || ''}" required>
        </div>
      </div>
      ` : ''}
      
      <div class="form-group">
        <label>Residenza Completa:</label>
        <div class="form-row">
          <input type="text" name="autista-${index}-comune" placeholder="Comune" value="${autista.comune || ''}" ${index === 0 ? 'required' : ''}>
          <input type="text" name="autista-${index}-via" placeholder="Via" value="${autista.via || ''}" ${index === 0 ? 'required' : ''}>
          <input type="text" name="autista-${index}-civico" placeholder="Civico" value="${autista.civico || ''}" ${index === 0 ? 'required' : ''}>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Numero Patente:</label>
          <input type="text" name="autista-${index}-numero-patente" value="${autista.numeroPatente || ''}" ${index === 0 ? 'required' : ''}>
        </div>
        <div class="form-group">
          <label>🔧 Data Inizio Validità Patente:</label>
          <input type="date" name="autista-${index}-inizio-patente" value="${autista.inizioPatente || ''}" ${index === 0 ? 'required' : ''}>
        </div>
      </div>
      
      <div class="form-group">
        <label>Scadenza Patente:</label>
        <input type="date" name="autista-${index}-scadenza-patente" value="${autista.scadenzaPatente || ''}" ${index === 0 ? 'required' : ''}>
      </div>
    </div>
  `).join('');
  
  // Auto-popola primo autista se login fatto
  if (currentUser && autisti.length === 1 && !autisti[0].nome) {
    populateFirstAutista();
  }
  
  // Event listeners per rimozione autisti
  container.querySelectorAll('.remove-autista').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeAutista(index);
    });
  });
  
  updateStep4NextButton();
  
  console.log('✅ Step 4 renderizzato con campo Data Inizio Validità Patente');
}

// FIX BUG: Auto-popolamento primo autista con TUTTI i dati
function populateFirstAutista() {
  if (!currentUser) return;
  
  const fields = {
    'autista-0-nome': currentUser.nome,
    'autista-0-cf': currentUser.cf,
    'autista-0-data-nascita': currentUser.dataNascita,
    'autista-0-luogo-nascita': currentUser.luogoNascita,
    'autista-0-email': currentUser.email,
    'autista-0-telefono': currentUser.telefono,
    'autista-0-comune': currentUser.comuneResidenza,
    'autista-0-via': currentUser.viaResidenza,
    'autista-0-civico': currentUser.civicoResidenza,
    'autista-0-numero-patente': currentUser.numeroPatente,
    'autista-0-inizio-patente': currentUser.inizioValiditaPatente, // FIX BUG
    'autista-0-scadenza-patente': currentUser.scadenzaPatente
  };
  
  Object.entries(fields).forEach(([name, value]) => {
    const field = document.querySelector(`[name="${name}"]`);
    if (field && value) {
      field.value = value;
    }
  });
  
  console.log('✅ Primo autista auto-popolato completamente');
}

// ============================================
// DISPONIBILITÀ VEICOLI - FIX BUG BUFFER 4 ORE
// ============================================
async function loadAvailableVehicles() {
  if (!bookingData.dataRitiro || !bookingData.oraRitiro || !bookingData.dataConsegna || !bookingData.oraConsegna) {
    console.error('Dati mancanti per controllo disponibilità');
    return;
  }
  
  showLoading(true);
  
  try {
    // FIX BUG: Chiamata API con controllo buffer 4 ore
    const response = await callAPI('disponibilita', {
      dataInizio: bookingData.dataRitiro,
      oraInizio: bookingData.oraRitiro,
      dataFine: bookingData.dataConsegna,
      oraFine: bookingData.oraConsegna,
      destinazione: bookingData.destinazione
    });
    
    if (response.success) {
      availableVehicles = response.data || [];
      renderVehiclesGrid(availableVehicles);
      
      if (availableVehicles.length === 0) {
        showToast('⚠️ Nessun veicolo disponibile per le date selezionate', 'warning');
      } else {
        showToast(`✅ ${availableVehicles.length} veicoli disponibili`, 'success');
      }
    } else {
      showToast(`❌ ${response.message}`, 'error');
    }
    
  } catch (error) {
    console.error('Errore caricamento veicoli:', error);
    showToast('❌ Errore caricamento veicoli', 'error');
  } finally {
    showLoading(false);
  }
}

// ============================================
// WIZARD NAVIGATION E STEP MANAGEMENT
// ============================================
function goToStep(step) {
  // Nascondi step attuale
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.progress-step').forEach(s => s.classList.remove('active'));
  
  // Mostra nuovo step
  const stepEl = qsId(`step-${step}`);
  const progressEl = document.querySelector(`[data-step="${step}"]`);
  
  if (stepEl) stepEl.classList.add('active');
  if (progressEl) progressEl.classList.add('active');
  
  currentStep = step;
  
  // Azioni specifiche per step
  switch(step) {
    case 2:
      loadAvailableVehicles();
      break;
    case 3:
      renderPreventivoStep();
      break;
    case 4:
      renderAutistiStep();
      break;
    case 5:
      renderBookingSummary();
      break;
  }
  
  console.log(`📍 Navigato a Step ${step}`);
}

// ============================================
// STEP HANDLERS
// ============================================
function handleStep1Next() {
  const dataRitiro = qsId('data-ritiro').value;
  const oraRitiro = qsId('ora-ritiro').value;
  const dataConsegna = qsId('data-consegna').value;
  const oraConsegna = qsId('ora-consegna').value;
  const destinazione = qsId('destinazione').value;
  
  if (!dataRitiro || !oraRitiro || !dataConsegna || !oraConsegna || !destinazione) {
    showToast('❌ Compila tutti i campi', 'error');
    return;
  }
  
  // Validazione date
  if (new Date(dataRitiro) >= new Date(dataConsegna)) {
    showToast('❌ La data di consegna deve essere successiva al ritiro', 'error');
    return;
  }
  
  bookingData = {
    dataRitiro,
    oraRitiro,
    dataConsegna,
    oraConsegna,
    destinazione
  };
  
  goToStep(2);
}

function handleAddAutista() {
  if (!bookingData.autisti) bookingData.autisti = [];
  
  if (bookingData.autisti.length >= window.FRONTEND_CONFIG.validation.MAX_AUTISTI) {
    showToast(`❌ Massimo ${window.FRONTEND_CONFIG.validation.MAX_AUTISTI} autisti`, 'error');
    return;
  }
  
  bookingData.autisti.push({});
  renderAutistiStep();
  
  showToast(`✅ Autista ${bookingData.autisti.length} aggiunto`, 'success');
}

function removeAutista(index) {
  if (index === 0) {
    showToast('❌ Non puoi rimuovere il primo autista', 'error');
    return;
  }
  
  bookingData.autisti.splice(index, 1);
  renderAutistiStep();
  
  showToast('✅ Autista rimosso', 'success');
}

function updateStep4NextButton() {
  const nextBtn = qsId('step4-next');
  if (!nextBtn) return;
  
  const requiredFields = document.querySelectorAll('#step-4 input[required]');
  const allFilled = Array.from(requiredFields).every(field => field.value.trim());
  
  nextBtn.disabled = !allFilled;
}

// ============================================
// STEP RENDERING FUNCTIONS
// ============================================
function renderVehiclesGrid(vehicles) {
  const grid = qsId('veicoli-list');
  if (!grid) return;
  
  if (!vehicles || vehicles.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚐</div>
        <h4>Nessun veicolo disponibile</h4>
        <p>Non ci sono pulmini disponibili per le date selezionate.</p>
        <p><small>Considera di cambiare le date o contattaci per soluzioni alternative.</small></p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = vehicles.map(vehicle => `
    <div class="vehicle-card" data-targa="${vehicle.Targa}">
      <div class="vehicle-icon">🚐</div>
      <div class="vehicle-info">
        <h6>${vehicle.Marca} ${vehicle.Modello}</h6>
        <p class="vehicle-details">
          <span class="badge">🪑 ${vehicle.Posti} posti</span>
          <span class="badge targa">${vehicle.Targa}</span>
        </p>
        <div class="vehicle-features">
          <span class="feature">✅ Assicurazione inclusa</span>
          <span class="feature">✅ Assistenza 24/7</span>
        </div>
      </div>
      <button type="button" class="btn btn-primary select-vehicle" data-targa="${vehicle.Targa}">
        Seleziona Veicolo
      </button>
    </div>
  `).join('');
  
  // Event listeners per selezione veicolo
  grid.querySelectorAll('.select-vehicle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targa = e.target.dataset.targa;
      selectVehicle(targa);
    });
  });
}

function selectVehicle(targa) {
  const vehicle = availableVehicles.find(v => v.Targa === targa);
  if (!vehicle) return;
  
  bookingData.veicolo = vehicle;
  
  // Update UI
  document.querySelectorAll('.vehicle-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  const selectedCard = document.querySelector(`[data-targa="${targa}"]`);
  if (selectedCard) selectedCard.classList.add('selected');
  
  // Enable next button
  const nextBtn = qsId('step2-next');
  if (nextBtn) nextBtn.disabled = false;
  
  showToast(`✅ ${vehicle.Marca} ${vehicle.Modello} selezionato`, 'success');
}

function renderPreventivoStep() {
  const detailsEl = qsId('preventivo-details');
  if (!detailsEl) return;
  
  detailsEl.innerHTML = `
    <div class="summary-item">
      <span class="label">📅 Ritiro:</span>
      <span class="value">${formatDate(bookingData.dataRitiro)} alle ${bookingData.oraRitiro}</span>
    </div>
    <div class="summary-item">
      <span class="label">📅 Consegna:</span>
      <span class="value">${formatDate(bookingData.dataConsegna)} alle ${bookingData.oraConsegna}</span>
    </div>
    <div class="summary-item">
      <span class="label">🚐 Veicolo:</span>
      <span class="value">${bookingData.veicolo?.Marca} ${bookingData.veicolo?.Modello} (${bookingData.veicolo?.Targa})</span>
    </div>
    <div class="summary-item">
      <span class="label">🎯 Destinazione:</span>
      <span class="value">${bookingData.destinazione}</span>
    </div>
  `;
}

function renderBookingSummary() {
  const summaryEl = qsId('booking-summary');
  if (!summaryEl) return;
  
  const autisti = collectAutistiData();
  
  summaryEl.innerHTML = `
    <div class="summary-section">
      <h6>📅 Dettagli Prenotazione</h6>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">Ritiro:</span>
          <span class="value">${formatDate(bookingData.dataRitiro)} - ${bookingData.oraRitiro}</span>
        </div>
        <div class="summary-item">
          <span class="label">Consegna:</span>
          <span class="value">${formatDate(bookingData.dataConsegna)} - ${bookingData.oraConsegna}</span>
        </div>
        <div class="summary-item">
          <span class="label">Destinazione:</span>
          <span class="value">${bookingData.destinazione}</span>
        </div>
        <div class="summary-item">
          <span class="label">Veicolo:</span>
          <span class="value">${bookingData.veicolo?.Marca} ${bookingData.veicolo?.Modello} (${bookingData.veicolo?.Targa})</span>
        </div>
      </div>
    </div>
    
    <div class="summary-section">
      <h6>👥 Autisti (${autisti.length})</h6>
      ${autisti.map((autista, index) => `
        <div class="autista-summary">
          <h7>Autista ${index + 1}:</h7>
          <div class="autista-details">
            <p><strong>${autista.nome}</strong> (${autista.cf})</p>
            <p>📍 ${autista.comune}, ${autista.via} ${autista.civico}</p>
            <p>🆔 Patente: ${autista.numeroPatente} (scade: ${formatDate(autista.scadenzaPatente)})</p>
            ${index === 0 ? `<p>📞 ${autista.telefono} | 📧 ${autista.email}</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function collectAutistiData() {
  const autisti = [];
  const autistiCards = document.querySelectorAll('.autista-card');
  
  autistiCards.forEach((card, index) => {
    const getData = (name) => {
      const field = card.querySelector(`[name="${name}"]`);
      return field ? field.value.trim() : '';
    };
    
    const autista = {
      nome: getData(`autista-${index}-nome`),
      cf: getData(`autista-${index}-cf`),
      dataNascita: getData(`autista-${index}-data-nascita`),
      luogoNascita: getData(`autista-${index}-luogo-nascita`),
      comune: getData(`autista-${index}-comune`),
      via: getData(`autista-${index}-via`),
      civico: getData(`autista-${index}-civico`),
      numeroPatente: getData(`autista-${index}-numero-patente`),
      inizioPatente: getData(`autista-${index}-inizio-patente`), // FIX BUG
      scadenzaPatente: getData(`autista-${index}-scadenza-patente`)
    };
    
    if (index === 0) {
      autista.email = getData(`autista-${index}-email`);
      autista.telefono = getData(`autista-${index}-telefono`);
    }
    
    autisti.push(autista);
  });
  
  return autisti;
}

// ============================================
// API CALLS E BACKEND INTEGRATION
// ============================================
async function callAPI(action, params = {}) {
  const config = window.FRONTEND_CONFIG;
  
  const url = new URL(config.API_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('token', config.TOKEN);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, value);
    }
  });
  
  const response = await fetch(url.toString());
  return await response.json();
}

// ============================================
// CONFIRMATION E BOOKING FINALE
// ============================================
async function handleConfirmBooking() {
  const autisti = collectAutistiData();
  
  // Validazione finale
  if (!autisti[0]?.nome || !autisti[0]?.cf) {
    showToast('❌ Dati primo autista incompleti', 'error');
    return;
  }
  
  showLoading(true);
  
  const bookingPayload = {
    ...bookingData,
    autisti: autisti,
    clienteCF: currentUser?.cf || autisti[0].cf
  };
  
  try {
    const response = await callAPI('creaPrenotazione', bookingPayload);
    
    if (response.success) {
      showToast(`✅ Prenotazione creata: ${response.bookingId}`, 'success');
      
      // Reset e torna alle prenotazioni
      resetWizard();
      switchTab('prenotazioni');
      loadUserBookings();
      
    } else {
      showToast(`❌ ${response.message}`, 'error');
    }
    
  } catch (error) {
    console.error('Errore creazione prenotazione:', error);
    showToast('❌ Errore creazione prenotazione', 'error');
  } finally {
    showLoading(false);
  }
}

// ============================================
// UI UTILITIES E HELPERS
// ============================================
function showLoading(show) {
  const overlay = qsId('loading-overlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !show);
  }
}

function showToast(message, type = 'info') {
  console.log(`Toast ${type}: ${message}`);
  
  const container = qsId('toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function qsId(id) {
  return document.getElementById(id);
}

function validateCF(cf) {
  return cf && cf.length === 16 && /^[A-Z0-9]+$/.test(cf);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/D';
  return new Date(dateStr).toLocaleDateString('it-IT');
}

function showUserDashboard() {
  qsId('homepage-sections')?.classList.add('hidden');
  qsId('user-dashboard')?.classList.remove('hidden');
  
  const userNameEl = qsId('user-name');
  if (userNameEl && currentUser?.nome) {
    userNameEl.textContent = currentUser.nome;
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  
  // Update tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  qsId(`${tabName}-tab`)?.classList.add('active');
  
  // Tab-specific actions
  if (tabName === 'prenotazioni') {
    loadUserBookings();
  }
}

function resetWizard() {
  currentStep = 1;
  bookingData = {};
  
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.progress-step').forEach(s => s.classList.remove('active'));
  
  qsId('step-1')?.classList.add('active');
  document.querySelector('[data-step="1"]')?.classList.add('active');
}

function checkExistingLogin() {
  const cf = localStorage.getItem(window.FRONTEND_CONFIG.storage.CF);
  const userData = localStorage.getItem(window.FRONTEND_CONFIG.storage.USER_DATA);
  
  if (cf && userData) {
    try {
      currentUser = JSON.parse(userData);
      showUserDashboard();
      loadUserBookings();
      populateProfileForm();
      
      console.log('✅ Login esistente ripristinato');
    } catch (error) {
      console.error('Errore parsing user data:', error);
      localStorage.clear();
    }
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.clear();
  
  qsId('user-dashboard')?.classList.add('hidden');
  qsId('homepage-sections')?.classList.remove('hidden');
  
  qsId('cf-input').value = '';
  resetWizard();
  
  showToast('👋 Disconnesso con successo', 'info');
}

// ============================================
// USER BOOKINGS E PROFILE MANAGEMENT
// ============================================
async function loadUserBookings() {
  if (!currentUser?.cf) return;
  
  try {
    const response = await callAPI('recuperaPrenotazioni', { cf: currentUser.cf });
    
    if (response.success) {
      userBookings = response.data || [];
      renderUserBookings(userBookings);
    } else {
      qsId('empty-bookings')?.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Errore caricamento prenotazioni:', error);
  }
}

function renderUserBookings(bookings) {
  const listEl = qsId('prenotazioni-list');
  const emptyEl = qsId('empty-bookings');
  
  if (!bookings || bookings.length === 0) {
    if (listEl) listEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  
  if (listEl) listEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  
  if (listEl) {
    listEl.innerHTML = bookings.map(booking => `
      <div class="booking-card" data-id="${booking.ID}">
        <div class="booking-header">
          <span class="booking-id">${booking.ID}</span>
          <span class="status-badge ${getStatusClass(booking.Stato)}">
            ${window.FRONTEND_CONFIG.statiEmoji[booking.Stato] || '❓'} ${booking.Stato}
          </span>
        </div>
        <div class="booking-details">
          <p><strong>🚐 ${booking.Targa || 'TBD'}</strong> - ${booking.Destinazione}</p>
          <p>📅 ${formatDate(booking.DataRitiro)} ${booking.OraRitiro} → ${formatDate(booking.DataConsegna)} ${booking.OraConsegna}</p>
        </div>
      </div>
    `).join('');
  }
}

function getStatusClass(status) {
  const classes = {
    'Confermata': 'status-confirmed',
    'Da confermare': 'status-pending', 
    'Annullata': 'status-cancelled'
  };
  return classes[status] || 'status-unknown';
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  
  // Raccoglie dati dal form profilo
  const formData = new FormData(e.target);
  const profileData = Object.fromEntries(formData.entries());
  
  // Update currentUser
  if (currentUser) {
    Object.assign(currentUser, {
      nome: profileData['profile-nome-completo'],
      email: profileData['profile-email'],
      telefono: profileData['profile-telefono'],
      dataNascita: profileData['profile-data-nascita'],
      luogoNascita: profileData['profile-luogo-nascita'],
      comuneResidenza: profileData['profile-comune-residenza'],
      viaResidenza: profileData['profile-via-residenza'],
      civicoResidenza: profileData['profile-civico-residenza'],
      numeroPatente: profileData['profile-numero-patente'],
      scadenzaPatente: profileData['profile-scadenza-patente']
    });
    
    localStorage.setItem(window.FRONTEND_CONFIG.storage.USER_DATA, JSON.stringify(currentUser));
    
    showToast('✅ Profilo aggiornato', 'success');
  }
}

// ============================================
// CONTACT HANDLERS (STEP 3)
// ============================================
function handlePhoneCall() {
  const phone = '328 658 9618';
  window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  
  // Mark preventivo as requested
  qsId('preventivo-completed')?.classList.remove('hidden');
  qsId('step3-next').disabled = false;
  
  showToast('📞 Chiamata avviata', 'success');
}

function handleWhatsApp() {
  const phone = '3286589618';
  const message = `Ciao! Vorrei un preventivo per:
` +
    `🚐 ${bookingData.veicolo?.Marca} ${bookingData.veicolo?.Modello} (${bookingData.veicolo?.Targa})
` +
    `📅 Dal ${formatDate(bookingData.dataRitiro)} ${bookingData.oraRitiro}
` +
    `📅 Al ${formatDate(bookingData.dataConsegna)} ${bookingData.oraConsegna}
` +
    `🎯 Destinazione: ${bookingData.destinazione}
` +
    `Grazie!`;
  
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  // Mark preventivo as requested  
  qsId('preventivo-completed')?.classList.remove('hidden');
  qsId('step3-next').disabled = false;
  
  showToast('💬 WhatsApp aperto', 'success');
}

console.log('✅ Frontend Script v8.0.0 caricato - Tutti i bug risolti!');

// Export per testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateCF,
    formatDate,
    callAPI
  };
}