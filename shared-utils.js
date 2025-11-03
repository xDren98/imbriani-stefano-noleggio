/* SHARED UTILS v8.3 — secureGet GET-compatibile con GAS (token+ts in querystring) + retry/timeout */
(function(){
  const BASE = window.API_URL || '';
  const TOKEN = window.API_TOKEN || '';
  const TIMEOUT = 30000;
  const RETRIES = 2;
  const DELAY = 800;
  const DEBUG = true;

  function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

  function toQuery(params){
    const sp = new URLSearchParams();
    Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null) sp.append(k, String(v)); });
    return sp.toString();
  }

  async function doGET(action, params){
    const ts = Date.now();
    const all = { action, token: TOKEN, ts, ...params };
    const url = `${BASE}?${toQuery(all)}`;
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), TIMEOUT);
    try{
      const res = await fetch(url, { method:'GET', headers:{ 'Accept':'application/json' }, signal: controller.signal });
      let json = null; try{ json = await res.json(); }catch{ json = { success:false, message:`HTTP ${res.status}` } }
      return json;
    } finally { clearTimeout(timer); }
  }

  async function secureGet(action, params={}){
    if(DEBUG) console.log(`[SECURE] GET ${action} with`, params);
    for(let a=0;a<=RETRIES;a++){
      const resp = await doGET(action, params);
      if(DEBUG) console.log(`[SECURE] Response ${action} (attempt ${a+1})`, resp);
      if(resp && (resp.success===true || resp.data)) return resp;
      if(resp && /token non valido|timestamp/i.test(String(resp.message||'')) && a<RETRIES){
        // Ritenta subito (potrebbe essere desync orario)
      }
      if(a<RETRIES) await sleep(DELAY*(a+1));
    }
    return { success:false, message:`secureGet failed after ${RETRIES+1} attempts` };
  }

  // Backward compat
  async function callAPI(action, params={}){ return await secureGet(action, params); }

  // Expose minimal shared helpers used in app
  window.secureGet = secureGet;
  window.callAPI = callAPI;
  console.log(`[SHARED] ${new Date().toISOString()}: Shared Utils v8.3 loaded (GET mode, token+ts)`);
})();
