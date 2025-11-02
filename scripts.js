/* 🚀 IMBRIANI STEFANO NOLEGGIO - scripts.js v7.2.0 COMPLETE AUTOFILL
   + Fixed autofill system + Step 5 summary + Profile population
*/

'use strict';

const VERSION = '7.2.0';
let clienteCorrente = null;
let ultimoAutista = null;
let prenotazioniUtente = [];
let availableVehicles = [];
let stepAttuale = 1;
let bookingData = {};
let preventivoRequested = false;

console.log(`🚀 Imbriani Stefano Noleggio v${VERSION} loaded`);

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM loaded');
  
  const loginForm = qsId('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('✅ Login handler attached');
  }
  
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });
  
  const newCustomerCTA = qsId('new-customer-cta');
  if (newCustomerCTA) {
    newCustomerCTA.addEventListener('click', handleNewCustomerCTA);
  }
  
  const logoutBtn = qsId('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  
  const refreshBtn = qsId('refresh-bookings');
  if (refreshBtn) refreshBtn.addEventListener('click', loadUserBookings);
  
  setupWizardNavigation();
  
  const callBtn = qsId('call-btn');
  const whatsappBtn = qsId('whatsapp-btn');
  if (callBtn) callBtn.addEventListener('click', handleCallPreventivo);
  if (whatsappBtn) whatsappBtn.addEventListener('click', handleWhatsAppPreventivo);
  
  const profileForm = qsId('profile-form');
  if (profileForm) profileForm.addEventListener('submit', handleProfileSave);
});

// =====================
// LOGIN with COMPLETE AUTOFILL from CLIENTI REGISTRY
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
    // 1) Basic login
    const response = await callAPI('login', { cf });
    console.log('📡 Login response:', response);
    
    if (response.success) {
      clienteCorrente = response.data;
      localStorage.setItem(FRONTEND_CONFIG.storage.CF, cf);
      
      // 2) 🎯 LOAD COMPLETE CLIENT DATA from Clienti registry
      await loadCompleteClientData(cf);
      
      showToast('✅ Login riuscito!', 'success');
      
      // Show dashboard
      const homepage = qsId('homepage-sections');
      const dashboard = qsId('user-dashboard');
      if (homepage) homepage.classList.add('hidden');
      if (dashboard) dashboard.classList.remove('hidden');
      
      // Update user name
      const userName = qsId('user-name');
      if (userName) userName.textContent = ultimoAutista?.Nome || clienteCorrente.Nome || 'Cliente';
      
      // 3) 📋 POPULATE PROFILE with complete data
      populateProfileFromCompleteData();
      
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

// 🎯 LOAD COMPLETE CLIENT DATA from Clienti registry
async function loadCompleteClientData(cf) {
  try {
    // Try getClienteByCF first (from Clienti registry)
    const response = await callAPI('getClienteByCF', { cf });
    
    if (response.success && response.data) {
      ultimoAutista = response.data;
      console.log('🎯 Complete client loaded from registry:', ultimoAutista);
      return;
    }
    
    console.log('⚠️ Client not in registry, trying historical bookings');
    
    // Fallback: historical bookings
    const historyResponse = await callAPI('recuperaPrenotazioni', { cf });
    
    if (historyResponse.success && historyResponse.data && historyResponse.data.length > 0) {
      const ultima = historyResponse.data[historyResponse.data.length - 1];
      
      ultimoAutista = {
        Nome: ultima.Nome || clienteCorrente.Nome || '',
        CF: cf,
        Email: ultima.Email || clienteCorrente.Email || '',
        Cellulare: ultima.Cellulare || clienteCorrente.Cellulare || '',
        DataNascita: ultima['Data di nascita'] || '',
        LuogoNascita: ultima['Luogo di nascita'] || '',
        ComuneResidenza: ultima['Comune di residenza'] || '',
        ViaResidenza: ultima['Via di residenza'] || '',
        CivicoResidenza: ultima['Civico di residenza'] || '',
        NumeroPatente: ultima['Numero di patente'] || '',
        InizioPatente: ultima['Data inizio validità patente'] || '',
        ScadenzaPatente: ultima['Scadenza patente'] || ''
      };
      
      console.log('🎯 Client loaded from history:', ultimoAutista);
    } else {
      // Final fallback: basic data only
      ultimoAutista = {
        Nome: clienteCorrente.Nome || '',
        CF: cf,
        Email: clienteCorrente.Email || '',
        Cellulare: clienteCorrente.Cellulare || ''
      };
      
      console.log('📝 Basic client data only:', ultimoAutista);
    }
  } catch (error) {
    console.error('Error loading complete client data:', error);
    ultimoAutista = null;
  }
}

// 📋 POPULATE PROFILE with complete data
function populateProfileFromCompleteData() {
  if (!ultimoAutista) return;
  
  const fields = {
    'profile-nome-completo': ultimoAutista.Nome || '',
    'profile-email': ultimoAutista.Email || '',
    'profile-telefono': ultimoAutista.Cellulare || '',
    'profile-data-nascita': ultimoAutista.DataNascita || '',
    'profile-luogo-nascita': ultimoAutista.LuogoNascita || '',
    'profile-comune-residenza': ultimoAutista.ComuneResidenza || '',
    'profile-via-residenza': ultimoAutista.ViaResidenza || '',
    'profile-civico-residenza': ultimoAutista.CivicoResidenza || '',
    'profile-numero-patente': ultimoAutista.NumeroPatente || '',
    'profile-scadenza-patente': ultimoAutista.ScadenzaPatente || ''
  };
  
  Object.entries(fields).forEach(([id, value]) => {
    const input = qsId(id);
    if (input && value) {
      input.value = value;
    }
  });
  
  console.log('📋 Profile populated with complete data');
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
    const response = await callAPI('recuperaPrenotazioni', { cf: clienteCorrente.CF });
    
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
    const response = await callAPI('disponibilita');
    
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
    vehiclesList.innerHTML = '<p>🚫 Nessun pulmino disponibile</p>';
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
    // 🎯 AUTO-FILL COMPLETE FIRST DRIVER
    if (ultimoAutista && (!bookingData.drivers || bookingData.drivers.length === 0)) {
      addDriverWithCompleteData(ultimoAutista, true);
    } else if (!bookingData.drivers || bookingData.drivers.length === 0) {
      addDriver();
    }
    renderDrivers();
  } else if (step === 5) {
    // 📋 GENERATE COMPLETE BOOKING SUMMARY
    generateCompleteBookingSummary();
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
  
  if (stepAttuale === 4) {
    if (!bookingData.drivers || bookingData.drivers.length === 0) {
      showToast('⚠️ Aggiungi almeno un autista', 'warning');
      return;
    }
    
    // Validate required fields
    for (const driver of bookingData.drivers) {
      if (!driver.Nome || !driver.CF || !driver.DataNascita || !driver.NumeroPatente) {
        showToast('⚠️ Completa i dati obbligatori di tutti gli autisti', 'warning');
        return;
      }
    }
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
// DRIVERS MANAGEMENT with COMPLETE AUTOFILL
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

// 🎯 ADD DRIVER WITH COMPLETE DATA (for autofill)
function addDriverWithCompleteData(driverData, showMessage = false) {
  if (!bookingData.drivers) bookingData.drivers = [];
  
  if (bookingData.drivers.length >= 3) {
    showToast('⚠️ Massimo 3 autisti', 'warning');
    return;
  }
  
  bookingData.drivers.push({ ...driverData });
  
  if (showMessage) {
    showToast('✅ Primo autista precompilato completamente!', 'success');
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
          <label>Nome *:</label>
          <input type="text" value="${driver.Nome}" data-index="${index}" data-field="Nome" onchange="updateDriverField(${index}, 'Nome', this.value)" required>
        </div>
        <div class="form-group">
          <label>CF (16 caratteri) *:</label>
          <input type="text" value="${driver.CF}" data-index="${index}" data-field="CF" maxlength="16" onchange="updateDriverField(${index}, 'CF', this.value)" required>
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
          <label>Data di Nascita *:</label>
          <input type="date" value="${driver.DataNascita}" data-index="${index}" data-field="DataNascita" onchange="updateDriverField(${index}, 'DataNascita', this.value)" required>
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
          <label>Numero Patente *:</label>
          <input type="text" value="${driver.NumeroPatente}" data-index="${index}" data-field="NumeroPatente" onchange="updateDriverField(${index}, 'NumeroPatente', this.value)" required>
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
// STEP 5 - COMPLETE BOOKING SUMMARY
// =====================
function generateCompleteBookingSummary() {
  const container = qsId('booking-summary');
  if (!container) return;
  
  const startDate = new Date(`${bookingData.dataRitiro}T${bookingData.oraRitiro}:00`);
  const endDate = new Date(`${bookingData.dataConsegna}T${bookingData.oraConsegna}:00`);
  const diffMs = endDate - startDate;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  
  let durationText = '';
  if (days > 0 && hours > 0) durationText = `${days} giorni e ${hours} ore`;
  else if (days > 0) durationText = `${days} giorni`;
  else durationText = `${hours} ore`;
  
  container.innerHTML = `
    <div class="summary-section">
      <h4>📋 Riepilogo Completo Prenotazione</h4>
      
      <div class="summary-grid">
        <div class="summary-item">
          <label>📅 Ritiro:</label>
          <span><strong>${formattaDataIT(bookingData.dataRitiro)} alle ${bookingData.oraRitiro}</strong></span>
        </div>
        <div class="summary-item">
          <label>📅 Consegna:</label>
          <span><strong>${formattaDataIT(bookingData.dataConsegna)} alle ${bookingData.oraConsegna}</strong></span>
        </div>
        <div class="summary-item">
          <label>⏱️ Durata:</label>
          <span><strong>${durationText}</strong></span>
        </div>
        <div class="summary-item">
          <label>🎯 Destinazione:</label>
          <span><strong>${bookingData.destinazione}</strong></span>
        </div>
        <div class="summary-item">
          <label>🚐 Pulmino:</label>
          <span><strong>${bookingData.targa} (${bookingData.selectedVehicle?.Posti || '9'} posti)</strong></span>
        </div>
        <div class="summary-item">
          <label>👥 Autisti:</label>
          <span><strong>${bookingData.drivers?.length || 0}</strong></span>
        </div>
      </div>
    </div>
    
    <div class="summary-section drivers-summary">
      <h5>👥 Dettagli Autisti</h5>
      ${bookingData.drivers?.map((driver, index) => `
        <div class="driver-summary-card">
          <h6>👤 Autista ${index + 1}</h6>
          <div class="driver-details">
            <p><strong>Nome:</strong> ${driver.Nome}</p>
            <p><strong>CF:</strong> ${driver.CF}</p>
            <p><strong>Data Nascita:</strong> ${driver.DataNascita ? formattaDataIT(driver.DataNascita) : 'Non specificata'}</p>
            <p><strong>Luogo Nascita:</strong> ${driver.LuogoNascita || 'Non specificato'}</p>
            <p><strong>Residenza:</strong> ${[driver.ViaResidenza, driver.CivicoResidenza, driver.ComuneResidenza].filter(x=>x).join(', ') || 'Non specificata'}</p>
            <p><strong>Patente:</strong> ${driver.NumeroPatente} ${driver.ScadenzaPatente ? '(scade: ' + formattaDataIT(driver.ScadenzaPatente) + ')' : ''}</p>
            ${index === 0 && (driver.Email || driver.Cellulare) ? `<p><strong>Contatti:</strong> ${[driver.Email, driver.Cellulare].filter(x=>x).join(' • ')}</p>` : ''}
          </div>
        </div>
      `).join('') || '<p>❌ Nessun autista</p>'}
    </div>
    
    <div class="booking-note">
      <p><strong>📋 Nota importante:</strong></p>
      <p>La prenotazione sarà inviata con stato "Da confermare" e riceverai conferma telefonica.</p>
      <p>ID prenotazione: <code>BOOK-${new Date().getFullYear()}-###</code></p>
    </div>
  `;
}

// =====================
// PROFILE MANAGEMENT
// =====================
async function handleProfileSave(e) {
  e.preventDefault();
  
  const profileData = {
    Nome: qsId('profile-nome-completo')?.value || '',
    Email: qsId('profile-email')?.value || '',
    Cellulare: qsId('profile-telefono')?.value || '',
    DataNascita: qsId('profile-data-nascita')?.value || '',
    LuogoNascita: qsId('profile-luogo-nascita')?.value || '',
    ComuneResidenza: qsId('profile-comune-residenza')?.value || '',
    ViaResidenza: qsId('profile-via-residenza')?.value || '',
    CivicoResidenza: qsId('profile-civico-residenza')?.value || '',
    NumeroPatente: qsId('profile-numero-patente')?.value || '',
    ScadenzaPatente: qsId('profile-scadenza-patente')?.value || ''
  };
  
  // Save in localStorage
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
    
    const response = await callAPI('creaPrenotazione', payload);
    
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

// =====================
// UTILITIES
// =====================
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

function formattaDataIT(dateStr) {
  if (!dateStr) return '';
  let cleanDate = String(dateStr).split('T')[0];
  const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateStr;
}

function isValidCF(cf) {
  const cfUpper = String(cf || '').toUpperCase().trim();
  return cfUpper.length === 16 && /^[A-Z0-9]+$/.test(cfUpper);
}

// Global functions
window.selectVehicle = selectVehicle;
window.updateDriverField = updateDriverField;
window.removeDriver = function(index) {
  if (bookingData.drivers && index > 0) {
    bookingData.drivers.splice(index, 1);
    renderDrivers();
    showToast('❌ Autista rimosso', 'info');
  }
};

console.log('✅ scripts.js v7.2.0 loaded - COMPLETE AUTOFILL + STEP 5 SUMMARY');