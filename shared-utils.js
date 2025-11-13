// Shared Utils v8.9 - Added formatDateIT for Italian date formatting
(function(){
  window.api = window.api || {};

  const DEFAULTS = {
    API_URL: 'https://imbriani-proxy.dreenhd.workers.dev',
    AUTH_TOKEN: 'imbriani_secret_2025'
  };

  function cfg(key){
    try{ return (window.CONFIG && window.CONFIG[key]) ? window.CONFIG[key] : DEFAULTS[key]; }
    catch(_){ return DEFAULTS[key]; }
  }

  const CLIENT_CACHE_TTL_MS = 30000;
  const __clientCache = new Map();
  function makeCacheKey(action, params){
    try{
      const p = Object.assign({}, params||{});
      delete p.Authorization; delete p.token; delete p.ua; delete p.cfip; delete p.debug; delete p.diag; delete p.nocache;
      return action + '|' + JSON.stringify(p);
    }catch(_){ return action; }
  }
  function clientCacheGet(key){
    const e = __clientCache.get(key);
    if (!e) return null;
    if ((Date.now() - e.ts) > CLIENT_CACHE_TTL_MS) { __clientCache.delete(key); return null; }
    try{ return JSON.parse(e.payload); }catch(_){ return null; }
  }
  function clientCachePut(key, obj){
    try{ __clientCache.set(key, { ts: Date.now(), payload: JSON.stringify(obj) }); }catch(_){ }
  }

  // Sorgente token attivo: preferisci sessione (admin o cliente) rispetto al token statico
  function getActiveToken(){
    try {
      // Admin session
      const rawAdmin = localStorage.getItem('imbriani_admin_session');
      if (rawAdmin) {
        const s = JSON.parse(rawAdmin);
        if (s && s.token) return String(s.token);
      }
      // Admin session (sessionStorage fallback)
      try {
        const rawAdminSS = sessionStorage.getItem('imbriani_admin_session');
        if (rawAdminSS) {
          const sSS = JSON.parse(rawAdminSS);
          if (sSS && sSS.token) return String(sSS.token);
        }
      } catch(_){ }
      // Admin session (cookie fallback)
      try {
        const m = document.cookie.match(/(?:^|; )imbriani_admin_session=([^;]*)/);
        if (m && m[1]) {
          const payload = m[1];
          const json = decodeURIComponent(escape(atob(payload)));
          const sCK = JSON.parse(json);
          if (sCK && sCK.token) return String(sCK.token);
        }
      } catch(_){ }
      // Cliente sessione
      const rawSess = localStorage.getItem('imbriani_session');
      if (rawSess) {
        const s2 = JSON.parse(rawSess);
        if (s2 && s2.token) return String(s2.token);
      }
      // Cliente sessione (sessionStorage fallback)
      try {
        const rawSessSS = sessionStorage.getItem('imbriani_session');
        if (rawSessSS) {
          const s2SS = JSON.parse(rawSessSS);
          if (s2SS && s2SS.token) return String(s2SS.token);
        }
      } catch(_){ }
    } catch(_){ /* ignore */ }
    return cfg('AUTH_TOKEN');
  }

  // Escape HTML (globale)
  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  // Parsing robusto per stringhe di data comuni
  // Accetta: Date, 'dd/mm/yyyy', 'yyyy-mm-dd', ISO con tempo. Ritorna Date o null
  function parseDateAny(val){
    if(!val) return null;
    if(val instanceof Date && !isNaN(val.getTime())) return val;
    if(typeof val === 'string'){
      const s = val.trim();
      const mIT = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if(mIT){ const d = new Date(parseInt(mIT[3],10), parseInt(mIT[2],10)-1, parseInt(mIT[1],10)); return isNaN(d.getTime())?null:d; }
      const mISO = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if(mISO){ const d = new Date(parseInt(mISO[1],10), parseInt(mISO[2],10)-1, parseInt(mISO[3],10)); return isNaN(d.getTime())?null:d; }
      const d2 = new Date(s); return isNaN(d2.getTime())?null:d2;
    }
    return null;
  }

  function toJSONSafe(res){
    const ct = (res.headers.get('content-type')||'').toLowerCase();
    const status = res.status;
    if (ct.includes('application/json')) {
      // Prova a fare il parse JSON normalmente; se fallisce, tenta parse manuale dal testo
      return res.json().catch(async () => {
        const t = await res.text();
        try { return JSON.parse(t); }
        catch(_) { 
          console.error('[toJSONSafe] Failed to parse JSON response. Content-Type:', ct, 'Status:', status, 'Raw:', t.substring(0, 200));
          return { success:false, message:'Risposta non JSON', raw: t, status }; 
        }
      });
    }
    return res.text().then(t => {
      try { return JSON.parse(t); }
      catch(_) { 
        console.error('[toJSONSafe] Non-JSON response detected. Content-Type:', ct, 'Status:', status, 'Raw:', t.substring(0, 200));
        return { success:false, message:'Risposta non JSON', raw: t, status }; 
      }
    });
  }

  function showError(msg){
    console.error('[API ERROR]', msg);
    if (typeof msg === 'string' && msg.includes('Risposta non JSON')) {
      console.error('[API ERROR DETAIL] Non-JSON response detected - this may indicate CSP blocking or server error');
    }
    if (window.showToast) {
      showToast(msg, 'error');
    } else {
      try{ alert(msg); }catch(_){ /* no ui */ }
    }
  }

  // Toast notification system
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const colors = {
      success: 'text-bg-success',
      error: 'text-bg-danger', 
      warning: 'text-bg-warning',
      info: 'text-bg-info'
    };

    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-circle', 
      info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center ${colors[type] || colors.info} border-0 mb-2`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center">
          <i class="${icons[type] || icons.info} me-2"></i>
          <span class="toast-message"></span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    container.appendChild(toast);
    const msgNode = toast.querySelector('.toast-message');
    if (msgNode) msgNode.textContent = String(message || '');
    
    // Inizializza il toast con Bootstrap
    const bsToast = new bootstrap.Toast(toast, { delay: duration });
    bsToast.show();
    
    // Rimuovi dal DOM dopo l'animazione
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });

    return bsToast;
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1055';
    document.body.appendChild(container);
    return container;
  }

  /**
   * 🇮🇹 Formatta una data in formato italiano (gg/mm/aaaa)
   * @param {string|Date} date - Data da formattare
   * @returns {string} Data formattata in formato italiano o '-' se invalida
   * @example
   * formatDateIT('2025-11-08') // '08/11/2025'
   * formatDateIT(new Date()) // '08/11/2025'
   * formatDateIT(null) // '-'
   */
  function formatDateIT(date) {
    if (!date) return '-';
    try {
      // Gestione esplicita stringhe in formato italiano gg/mm/aaaa
      if (typeof date === 'string') {
        const s = date.trim();
        // Caso: yyyy-mm-dd (senza orario) -> interpreta come data locale evitando timezone
        const mISO = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (mISO) {
          const y = parseInt(mISO[1], 10);
          const m = parseInt(mISO[2], 10) - 1;
          const d = parseInt(mISO[3], 10);
          const dt = new Date(y, m, d);
          if (!isNaN(dt.getTime())) {
            return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
          }
        }
        const m = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
        if (m) {
          const dNum = parseInt(m[1], 10);
          const mNum = parseInt(m[2], 10) - 1;
          const yNum = parseInt(m[3], 10);
          const d = new Date(yNum, mNum, dNum);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
          }
        }
        // Gestione ISO (yyyy-mm-dd o ISO con tempo)
        const iso = s;
        const dIso = new Date(iso);
        if (!isNaN(dIso.getTime())) {
          return dIso.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return '-';
      }
      // Oggetto Date
      const d = date;
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  }

  // 📅 Datepicker italiano (flatpickr) con valore ISO e visualizzazione d/m/Y
  function loadScriptOnce(src, id){
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.id = id; s.crossOrigin = 'anonymous'; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
  }

  function toISO(dateVal) {
    try {
      if (!dateVal) return '';
      if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const s = String(dateVal).trim();
      if (s.includes('T')) return s.split('T')[0];
      const mIT = s.match(/^([0-3]?\d)[\/.\-]([0-1]?\d)[\/.\-](\d{4})$/);
      if (mIT) return `${mIT[3]}-${String(mIT[2]).padStart(2,'0')}-${String(mIT[1]).padStart(2,'0')}`;
      const mISO = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (mISO) return s;
      const d2 = new Date(s);
      if (!isNaN(d2.getTime())) {
        const y = d2.getFullYear();
        const m = String(d2.getMonth() + 1).padStart(2, '0');
        const d = String(d2.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return '';
    } catch {
      return '';
    }
  }
  function loadStyleOnce(href, id){
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href; l.id = id; l.crossOrigin = 'anonymous'; document.head.appendChild(l);
  }

  async function initDatePickersItalian(){
    try{
      // Carica CSS e JS di flatpickr solo una volta
      loadStyleOnce('https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css','flatpickr-css');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/flatpickr@4.6.13','flatpickr-js');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/it.js','flatpickr-it');

      const inputs = Array.from(document.querySelectorAll('input[type="date"]'));
      inputs.forEach(el => {
        // Mantieni attributi min/max
        const opts = {
          altInput: true,
          dateFormat: 'Y-m-d',
          altFormat: 'd/m/Y',
          locale: 'it',
          allowInput: true,
          clickOpens: true,
          altInputClass: 'form-control form-control-modern'
        };
        if (el.min) opts.minDate = el.min;
        if (el.max) opts.maxDate = el.max;
        window.flatpickr(el, opts);

        // Forza apertura nativa se disponibile
        el.addEventListener('click', () => { if (el.showPicker) try{ el.showPicker(); }catch(_){} });
        el.placeholder = 'gg/mm/aaaa';
      });
    }catch(e){
      console.warn('[datepicker] Fallito caricamento, uso nativo se disponibile:', e.message);
      // fallback: cerca di aprire il picker nativo al click
      Array.from(document.querySelectorAll('input[type="date"]')).forEach(el => {
        el.addEventListener('click', () => { if (el.showPicker) try{ el.showPicker(); }catch(_){} });
        el.placeholder = 'gg/mm/aaaa';
      });
    }
  }

  /**
   * 🔐 Controlla se la sessione è valida
   * @returns {boolean} true se la sessione è valida
   */
  function isSessionValid() {
    try {
      const userData = localStorage.getItem('imbriani_user');
      const sessionData = localStorage.getItem('imbriani_session');
      
      if (!userData || !sessionData) {
        console.log('[SESSION] Dati sessione mancanti');
        return false;
      }
      
      const session = JSON.parse(sessionData);
      const sessionTimeout = 24 * 60 * 60 * 1000; // 24 ore
      const now = Date.now();
      const sessionAge = now - (session.timestamp || 0);
      
      if (sessionAge > sessionTimeout) {
        console.log('[SESSION] Sessione scaduta (24 ore)');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[SESSION] Errore validazione sessione:', error);
      return false;
    }
  }

  /**
   * 🚪 Gestisce la scadenza della sessione
   */
  function handleSessionExpired() {
    localStorage.removeItem('imbriani_user');
    localStorage.removeItem('imbriani_session');
    sessionStorage.removeItem('userData');
    
    if (window.showToast) {
      showToast('Sessione scaduta. Effettua di nuovo il login.', 'warning');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      alert('Sessione scaduta. Effettua di nuovo il login.');
      window.location.href = 'index.html';
    }
  }

  /**
   * 🔄 Aggiorna il timestamp della sessione
   */
  function updateSessionTimestamp() {
    try {
      const sessionData = localStorage.getItem('imbriani_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.timestamp = Date.now();
        localStorage.setItem('imbriani_session', JSON.stringify(session));
      }
    } catch (error) {
      console.error('[SESSION] Errore aggiornamento timestamp:', error);
    }
  }

  // ✅ FIX: Aggiungi funzione secureGet con fallback diretto a Google Apps Script
  async function secureGet(action, params = {}) {
    const url = new URL(cfg('API_URL'));
    url.searchParams.set('action', action);

    // Aggiungi tutti i parametri alla query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    const token = getActiveToken();
    if (!token || String(token).trim().length < 6) {
      console.warn('[secureGet] Token assente o sospetto (lunghezza < 6). Controlla config.js -> AUTH_TOKEN o sessione admin/cliente.');
    } else {
      console.log('[secureGet] Token preview:', String(token).substring(0, 8) + '…');
    }
    // Include anche il token come query param per compatibilità con Apps Script
    // (oltre all'Authorization header passato via proxy)
    if (token) {
      try { url.searchParams.set('token', String(token)); } catch(_) {}
    }
    console.log('[secureGet]', action, 'params:', params);

    // Il token non viene inserito nella query; il Worker inoltra l'Authorization.

    try {
      let ck = null;
      if (String(params.nocache||'') !== '1') {
        ck = makeCacheKey(action, params);
        const hit = clientCacheGet(ck);
        if (hit && hit.success === true) { return hit; }
      }
      // Prova prima con il proxy
      const res = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await toJSONSafe(res);
      const isNonJson = data && String(data.message||'').toLowerCase().includes('risposta non json');
      console.log('[secureGet] Response check - Status:', res.status, 'isNonJson:', isNonJson, 'ok:', res.ok);
      if (!res.ok || isNonJson) {
        if (isNonJson) {
          console.log('[secureGet] Triggering JSONP fallback due to non-JSON response for action:', action);
          try {
            const alt = await secureGetDirectFallback(action, params);
            console.log('[secureGet] JSONP fallback result for action:', action, 'success:', alt.success, 'message:', alt.message);
            if (alt && (alt.success === true || alt.data)) {
              if (ck) { try{ clientCachePut(ck, alt); }catch(_){ } }
              return alt;
            }
          } catch(_) { }
        }
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 600));
          const res2 = await fetch(url.toString(), { method:'GET', mode:'cors', cache:'no-cache', headers: { 'Authorization': `Bearer ${token}` } });
          const data2 = await toJSONSafe(res2);
          if (!res2.ok || (data2 && data2.success === false)) {
            const msg2 = (data2 && (data2.message || data2.error)) ? (data2.message || data2.error) : ('Errore API: ' + res2.status);
            showError(msg2);
          }
          if (ck) { try{ clientCachePut(ck, data2); }catch(_){ } }
          return data2;
        }
        const msg = (data && (data.message || data.error)) ? (data.message || data.error) : ('Errore API: ' + res.status);
        showError(msg);
      }
      if (ck) { try{ clientCachePut(ck, data); }catch(_){ } }
      return data;
    } catch (err) {
      console.warn('[secureGet] Errore rete', err.message);
      showError('Errore di rete: ' + err.message);
      return { success:false, message: err.message };
    }
  }

  // ✅ Fallback diretto a Google Apps Script con JSONP
  async function secureGetDirectFallback(action, params = {}) {
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec';
    const token = getActiveToken();
    
    // Costruisci URL con parametri
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', token);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    // Usa JSONP per aggirare CORS
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      url.searchParams.set('callback', callbackName);
      console.log('[JSONP Fallback] Setting up callback:', callbackName, 'for action:', action);

      window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        
        if (data && data.success === false) {
          showError(data.message || 'Errore API');
        }
        resolve(data);
      };

      const script = document.createElement('script');
      script.onerror = function(e) {
        console.error('[JSONP Fallback] Script load error for action:', action, e);
        delete window[callbackName];
        document.body.removeChild(script);
        // Invece di rigettare, restituisci un errore gestito
        resolve({ 
          success: false, 
          message: 'Errore di connessione al backend (fallback fallito)',
          fallbackError: true 
        });
      };
      
      script.src = url.toString();
      
      try {
        document.body.appendChild(script);
        console.log('[JSONP Fallback] Script injected successfully for action:', action);
      } catch (e) {
        console.error('[JSONP Fallback] Failed to inject script - CSP may be blocking:', e);
        delete window[callbackName];
        resolve({ 
          success: false, 
          message: 'CSP blocking JSONP fallback - script injection failed',
          cspError: true 
        });
        return;
      }
      
      // Timeout di sicurezza
      setTimeout(() => {
        if (window[callbackName]) {
          console.warn('[JSONP Fallback] Timeout reached for action:', action);
          delete window[callbackName];
          document.body.removeChild(script);
          resolve({ 
            success: false, 
            message: 'Timeout richiesta (fallback)',
            timeout: true 
          });
        }
      }, 10000);
    });
  }

  // ✅ FIX: Aggiungi funzione securePost con fallback diretto
  async function securePost(action, payload = {}) {
    const url = cfg('API_URL');
    const token = getActiveToken();
    
    console.log('[securePost]', action, 'payload:', payload);

    // Includi token sia in header che nel body per massima compatibilità
    const body = {
      action: action,
      ...payload,
      token: token  // Token nel body per Apps Script
    };

    try {
      const isAppsScript = typeof url === 'string' && url.includes('script.google.com');
      const headers = isAppsScript
        // Evita preflight CORS verso Apps Script
        ? { 'Content-Type': 'text/plain' }
        // Usa header per il proxy
        : { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers,
        body: JSON.stringify(body)
      });

      const data = await toJSONSafe(res);
      if (!res.ok || (data && data.success === false)) {
        const msg = (data && (data.message || data.error)) ? (data.message || data.error) : ('Errore API: ' + res.status);
        showError(msg);
      }
      return data;
    } catch (err) {
      console.warn('[securePost] Errore rete', err.message);
      showError('Errore di rete: ' + err.message);
      return { success:false, message: err.message };
    }
  }

  // ✅ Fallback diretto a Google Apps Script con form POST
  async function securePostDirectFallback(action, data = {}) {
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec';
    const token = getActiveToken();
    
    const formData = new FormData();
    formData.append('action', action);
    formData.append('token', token);
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.name = 'post_fallback_' + Date.now();
      iframe.style.display = 'none';
      
      // Timeout di sicurezza
      const timeout = setTimeout(() => {
        document.body.removeChild(iframe);
        resolve({ 
          success: false, 
          message: 'Timeout richiesta (fallback POST)',
          timeout: true 
        });
      }, 10000);

      window.addEventListener('message', function handler(event) {
        if (event.origin !== 'https://script.google.com') return;
        
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        document.body.removeChild(iframe);
        
        if (event.data && event.data.success === false) {
          showError(event.data.message || 'Errore API');
        }
        resolve(event.data);
      });

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = APPS_SCRIPT_URL;
      form.target = iframe.name;
      
      // Copia i dati dal FormData al form
      for (let [key, value] of formData.entries()) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      
      form.submit();
      document.body.removeChild(form);
    });
  }

  // Legacy POST function (mantiene compatibilità con vecchio codice)
  async function call(pathOrBody, opts={}){
    const url = cfg('API_URL');
    const body = typeof pathOrBody === 'string' ? (opts.body||{}) : (pathOrBody||{});
    const token = getActiveToken();

    // DUAL TOKEN SUPPORT: includi token sia in header che nel body per massima compatibilità
    const payload = {
      ...body,
      token: token  // Token nel body per Apps Script
    };

    try{
      const isAppsScript = typeof url === 'string' && url.includes('script.google.com');
      const headers = isAppsScript
        // Evita preflight CORS verso Apps Script
        ? { 'Content-Type': 'text/plain' }
        // Usa header per il proxy
        : { 'Content-Type':'application/json', 'Authorization':'Bearer ' + token };

      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors', cache: 'no-cache',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await toJSONSafe(res);
      if (!res.ok || data.success === false){
        const msg = (data && (data.message || data.error)) ? (data.message || data.error) : ('Errore API: ' + res.status);
        showError(msg);
      }
      return data;
    }catch(err){
      console.warn('[call] Errore proxy, provo fallback diretto...', err.message);
      
      // Fallback diretto con form data
      try {
        return await securePostDirectFallback(body.action || 'unknown', body);
      } catch (fallbackErr) {
        showError('Errore di rete: ' + err.message + ' - Fallback fallito: ' + fallbackErr.message);
        return { success:false, message:err.message + ' - Fallback: ' + fallbackErr.message };
      }
    }
  }

  // Esporta le funzioni globalmente
  window.api.call = call;
  window.api.secureGet = secureGet;
  window.api.securePost = securePost;
  window.initDatePickersItalian = initDatePickersItalian;
  window.secureGet = secureGet;  // ✅ Export anche come funzione globale
  window.securePost = securePost;  // ✅ Export anche come funzione globale
  window.showToast = showToast;
  window.formatDateIT = formatDateIT;  // 🇮🇹 Export funzione formattazione date italiane
  window.escapeHtml = escapeHtml;      // 🔐 Export global escape
  window.parseDateAny = parseDateAny;  // 📅 Export parser date
  window.toISO = toISO;
  document.addEventListener('DOMContentLoaded', initDatePickersItalian);
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
      try {
        await secureGet('getVeicoli', {});
      } catch(_){ }
      try {
        await secureGet('getSheet', { name:'CLIENTI', fields:'NOME,CODICE_FISCALE,SCADENZA_PATENTE', limit: 200 });
      } catch(_){ }
    }, 600);
  });
  
  console.log('[SHARED-UTILS] v8.9 loaded - formatDateIT added for Italian dates (gg/mm/aaaa)');
})();
