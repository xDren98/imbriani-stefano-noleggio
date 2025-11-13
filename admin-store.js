function createStore(name, initial){
  let state = initial;
  const subs = new Set();
  const get = () => state;
  const set = (next) => { state = next; subs.forEach(fn => { try{ fn(state); }catch(_){} }); try{ window.dispatchEvent(new CustomEvent('store:'+name+':update', { detail: state })); }catch(_){} };
  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  return { get, set, subscribe };
}
async function loadWith(action, params){
  if (window.adminApi && typeof window.adminApi.callAPI === 'function'){
    const res = await window.adminApi.callAPI(action, params||{});
    return res && res.success ? (res.data||res.rows||res.prenotazioni||[]) : [];
  }
  return [];
}
const adminStore = {
  prenotazioni: createStore('prenotazioni', []),
  veicoli: createStore('veicoli', []),
  clienti: createStore('clienti', []),
  async loadPrenotazioni(){ const data = await loadWith('getPrenotazioni', {}); adminStore.prenotazioni.set(Array.isArray(data)?data:[]); return adminStore.prenotazioni.get(); },
  async loadVeicoli(){ const data = await loadWith('getVeicoli', {}); adminStore.veicoli.set(Array.isArray(data)?data:[]); return adminStore.veicoli.get(); },
  async loadClienti(){ const data = await loadWith('getSheet', { name:'CLIENTI' }); adminStore.clienti.set(Array.isArray(data)?data:[]); return adminStore.clienti.get(); }
};
const events = {
  on(ev, fn){ window.addEventListener(ev, fn); },
  off(ev, fn){ window.removeEventListener(ev, fn); },
  emit(ev, detail){ try{ window.dispatchEvent(new CustomEvent(ev, { detail })); }catch(_){} }
};
window.adminStore = adminStore;
window.events = events;
export { adminStore, events };
