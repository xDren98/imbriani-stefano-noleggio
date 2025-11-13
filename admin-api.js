const POST_ACTIONS = new Set([
  'setManutenzione','setVeicolo','eliminaVeicolo','creaPrenotazione','aggiornaPrenotazione','aggiornaPrenotazioneCompleta','eliminaPrenotazione','aggiornaStato','confermaPrenotazione','aggiornaCliente','creaCliente','importaPrenotazioniICS','importaPrenotazioniCSV','aggiornaStatoPrenotazione'
]);

async function callAPI(action, params={}){
  const isWrite = POST_ACTIONS.has(action);
  try {
    if (isWrite) {
      if (typeof window.securePost === 'function') {
        const result = await window.securePost(action, params);
        return result;
      }
      if (typeof window.api?.call === 'function') {
        const result = await window.api.call({ action, ...params });
        return result;
      }
      return { success:false, message:'securePost missing' };
    } else {
      if (typeof window.secureGet === 'function') {
        const result = await window.secureGet(action, params);
        return result;
      }
      if (typeof window.api?.call === 'function') {
        const result = await window.api.call({ action, ...params });
        return result;
      }
      return { success:false, message:'secureGet missing' };
    }
  } catch (err) {
    return { success:false, message: String(err && err.message || err) };
  }
}

window.adminApi = { callAPI, POST_ACTIONS };
export { callAPI, POST_ACTIONS };
