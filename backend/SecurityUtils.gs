/**
 * UTILITÀ DI SICUREZZA
 * 
 * Funzioni di utilità per la gestione della sicurezza
 */

/**
 * Rate limiting - traccia le richieste per IP
 */
const rateLimitTracker = {};

/**
 * Verifica se l'IP è soggetto a rate limiting
 * @param {string} ip - Indirizzo IP del client
 * @return {boolean} true se il rate limit è superato
 */
function checkRateLimit(ip) {
  try {
    var maxRequests = getSecurityConfig('MAX_REQUESTS_PER_MINUTE') || 60;
    var now = Date.now();
    var windowMs = 60000; // 1 minuto
    
    if (!rateLimitTracker[ip]) {
      rateLimitTracker[ip] = [];
    }
    
    // Rimuovi richieste vecchie
    rateLimitTracker[ip] = rateLimitTracker[ip].filter(function(timestamp) {
      return now - timestamp < windowMs;
    });
    
    // Verifica se ha superato il limite
    if (rateLimitTracker[ip].length >= maxRequests) {
      Logger.log('[RateLimit] IP ' + ip + ' ha superato il limite di ' + maxRequests + ' richieste/minuto');
      return true;
    }
    
    // Aggiungi richiesta corrente
    rateLimitTracker[ip].push(now);
    return false;
    
  } catch (error) {
    Logger.log('[RateLimit] Errore nel controllo rate limit: ' + error.message);
    return false; // In caso di errore, permetti l'accesso
  }
}

/**
 * Traccia tentativi di login falliti
 */
const loginAttempts = {};

/**
 * Verifica se l'utente è bloccato per troppi tentativi di login
 * @param {string} identifier - Identificatore utente (nome, email, etc.)
 * @return {boolean} true se l'utente è bloccato
 */
function isUserLocked(identifier) {
  try {
    var maxAttempts = getSecurityConfig('MAX_LOGIN_ATTEMPTS') || 5;
    var lockoutDuration = getSecurityConfig('LOCKOUT_DURATION') || 900; // 15 minuti
    var now = Date.now();
    
    if (!loginAttempts[identifier]) {
      return false;
    }
    
    var attempts = loginAttempts[identifier];
    
    // Rimuovi tentativi vecchi
    var validAttempts = attempts.filter(function(timestamp) {
      return now - timestamp < (lockoutDuration * 1000);
    });
    
    loginAttempts[identifier] = validAttempts;
    
    // Verifica se ha superato il limite
    if (validAttempts.length >= maxAttempts) {
      Logger.log('[LoginLock] Utente ' + identifier + ' bloccato per ' + validAttempts.length + ' tentativi falliti');
      return true;
    }
    
    return false;
    
  } catch (error) {
    Logger.log('[LoginLock] Errore nel controllo blocco login: ' + error.message);
    return false;
  }
}

/**
 * Registra un tentativo di login fallito
 * @param {string} identifier - Identificatore utente
 */
function recordFailedLogin(identifier) {
  try {
    if (!loginAttempts[identifier]) {
      loginAttempts[identifier] = [];
    }
    
    loginAttempts[identifier].push(Date.now());
    
    var attemptCount = loginAttempts[identifier].length;
    Logger.log('[LoginLock] Tentativo di login fallito per ' + identifier + ' (totale: ' + attemptCount + ')');
    
  } catch (error) {
    Logger.log('[LoginLock] Errore nel registrare tentativo fallito: ' + error.message);
  }
}

/**
 * Pulisce i tentativi di login falliti per un utente (dopo login successo)
 * @param {string} identifier - Identificatore utente
 */
function clearFailedLogins(identifier) {
  try {
    if (loginAttempts[identifier]) {
      delete loginAttempts[identifier];
      Logger.log('[LoginLock] Puliti tentativi falliti per ' + identifier);
    }
  } catch (error) {
    Logger.log('[LoginLock] Errore nel pulire tentativi falliti: ' + error.message);
  }
}

/**
 * Sanitizza input per prevenire XSS e injection
 * @param {string} input - Input da sanitizzare
 * @param {string} type - Tipo di sanitizzazione ('html', 'js', 'sql', 'sheet')
 * @return {string} Input sanitizzato
 */
function sanitizeInput(input, type) {
  if (input === null || input === undefined) {
    return '';
  }
  
  var str = String(input);
  
  switch (type) {
    case 'html':
      return str.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#x27;');
               
    case 'js':
      return str.replace(/\\/g, '\\\\')
               .replace(/"/g, '\\"')
               .replace(/'/g, "\\'")
               .replace(/\n/g, '\\n')
               .replace(/\r/g, '\\r')
               .replace(/</g, '\\x3c')
               .replace(/>/g, '\\x3e');
               
    case 'sql':
      return str.replace(/'/g, "''")
               .replace(/\\/g, '\\\\');
               
    case 'sheet':
      return sanitizeSheetValue(str);
      
    default:
      return str.trim();
  }
}

/**
 * Verifica se una stringa contiene pattern pericolosi
 * @param {string} str - Stringa da verificare
 * @return {boolean} true se contiene pattern sospetti
 */
function containsDangerousPatterns(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  var dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers (onclick, onload, etc.)
    /eval\s*\(/gi, // Eval function
    /document\.write/gi, // Document.write
    /window\./gi, // Window object access
    /\\x[0-9a-f]{2}/gi, // Hex encoding
    /\\u[0-9a-f]{4}/gi, // Unicode encoding
    /&#x[0-9a-f]+;/gi, // HTML hex encoding
    /&#\d+;/gi, // HTML decimal encoding
  ];
  
  for (var i = 0; i < dangerousPatterns.length; i++) {
    if (dangerousPatterns[i].test(str)) {
      Logger.log('[Security] Pattern pericoloso rilevato: ' + str.substring(0, 100));
      return true;
    }
  }
  
  return false;
}