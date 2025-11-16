/**
 * Test Suite per Security Fixes
 * 
 * Questo file contiene test per verificare che tutti i fix di sicurezza
 * siano stati implementati correttamente.
 */

// Test 1: Validazione JWT Secret
function testJWTSecretValidation() {
  console.log('🧪 Testing JWT Secret Validation...');
  
  try {
    // Simula JWT_SECRET non configurato
    const originalGetProperty = PropertiesService.getScriptProperties().getProperty;
    PropertiesService.getScriptProperties().getProperty = function(key) {
      if (key === 'JWT_SECRET') return null;
      return originalGetProperty.call(this, key);
    };
    
    // Questo dovrebbe lanciare un errore
    try {
      getJWTSecret();
      console.error('❌ Test fallito: getJWTSecret non ha lanciato errore con JWT_SECRET mancante');
      return false;
    } catch (e) {
      if (e.message.includes('JWT_SECRET non configurato')) {
        console.log('✅ Test passato: getJWTSecret lancia errore corretto con JWT_SECRET mancante');
        return true;
      } else {
        console.error('❌ Test fallito: getJWTSecret ha lanciato errore inatteso:', e.message);
        return false;
      }
    }
  } finally {
    // Ripristina funzione originale
    PropertiesService.getScriptProperties().getProperty = originalGetProperty;
  }
}

// Test 2: Sanitizzazione Formula Injection
function testFormulaSanitization() {
  console.log('🧪 Testing Formula Sanitization...');
  
  const testCases = [
    { input: '=HYPERLINK("http://evil.com", "Click")', expected: ' =HYPERLINK("http://evil.com", "Click")' },
    { input: '+1+1', expected: ' +1+1' },
    { input: '-1-1', expected: ' -1-1' },
    { input: '@SUM(A1:A10)', expected: ' @SUM(A1:A10)' },
    { input: 'Test normale', expected: 'Test normale' },
    { input: '', expected: '' },
    { input: null, expected: '' }
  ];
  
  let allPassed = true;
  
  testCases.forEach((testCase, index) => {
    const result = sanitizeSheetValue(testCase.input);
    if (result === testCase.expected) {
      console.log(`✅ Test ${index + 1} passato: "${testCase.input}" -> "${result}"`);
    } else {
      console.error(`❌ Test ${index + 1} fallito: "${testCase.input}" -> "${result}" (atteso: "${testCase.expected}")`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Test 3: CSRF Token Generation e Validation
function testCSRFToken() {
  console.log('🧪 Testing CSRF Token...');
  
  // Crea un token di sessione valido
  const sessionToken = createJWT({ cf: 'TESTCF', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 });
  
  // Genera CSRF token
  const csrfToken = generateCSRFToken(sessionToken);
  if (!csrfToken) {
    console.error('❌ Test fallito: generateCSRFToken ha restituito null');
    return false;
  }
  console.log('✅ CSRF Token generato:', csrfToken);
  
  // Valida CSRF token
  const isValid = validateCSRFToken(sessionToken, csrfToken);
  if (isValid) {
    console.log('✅ Test passato: CSRF Token validato correttamente');
    return true;
  } else {
    console.error('❌ Test fallito: CSRF Token non validato');
    return false;
  }
}

// Test 4: HTML Escaping
function testHTMLEscaping() {
  console.log('🧪 Testing HTML Escaping...');
  
  const testCases = [
    { input: '<script>alert("XSS")</script>', expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' },
    { input: '<img src="x" onerror="alert(1)">', expected: '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;' },
    { input: '"quotes" & ampersand', expected: '&quot;quotes&quot; &amp; ampersand' },
    { input: 'Test normale', expected: 'Test normale' }
  ];
  
  let allPassed = true;
  
  testCases.forEach((testCase, index) => {
    const result = escapeHtml(testCase.input);
    if (result === testCase.expected) {
      console.log(`✅ Test ${index + 1} passato: HTML escaping corretto`);
    } else {
      console.error(`❌ Test ${index + 1} fallito: "${testCase.input}" -> "${result}" (atteso: "${testCase.expected}")`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Test Suite principale
function runSecurityTests() {
  console.log('🔐 Avvio Security Test Suite...\n');
  
  const tests = [
    { name: 'JWT Secret Validation', func: testJWTSecretValidation },
    { name: 'Formula Sanitization', func: testFormulaSanitization },
    { name: 'CSRF Token', func: testCSRFToken },
    { name: 'HTML Escaping', func: testHTMLEscaping }
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  tests.forEach(test => {
    console.log(`\n=== ${test.name} ===`);
    try {
      if (test.func()) {
        totalPassed++;
        console.log(`✅ ${test.name}: PASS`);
      } else {
        totalFailed++;
        console.log(`❌ ${test.name}: FAIL`);
      }
    } catch (error) {
      totalFailed++;
      console.error(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  });
  
  console.log('\n=== RISULTATI FINALI ===');
  console.log(`✅ Test passati: ${totalPassed}`);
  console.log(`❌ Test falliti: ${totalFailed}`);
  console.log(`📊 Success rate: ${Math.round((totalPassed / tests.length) * 100)}%`);
  
  if (totalFailed === 0) {
    console.log('🎉 Tutti i test di sicurezza sono passati!');
  } else {
    console.log('⚠️  Alcuni test sono falliti. Rivedere i fix di sicurezza.');
  }
  
  return totalFailed === 0;
}

// Esegui i test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runSecurityTests };
} else {
  // In ambiente Google Apps Script
  runSecurityTests();
}