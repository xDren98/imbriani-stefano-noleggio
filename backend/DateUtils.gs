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
    // Se è già una stringa italiana (gg/mm/aaaa), validala e restituiscila normalizzata
    if (typeof date === 'string' && date.indexOf('/') > -1) {
      var parts = date.split('/');
      if (parts.length === 3) {
        var gg = ('0' + parseInt(parts[0], 10)).slice(-2);
        var mm = ('0' + parseInt(parts[1], 10)).slice(-2);
        var yyyy = String(parts[2]).trim();
        if (!isNaN(parseInt(gg,10)) && !isNaN(parseInt(mm,10)) && !isNaN(parseInt(yyyy,10))) {
          return gg + '/' + mm + '/' + yyyy;
        }
      }
      return '';
    }
    // Altrimenti prova a creare un Date (supporta anche ISO yyyy-mm-dd)
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
 * Parsing sicuro per date in formato italiano (gg/mm/aaaa) o ISO (yyyy-mm-dd)
 * @param {string|Date} value
 * @return {Date|null}
 */
function parseItalianOrISO(value) {
  if (!value) return null;
  try {
    if (value instanceof Date) {
      // Usa mezzogiorno locale per evitare shift di giornata dovuti al timezone
      return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
    }
    if (typeof value === 'string') {
      if (value.indexOf('/') > -1) {
        var p = value.split('/');
        if (p.length === 3) {
          var day = parseInt(p[0], 10);
          var month = parseInt(p[1], 10) - 1;
          var year = parseInt(p[2], 10);
          // Costruisci la data a mezzogiorno
          var d = new Date(year, month, day, 12, 0, 0, 0);
          return isNaN(d.getTime()) ? null : d;
        }
      } else if (value.indexOf('-') > -1) {
        var s = value.split('-');
        if (s.length === 3) {
          var y = parseInt(s[0], 10);
          var m = parseInt(s[1], 10) - 1;
          var dd = parseInt(s[2], 10);
          // Input ISO da <input type="date"> → set a mezzogiorno
          var d2 = new Date(y, m, dd, 12, 0, 0, 0);
          return isNaN(d2.getTime()) ? null : d2;
        }
      }
    }
    // Fallback
    var f = new Date(value);
    return isNaN(f.getTime()) ? null : new Date(f.getFullYear(), f.getMonth(), f.getDate(), 12, 0, 0, 0);
  } catch (e) {
    Logger.log('[parseItalianOrISO] Errore: ' + e.message + ' per value=' + value);
    return null;
  }
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
