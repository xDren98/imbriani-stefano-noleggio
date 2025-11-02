// 🛠️ Shared utilities v2.1.0 - Backend aligned
'use strict';

window.qsId = function(id) { return document.getElementById(id); };

window.isValidCF = function(cf) {
  const cfUpper = String(cf || '').toUpperCase().trim();
  return cfUpper.length === 16 && /^[A-Z0-9]+$/.test(cfUpper);
};

window.showLoader = function(show = true) {
  const loader = qsId('loading-overlay');
  if (loader) loader.classList.toggle('hidden', !show);
};

// 🎨 TOAST SYSTEM with proper emoji
window.showToast = function(message, type = 'info', duration = 3000) {
  const container = qsId('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message; // Message already contains emoji
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// 🔗 API wrapper - usa le action del TUO backend
window.callAPI = async function(action, payload = {}) {
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
};

// 📅 DATE FORMATTING - Italian format
window.formattaDataIT = function(dateStr) {
  if (!dateStr) return '';
  
  // Clean any time part
  let cleanDate = String(dateStr).split('T')[0];
  
  // yyyy-MM-dd to dd/MM/yyyy
  const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  
  return dateStr;
};

console.log('✅ shared-utils.js v2.1.0 loaded - Backend aligned');