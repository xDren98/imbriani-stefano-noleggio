/**
 * IMBRIANI STEFANO NOLEGGIO - SHARED UTILITIES v8.0
 * Utility condivise per frontend e admin
 */

const SHARED_CONFIG = {
  VERSION: '8.0',
  API_BASE_URL: window.API_URL || 'https://imbriani-proxy.dreenhd.workers.dev',
  TOKEN: 'imbriani_secret_2025',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  DEBUG: true,
  VEHICLE_TYPES: {
    PASSO_LUNGO_TARGA: 'EC787NM',
    STATI_VALIDI: ['Disponibile', 'Occupato', 'Manutenzione', 'Fuori servizio']
  }
};

window.SHARED_CONFIG = SHARED_CONFIG;

// CORS-enabled API call with enhanced error handling
async function callAPI(action, params = {}) {
  const timestamp = Date.now();
  const payload = {
    action: action,
    token: SHARED_CONFIG.TOKEN,
    ts: timestamp.toString(),
    ...params
  };
  
  if (SHARED_CONFIG.DEBUG) {
    console.log(`🚀 API Call: ${action}`, payload);
  }
  
  try {
    const url = new URL(SHARED_CONFIG.API_BASE_URL);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (SHARED_CONFIG.DEBUG) {
      console.log(`✅ API Response: ${action}`, data);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ API Error: ${action}`, error);
    return {
      success: false,
      data: null,
      message: `Errore di rete: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

// Enhanced vehicle utilities
function isPassoLungo(vehicle) {
  if (!vehicle) return false;
  return vehicle.Targa === SHARED_CONFIG.VEHICLE_TYPES.PASSO_LUNGO_TARGA ||
         vehicle.PassoLungo === true ||
         (vehicle.Marca?.toLowerCase().includes('fiat') && 
          vehicle.Modello?.toLowerCase().includes('ducato') && 
          vehicle.Targa === 'EC787NM');
}

function getVehicleBadges(vehicle) {
  const badges = [];
  
  if (isPassoLungo(vehicle)) {
    badges.push({ text: '🚐 Passo Lungo', class: 'bg-warning' });
  }
  
  if (vehicle.Disponibile) {
    badges.push({ text: 'Disponibile', class: 'bg-success' });
  } else if (vehicle.Stato?.toLowerCase().includes('manutenzione')) {
    badges.push({ text: 'Manutenzione', class: 'bg-secondary' });
  } else {
    badges.push({ text: vehicle.Stato || 'Non disponibile', class: 'bg-warning' });
  }
  
  return badges;
}

function formatVehicleForWhatsApp(vehicle, searchParams) {
  const passoLungo = isPassoLungo(vehicle);
  const vehicleText = `${vehicle.Marca} ${vehicle.Modello} (${vehicle.Targa})${passoLungo ? ' - Passo Lungo' : ''}`;
  
  const lines = [
    'Richiesta preventivo — Imbriani Stefano Noleggio',
    `Veicolo richiesto: ${vehicleText}`,
    `Ritiro: ${searchParams.dataInizio} ${searchParams.oraInizio}`,
    `Consegna: ${searchParams.dataFine} ${searchParams.oraFine}`,
    `Destinazione: ${searchParams.destinazione || 'Da specificare'}`,
    `Posti: ${vehicle.Posti}`
  ];
  
  return lines.join('\n');
}

// Enhanced loading states
function showLoader(show, message = 'Caricamento...') {
  const spinner = document.getElementById('spinner');
  const loadMessage = document.getElementById('loader-message');
  
  if (spinner) {
    if (show) {
      spinner.classList.remove('d-none');
      if (loadMessage) loadMessage.textContent = message;
    } else {
      spinner.classList.add('d-none');
    }
  }
}

// Enhanced toast notifications
function showToast(message, type = 'info', duration = 5000) {
  const toastContainer = getOrCreateToastContainer();
  const toastId = 'toast-' + Date.now();
  
  const bgClass = {
    'success': 'bg-success',
    'warning': 'bg-warning',
    'error': 'bg-danger',
    'info': 'bg-info'
  }[type] || 'bg-info';
  
  const icon = {
    'success': 'fas fa-check-circle',
    'warning': 'fas fa-exclamation-triangle',
    'error': 'fas fa-times-circle',
    'info': 'fas fa-info-circle'
  }[type] || 'fas fa-info-circle';
  
  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">
          <i class="${icon} me-2"></i>${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;
  
  toastContainer.insertAdjacentHTML('beforeend', toastHTML);
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: duration });
  
  toast.show();
  
  // Remove toast element after hide
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

function getOrCreateToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
}

// Date utilities
function formatDateForInput(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

function formatCurrency(amount) {
  if (!amount || isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(parseFloat(amount));
}

// Validation utilities
function validateTarga(targa) {
  if (!targa) return { valid: false, message: 'Targa obbligatoria' };
  const targaRegex = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
  if (!targaRegex.test(targa.toUpperCase())) {
    return { valid: false, message: 'Formato targa non valido (es. AB123CD)' };
  }
  return { valid: true };
}

function validateCodiceFiscale(cf) {
  if (!cf) return { valid: false, message: 'Codice fiscale obbligatorio' };
  if (cf.length !== 16) return { valid: false, message: 'Il codice fiscale deve essere di 16 caratteri' };
  if (!/^[A-Z0-9]{16}$/.test(cf.toUpperCase())) {
    return { valid: false, message: 'Il codice fiscale contiene caratteri non validi' };
  }
  return { valid: true };
}

// Vehicle state utilities
function getVehicleStatusColor(stato) {
  const colors = {
    'disponibile': 'success',
    'occupato': 'warning',
    'manutenzione': 'secondary',
    'fuori servizio': 'danger'
  };
  return colors[stato?.toLowerCase()] || 'secondary';
}

function getMaintenanceStatusColor(stato) {
  const colors = {
    'programmata': 'info',
    'in corso': 'warning', 
    'completata': 'success',
    'annullata': 'secondary'
  };
  return colors[stato?.toLowerCase()] || 'secondary';
}

// Export utilities for external access
window.callAPI = callAPI;
window.showLoader = showLoader;
window.showToast = showToast;
window.isPassoLungo = isPassoLungo;
window.getVehicleBadges = getVehicleBadges;
window.formatVehicleForWhatsApp = formatVehicleForWhatsApp;
window.formatDateForInput = formatDateForInput;
window.formatDateForDisplay = formatDateForDisplay;
window.formatCurrency = formatCurrency;
window.validateTarga = validateTarga;
window.validateCodiceFiscale = validateCodiceFiscale;
window.getVehicleStatusColor = getVehicleStatusColor;
window.getMaintenanceStatusColor = getMaintenanceStatusColor;

function logInfo(message) {
  if (SHARED_CONFIG.DEBUG) {
    console.log(`[SHARED] ${new Date().toISOString()}: ${message}`);
  }
}

logInfo(`🚀 Shared Utils v${SHARED_CONFIG.VERSION} loaded (CORS via config API_URL)`);
logInfo(`API Base URL: ${SHARED_CONFIG.API_BASE_URL}`);