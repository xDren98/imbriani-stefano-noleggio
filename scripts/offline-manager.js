/**
 * Offline Detection and Indicator
 * Shows user-friendly offline status and handles offline scenarios
 */

class OfflineManager {
  constructor() {
    this.isOffline = !navigator.onLine;
    this.indicator = null;
    this.init();
  }

  init() {
    // Create offline indicator
    this.createOfflineIndicator();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Check initial state
    if (this.isOffline) {
      this.showOfflineIndicator();
    }
    
    // Monitor connection status periodically
    this.startConnectionMonitoring();
  }

  createOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff6b6b;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
      z-index: 10000;
      display: none;
      align-items: center;
      gap: 8px;
      animation: slideDown 0.3s ease-out;
    `;
    
    indicator.innerHTML = `
      <i class="fas fa-wifi-slash"></i>
      <span>Sei offline. Alcune funzionalità potrebbero non essere disponibili.</span>
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        to {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
      }
      
      .offline-indicator.offline {
        display: flex;
      }
      
      .offline-indicator.online {
        animation: slideUp 0.3s ease-out;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(indicator);
    this.indicator = indicator;
  }

  showOfflineIndicator() {
    if (this.indicator) {
      this.indicator.classList.remove('online');
      this.indicator.classList.add('offline');
      this.indicator.style.display = 'flex';
    }
    
    // Show toast notification
    if (window.showToast) {
      window.showToast('Connessione persa. Modalità offline attivata.', 'warning');
    }
  }

  hideOfflineIndicator() {
    if (this.indicator) {
      this.indicator.classList.remove('offline');
      this.indicator.classList.add('online');
      
      setTimeout(() => {
        this.indicator.style.display = 'none';
        this.indicator.classList.remove('online');
      }, 300);
    }
    
    // Show toast notification
    if (window.showToast) {
      window.showToast('Connessione ristabilita!', 'success');
    }
  }

  handleOnline() {
    console.log('📶 Connection restored');
    this.isOffline = false;
    this.hideOfflineIndicator();
    
    // Retry failed requests
    this.retryFailedRequests();
  }

  handleOffline() {
    console.log('📵 Connection lost');
    this.isOffline = true;
    this.showOfflineIndicator();
  }

  startConnectionMonitoring() {
    // Check connection every 30 seconds
    setInterval(() => {
      this.checkConnectionStatus();
    }, 30000);
  }

  async checkConnectionStatus() {
    try {
      // Try to fetch a small resource to test connectivity
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        signal: controller.signal
      });
      
      if (this.isOffline && navigator.onLine) {
        this.handleOnline();
      }
    } catch (error) {
      if (!this.isOffline && !navigator.onLine) {
        this.handleOffline();
      }
    }
  }

  retryFailedRequests() {
    // This could be implemented to retry failed API calls
    console.log('🔄 Retrying failed requests...');
    
    // Example: Retry getting vehicles data
    if (window.secureGet) {
      window.secureGet('getVeicoli', {})
        .then(response => {
          if (response.success) {
            console.log('✅ Successfully retried getVeicoli');
          }
        })
        .catch(error => {
          console.warn('❌ Retry failed for getVeicoli:', error);
        });
    }
  }

  getConnectionStatus() {
    return {
      online: navigator.onLine,
      offline: this.isOffline,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize offline manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.offlineManager = new OfflineManager();
  });
} else {
  window.offlineManager = new OfflineManager();
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OfflineManager };
}