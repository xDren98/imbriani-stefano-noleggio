/* ================================================================================
   🚐 IMBRIANI STEFANO NOLEGGIO - scripts.js v7.1.0 BACKEND ALIGNED
   + Complete auto-fill system + Date formatting + Real API calls
   ================================================================================ */

'use strict';

const VERSION = '7.1.0';
let clienteCorrente = null;
let ultimoAutista = null;
let prenotazioniUtente = [];
let availableVehicles = [];
let stepAttuale = 1;
let bookingData = {};
let preventivoRequested = false;

console.log(`🚐 Imbriani Stefano Noleggio v${VERSION} loaded`);

// =====================
// BACKEND ALIGNED API CALLS
// =====================
async function callAPIAligned(action, payload = {}) {
  const params = { ...payload, action, token: FRONTEND_CONFIG.TOKEN };
  const url = `${FRONTEND_CONFIG.API_URL}?${new URLSearchParams(params).toString()}`;
  
  try {
    console.log(`📡 API Call: ${action}`, params);
    const response = await fetch(url);
    const result = await response.json();
    console.log(`📨 API Response:`, result);
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: error.message };
  }
}

// =====================
// DATE UTILITIES
// =====================
function formattaDataIT(dateStr) {
  if (!dateStr) return '';
  
  // Handle various date formats
  let cleanDate = String(dateStr).split('T')[0]; // Remove time part
  
  // yyyy-MM-dd to dd/MM/yyyy
  const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  
  return dateStr;
}

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM loaded');
  
  // Login handler
  const loginForm = qsId('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('✅ Login handler attached');
  }
  
  // Tab handlers
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });
  
  // New customer CTA
  const newCustomerCTA = qsId('new-customer-cta');
  if (newCustomerCTA) {
    newCustomerCTA.addEventListener('click', handleNewCustomerCTA);
  }
  
  // Logout
  const logoutBtn = qsId('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  
  // Refresh bookings
  const refreshBtn = qsId('refresh-bookings');
  if (refreshBtn) refreshBtn.addEventListener('click', loadUserBookings);
  
  // Wizard navigation
  setupWizardNavigation();
  
  // Preventivo buttons
  const callBtn = qsId('call-btn');
  const whatsappBtn = qsId('whatsapp-btn');
  if (callBtn) callBtn.addEventListener('click', handleCallPreventivo);
  if (whatsappBtn) whatsappBtn.addEventListener('click', handleWhatsAppPreventivo);
  
  // Profile form
  const profileForm = qsId('profile-form');
  if (profileForm) profileForm.addEventListener('submit', handleProfileSave);
});

// =====================
// LOGIN with COMPLETE AUTO-FILL
// =====================
async function handleLogin(e) {
  e.preventDefault();
  console.log('🚀 Login clicked');
  
  const cfInput = qsId('cf-input');
  const cf = cfInput.value.toUpperCase().trim();
  
  if (!isValidCF(cf)) {
    showToast('CF non valido (16 caratteri)', 'error');
    return;
  }
  
  showLoader(true);
  
  try {
    // 1) Login usando l'action del TUO backend
    const response = await callAPIAligned('login', { cf });
    console.log('📡 Login response:', response);
    
    if (response.success) {
      clienteCorrente = response.data;
      localStorage.setItem(FRONTEND_CONFIG.storage.CF, cf);
      
      // 2) 🎯 CARICA ULTIMO AUTISTA DALLE PRENOTAZIONI STORICHE
      await loadUltimoAutistaCompleto(cf);
      
      showToast('✅ Login riuscito!', 'success');
      
      // Show dashboard
      const homepage = qsId('homepage-sections');
      const dashboard = qsId('user-dashboard');
      if (homepage) homepage.classList.add('hidden');
      if (dashboard) dashboard.classList.remove('hidden');
      
      // Update user name
      const userName = qsId('user-name');
      if (userName) userName.textContent = clienteCorrente.Nome || 'Cliente';
      
      // 3) 📋 POPOLA PROFILO CON DATI COMPLETI
      populateProfileFromData();
      
      // Load user bookings
      await loadUserBookings();
      
    } else {
      showToast(response.message || 'Errore login', 'error');
    }
  } catch (error) {
    showToast('Errore connessione', 'error');
  } finally {
    showLoader(false);
  }
}

// 🎯 CARICA DATI COMPLETI ULTIMO AUTISTA
async function loadUltimoAutistaCompleto(cf) {
  try {
    const response = await callAPIAligned('recuperaPrenotazioni', { cf });
    
    if (response.success && response.data && response.data.length > 0) {
      // Ultima prenotazione (più recente)
      const ultima = response.data[response.data.length - 1];
      
      // Costruisci ultimoAutista con MAPPING ESATTO del tuo backend
      ultimoAutista = {
        Nome: ultima.Nome || clienteCorrente.Nome || '',
        CF: cf,
        Email: ultima.Email || clienteCorrente.Email || '',
        Cellulare: ultima.Cellulare || clienteCorrente.Cellulare || '',
        // Dal tuo backend - colonne esatte
        DataNascita: ultima['Data di nascita'] || '',
        LuogoNascita: ultima['Luogo di nascita'] || '',
        ComuneResidenza: ultima['Comune di residenza'] || '',
        ViaResidenza: ultima['Via di residenza'] || '',
        CivicoResidenza: ultima['Civico di residenza'] || '',
        NumeroPatente: ultima['Numero di patente'] || '',
        InizioPatente: ultima['Data inizio validità patente'] || '',
        ScadenzaPatente: ultima['Scadenza patente'] || ''
      };
      
      console.log('🎯 Ultimo autista caricato:', ultimoAutista);
      
    } else {
      // Fallback: dati base
      ultimoAutista = {
        Nome: clienteCorrente.Nome || '',
        CF: cf,
        Email: clienteCorrente.Email || '',
        Cellulare: clienteCorrente.Cellulare || ''
      };
      
      console.log('📝 Nessuno storico - dati base:', ultimoAutista);
    }
  } catch (error) {
    console.error('Error loading ultimo autista:', error);
    ultimoAutista = null;
  }
}

// 📋 POPOLA PROFILO CLIENTE
function populateProfileFromData() {
  if (!ultimoAutista) return;
  
  const fields = {
    'profile-nome-completo': ultimoAutista.Nome || '',
    'profile-email': ultimoAutista.Email || '',
    'profile-telefono': ultimoAutista.Cellulare || '',
    'profile-data-nascita': ultimoAutista.DataNascita || '',
    'profile-luogo-nascita': ultimoAutista.LuogoNascita || '',
    'profile-indirizzo': composeAddress(ultimoAutista.ViaResidenza, ultimoAutista.CivicoResidenza, ultimoAutista.ComuneResidenza),
    'profile-patente': ultimoAutista.NumeroPatente || '',
    'profile-patente-scadenza': ultimoAutista.ScadenzaPatente || ''
  };
  
  Object.entries(fields).forEach(([id, value]) => {
    const input = qsId(id);
    if (input && value) input.value = value;
  });
  
  console.log('📋 Profilo popolato con dati completi');
}

function handleLogout() {
  clienteCorrente = null;
  ultimoAutista = null;
  prenotazioniUtente = [];
  localStorage.removeItem(FRONTEND_CONFIG.storage.CF);
  
  const homepage = qsId('homepage-sections');
  const dashboard = qsId('user-dashboard');
  if (homepage) homepage.classList.remove('hidden');
  if (dashboard) dashboard.classList.add('hidden');
  
  const cfInput = qsId('cf-input');
  if (cfInput) cfInput.value = '';
  
  showToast('🚪 Disconnesso', 'info');
}

function handleNewCustomerCTA() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];
  
  const homepage = qsId('homepage-sections');
  const dashboard = qsId('user-dashboard');
  if (homepage) homepage.classList.add('hidden');
  if (dashboard) dashboard.classList.remove('hidden');
  
  switchTab('nuovo');
  
  setTimeout(() => {
    const dataRitiro = qsId('data-ritiro');
    const dataConsegna = qsId('data-consegna');
    const oraRitiro = qsId('ora-ritiro');
    const oraConsegna = qsId('ora-consegna');
    
    if (dataRitiro) dataRitiro.value = tomorrowStr;
    if (dataConsegna) dataConsegna.value = dayAfterStr;
    if (oraRitiro) oraRitiro.value = '08:00';
    if (oraConsegna) oraConsegna.value = '20:00';
  }, 100);
  
  showToast('🚀 Date preimpostate per domani!', 'info');
}

// =====================
// TABS
// =====================
function switchTab(tabName) {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
  
  if (tabName === 'prenotazioni') {
    loadUserBookings();
  } else if (tabName === 'nuovo') {
    loadAvailableVehicles();
    goToStep(1);
  }
}

// =====================
// BOOKINGS
// =====================
async function loadUserBookings() {
  const bookingsList = qsId('prenotazioni-list');
  const emptyState = qsId('empty-bookings');
  
  if (!bookingsList) return;
  
  if (!clienteCorrente?.CF) {
    if (emptyState) emptyState.classList.remove('hidden');
    bookingsList.innerHTML = '';
    return;
  }
  
  try {
    const response = await callAPIAligned('recuperaPrenotazioni', { cf: clienteCorrente.CF });
    
    if (response.success) {
      prenotazioniUtente = response.data || [];
      
      if (prenotazioniUtente.length === 0) {
        bookingsList.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
      } else {
        if (emptyState) emptyState.classList.add('hidden');
        renderUserBookings();
      }
    } else {
      showToast('❌ Errore caricamento prenotazioni', 'error');
    }
  } catch (error) {
    console.error('Error loading bookings:', error);
    showToast('❌ Errore connessione prenotazioni', 'error');
  }
}

function renderUserBookings() {
  const bookingsList = qsId('prenotazioni-list');
  if (!bookingsList) return;
  
  // 🔧 DATE FORMAT FIX
  bookingsList.innerHTML = prenotazioniUtente.map(booking => `
    <div class="booking-card">
      <div class="booking-header">
        <h5>📋 #${booking.ID}</h5>
        <span class="badge ${getStatusClass(booking.Stato)}">${getStatusEmoji(booking.Stato)} ${booking.Stato}</span>
      </div>
      <div class="booking-details">
        <p><strong>📅 Periodo:</strong> ${formattaDataIT(booking.DataRitiro)} ${booking.OraRitiro} → ${formattaDataIT(booking.DataConsegna)} ${booking.OraConsegna}</p>
        <p><strong>🎯 Destinazione:</strong> ${booking.Destinazione || 'Non specificata'}</p>
        <p><strong>🚐 Pulmino:</strong> ${booking.Targa || 'Da assegnare'}</p>
        <p><strong>📅 Creata:</strong> ${formattaDataIT(booking.DataCreazione)}</p>
      </div>
    </div>
  `).join('');
}

// =====================
// VEHICLES
// =====================
async function loadAvailableVehicles() {
  const vehiclesList = qsId('veicoli-list');
  if (!vehiclesList) return;
  
  try {
    const response = await callAPIAligned('disponibilita');
    
    if (response.success) {
      availableVehicles = response.data || [];
      renderVehicles();
    } else {
      showToast('❌ Errore caricamento veicoli', 'error');
    }
  } catch (error) {
    console.error('Error loading vehicles:', error);
    showToast('❌ Errore connessione veicoli', 'error');
  }
}

function renderVehicles() {
  const vehiclesList = qsId('veicoli-list');
  if (!vehiclesList) return;
  
  if (!availableVehicles.length) {
    vehiclesList.innerHTML = '<p>📭 Nessun pulmino disponibile</p>';
    return;
  }
  
  vehiclesList.innerHTML = availableVehicles.map(vehicle => `
    <div class="vehicle-card" onclick="selectVehicle('${vehicle.Targa}', this)">
      <div class="vehicle-header">
        <strong>🚐 ${vehicle.Targa}</strong>
        <span class="badge badge-success">👥 ${vehicle.Posti} posti</span>
      </div>
      <div class="vehicle-details">
        <div class="vehicle-model">${vehicle.Marca} ${vehicle.Modello}</div>
        <div class="vehicle-status">✅ Disponibile</div>
      </div>
    </div>
  `).join('');
}

function selectVehicle(targa, element) {
  document.querySelectorAll('.vehicle-card').forEach(card => {
    card.classList.remove('active');
  });
  
  element.classList.add('active');
  
  bookingData.selectedVehicle = availableVehicles.find(v => v.Targa === targa);
  bookingData.targa = targa;
  
  const nextBtn = qsId('step2-next');
  if (nextBtn) nextBtn.disabled = false;
  
  showToast('✅ Pulmino selezionato: ' + targa, 'success');
}

// =====================
// WIZARD NAVIGATION
// =====================
function setupWizardNavigation() {
  const nav = {
    'step1-next': () => validateAndGoToStep(2),
    'step2-back': () => goToStep(1),
    'step2-next': () => validateAndGoToStep(3),
    'step3-back': () => goToStep(2),
    'step3-next': () => validateAndGoToStep(4),
    'step4-back': () => goToStep(3),
    'step4-next': () => validateAndGoToStep(5),
    'step5-back': () => goToStep(4),
    'step5-confirm': () => submitBooking(),
    'add-autista': () => addDriver()
  };

  Object.entries(nav).forEach(([id, handler]) => {
    const btn = qsId(id);
    if (btn) btn.addEventListener('click', handler);
  });
}

function goToStep(step) {
  stepAttuale = step;
  
  for (let i = 1; i <= 5; i++) {
    const stepEl = qsId(`step-${i}`);
    if (stepEl) stepEl.classList.toggle('active', i === step);
  }
  
  document.querySelectorAll('.progress-step').forEach((el, idx) => {
    el.classList.toggle('active', idx + 1 === step);
    el.classList.toggle('completed', idx + 1 < step);
  });
  
  if (step === 2) {
    loadAvailableVehicles();
  } else if (step === 3) {
    updatePreventivoSummary();
  } else if (step === 4) {
    // 🎯 AUTO-FILL COMPLETO PRIMO AUTISTA
    if (ultimoAutista && (!bookingData.drivers || bookingData.drivers.length === 0)) {
      addDriverWithData(ultimoAutista, true); // Primo autista auto-compilato
    } else if (!bookingData.drivers || bookingData.drivers.length === 0) {
      addDriver(); // Primo autista vuoto
    }
    renderDrivers();
  }
}

function validateAndGoToStep(targetStep) {
  if (stepAttuale === 1) {
    const dataRitiro = qsId('data-ritiro')?.value;
    const oraRitiro = qsId('ora-ritiro')?.value;
    const dataConsegna = qsId('data-consegna')?.value;
    const oraConsegna = qsId('ora-consegna')?.value;
    const destinazione = qsId('destinazione')?.value?.trim();
    
    if (!dataRitiro || !oraRitiro || !dataConsegna || !oraConsegna || !destinazione) {
      showToast('⚠️ Compila tutti i campi', 'warning');
      return;
    }
    
    bookingData = {
      ...bookingData,
      dataRitiro, oraRitiro, dataConsegna, oraConsegna, destinazione
    };
  }
  
  if (stepAttuale === 2 && !bookingData.targa) {
    showToast('⚠️ Seleziona un pulmino', 'warning');
    return;
  }
  
  if (stepAttuale === 3 && !preventivoRequested) {
    showToast('⚠️ Richiedi il preventivo prima di continuare', 'warning');
    return;
  }
  
  goToStep(targetStep);
}

// =====================
// PREVENTIVO
// =====================
function updatePreventivoSummary() {
  const container = qsId('preventivo-details');
  if (!container || !bookingData.targa) return;
  
  container.innerHTML = `
    <div class="summary-row"><span>🚐 Pulmino:</span> <strong>${bookingData.targa}</strong></div>
    <div class="summary-row"><span>📅 Ritiro:</span> <strong>${formattaDataIT(bookingData.dataRitiro)} alle ${bookingData.oraRitiro}</strong></div>
    <div class="summary-row"><span>📅 Consegna:</span> <strong>${formattaDataIT(bookingData.dataConsegna)} alle ${bookingData.oraConsegna}</strong></div>
    <div class="summary-row"><span>🎯 Destinazione:</span> <strong>${bookingData.destinazione}</strong></div>
  `;
}

function handleCallPreventivo() {
  window.open('tel:3286589618');
  markPreventivoRequested();
}

function handleWhatsAppPreventivo() {
  const message = `PREVENTIVO PULMINO IMBRIANI\n🚐 ${bookingData.targa}\n📅 Dal: ${formattaDataIT(bookingData.dataRitiro)} ${bookingData.oraRitiro}\n📅 Al: ${formattaDataIT(bookingData.dataConsegna)} ${bookingData.oraConsegna}\n🎯 Destinazione: ${bookingData.destinazione}`;
  const url = `https://wa.me/393286589618?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  markPreventivoRequested();
}

function markPreventivoRequested() {
  preventivoRequested = true;
  const statusDiv = qsId('preventivo-completed');
  if (statusDiv) statusDiv.classList.remove('hidden');
  
  const nextBtn = qsId('step3-next');
  if (nextBtn) nextBtn.disabled = false;
  
  showToast('✅ Preventivo richiesto! Ora puoi continuare', 'success');
}

// =====================
// DRIVERS MANAGEMENT - AUTO-FILL COMPLETO
// =====================
function addDriver() {
  if (!bookingData.drivers) bookingData.drivers = [];
  
  if (bookingData.drivers.length >= 3) {
    showToast('⚠️ Massimo 3 autisti', 'warning');
    return;
  }
  
  const newDriver = {
    Nome: '',
    CF: '',
    Email: '',
    Cellulare: '',
    DataNascita: '',
    LuogoNascita: '',
    ComuneResidenza: '',
    ViaResidenza: '',
    CivicoResidenza: '',
    NumeroPatente: '',
    ScadenzaPatente: ''
  };
  
  bookingData.drivers.push(newDriver);
  renderDrivers();
}

// 🎯 AGGIUNGI AUTISTA CON DATI COMPLETI (per auto-fill)
function addDriverWithData(driverData, showMessage = false) {
  if (!bookingData.drivers) bookingData.drivers = [];
  
  if (bookingData.drivers.length >= 3) {
    showToast('⚠️ Massimo 3 autisti', 'warning');
    return;
  }
  
  bookingData.drivers.push({ ...driverData });
  
  if (showMessage) {
    showToast('✅ Primo autista precompilato dalle tue prenotazioni', 'success');
  }
  
  renderDrivers();
}

function renderDrivers() {
  const container = qsId('autisti-container');
  if (!container || !bookingData.drivers) return;
  
  container.innerHTML = bookingData.drivers.map((driver, index) => `
    <div class="driver-row">
      <div class="driver-header">
        <h6>👤 Autista ${index + 1} ${index === 0 && ultimoAutista ? '(precompilato)' : ''}</h6>
        ${index > 0 ? `<button type="button" class="btn btn-sm btn-danger" onclick="removeDriver(${index})">❌ Rimuovi</button>` : ''}
      </div>
      
      <!-- Dati anagrafici -->
      <div class="form-row">
        <div class="form-group">
          <label>Nome:</label>
          <input type="text" value="${driver.Nome}" data-index="${index}" data-field="Nome" onchange="updateDriverField(${index}, 'Nome', this.value)">
        </div>
        <div class="form-group">
          <label>CF (16 caratteri):</label>
          <input type="text" value="${driver.CF}" data-index="${index}" data-field="CF" maxlength="16" onchange="updateDriverField(${index}, 'CF', this.value)">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Email:</label>
          <input type="email" value="${driver.Email}" data-index="${index}" data-field="Email" onchange="updateDriverField(${index}, 'Email', this.value)">
        </div>
        <div class="form-group">
          <label>Cellulare:</label>
          <input type="tel" value="${driver.Cellulare}" data-index="${index}" data-field="Cellulare" onchange="updateDriverField(${index}, 'Cellulare', this.value)">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Data di Nascita:</label>
          <input type="date" value="${driver.DataNascita}" data-index="${index}" data-field="DataNascita" onchange="updateDriverField(${index}, 'DataNascita', this.value)">
        </div>
        <div class="form-group">
          <label>Luogo di Nascita:</label>
          <input type="text" value="${driver.LuogoNascita}" data-index="${index}" data-field="LuogoNascita" onchange="updateDriverField(${index}, 'LuogoNascita', this.value)">
        </div>
      </div>
      
      <!-- Residenza -->
      <div class="form-row">
        <div class="form-group">
          <label>Comune di Residenza:</label>
          <input type="text" value="${driver.ComuneResidenza}" data-index="${index}" data-field="ComuneResidenza" onchange="updateDriverField(${index}, 'ComuneResidenza', this.value)">
        </div>
        <div class="form-group">
          <label>Via:</label>
          <input type="text" value="${driver.ViaResidenza}" data-index="${index}" data-field="ViaResidenza" onchange="updateDriverField(${index}, 'ViaResidenza', this.value)">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Civico:</label>
          <input type="text" value="${driver.CivicoResidenza}" data-index="${index}" data-field="CivicoResidenza" onchange="updateDriverField(${index}, 'CivicoResidenza', this.value)">
        </div>
      </div>
      
      <!-- Patente -->
      <div class="form-row">
        <div class="form-group">
          <label>Numero Patente:</label>
          <input type="text" value="${driver.NumeroPatente}" data-index="${index}" data-field="NumeroPatente" onchange="updateDriverField(${index}, 'NumeroPatente', this.value)">
        </div>
        <div class="form-group">
          <label>Scadenza Patente:</label>
          <input type="date" value="${driver.ScadenzaPatente}" data-index="${index}" data-field="ScadenzaPatente" onchange="updateDriverField(${index}, 'ScadenzaPatente', this.value)">
        </div>
      </div>
    </div>
  `).join('');
  
  // Enable next button if drivers exist
  const nextBtn = qsId('step4-next');
  if (nextBtn) nextBtn.disabled = bookingData.drivers.length === 0;
}

function updateDriverField(index, field, value) {
  if (bookingData.drivers && bookingData.drivers[index]) {
    bookingData.drivers[index][field] = value;
  }
}

// =====================
// PROFILE MANAGEMENT
// =====================
async function handleProfileSave(e) {
  e.preventDefault();
  
  const profileData = {
    nome: qsId('profile-nome-completo')?.value || '',
    email: qsId('profile-email')?.value || '',
    telefono: qsId('profile-telefono')?.value || '',
    dataNascita: qsId('profile-data-nascita')?.value || '',
    luogoNascita: qsId('profile-luogo-nascita')?.value || '',
    indirizzo: qsId('profile-indirizzo')?.value || '',
    numeroPatente: qsId('profile-patente')?.value || '',
    scadenzaPatente: qsId('profile-patente-scadenza')?.value || ''
  };
  
  // Save in localStorage for future use
  localStorage.setItem('USER_PROFILE', JSON.stringify(profileData));
  
  // Update ultimoAutista if available
  if (ultimoAutista) {
    ultimoAutista = { ...ultimoAutista, ...profileData };
  }
  
  showToast('💾 Profilo salvato localmente', 'success');
}

// =====================
// BOOKING SUBMISSION
// =====================
async function submitBooking() {
  if (!bookingData.targa || !bookingData.drivers || bookingData.drivers.length === 0) {
    showToast('❌ Dati mancanti per prenotazione', 'error');
    return;
  }
  
  showLoader(true);
  
  try {
    const payload = {
      cf: clienteCorrente?.CF || 'ANONYMOUS',
      dataRitiro: bookingData.dataRitiro,
      oraRitiro: bookingData.oraRitiro,
      dataConsegna: bookingData.dataConsegna,
      oraConsegna: bookingData.oraConsegna,
      destinazione: bookingData.destinazione,
      targa: bookingData.targa,
      drivers: encodeURIComponent(JSON.stringify(bookingData.drivers))
    };
    
    const response = await callAPIAligned('creaPrenotazione', payload);
    
    if (response.success) {
      showToast('🎉 Prenotazione creata con ID: ' + response.data.id, 'success');
      switchTab('prenotazioni');
      loadUserBookings();
      
      bookingData = {};
      preventivoRequested = false;
      
    } else {
      showToast('❌ ' + response.message, 'error');
    }
  } catch (error) {
    showToast('❌ Errore creazione prenotazione', 'error');
  } finally {
    showLoader(false);
  }
}

function getStatusClass(status) {
  if (status === 'Confermata') return 'badge-success';
  if (status === 'Da confermare' || status === 'Da Confermare') return 'badge-warning';
  if (status === 'Annullata') return 'badge-danger';
  return 'badge-secondary';
}

function getStatusEmoji(status) {
  return FRONTEND_CONFIG.statiEmoji[status] || '❓';
}

function composeAddress(via, civico, comune) {
  const parts = [via, civico, comune].filter(p => p && String(p).trim());
  return parts.join(' ');
}

// Helper per validazione CF
function isValidCF(cf) {
  const cfUpper = String(cf || '').toUpperCase().trim();
  return cfUpper.length === 16 && /^[A-Z0-9]+$/.test(cfUpper);
}

// Funzioni globali
window.selectVehicle = selectVehicle;
window.updateDriverField = updateDriverField;
window.removeDriver = function(index) {
  if (bookingData.drivers && index > 0) {
    bookingData.drivers.splice(index, 1);
    renderDrivers();
    showToast('❌ Autista rimosso', 'info');
  }
};

// Usa callAPIAligned globalmente
window.callAPI = callAPIAligned;

console.log('✅ scripts.js v7.1.0 loaded - BACKEND ALIGNED + AUTO-FILL COMPLETO');