/* 🚀 IMBRIANI NOLEGGIO - Shared Utilities v5.0 */

'use strict';

// Configuration
const APP_CONFIG = {
  AUTH_TOKEN: 'imbriani_secret_2025',
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec',
  CORS_PROXY: 'https://cors-anywhere.herokuapp.com/',
  DEBUG: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
};

// API Helper with improved error handling
async function callAPI(action, params = {}, method = 'GET') {
  if (APP_CONFIG.DEBUG) {
    console.log(`🔄 API Call: ${action}`, params);
  }
  
  try {
    let url = APP_CONFIG.API_BASE_URL;
    
    if (method === 'GET') {
      const queryParams = new URLSearchParams({
        action,
        ...params
      });
      url += `?${queryParams.toString()}`;
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors'
    };
    
    if (method === 'POST') {
      options.body = JSON.stringify({ action, ...params });
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (APP_CONFIG.DEBUG) {
      console.log(`✅ API Response:`, result);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ API Error (${action}):`, error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// Storage helpers
function saveToStorage(key, value) {
  try {
    localStorage.setItem(`imbriani_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(`imbriani_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn('Storage get failed:', e);
    return defaultValue;
  }
}

// Validation helpers
function isValidCF(cf) {
  return /^[A-Z0-9]{16}$/.test(cf?.toUpperCase() || '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function isValidPhone(phone) {
  return /^[0-9+\s-()]{8,}$/.test(phone || '');
}

// UI helpers
function showLoader(show = true) {
  const loader = document.getElementById('spinner') || document.getElementById('loader');
  if (loader) {
    loader.classList.toggle('d-none', !show);
    loader.style.display = show ? 'flex' : 'none';
  }
}

function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    max-width: 300px;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    background: ${getToastColor(type)};
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  
  toast.textContent = message;
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Auto remove
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

function getToastColor(type) {
  const colors = {
    success: '#22c55e',
    error: '#ef4444', 
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  return colors[type] || colors.info;
}

// Status helpers
function getStatoEmoji(stato) {
  const emojiMap = {
    'Da Confermare': '⏳',
    'Da confermare': '⏳',
    'Confermata': '✅',
    'Annullata': '❌',
    'Rifiutata': '🚫'
  };
  return emojiMap[stato] || '❓';
}

// Format helpers
function formatDate(dateString, locale = 'it-IT') {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString(locale);
  } catch (e) {
    return dateString;
  }
}

function formatCurrency(amount, currency = 'EUR') {
  if (typeof amount !== 'number') return '-';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency
  }).format(amount);
}

// Make globally available
window.APP_CONFIG = APP_CONFIG;
window.callAPI = callAPI;
window.saveToStorage = saveToStorage;
window.getFromStorage = getFromStorage;
window.isValidCF = isValidCF;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.showLoader = showLoader;
window.showToast = showToast;
window.getStatoEmoji = getStatoEmoji;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;

if (APP_CONFIG.DEBUG) {
  console.log('%c🚀 Shared Utils v5.0 loaded', 'color: #22c55e; font-weight: bold;');
}