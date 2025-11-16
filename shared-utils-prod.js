// Shared Utils v9.0 - Production-optimized with enhanced error handling for ERR_ABORTED and ERR_FAILED
(function(){
  window.api = window.api || {};

  const DEFAULTS = {
    API_URL: 'https://imbriani-proxy.dreenhd.workers.dev'
  }

  /**
   * 🔐 Production-optimized secureGet implementation with enhanced error handling
   */
  async function secureGetInternal(action, params, ck, url) {
    // Enhanced error categorization for production environments
    function categorizeNetworkError(error, url) {
      const errorInfo = {
        type: 'unknown',
        message: error.message || 'Unknown error',
        url: url,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        online: navigator.onLine
      };

      // CORS and network-specific errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorInfo.type = 'failed_fetch';
        errorInfo.message = 'Network request failed - possible CORS or connectivity issue';
      } else if (error.name === 'AbortError') {
        errorInfo.type = 'timeout';
        errorInfo.message = 'Request timeout - server may be unresponsive';
      } else if (error.message.includes('ERR_ABORTED')) {
        errorInfo.type = 'err_aborted';
        errorInfo.message = 'Request aborted - possible network interruption';
      } else if (error.message.includes('ERR_FAILED')) {
        errorInfo.type = 'err_failed';
        errorInfo.message = 'Request failed - server or network error';
      } else if (error.message.includes('CORS')) {
        errorInfo.type = 'cors_error';
        errorInfo.message = 'CORS policy violation';
      } else if (!navigator.onLine) {
        errorInfo.type = 'offline';
        errorInfo.message = 'Device appears to be offline';
      }

      return errorInfo;
    }

    // Production-grade retry mechanism
    async function fetchWithRetry(url, options, maxRetries = 3) {
      let lastError;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 
          attempt === 0 ? 5000 : (attempt === 1 ? 8000 : 12000) // Progressive timeouts
        );

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            // Add cache-busting for production
            cache: attempt > 0 ? 'reload' : 'no-cache'
          });
          
          clearTimeout(timeoutId);
          
          // Handle specific HTTP status codes
          if (response.status === 429) {
            // Rate limiting - wait longer
            const retryAfter = response.headers.get('Retry-After') || (attempt + 1) * 2;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          
          if (response.status >= 500) {
            throw new Error(`Server error ${response.status}`);
          }
          
          return response;
          
        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error;
          
          const errorInfo = categorizeNetworkError(error, url);
          console.warn(`[fetchWithRetry] Attempt ${attempt + 1} failed:`, errorInfo);
          
          // Don't retry on certain errors
          if (errorInfo.type === 'cors_error' || errorInfo.type === 'offline') {
            throw error;
          }
          
          // Exponential backoff with jitter
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
            console.log(`[fetchWithRetry] Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    }

    // Try proxy first with enhanced error handling
    let res;
    
    try {
      res = await fetchWithRetry(url.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!res.ok) {
        throw new Error(`Proxy error: ${res.status}`);
      }
      
    } catch (proxyError) {
      const errorInfo = categorizeNetworkError(proxyError, url.toString());
      console.warn('[secureGetInternal] Proxy failed:', errorInfo);
      
      // Production-specific fallback strategy
      if (errorInfo.type === 'cors_error' || errorInfo.type === 'offline') {
        throw proxyError; // Don't try fallback for these errors
      }
      
      // Fallback to direct Apps Script endpoint with enhanced error handling
      const fallbackUrl = new URL('https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec');
      fallbackUrl.searchParams.set('action', action);
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          fallbackUrl.searchParams.set(key, String(params[key]));
        }
      });
      
      // Add cache-busting parameter for production
      fallbackUrl.searchParams.set('_t', Date.now().toString());
      
      try {
        res = await fetchWithRetry(fallbackUrl.toString(), {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }, 2); // Fewer retries for fallback
        
      } catch (directError) {
        const directErrorInfo = categorizeNetworkError(directError, fallbackUrl.toString());
        console.error('[secureGetInternal] Both proxy and direct failed:', directErrorInfo);
        
        // Enhanced error message for production
        let finalErrorMessage = 'Servizio temporaneamente non disponibile';
        
        if (directErrorInfo.type === 'offline') {
          finalErrorMessage = 'Sei offline. Controlla la tua connessione internet.';
        } else if (directErrorInfo.type === 'timeout') {
          finalErrorMessage = 'Timeout di connessione - il server non risponde';
        } else if (directErrorInfo.type === 'err_aborted' || directErrorInfo.type === 'err_failed') {
          finalErrorMessage = 'Connessione interrotta - riprova tra qualche secondo';
        }
        
        throw new Error(finalErrorMessage);
      }
    }

    const data = await toJSONSafe(res);
    const isNonJson = data && String(data.message||'').toLowerCase().includes('risposta non json');
    console.log('[secureGetInternal] Response check - Status:', res.status, 'isNonJson:', isNonJson, 'ok:', res.ok);
    
    if (isNonJson) {
      const u2 = new URL(url.toString());
      u2.searchParams.set('diag','1');
      u2.searchParams.set('nocache','1');
      try {
        const res3 = await fetch(u2.toString(), { method:'GET', mode:'cors', cache:'no-cache', credentials:'include' });
        const data3 = await toJSONSafe(res3);
        if (data3 && data3.success !== undefined) {
          if (ck) { try { clientCachePut(ck, data3); } catch (e) { } }
          return data3;
        }
      } catch (e) { }
    }
    
    if (!res.ok) {
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 600));
        const res2 = await fetch(url.toString(), { method:'GET', mode:'cors', cache:'no-cache', credentials:'include' });
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
  }

  /**
   * 🔐 Production-optimized securePost implementation with enhanced error handling
   */
  async function securePost(action, payload = {}) {
    const url = cfg('API_URL');
    const token = null;
    
    console.log('[securePost]', action, 'payload keys:', Object.keys(payload));

    // Enhanced error categorization for POST requests
    function categorizePostError(error, url) {
      const errorInfo = {
        type: 'unknown',
        message: error.message || 'Unknown error',
        url: url,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        action: action
      };

      // POST-specific error categorization
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorInfo.type = 'post_failed_fetch';
        errorInfo.message = 'POST request failed - possible CORS or payload size issue';
      } else if (error.name === 'AbortError') {
        errorInfo.type = 'post_timeout';
        errorInfo.message = 'POST timeout - server may be processing large payload';
      } else if (error.message.includes('ERR_ABORTED')) {
        errorInfo.type = 'post_err_aborted';
        errorInfo.message = 'POST request aborted - network interruption during upload';
      } else if (error.message.includes('ERR_FAILED')) {
        errorInfo.type = 'post_err_failed';
        errorInfo.message = 'POST request failed - server error or network issue';
      } else if (error.message.includes('Payload too large')) {
        errorInfo.type = 'payload_too_large';
        errorInfo.message = 'Payload too large - reduce data size';
      } else if (!navigator.onLine) {
        errorInfo.type = 'offline';
        errorInfo.message = 'Cannot POST while offline';
      }

      return errorInfo;
    }

    // Production-grade POST retry mechanism
    async function postWithRetry(url, body, headers, maxRetries = 2) {
      let lastError;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 
          attempt === 0 ? 8000 : 15000 // Longer timeouts for POST
        );

        try {
          const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            headers: {
              ...headers,
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(body),
            signal: controller.signal,
            // Add cache-busting for production
            cache: attempt > 0 ? 'reload' : 'no-cache'
          });
          
          clearTimeout(timeoutId);
          
          // Handle specific HTTP status codes
          if (response.status === 413) {
            throw new Error('Payload too large');
          }
          
          if (response.status === 429) {
            // Rate limiting - wait longer for POST
            const retryAfter = response.headers.get('Retry-After') || (attempt + 1) * 3;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          
          if (response.status >= 500) {
            throw new Error(`Server error ${response.status}`);
          }
          
          return response;
          
        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error;
          
          const errorInfo = categorizePostError(error, url);
          console.warn(`[postWithRetry] Attempt ${attempt + 1} failed:`, errorInfo);
          
          // Don't retry on certain POST errors
          if (errorInfo.type === 'payload_too_large' || errorInfo.type === 'offline') {
            throw error;
          }
          
          // Longer exponential backoff for POST
          if (attempt < maxRetries - 1) {
            const delay = Math.min(2000 * Math.pow(2, attempt) + Math.random() * 2000, 15000);
            console.log(`[postWithRetry] Retrying POST in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    }

    // Prepare POST body with enhanced error handling
    const body = { action: action, ...payload };

    // 🔐 Aggiungi CSRF token se disponibile
    const csrfToken = sessionStorage.getItem('csrfToken');
    if (csrfToken) {
      body.csrfToken = csrfToken;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      
      // Try proxy first with enhanced POST handling
      let res;
      
      try {
        res = await postWithRetry(url, body, headers);
        
      } catch (postError) {
        const errorInfo = categorizePostError(postError, url);
        console.warn('[securePost] Proxy POST failed:', errorInfo);
        
        // Production-specific fallback strategy for POST
        if (errorInfo.type === 'payload_too_large' || errorInfo.type === 'offline') {
          throw postError; // Don't try fallback for these errors
        }
        
        // Fallback to direct Apps Script endpoint
        const fallbackUrl = 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec';
        
        // Add cache-busting parameter for production
        body._t = Date.now().toString();
        
        try {
          res = await postWithRetry(fallbackUrl, body, headers, 1); // Single retry for fallback
          
        } catch (directError) {
          const directErrorInfo = categorizePostError(directError, fallbackUrl);
          console.error('[securePost] Both proxy and direct POST failed:', directErrorInfo);
          
          // Enhanced error message for production POST failures
          let finalErrorMessage = 'Servizio temporaneamente non disponibile';
          
          if (directErrorInfo.type === 'offline') {
            finalErrorMessage = 'Sei offline. Le modifiche verranno salvate quando tornerai online.';
          } else if (directErrorInfo.type === 'post_timeout') {
            finalErrorMessage = 'Timeout del server - i dati potrebbero essere stati salvati, verifica più tardi';
          } else if (directErrorInfo.type === 'post_err_aborted' || directErrorInfo.type === 'post_err_failed') {
            finalErrorMessage = 'Connessione interrotta durante il salvataggio - riprova';
          } else if (directErrorInfo.type === 'payload_too_large') {
            finalErrorMessage = 'I dati sono troppo grandi - riduci la quantità di informazioni';
          }
          
          throw new Error(finalErrorMessage);
        }
      }

      const data = await toJSONSafe(res);
      if (!res.ok || (data && data.success === false)) {
        const msg = (data && (data.message || data.error)) ? (data.message || data.error) : ('Errore API: ' + res.status);
        showError(msg);
      }
      return data;
      
    } catch (err) {
      console.warn('[securePost] Errore rete', err.message);
      
      // Enhanced error handling with offline detection
      let errorMessage = 'Errore di rete: ';
      let errorType = 'network_error';
      
      if (err.name === 'AbortError') {
        errorMessage += 'Timeout di connessione';
        errorType = 'timeout_error';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage += 'Connessione non disponibile';
        errorType = 'connection_error';
      } else if (err.message.includes('Both proxy and direct')) {
        errorMessage += 'Servizio temporaneamente non disponibile';
        errorType = 'service_unavailable';
      } else {
        errorMessage += err.message;
      }
      
      // Check if we're offline
      if (!navigator.onLine) {
        errorMessage = 'Sei offline. Controlla la tua connessione internet.';
        errorType = 'offline_error';
      }
      
      showError(errorMessage);
      
      // Return structured error for better handling
      return { 
        success: false, 
        message: errorMessage,
        error_type: errorType,
        offline: !navigator.onLine,
        timestamp: new Date().toISOString()
      };
    }
  }

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

  function getActiveToken(){ return null; }

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
    const status = res.status;
    const ct = (res.headers.get('content-type')||'').toLowerCase();
    return res.text().then(t => {
      try { return JSON.parse(t); }
      catch(_) {
        console.error('[toJSONSafe] Non-JSON response detected. Content-Type:', ct, 'Status:', status, 'Raw:', String(t||'').substring(0,200));
        return { success:false, message:'Risposta non JSON', raw: t, status, contentType: ct };
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
      try{
        const container = document.getElementById('toast-container') || createToastContainer();
        const note = document.createElement('div');
        note.className = 'toast align-items-center text-bg-danger border-0 mb-2';
        note.setAttribute('role','alert');
        note.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="fas fa-exclamation-triangle me-2"></i>${escapeHtml(String(msg||''))}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
        container.appendChild(note);
        try{ new bootstrap.Toast(note, { delay: 4000 }).show(); }catch(__){ /* bootstrap may be unavailable */ }
        setTimeout(() => { try{ note.remove(); }catch(__){} }, 5000);
      }catch(__){ /* no ui */ }
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
      const mIT = s.match(/^([0-3]?\d)[\/\.\-]([0-1]?\d)[\/\.\-](\d{4})$/);
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
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } else {
      console.warn('Sessione scaduta. Redirect al login.');
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

    console.log('[secureGet]', action, 'params:', params);

    try {
      let ck = null;
      if (String(params.nocache||'') !== '1') {
        ck = makeCacheKey(action, params);
        const hit = clientCacheGet(ck);
        if (hit && hit.success === true) { return hit; }
      }
      
      // Use enhanced retry logic for production
      return await retryWithBackoff(async () => {
        return await secureGetInternal(action, params, ck, url);
      }, 3, 1000); // 3 retries with 1s base delay for production
    } catch (err) {
      console.warn('[secureGet] Errore rete', err.message);
      
      // Enhanced error handling with offline detection
      let errorMessage = 'Errore di rete: ';
      let errorType = 'network_error';
      
      if (err.name === 'AbortError') {
        errorMessage += 'Timeout di connessione';
        errorType = 'timeout_error';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage += 'Connessione non disponibile';
        errorType = 'connection_error';
      } else if (err.message.includes('Both proxy and direct')) {
        errorMessage += 'Servizio temporaneamente non disponibile';
        errorType = 'service_unavailable';
      } else {
        errorMessage += err.message;
      }
      
      // Check if we're offline
      if (!navigator.onLine) {
        errorMessage = 'Sei offline. Controlla la tua connessione internet.';
        errorType = 'offline_error';
      }
      
      showError(errorMessage);
      
      // Return structured error for better handling
      return { 
        success: false, 
        message: errorMessage,
        error_type: errorType,
        offline: !navigator.onLine,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🔄 Production-grade retry helper with exponential backoff and enhanced error handling
   */
  async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Enhanced error categorization for retry decisions
        if (error.name === 'AbortError' || error.message.includes('ERR_ABORTED') || error.message.includes('ERR_FAILED')) {
          console.warn(`[retryWithBackoff] Network error on attempt ${attempt + 1}:`, error.message);
          // These errors are often transient, so we retry
        } else if (error.message.includes('Both proxy and direct')) {
          console.warn(`[retryWithBackoff] Both connections failed on attempt ${attempt + 1}:`, error.message);
          // Service unavailable - retry with longer delay
          const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 2000, 20000);
          console.log(`[retryWithBackoff] Service unavailable, retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // Don't retry on other errors
          throw error;
        }
        
        // Exponential backoff with jitter for production
        if (attempt < maxRetries - 1) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, 15000);
          console.log(`[retryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // JSONP fallback rimosso per conformità sicurezza

  // Fallback POST diretto rimosso per conformità sicurezza

  // Legacy POST function (mantiene compatibilità con vecchio codice)
  async function call(pathOrBody, opts={}){
    const url = cfg('API_URL');
    const body = typeof pathOrBody === 'string' ? (opts.body||{}) : (pathOrBody||{});
    const token = getActiveToken();

    // DUAL TOKEN SUPPORT: includi token sia in header che nel body per massima compatibilità
    const payload = { ...body };

    // 🔐 Aggiungi CSRF token se disponibile
    const csrfToken = sessionStorage.getItem('csrfToken');
    if (csrfToken) {
      payload.csrfToken = csrfToken;
    }

    try{
      const isAppsScript = typeof url === 'string' && url.includes('script.google.com');
      const headers = isAppsScript ? { 'Content-Type': 'text/plain' } : { 'Content-Type':'application/json' };
      if (!isAppsScript && token && String(token).trim()) headers['Authorization'] = 'Bearer ' + token;

      // Try connection with timeout and better error handling
      let res;
      let timeoutId;
      
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        res = await fetch(url, { 
          method:'POST', 
          mode:'cors', 
          cache:'no-cache', 
          credentials:'include', 
          headers, 
          body: JSON.stringify(payload),
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok && res.status >= 500) {
          throw new Error('Server error');
        }
        
      } catch (fetchError) {
        console.warn('[call] Connection failed:', fetchError.message);
        
        // Try fallback to direct Apps Script endpoint
        const fallbackUrl = 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec';
        
        try {
          const controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for fallback
          
          const fallbackHeaders = { 'Content-Type': 'text/plain' };
          if (token && String(token).trim()) fallbackHeaders['Authorization'] = 'Bearer ' + token;
          
          res = await fetch(fallbackUrl, { 
            method:'POST', 
            mode:'cors', 
            cache:'no-cache', 
            credentials:'include', 
            headers: fallbackHeaders, 
            body: JSON.stringify(payload),
            signal: controller.signal 
          });
          
          clearTimeout(timeoutId);
        } catch (directError) {
          clearTimeout(timeoutId);
          throw new Error('Both proxy and direct connection failed');
        }
      }
      const data = await toJSONSafe(res);
      if (!res.ok || data.success === false){
        const msg = (data && (data.message || data.error)) ? (data.message || data.error) : ('Errore API: ' + res.status);
        showError(msg);
      }
      return data;
    } catch(err) {
      console.warn('[call] Errore rete', err.message);
      
      // Enhanced error handling with offline detection
      let errorMessage = 'Errore di rete: ';
      let errorType = 'network_error';
      
      if (err.name === 'AbortError') {
        errorMessage += 'Timeout di connessione';
        errorType = 'timeout_error';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage += 'Connessione non disponibile';
        errorType = 'connection_error';
      } else if (err.message.includes('Both proxy and direct')) {
        errorMessage += 'Servizio temporaneamente non disponibile';
        errorType = 'service_unavailable';
      } else {
        errorMessage += err.message;
      }
      
      // Check if we're offline
      if (!navigator.onLine) {
        errorMessage = 'Sei offline. Controlla la tua connessione internet.';
        errorType = 'offline_error';
      }
      
      showError(errorMessage);
      
      // Return structured error for better handling
      return { 
        success: false, 
        message: errorMessage,
        error_type: errorType,
        offline: !navigator.onLine,
        timestamp: new Date().toISOString()
      };
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
  window.retryWithBackoff = retryWithBackoff; // 🔄 Export retry helper
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
  
  console.log('[SHARED-UTILS] v9.0 loaded - Production-optimized with enhanced ERR_ABORTED/ERR_FAILED handling');
  
  // ===== FUNZIONI DI SICUREZZA AGGIUNTE =====
  
  /**
   * Sanitizza una stringa per l'uso sicuro in HTML
   * @param {string} str - Stringa da sanitizzare
   * @returns {string} Stringa sanitizzata
   */
  window.escapeHtml = function(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  /**
   * Sanitizza attributi HTML per prevenire XSS
   * @param {string} str - Stringa da sanitizzare
   * @returns {string} Stringa sanitizzata per attributi
   */
  window.escapeAttr = function(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\n/g, '&#10;')
      .replace(/\r/g, '&#13;')
      .replace(/\t/g, '&#9;');
  };

  /**
   * Sanitizza stringhe per JavaScript inline
   * @param {string} str - Stringa da sanitizzare
   * @returns {string} Stringa sicura per JS
   */
  window.escapeJs = function(str) {
    if (str == null) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e');
  };

  /**
   * Previene formula injection in Google Sheets
   * @param {string} str - Stringa da sanitizzare
   * @returns {string} Stringa sicura per Sheets
   */
  window.escapeSheetsFormula = function(str) {
    if (str == null) return '';
    str = String(str).trim();
    // Se inizia con =, +, -, @, aggiungi apostrofo
    if (/^[\=\+\-\@]/.test(str)) {
      return "'" + str;
    }
    return str;
  };
  
  console.log('[SHARED-UTILS] Security functions added: escapeHtml, escapeAttr, escapeJs, escapeSheetsFormula');
})();