/* 🚀 IMBRIANI NOLEGGIO - Shared Utilities v6.1 - CORS-Safe via Config API_URL */

'use strict';

// Configuration
const APP_CONFIG = {
  AUTH_TOKEN: 'imbriani_secret_2025',
  // Leggi l'API_BASE_URL da FRONTEND_CONFIG se presente (proxy Cloudflare)
  API_BASE_URL: (window?.FRONTEND_CONFIG?.API_URL) || 'https://imbriani-proxy.dreenhd.workers.dev',
  HMAC_SECRET: 'imbriani_hmac_2025_secure',
  MAX_URL_LENGTH: 1800,
  DEBUG: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
};

// HMAC-SHA256 implementation (simplified for frontend)
async function hmacSHA256(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enhanced CORS-safe API helper with HMAC signatures
async function callAPI(action, params = {}, method = 'GET') {
  const timestamp = Date.now();
  const nocache = timestamp + Math.random().toString(36);

  if (APP_CONFIG.DEBUG) console.log(`🔄 API Call: ${action}`, params);

  // Clean parameters
  const cleanParams = Object.keys(params).reduce((acc, key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      acc[key] = (typeof params[key] === 'string') ? params[key].trim() : params[key];
    }
    return acc;
  }, {});

  // Add system parameters
  cleanParams.action = action;
  cleanParams.token = APP_CONFIG.AUTH_TOKEN;
  cleanParams.ts = timestamp;
  cleanParams._nocache = nocache;

  // Base64 for big payloads
  if (cleanParams.drivers && typeof cleanParams.drivers === 'string') {
    try {
      const driversSize = encodeURIComponent(cleanParams.drivers).length;
      if (driversSize > 200) {
        cleanParams.drivers_b64 = btoa(unescape(encodeURIComponent(cleanParams.drivers)));
        delete cleanParams.drivers;
      }
    } catch (e) { console.warn('Base64 encoding failed:', e); }
  }

  // Create HMAC signature
  const sortedKeys = Object.keys(cleanParams).sort();
  const paramString = sortedKeys.map(k => `${k}=${cleanParams[k]}`).join('|');
  const signatureData = `${timestamp}|${action}|${paramString}`;
  try { cleanParams.hmac = await hmacSHA256(APP_CONFIG.HMAC_SECRET, signatureData); } catch (e) { console.warn('HMAC generation failed:', e); }

  // Build final URL using proxy from config.js
  const queryParams = new URLSearchParams();
  Object.keys(cleanParams).forEach(key => queryParams.append(key, cleanParams[key]));
  const base = (window?.FRONTEND_CONFIG?.API_URL) || APP_CONFIG.API_BASE_URL;
  const url = `${base}?${queryParams.toString()}`;

  // Retry logic
  let lastError = null; const delays = [500, 1500, 3500];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }, mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      if (APP_CONFIG.DEBUG) console.log(`✅ API Response (attempt ${attempt + 1}):`, result);
      if (typeof result === 'object' && result !== null) {
        return { success: result.success !== false, data: result.data || result, message: result.message || '', code: result.code || 200 };
      }
      return { success: true, data: result, message: '', code: 200 };
    } catch (error) {
      lastError = error; console.warn(`API attempt ${attempt + 1} failed:`, error.message);
      if (attempt < 2) await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }

  console.error(`❌ API Error (${action}) after 3 attempts:`, lastError);
  return { success: false, error: lastError?.message || 'Unknown error', data: null, code: 500 };
}

// Storage + helpers unchanged ... (omesso per brevità: salva/get/clear, validators, toasts, formats)
// Manteniamo tutto il resto del file originale sotto questa linea senza modifiche.

// EXPORT GLOBAL
afterSharedUtilsLoad();
function afterSharedUtilsLoad(){
  window.APP_CONFIG = APP_CONFIG; window.callAPI = callAPI; window.hmacSHA256 = hmacSHA256;
  if (APP_CONFIG.DEBUG) console.log('%c🚀 Shared Utils v6.1 loaded (CORS via config API_URL)', 'color: #22c55e; font-weight: bold;');
}
