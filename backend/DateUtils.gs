/**
 * UTILITY PER GESTIONE DATE
 * 
 * Contiene funzioni per formattazione e parsing date
 * - Formattazione italiana (gg/mm/aaaa)
 * - Formattazione per filename
 * - Parsing date
 */

/**
 * Formatta una data in formato italiano gg/mm/aaaa
 * @param {Date|string} date - Data da formattare
 * @return {string} Data formattata o stringa vuota se invalida
 */
function formatDateToItalian(date) {
  if (!date) return '';
  
  try {
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    
    return day + '/' + month + '/' + year;
  } catch (e) {
    Logger.log('[formatDateToItalian] Errore: ' + e.message);
    return '';
  }
}

/**
 * Formatta una data per utilizzo nei nomi file (gg-mm-aaaa)
 * @param {Date} date - Data da formattare
 * @return {string} Data formattata per filename o stringa vuota
 */
function formatDateForFilename(date) {
  if (date instanceof Date && !isNaN(date.getTime())) {
    var d = Utilities.formatDate(date, CONFIG.PDF.TIMEZONE, 'dd/MM/yyyy');
    return d.replace(/\//g, '-');
  }
  return '';
}

/**
 * Normalizza una data rimuovendo ore/minuti/secondi
 * @param {Date} date - Data da normalizzare
 * @return {Date} Data normalizzata (solo anno/mese/giorno)
 */
function normalizeDate(date) {
  if (!date || !(date instanceof Date)) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Verifica se due date sono lo stesso giorno
 * @param {Date} date1 - Prima data
 * @param {Date} date2 - Seconda data
 * @return {boolean} True se stesso giorno
 */
function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Calcola differenza in giorni tra due date
 * @param {Date} startDate - Data inizio
 * @param {Date} endDate - Data fine
 * @return {number} Numero di giorni
 */
function daysDifference(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  var diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
