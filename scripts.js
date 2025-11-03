/**
 * IMBRIANI STEFANO NOLEGGIO - SCRIPTS v8.2
 * Homepage logic completo e funzionante
 */

// Variabili globali
let selectedVehicle = null;
let searchParams = {};
let vehicleModal = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('🚀 Inizializzazione Imbriani Noleggio v8.2...');
  
  // Setup sicuro network handlers
  safeSetupNetworkHandlers();
  
  // Load stato salvato
  loadSavedState();
  
  // Setup modale veicoli
  setupVehicleModal();
  
  // Setup login
  setupLogin();
  
  // Check se torniamo da selezione veicolo
  checkVehicleSelection();
}

function safeSetupNetworkHandlers() {
  try {
    if (typeof window.onNetworkChange !== 'function') {
      window.onNetworkChange = function(online) {
        if (window.showToast) {
          showToast(`Sei ${online ? 'online' : 'offline'}`, online ? 'success' : 'warning', 2000);
        }
      };
    }
    window.addEventListener('online', () => onNetworkChange(true));
    window.addEventListener('offline', () => onNetworkChange(false));
  } catch (e) {
    console.warn('Network handlers setup failed:', e);
  }
}

function loadSavedState() {
  try {
    const params = getFromStorage('searchParams', {});
    if (params && params.dataInizio) {
      console.log('ℹ️ Stato caricato da storage', params);
      // Pre-compila form se ha senso
      const dataRitiro = document.getElementById('new-data-ritiro');
      if (dataRitiro && params.dataInizio) {
        dataRitiro.value = params.dataInizio;
      }
    }
  } catch (e) {
    console.warn('Storage read error:', e);
  }
}

function setupVehicleModal() {
  try {
    const modalEl = document.getElementById('vehicleModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      vehicleModal = new bootstrap.Modal(modalEl);
    }
    
    // Bottone "Verifica e Seleziona Veicolo"
    const btnCheck = document.getElementById('check-disponibilita');
    if (btnCheck) {
      btnCheck.addEventListener('click', handleCheckAvailability);
    }
    
    // Filtri veicoli
    ['filter-disponibili', 'filter-manutenzione', 'filter-search', 'filter-posti'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', filterVehicles);
        el.addEventListener('input', filterVehicles);
      }
    });
    
    // Continua selezione
    const continueBtn = document.getElementById('continue-selection');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (selectedVehicle && vehicleModal) {
          vehicleModal.hide();
          showQuoteStep();
        }
      });
    }
  } catch (e) {
    console.error('Vehicle modal setup failed:', e);
  }
}

function setupLogin() {
  const loginBtn = document.getElementById('login-btn');
  const cfInput = document.getElementById('cf-input');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  
  if (cfInput) {
    cfInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }
}

async function handleCheckAvailability() {
  const dr = document.getElementById('new-data-ritiro')?.value;
  const or = document.getElementById('new-ora-ritiro')?.value || '08:00';
  const dc = document.getElementById('new-data-consegna')?.value;
  const oc = document.getElementById('new-ora-consegna')?.value || '20:00';
  const de = document.getElementById('new-destinazione')?.value?.trim() || '';
  const posti = document.getElementById('new-posti')?.value || '9';
  
  if (!dr || !dc) {
    showToast('Seleziona date ritiro e consegna', 'warning');
    return;
  }
  
  searchParams = {
    dataInizio: dr,
    dataFine: dc,
    oraInizio: or,
    oraFine: oc,
    destinazione: de,
    posti: posti
  };
  
  // Salva parametri
  saveToStorage('searchParams', searchParams);
  
  // Apri modale
  if (vehicleModal) {
    vehicleModal.show();
    await loadVehicles();
  }
}

async function loadVehicles() {
  if (!window.callAPI) {
    console.error('callAPI not available');
    return;
  }
  
  showLoader(true, 'Caricamento veicoli...');
  
  try {
    const [flottaResp, dispResp] = await Promise.all([
      callAPI('flotta', { method: 'get' }),
      callAPI('disponibilita', searchParams)
    ]);
    
    const flotta = flottaResp.success ? flottaResp.data : [];
    const disponibili = dispResp.success ? (dispResp.data.disponibili || dispResp.data || []) : [];
    const targheDisponibili = new Set(disponibili.map(v => v.Targa));
    
    // Merge disponibilità
    flotta.forEach(v => {
      v.DisponibileDate = targheDisponibili.has(v.Targa);
    });
    
    renderVehicles(flotta);
    updateVehicleCount(flotta);
    
  } catch (error) {
    console.error('Errore caricamento veicoli:', error);
    const grid = document.getElementById('vehicles-grid');
    if (grid) {
      grid.innerHTML = '<div class="col-12"><div class="alert alert-danger">Errore caricamento veicoli. Verifica la connessione e riprova.</div></div>';
    }
  } finally {
    showLoader(false);
  }
}

function renderVehicles(vehicles) {
  const grid = document.getElementById('vehicles-grid');
  if (!grid) return;
  
  if (!vehicles || vehicles.length === 0) {
    grid.innerHTML = '<div class="col-12"><div class="alert alert-warning text-center">Nessun veicolo trovato.</div></div>';
    return;
  }
  
  grid.innerHTML = vehicles.map(v => {
    const available = v.DisponibileDate && v.Disponibile;
    const passoLungo = v.PassoLungo || v.Targa === 'EC787NM';
    const badges = [];
    
    if (passoLungo) badges.push('<span class="badge bg-warning">🚐 Passo Lungo</span>');
    if (!available) badges.push('<span class="badge bg-secondary">Manutenzione</span>');
    else badges.push('<span class="badge bg-success">Disponibile</span>');
    
    return `
      <div class="col-md-6 col-xl-4">
        <div class="vehicle-card glass-card p-3 h-100 ${!available ? 'disabled' : ''}" data-targa="${v.Targa}" data-vehicle='${JSON.stringify(v).replace(/'/g, '&#39;')}'>
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0">${v.Marca} ${v.Modello}</h6>
            <div class="d-flex flex-wrap gap-1">${badges.join('')}</div>
          </div>
          <div class="text-muted small mb-2">
            <i class="fas fa-id-badge me-1"></i>Targa: ${v.Targa}
          </div>
          <div class="text-muted small mb-3">
            <i class="fas fa-users me-1"></i>${v.Posti} posti
          </div>
          ${v.Note ? `<div class="small text-muted mb-2">${v.Note}</div>` : ''}
          <div class="d-grid">
            <button class="btn ${available ? 'btn-outline-primary' : 'btn-outline-secondary'} btn-sm vehicle-select" ${!available ? 'disabled' : ''} data-targa="${v.Targa}">
              ${available ? '<i class="fas fa-check me-1"></i>Seleziona' : '<i class="fas fa-ban me-1"></i>Non disponibile'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach click handlers
  document.querySelectorAll('.vehicle-select').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        selectVehicle(btn.dataset.targa);
      }
    });
  });
}

function selectVehicle(targa) {
  selectedVehicle = null;
  
  document.querySelectorAll('.vehicle-card').forEach(card => {
    card.classList.remove('selected');
    if (card.dataset.targa === targa) {
      card.classList.add('selected');
      try {
        selectedVehicle = JSON.parse(card.dataset.vehicle.replace(/&#39;/g, "'"));
      } catch (e) {
        console.error('Errore parsing veicolo:', e);
      }
    }
  });
  
  const continueBtn = document.getElementById('continue-selection');
  if (continueBtn) {
    continueBtn.disabled = !selectedVehicle;
  }
}

function filterVehicles() {
  const soloDisp = document.getElementById('filter-disponibili')?.checked;
  const inclManu = document.getElementById('filter-manutenzione')?.checked;
  const search = document.getElementById('filter-search')?.value?.toLowerCase() || '';
  const posti = document.getElementById('filter-posti')?.value;
  
  document.querySelectorAll('.vehicle-card').forEach(card => {
    try {
      const vehicle = JSON.parse(card.dataset.vehicle.replace(/&#39;/g, "'"));
      let show = true;
      
      if (soloDisp && !vehicle.DisponibileDate) show = false;
      if (!inclManu && !vehicle.Disponibile) show = false;
      if (search && !`${vehicle.Marca} ${vehicle.Modello} ${vehicle.Targa}`.toLowerCase().includes(search)) show = false;
      if (posti && vehicle.Posti.toString() !== posti) show = false;
      
      card.parentElement.style.display = show ? 'block' : 'none';
    } catch (e) {
      console.error('Errore filtro veicolo:', e);
    }
  });
}

function updateVehicleCount(vehicles) {
  const countEl = document.getElementById('vehicles-count');
  if (countEl && vehicles) {
    const total = vehicles.length;
    const available = vehicles.filter(v => v.DisponibileDate && v.Disponibile).length;
    countEl.textContent = `${available} disponibili su ${total} veicoli totali`;
  }
}

function showQuoteStep() {
  const stepPrev = document.getElementById('step-preventivo');
  const vehicleInfo = document.getElementById('veicolo-selezionato');
  
  if (selectedVehicle && stepPrev) {
    const passoLungo = selectedVehicle.PassoLungo || selectedVehicle.Targa === 'EC787NM';
    const badge = passoLungo ? ' <span class="badge bg-warning">Passo Lungo</span>' : '';
    
    vehicleInfo.innerHTML = `
      <strong>Veicolo selezionato:</strong><br>
      <i class="fas fa-car me-1"></i>${selectedVehicle.Marca} ${selectedVehicle.Modello} (${selectedVehicle.Targa})${badge}
    `;
    
    stepPrev.classList.remove('d-none');
    stepPrev.scrollIntoView({ behavior: 'smooth' });
    
    // Setup WhatsApp link
    setupWhatsAppLink();
  }
}

function setupWhatsAppLink() {
  const nomeEl = document.getElementById('nuovo-nome');
  const cognEl = document.getElementById('nuovo-cognome');
  const waEl = document.getElementById('cta-whatsapp');
  
  if (!nomeEl || !cognEl || !waEl) return;
  
  const updateWA = () => {
    if (!selectedVehicle) return;
    
    const nome = nomeEl.value || '';
    const cognome = cognEl.value || '';
    const passoLungo = selectedVehicle.PassoLungo || selectedVehicle.Targa === 'EC787NM';
    
    const phone = '393286589618';
    const lines = [
      'Richiesta preventivo — Imbriani Stefano Noleggio',
      `Nome: ${nome} ${cognome}`,
      `Ritiro: ${searchParams.dataInizio} ${searchParams.oraInizio}`,
      `Consegna: ${searchParams.dataFine} ${searchParams.oraFine}`,
      `Destinazione: ${searchParams.destinazione}`,
      `Veicolo: ${selectedVehicle.Marca} ${selectedVehicle.Modello} (${selectedVehicle.Targa})${passoLungo ? ' - Passo Lungo' : ''}`
    ];
    
    const waURL = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    waEl.setAttribute('href', waURL);
  };
  
  nomeEl.addEventListener('input', updateWA);
  cognEl.addEventListener('input', updateWA);
  updateWA();
}

function checkVehicleSelection() {
  // Controlla se torniamo da veicoli.html con selezione
  if (window.location.hash === '#preventivo') {
    const saved = getFromStorage('selectedVehicle', null);
    const params = getFromStorage('searchParams', {});
    
    if (saved && params) {
      try {
        selectedVehicle = typeof saved === 'string' ? JSON.parse(saved) : saved;
        searchParams = typeof params === 'string' ? JSON.parse(params) : params;
        
        // Pulisci storage
        removeFromStorage('selectedVehicle');
        removeFromStorage('searchParams');
        
        // Mostra step preventivo
        showQuoteStep();
        
        // Rimuovi hash
        window.history.replaceState('', document.title, window.location.pathname);
      } catch (e) {
        console.error('Errore caricamento selezione salvata:', e);
      }
    }
  }
}

async function handleLogin() {
  const cfInput = document.getElementById('cf-input');
  if (!cfInput) return;
  
  const cf = cfInput.value.trim().toUpperCase();
  
  const validation = validateCodiceFiscale(cf);
  if (!validation.valid) {
    showToast(validation.message, 'error');
    return;
  }
  
  showLoader(true, 'Accesso in corso...');
  
  try {
    const response = await callAPI('login', { cf });
    
    if (response.success) {
      showToast(`Benvenuto, ${response.data.nome}!`, 'success');
      // Qui redirigi all'area personale o carica i dati utente
      console.log('Login successful:', response.data);
    } else {
      showToast(response.message || 'Errore durante il login', 'error');
    }
  } catch (error) {
    showToast('Errore di connessione. Riprova.', 'error');
    console.error('Login error:', error);
  } finally {
    showLoader(false);
  }
}

// Export funzioni per uso globale
window.handleCheckAvailability = handleCheckAvailability;
window.loadVehicles = loadVehicles;
window.selectVehicle = selectVehicle;
window.filterVehicles = filterVehicles;
window.showQuoteStep = showQuoteStep;
window.handleLogin = handleLogin;

console.log('✅ Scripts v8.2 loaded - Homepage logic completo');