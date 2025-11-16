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
  async loadPrenotazioni(){
    let data = await loadWith('getPrenotazioni', {});
    if (!Array.isArray(data) && data && Array.isArray(data.rows)) data = data.rows;
    if (!Array.isArray(data) && data && Array.isArray(data.prenotazioni)) data = data.prenotazioni;
    if (!Array.isArray(data) || data.length === 0) {
      const snap = await loadWith('search', { entity:'prenotazioni', q:'', limit:500, offset:0, nocache:'1' });
      data = Array.isArray(snap) ? snap : (snap && Array.isArray(snap.data) ? snap.data : []);
    }
    adminStore.prenotazioni.set(Array.isArray(data)?data:[]);
    return adminStore.prenotazioni.get();
  },
  async loadVeicoli(){
    let data = await loadWith('getVeicoli', { nocache:'1' });
    if (!Array.isArray(data)) {
      if (data && Array.isArray(data.rows)) data = data.rows;
      else if (data && Array.isArray(data.data)) data = data.data;
    }
    if (!Array.isArray(data) || data.length === 0) {
      let sheet = await loadWith('getSheet', { name:'VEICOLI' });
      let rows = Array.isArray(sheet) ? sheet : (sheet && Array.isArray(sheet.rows) ? sheet.rows : []);
      if (!Array.isArray(rows) || rows.length === 0){
        sheet = await loadWith('getSheet', { name:'PULMINI' });
        rows = Array.isArray(sheet) ? sheet : (sheet && Array.isArray(sheet.rows) ? sheet.rows : []);
      }
      data = rows || [];
    }
    let manutenzioni = await loadWith('getSheet', { name:'MANUTENZIONI' });
    manutenzioni = Array.isArray(manutenzioni) ? manutenzioni : (manutenzioni && Array.isArray(manutenzioni.rows) ? manutenzioni.rows : []);
    const parseAny = (v) => { try{ if(typeof window.parseDateAny==='function') return window.parseDateAny(v); const d=new Date(v); return isNaN(d)?null:d; }catch(_){ return null; } };
    const today = new Date(); today.setHours(0,0,0,0);
    const activeByTarga = new Map();
    (manutenzioni||[]).forEach(r => {
      const tg = String(r.Targa || r.targa || '').trim().toUpperCase();
      if (!tg) return;
      const diRaw = r.DataInizioManutenzione || r['Data Inizio Manutenzione'] || r.Inizio || r['Data Inizio'] || r.giornoInizio || '';
      const dfRaw = r.DataFineManutenzione || r['Data Fine Manutenzione'] || r.Fine || r['Data Fine'] || r.giornoFine || '';
      const d1 = parseAny(diRaw);
      const d2 = parseAny(dfRaw) || parseAny(diRaw);
      if (!d1) return;
      const s = new Date(d1); s.setHours(0,0,0,0);
      const e = new Date(d2); e.setHours(0,0,0,0);
      if (today >= s && today <= e) {
        activeByTarga.set(tg, { note: r.Note || r.note || 'In manutenzione', di: d1, df: d2 });
      }
    });
    const baseList = Array.isArray(data) ? data : [];
    const normalized = baseList.map((row)=>{
      const Targa = row.Targa || row.targa || row['Targa'] || row['targa'] || '';
      const Marca = row.Marca || row.marca || row['Marca'] || row['marca'] || '';
      const Modello = row.Modello || row.modello || row['Modello'] || row['modello'] || '';
      const PostiRaw = row.Posti || row.posti || row['Posti'] || row['posti'] || '';
      const Posti = typeof PostiRaw === 'string' ? (parseInt(PostiRaw,10)||PostiRaw) : (typeof PostiRaw === 'number' ? PostiRaw : '');
      const Note = row.Note || row.note || '';
      let StatoManutenzione = row.StatoManutenzione || row.statoManutenzione || row.Manutenzione || row.manutenzione || row['Stato manutenzione'] || Note || '-';
      let InManutenzioneOggi = Boolean(
        row.InManutenzioneOggi ?? row.inManutenzioneOggi ?? row.ManutenzioneAttiva ?? row.manutenzioneAttiva ?? /manutenz|officina|guasto|fermo/i.test(String(StatoManutenzione||''))
      );
      const PassoLungo = row.PassoLungo || row.passoLungo || row['Passo Lungo'] || false;
      const Disponibile = row.Disponibile ?? row.disponibile;
      const DisponibileDate = row.DisponibileDate ?? row.disponibileDate;
      const key = String(Targa||'').toUpperCase();
      if (key && activeByTarga.has(key)) {
        InManutenzioneOggi = true;
        const info = activeByTarga.get(key);
        StatoManutenzione = info.note || 'In manutenzione';
      }
      return { ...row, Targa, Marca, Modello, Posti, StatoManutenzione, InManutenzioneOggi, PassoLungo, Disponibile, DisponibileDate };
    });
    // Merge con foglio PULMINI se presente
    try {
      const sheetPulmini = await loadWith('getSheet', { name:'PULMINI' });
      const rowsPulmini = Array.isArray(sheetPulmini) ? sheetPulmini : (sheetPulmini && Array.isArray(sheetPulmini.rows) ? sheetPulmini.rows : []);
      const normPulmini = (rowsPulmini||[]).map((row)=>{
        const Targa = row.Targa || row.targa || row['Targa'] || row['targa'] || '';
        const Marca = row.Marca || row.marca || row['Marca'] || row['marca'] || '';
        const Modello = row.Modello || row.modello || row['Modello'] || row['modello'] || '';
        const PostiRaw = row.Posti || row.posti || row['Posti'] || row['posti'] || '';
        const Posti = typeof PostiRaw === 'string' ? (parseInt(PostiRaw,10)||PostiRaw) : (typeof PostiRaw === 'number' ? PostiRaw : '');
        const Note = row.Note || row.note || '';
        const StatoManutenzione = row.StatoManutenzione || row['Stato manutenzione'] || row.Manutenzione || row.manutenzione || Note || '-';
        const InManutenzioneOggi = Boolean(row.InManutenzioneOggi ?? row.manutenzioneAttiva ?? /manutenz|officina|guasto|fermo/i.test(String(StatoManutenzione||'')));
        const PassoLungo = row.PassoLungo || row['Passo Lungo'] || false;
        return { ...row, Targa, Marca, Modello, Posti, StatoManutenzione, InManutenzioneOggi, PassoLungo };
      });
      const byTarga = new Map();
      normalized.forEach(v => { if (v.Targa) byTarga.set(String(v.Targa).toUpperCase(), v); });
      normPulmini.forEach(v => { const key = String(v.Targa||'').toUpperCase(); if (key && !byTarga.has(key)) byTarga.set(key, v); });
      adminStore.veicoli.set(Array.from(byTarga.values()));
    } catch(_) {
      adminStore.veicoli.set(normalized);
    }
    return adminStore.veicoli.get();
  },
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
