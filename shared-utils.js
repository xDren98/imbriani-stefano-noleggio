// Shared Utils v8.8 - Fixed Authorization header for all API calls
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

  function toJSONSafe(res){
    const ct = (res.headers.get('content-type')||'').toLowerCase();
    if (ct.includes('application/json')) return res.json();
    return res.text().then(t=>{ try { return JSON.parse(t) } catch(e){ return { success:false, message:'Risposta non JSON', raw:t, status:res.status }}});
  }

  function showError(msg){
    console.error('[API ERROR]', msg);
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
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    container.appendChild(toast);
    
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

  // ✅ FIX: Aggiungi funzione secureGet con Authorization header
  async function secureGet(action, params = {}) {
    const url = new URL(cfg('API_URL'));
    url.searchParams.set('action', action);
    
    // Aggiungi tutti i parametri alla query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    const token = cfg('AUTH_TOKEN');
    console.log('[secureGet]', action, 'params:', params);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': `Bearer ${token}`,  // ✅ Token nell'header per GET
          'Content-Type': 'application/json'
        }
      });

      const data = await toJSONSafe(res);
      
      if (!res.ok || data.success === false) {
        showError((data && data.message) ? data.message : ('Errore API: ' + res.status));
      }
      
      return data;
    } catch (err) {
      showError('Errore di rete: ' + err.message);
      return { success: false, message: err.message };
    }
  }

  // ✅ FIX: Aggiungi funzione securePost con Authorization header
  async function securePost(action, payload = {}) {
    const url = cfg('API_URL');
    const token = cfg('AUTH_TOKEN');
    
    console.log('[securePost]', action, 'payload:', payload);

    // Includi token sia in header che nel body per massima compatibilità
    const body = {
      action: action,
      ...payload,
      token: token  // Token nel body per Apps Script
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': `Bearer ${token}`,  // ✅ Token nell'header per proxy
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await toJSONSafe(res);
      
      if (!res.ok || data.success === false) {
        showError((data && data.message) ? data.message : ('Errore API: ' + res.status));
      }
      
      return data;
    } catch (err) {
      showError('Errore di rete: ' + err.message);
      return { success: false, message: err.message };
    }
  }

  // Legacy POST function (mantiene compatibilità con vecchio codice)
  async function call(pathOrBody, opts={}){
    const url = cfg('API_URL');
    const body = typeof pathOrBody === 'string' ? (opts.body||{}) : (pathOrBody||{});
    const token = cfg('AUTH_TOKEN');

    // DUAL TOKEN SUPPORT: includi token sia in header che nel body per massima compatibilità
    const payload = {
      ...body,
      token: token  // Token nel body per Apps Script
    };

    try{
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors', cache: 'no-cache',
        headers: { 
          'Content-Type':'application/json', 
          'Authorization':'Bearer ' + token  // Token nell'header per il proxy
        },
        body: JSON.stringify(payload)
      });
      const data = await toJSONSafe(res);
      if (!res.ok || data.success === false){
        showError((data && data.message) ? data.message : ('Errore API: ' + res.status));
      }
      return data;
    }catch(err){
      showError('Errore di rete: ' + err.message);
      return { success:false, message:err.message };
    }
  }

  // Esporta le funzioni globalmente
  window.api.call = call;
  window.api.secureGet = secureGet;
  window.api.securePost = securePost;
  window.secureGet = secureGet;  // ✅ Export anche come funzione globale
  window.securePost = securePost;  // ✅ Export anche come funzione globale
  window.showToast = showToast;
  
  console.log('[SHARED-UTILS] v8.8 loaded - Authorization header fixed for GET/POST');
})();