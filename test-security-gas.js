/**
 * Test Suite per Security Fixes - Google Apps Script Version
 * 
 * Questo file può essere copiato e incollato direttamente in Google Apps Script
 * per testare tutti i fix di sicurezza implementati.
 */

/**
 * Test 1: Validazione JWT Secret
 */
function testJWTSecretValidation() {
  Logger.log('🧪 Testing JWT Secret Validation...');
  
  try {
    // Test con JWT_SECRET non configurato
    var props = PropertiesService.getScriptProperties();
    var originalSecret = props.getProperty('JWT_SECRET');
    
    // Rimuovi temporaneamente il JWT_SECRET
    props.deleteProperty('JWT_SECRET');
    
    try {
      getJWTSecret();
      Logger.log('❌ Test fallito: getJWTSecret non ha lanciato errore con JWT_SECRET mancante');
      return false;
    } catch (e) {
      if (e.message.includes('JWT_SECRET non configurato')) {
        Logger.log('✅ Test passato: getJWTSecret lancia errore corretto con JWT_SECRET mancante');
        return true;
      } else {
        Logger.log('❌ Test fallito: getJWTSecret ha lanciato errore inatteso: ' + e.message);
        return false;
      }
    } finally {
      // Ripristina JWT_SECRET originale
      if (originalSecret) {
        props.setProperty('JWT_SECRET', originalSecret);
      }
    }
  } catch (error) {
    Logger.log('❌ Test error: ' + error.message);
    return false;
  }
}

/**
 * Test 2: Sanitizzazione Formula Injection
 */
function testFormulaSanitization() {
  Logger.log('🧪 Testing Formula Sanitization...');
  
  var testCases = [
    { input: '=HYPERLINK("http://evil.com", "Click")', expected: ' =HYPERLINK("http://evil.com", "Click")' },
    { input: '+1+1', expected: ' +1+1' },
    { input: '-1-1', expected: ' -1-1' },
    { input: '@SUM(A1:A10)', expected: ' @SUM(A1:A10)' },
    { input: 'Test normale', expected: 'Test normale' },
    { input: '', expected: '' },
    { input: null, expected: '' }
  ];
  
  var allPassed = true;
  
  for (var i = 0; i < testCases.length; i++) {
    var testCase = testCases[i];
    var result = sanitizeSheetValue(testCase.input);
    if (result === testCase.expected) {
      Logger.log('✅ Test ' + (i + 1) + ' passato: "' + testCase.input + '" -> "' + result + '"');
    } else {
      Logger.log('❌ Test ' + (i + 1) + ' fallito: "' + testCase.input + '" -> "' + result + '" (atteso: "' + testCase.expected + '")');
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Test 3: CSRF Token Generation e Validation
 */
function testCSRFToken() {
  Logger.log('🧪 Testing CSRF Token...');
  
  try {
    // Crea un token di sessione valido
    var sessionToken = createJWT({ 
      cf: 'TESTCF', 
      role: 'user', 
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    });
    
    if (!sessionToken) {
      Logger.log('❌ Test fallito: impossibile creare sessione token');
      return false;
    }
    
    // Genera CSRF token
    var csrfToken = generateCSRFToken(sessionToken);
    if (!csrfToken) {
      Logger.log('❌ Test fallito: generateCSRFToken ha restituito null');
      return false;
    }
    Logger.log('✅ CSRF Token generato: ' + csrfToken);
    
    // Valida CSRF token
    var isValid = validateCSRFToken(sessionToken, csrfToken);
    if (isValid) {
      Logger.log('✅ Test passato: CSRF Token validato correttamente');
      return true;
    } else {
      Logger.log('❌ Test fallito: CSRF Token non validato');
      return false;
    }
  } catch (error) {
    Logger.log('❌ Test error: ' + error.message);
    return false;
  }
}

/**
 * Test 4: HTML Escaping
 */
function testHTMLEscaping() {
  Logger.log('🧪 Testing HTML Escaping...');
  
  var testCases = [
    { input: '<script>alert("XSS")</script>', expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' },
    { input: '<img src="x" onerror="alert(1)">', expected: '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;' },
    { input: '"quotes" & ampersand', expected: '&quot;quotes&quot; &amp; ampersand' },
    { input: 'Test normale', expected: 'Test normale' }
  ];
  
  var allPassed = true;
  
  for (var i = 0; i < testCases.length; i++) {
    var testCase = testCases[i];
    var result = escapeHtml(testCase.input);
    if (result === testCase.expected) {
      Logger.log('✅ Test ' + (i + 1) + ' passato: HTML escaping corretto');
    } else {
      Logger.log('❌ Test ' + (i + 1) + ' fallito: "' + testCase.input + '" -> "' + result + '" (atteso: "' + testCase.expected + '")');
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Test Suite principale - da eseguire in Google Apps Script
 */
function runSecurityTestsGAS() {
  Logger.log('🔐 Avvio Security Test Suite per Google Apps Script...\n');
  
  var tests = [
    { name: 'JWT Secret Validation', func: testJWTSecretValidation },
    { name: 'Formula Sanitization', func: testFormulaSanitization },
    { name: 'CSRF Token', func: testCSRFToken },
    { name: 'HTML Escaping', func: testHTMLEscaping }
  ];
  
  var totalPassed = 0;
  var totalFailed = 0;
  
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    Logger.log('\n=== ' + test.name + ' ===');
    try {
      if (test.func()) {
        totalPassed++;
        Logger.log('✅ ' + test.name + ': PASS');
      } else {
        totalFailed++;
        Logger.log('❌ ' + test.name + ': FAIL');
      }
    } catch (error) {
      totalFailed++;
      Logger.log('❌ ' + test.name + ': ERROR - ' + error.message);
    }
  }
  
  Logger.log('\n=== RISULTATI FINALI ===');
  Logger.log('✅ Test passati: ' + totalPassed);
  Logger.log('❌ Test falliti: ' + totalFailed);
  Logger.log('📊 Success rate: ' + Math.round((totalPassed / tests.length) * 100) + '%');
  
  if (totalFailed === 0) {
    Logger.log('🎉 Tutti i test di sicurezza sono passati!');
  } else {
    Logger.log('⚠️  Alcuni test sono falliti. Rivedere i fix di sicurezza.');
  }
  
  return totalFailed === 0;
}

/**
 * Funzione per creare un report di test dettagliato
 */
function createSecurityTestReport() {
  var report = 'SECURITY TEST REPORT\n';
  report += '====================\n\n';
  report += 'Data: ' + new Date().toISOString() + '\n';
  report += 'Ambiente: Google Apps Script\n\n';
  
  // Esegui i test
  var success = runSecurityTestsGAS();
  
  report += 'Stato: ' + (success ? '✅ TUTTI I TEST PASSATI' : '❌ ALCUNI TEST FALLITI') + '\n\n';
  report += 'NOTA: Copiare questo report per documentazione.\n';
  
  Logger.log(report);
  return report;
}