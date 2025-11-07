/**
 * ENTRY POINT PRINCIPALE
 * 
 * Punto di ingresso per tutte le richieste HTTP
 * Delega la gestione agli endpoint specifici
 */

/**
 * Gestisce richieste GET
 * @param {Object} e - Evento richiesta HTTP
 * @return {ContentService} Risposta JSON
 */
function doGet(e) {
  Logger.log('[doGet] Chiamata ricevuta: ' + JSON.stringify(e.parameter));
  return handleGet(e);
}

/**
 * Gestisce richieste POST
 * @param {Object} e - Evento richiesta HTTP con postData
 * @return {ContentService} Risposta JSON
 */
function doPost(e) {
  Logger.log('[doPost] Chiamata ricevuta');
  return handlePost(e);
}
