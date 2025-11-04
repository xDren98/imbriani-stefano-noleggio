// Shared Utils v8.6 - robust API call with CONFIG fallbacks, visible errors and toast notifications
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

  async function call(pathOrBody, opts={}){
    const url = (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : cfg('API_URL');
    const body = typeof pathOrBody === 'string' ? (opts.body||{}) : (pathOrBody||{});
    const token = (window.CONFIG && window.CONFIG.AUTH_TOKEN) ? window.CONFIG.AUTH_TOKEN : cfg('AUTH_TOKEN');

    try{
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors', cache: 'no-cache',
        headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + token },
        body: JSON.stringify(body)
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
  window.showToast = showToast;
})();
