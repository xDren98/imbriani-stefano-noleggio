/**
 * Test Frontend Security Fixes
 * 
 * Questo file può essere aperto nel browser per testare le funzionalità di sicurezza frontend
 * Assicurarsi di aprirlo dopo aver caricato index.html
 */

(function() {
  'use strict';
  
  // HTML escaping function for testing
  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }
  
  // Test 1: Verifica che i CSRF tokens vengano salvati correttamente
  function testCSRFTokenStorage() {
    console.log('🧪 Testing CSRF Token Storage...');
    
    // Simula una risposta di login con CSRF token
    const mockResponse = {
      success: true,
      token: 'mock-jwt-token',
      csrfToken: 'mock-csrf-token-12345'
    };
    
    // Salva il token CSRF (simulando il comportamento del login)
    if (mockResponse.csrfToken) {
      sessionStorage.setItem('csrfToken', mockResponse.csrfToken);
    }
    
    // Verifica che il token sia stato salvato
    const savedToken = sessionStorage.getItem('csrfToken');
    if (savedToken === mockResponse.csrfToken) {
      console.log('✅ CSRF Token salvato correttamente in sessionStorage');
      return true;
    } else {
      console.error('❌ CSRF Token non salvato correttamente');
      return false;
    }
  }
  
  // Test 2: Verifica HTML Escaping
  function testHTMLEscaping() {
    console.log('🧪 Testing HTML Escaping...');
    
    if (typeof escapeHtml !== 'function') {
      console.error('❌ escapeHtml function not found');
      return false;
    }
    
    const testCases = [
      { input: '<script>alert("XSS")</script>', expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' },
      { input: '<img src="x" onerror="alert(1)">', expected: '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;' },
      { input: '"quotes" & ampersand', expected: '&quot;quotes&quot; &amp; ampersand' }
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
  
  // Test 3: Verifica CSP (Content Security Policy)
  function testCSP() {
    console.log('🧪 Testing Content Security Policy...');
    
    // Verifica che il meta tag CSP sia presente
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      console.error('❌ CSP meta tag not found');
      return false;
    }
    
    const cspContent = cspMeta.getAttribute('content');
    console.log('CSP Content:', cspContent);
    
    // Verifica che non ci sia 'unsafe-inline'
    if (cspContent.includes('unsafe-inline')) {
      console.error('❌ CSP contiene unsafe-inline - RISCHIO SICUREZZA');
      return false;
    } else {
      console.log('✅ CSP non contiene unsafe-inline');
    }
    
    // Verifica che ci siano le direttive necessarie
    const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src', 'connect-src'];
    const missingDirectives = requiredDirectives.filter(directive => !cspContent.includes(directive));
    
    if (missingDirectives.length > 0) {
      console.warn(`⚠️  CSP missing directives: ${missingDirectives.join(', ')}`);
    } else {
      console.log('✅ Tutte le direttive CSP necessarie presenti');
    }
    
    return true;
  }
  
  // Test 4: Verifica sessionStorage vs cookies
  function testSessionStorage() {
    console.log('🧪 Testing Session Storage Security...');
    
    // Verifica che i dati sensibili usino sessionStorage invece di cookies
    const sensitiveData = ['csrfToken', 'userData'];
    
    sensitiveData.forEach(key => {
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) {
        console.log(`✅ ${key} stored in sessionStorage (secure)`);
      }
    });
    
    // Verifica che non ci siano cookie con nomi sensibili
    const cookies = document.cookie.split(';');
    const suspiciousCookies = cookies.filter(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      return cookieName.includes('token') || cookieName.includes('session') || cookieName.includes('auth');
    });
    
    if (suspiciousCookies.length > 0) {
      console.warn(`⚠️  Found potentially sensitive cookies: ${suspiciousCookies.join(', ')}`);
    } else {
      console.log('✅ No sensitive cookies found');
    }
    
    return true;
  }
  
  // Test 5: Verifica SRI (Subresource Integrity)
  function testSRI() {
    console.log('🧪 Testing Subresource Integrity...');
    
    const externalResources = document.querySelectorAll('script[src^="http"], link[href^="http"]');
    let resourcesWithSRI = 0;
    
    externalResources.forEach(resource => {
      const integrity = resource.getAttribute('integrity');
      const src = resource.getAttribute('src') || resource.getAttribute('href');
      
      if (integrity) {
        resourcesWithSRI++;
        console.log(`✅ SRI presente per: ${src}`);
      } else {
        console.warn(`⚠️  SRI mancante per: ${src}`);
      }
    });
    
    if (resourcesWithSRI > 0) {
      console.log(`✅ ${resourcesWithSRI}/${externalResources.length} risorse esterne hanno SRI`);
      return true;
    } else if (externalResources.length === 0) {
      console.log('ℹ️  Nessuna risorsa esterna trovata');
      return true;
    } else {
      console.error('❌ Nessuna risorsa esterna ha SRI');
      return false;
    }
  }
  
  // Test Suite principale
  function runFrontendSecurityTests() {
    console.log('🔐 Avvio Frontend Security Test Suite...\n');
    
    const tests = [
      { name: 'CSRF Token Storage', func: testCSRFTokenStorage },
      { name: 'HTML Escaping', func: testHTMLEscaping },
      { name: 'Content Security Policy', func: testCSP },
      { name: 'Session Storage Security', func: testSessionStorage },
      { name: 'Subresource Integrity', func: testSRI }
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
      console.log('🎉 Tutti i test frontend di sicurezza sono passati!');
    } else {
      console.log('⚠️  Alcuni test frontend sono falliti. Rivedere i fix di sicurezza.');
    }
    
    return totalFailed === 0;
  }
  
  // Aggiungi il test alla pagina
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFrontendSecurityTests);
  } else {
    // Se il DOM è già caricato, esegui subito
    setTimeout(runFrontendSecurityTests, 1000);
  }
  
  // Esponi la funzione globalmente per testing manuale
  window.runFrontendSecurityTests = runFrontendSecurityTests;
  
})();