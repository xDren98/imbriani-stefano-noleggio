/* 🚀 IMBRIANI NOLEGGIO - Shared Utilities v6.2 COMPLETO - CORS-Safe Enhanced */

'use strict';

// Configuration
const APP_CONFIG = {
  AUTH_TOKEN: 'imbriani_secret_2025',
  // Leggi API_URL da FRONTEND_CONFIG (proxy Cloudflare) con fallback
  API_BASE_URL: (typeof window !== 'undefined' && window?.FRONTEND_CONFIG?.API_URL) || 'https://imbriani-proxy.dreenhd.workers.dev',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  MAX_URL_LENGTH: 1800,
  DEBUG: typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))
};

// HMAC-SHA256 implementation (simplified for frontend)
async function hmacSHA256(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enhanced CORS-safe API helper with HMAC signatures
async function callAPI(action, params = {}, method = 'GET') {
  const timestamp = Date.now();
  const nocache = timestamp + Math.random().toString(36);
  
  if (APP_CONFIG.DEBUG) {
    console.log(`🔄 API Call: ${action}`, params);
  }
  
  // Clean parameters
  const cleanParams = Object.keys(params).reduce((acc, key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      acc[key] = typeof params[key] === 'string' ? params[key].trim() : params[key];
    }
    return acc;
  }, {});
  
  // Add system parameters
  cleanParams.action = action;
  cleanParams.token = APP_CONFIG.AUTH_TOKEN;
  cleanParams.ts = timestamp;
  cleanParams._nocache = nocache;
  
  // Handle large payloads with base64 encoding
  if (cleanParams.drivers && typeof cleanParams.drivers === 'string') {
    try {
      const driversSize = encodeURIComponent(cleanParams.drivers).length;
      if (driversSize > 200) {
        cleanParams.drivers_b64 = btoa(unescape(encodeURIComponent(cleanParams.drivers)));
        delete cleanParams.drivers;
      }
    } catch (e) {
      console.warn('Base64 encoding failed:', e);
    }
  }
  
  // Create HMAC signature
  const sortedKeys = Object.keys(cleanParams).sort();
  const paramString = sortedKeys.map(k => `${k}=${cleanParams[k]}`).join('|');
  const signatureData = `${timestamp}|${action}|${paramString}`;
  
  try {
    cleanParams.hmac = await hmacSHA256(APP_CONFIG.HMAC_SECRET, signatureData);
  } catch (e) {
    console.warn('HMAC generation failed, continuing without signature:', e);
  }
  
  // Build URL usando il proxy da config.js
  const queryParams = new URLSearchParams();
  Object.keys(cleanParams).forEach(key => {
    queryParams.append(key, cleanParams[key]);
  });
  
  // Usa sempre l'API_URL da config.js (proxy Cloudflare)
  const baseUrl = (typeof window !== 'undefined' && window?.FRONTEND_CONFIG?.API_URL) || APP_CONFIG.API_BASE_URL;
  const url = `${baseUrl}?${queryParams.toString()}`;
  
  // Check URL length
  if (url.length > APP_CONFIG.MAX_URL_LENGTH) {
    console.warn(`URL length (${url.length}) exceeds safe limit (${APP_CONFIG.MAX_URL_LENGTH})`);
  }
  
  // Retry logic with exponential backoff
  let lastError = null;
  const delays = [500, 1500, 3500];
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const options = {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        mode: 'cors'
      };
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (APP_CONFIG.DEBUG) {
        console.log(`✅ API Response (attempt ${attempt + 1}):`, result);
      }
      
      // Validate response structure
      if (typeof result === 'object' && result !== null) {
        return {
          success: result.success !== false,
          data: result.data || result,
          message: result.message || '',
          code: result.code || 200
        };
      }
      
      return { success: true, data: result, message: '', code: 200 };
      
    } catch (error) {
      lastError = error;
      console.warn(`API attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }
  
  console.error(`❌ API Error (${action}) after 3 attempts:`, lastError);
  return {
    success: false,
    error: lastError.message,
    data: null,
    code: 500
  };
}

// Storage helpers with error handling
function saveToStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(`imbriani_${key}`, serialized);
    return true;
  } catch (e) {
    console.warn('Storage save failed:', e);
    return false;
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

function clearStorage(key = null) {
  try {
    if (key) {
      localStorage.removeItem(`imbriani_${key}`);
    } else {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('imbriani_')) {
          localStorage.removeItem(k);
        }
      });
    }
  } catch (e) {
    console.warn('Storage clear failed:', e);
  }
}

// Enhanced validation helpers
function isValidCF(cf) {
  if (!cf || typeof cf !== 'string') return false;
  const clean = cf.toUpperCase().trim();
  return /^[A-Z0-9]{16}$/.test(clean);
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.trim();
  return /^[0-9+\s\-()]{8,20}$/.test(clean);
}

function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Enhanced UI helpers
function showLoader(show = true, message = '') {
  const loader = document.getElementById('spinner') || document.getElementById('loader') || document.getElementById('loading-overlay');
  if (loader) {
    loader.classList.toggle('d-none', !show);
    loader.style.display = show ? 'flex' : 'none';
    
    if (message && show) {
      const messageEl = loader.querySelector('.loader-message');
      if (messageEl) {
        messageEl.textContent = message;
      }
    }
  }
}

function showToast(message, type = 'info', duration = 4000) {
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
      max-width: 350px;
    `;
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  const toastId = 'toast_' + Date.now();
  toast.id = toastId;
  
  const bgColor = getToastColor(type);
  const icon = getToastIcon(type);
  
  toast.style.cssText = `
    padding: 14px 18px;
    border-radius: 10px;
    color: white;
    font-weight: 500;
    font-size: 14px;
    line-height: 1.4;
    transform: translateX(100%);
    transition: all 0.3s ease;
    background: ${bgColor};
    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    border-left: 4px solid rgba(255,255,255,0.3);
    cursor: pointer;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px;">${icon}</span>
      <span style="flex: 1;">${message}</span>
    </div>
  `;
  
  // Click to dismiss
  toast.onclick = () => dismissToast(toastId);
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Auto dismiss
  setTimeout(() => dismissToast(toastId), duration);
}

function dismissToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

function getToastColor(type) {
  const colors = {
    success: 'linear-gradient(135deg, #22c55e, #16a34a)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
  };
  return colors[type] || colors.info;
}

function getToastIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
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

function getStatoColor(stato) {
  const colorMap = {
    'Da Confermare': '#f59e0b',
    'Da confermare': '#f59e0b',
    'Confermata': '#22c55e',
    'Annullata': '#ef4444',
    'Rifiutata': '#9333ea'
  };
  return colorMap[stato] || '#6b7280';
}

// Format helpers
function formatDate(dateString, locale = 'it-IT', options = {}) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    return date.toLocaleDateString(locale, { ...defaultOptions, ...options });
  } catch (e) {
    console.warn('Date format error:', e);
    return dateString;
  }
}

function formatDateTime(dateString, locale = 'it-IT') {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.warn('DateTime format error:', e);
    return dateString;
  }
}

function formatCurrency(amount, currency = 'EUR', locale = 'it-IT') {
  if (typeof amount !== 'number' || isNaN(amount)) return '-';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  } catch (e) {
    console.warn('Currency format error:', e);
    return `${amount} ${currency}`;
  }
}

// Network status helpers
function isOnline() {
  return navigator.onLine;
}

function onNetworkChange(callback) {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}

// Error helper
function getErrorMessage(error, fallback = 'Errore sconosciuto') {
  if (typeof error === 'string') return error;
  if (error && error.message) return error.message;
  if (error && error.error) return error.error;
  return fallback;
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Make globally available
if (typeof window !== 'undefined') {
  window.APP_CONFIG = APP_CONFIG;
  window.callAPI = callAPI;
  window.hmacSHA256 = hmacSHA256;
  window.saveToStorage = saveToStorage;
  window.getFromStorage = getFromStorage;
  window.clearStorage = clearStorage;
  window.isValidCF = isValidCF;
  window.isValidEmail = isValidEmail;
  window.isValidPhone = isValidPhone;
  window.isValidDate = isValidDate;
  window.showLoader = showLoader;
  window.showToast = showToast;
  window.dismissToast = dismissToast;
  window.getStatoEmoji = getStatoEmoji;
  window.getStatoColor = getStatoColor;
  window.formatDate = formatDate;
  window.formatDateTime = formatDateTime;
  window.formatCurrency = formatCurrency;
  window.isOnline = isOnline;
  window.onNetworkChange = onNetworkChange;
  window.getErrorMessage = getErrorMessage;
  window.debounce = debounce;

  if (APP_CONFIG.DEBUG) {
    console.log('%c🚀 Shared Utils v6.2 loaded (CORS via config API_URL)', 'color: #22c55e; font-weight: bold;');
    console.log('API Base URL:', APP_CONFIG.API_BASE_URL);
  }
}