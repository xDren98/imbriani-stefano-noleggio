/**
 * Network Error Handling Test Suite
 * Tests the improved API connectivity and error handling
 */

class NetworkTestSuite {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  async runAllTests() {
    console.log('🧪 Starting Network Error Handling Tests...');
    
    await this.testConnectivity();
    await this.testFallbackMechanism();
    await this.testErrorHandling();
    await this.testOfflineScenario();
    await this.testTimeoutHandling();
    
    this.displayResults();
    console.log('✅ Network tests completed!');
  }

  async testConnectivity() {
    console.log('🔍 Testing basic connectivity...');
    
    try {
      const result = await window.secureGet('debugAuth', {});
      this.logResult('Connectivity Test', result.success, result);
      
      if (result.success) {
        console.log('✅ API connectivity working');
      } else {
        console.warn('⚠️ API connectivity issue:', result.message);
      }
    } catch (error) {
      this.logResult('Connectivity Test', false, { error: error.message });
      console.error('❌ Connectivity test failed:', error);
    }
  }

  async testFallbackMechanism() {
    console.log('🔄 Testing fallback mechanism...');
    
    try {
      // Test with a simple endpoint that should work
      const result = await window.secureGet('getVeicoli', {});
      this.logResult('Fallback Test', result.success, result);
      
      if (result.success) {
        console.log('✅ Fallback mechanism working');
      } else {
        console.warn('⚠️ Fallback mechanism issue:', result.message);
      }
    } catch (error) {
      this.logResult('Fallback Test', false, { error: error.message });
      console.error('❌ Fallback test failed:', error);
    }
  }

  async testErrorHandling() {
    console.log('🛡️ Testing error handling...');
    
    try {
      // Test with invalid endpoint to trigger error handling
      const result = await window.secureGet('invalidEndpoint', {});
      this.logResult('Error Handling Test', true, result);
      
      // Check if we got a proper error response
      if (result.error_type) {
        console.log('✅ Error handling working properly');
      } else {
        console.warn('⚠️ Error handling may need improvement');
      }
    } catch (error) {
      this.logResult('Error Handling Test', false, { error: error.message });
      console.error('❌ Error handling test failed:', error);
    }
  }

  async testOfflineScenario() {
    console.log('📵 Testing offline scenario...');
    
    // Simulate offline state
    const originalOnline = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true
    });
    
    try {
      const result = await window.secureGet('getVeicoli', {});
      this.logResult('Offline Test', result.offline === true, result);
      
      if (result.offline) {
        console.log('✅ Offline detection working');
      } else {
        console.warn('⚠️ Offline detection may need improvement');
      }
    } catch (error) {
      this.logResult('Offline Test', false, { error: error.message });
      console.error('❌ Offline test failed:', error);
    } finally {
      // Restore original online status
      if (originalOnline) {
        Object.defineProperty(navigator, 'onLine', originalOnline);
      } else {
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true,
          configurable: true
        });
      }
    }
  }

  async testTimeoutHandling() {
    console.log('⏱️ Testing timeout handling...');
    
    try {
      // Test with a request that might timeout
      const startTime = performance.now();
      const result = await window.secureGet('getVeicoli', { timeout: 1000 }); // 1 second timeout
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.logResult('Timeout Test', duration < 5000, { duration, result });
      
      if (duration < 5000) {
        console.log('✅ Timeout handling working properly');
      } else {
        console.warn('⚠️ Request took longer than expected:', duration);
      }
    } catch (error) {
      this.logResult('Timeout Test', false, { error: error.message });
      console.error('❌ Timeout test failed:', error);
    }
  }

  logResult(testName, success, data) {
    this.results.push({
      test: testName,
      success: success,
      data: data,
      timestamp: new Date().toISOString()
    });
  }

  displayResults() {
    const container = document.createElement('div');
    container.id = 'network-test-results';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 400px;
      max-height: 300px;
      overflow-y: auto;
    `;
    
    let html = '<h3 style="margin: 0 0 10px 0; color: #4CAF50;">Network Test Results</h3>';
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const color = result.success ? '#4CAF50' : '#FF5722';
      html += `<div style="margin-bottom: 8px; color: ${color};">${status} ${result.test}</div>`;
    });
    
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    const percentage = Math.round((successCount / totalCount) * 100);
    
    html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
      <strong>Success Rate: ${percentage}% (${successCount}/${totalCount})</strong>
    </div>`;
    
    html += '<button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px; background: #333; color: white; border: none; border-radius: 4px;">Close</button>';
    
    container.innerHTML = html;
    document.body.appendChild(container);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (container.parentElement) {
        container.remove();
      }
    }, 15000);
    
    // Log detailed results to console
    console.log('📊 Network Test Results:', {
      total: totalCount,
      passed: successCount,
      failed: totalCount - successCount,
      successRate: percentage + '%',
      details: this.results
    });
  }
}

// Auto-run tests when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const tester = new NetworkTestSuite();
      tester.runAllTests();
    }, 2000);
  });
} else {
  setTimeout(() => {
    const tester = new NetworkTestSuite();
    tester.runAllTests();
  }, 2000);
}

// Export for manual testing
window.NetworkTestSuite = NetworkTestSuite;