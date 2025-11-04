// Shared Utils v8.5 - robust API call with CONFIG fallbacks and visible errors
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
    try{ alert(msg); }catch(_){ /* no ui */ }
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

  window.api.call = call;
})();
