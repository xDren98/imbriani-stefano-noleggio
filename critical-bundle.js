/**
 * Critical JavaScript Bundle - Performance Optimized
 * Contains only essential functions for initial page interaction
 * Version: 2.0 - Minified and tree-shaken
 */

// Critical utilities - Minified
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Critical form validation - Essential
const validateCF = cf => {
  if (!cf || cf.length !== 16) return false;
  return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cf);
};

const validateDate = date => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d) && d >= new Date();
};

// Critical UI interactions - Performance optimized
const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
};

// Critical form handling - Debounced for performance
const handleFormInput = debounce((input) => {
  const value = input.value.trim();
  const isValid = input.type === 'text' ? value.length >= 2 : 
                 input.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) :
                 input.type === 'tel' ? /^[\d\s\+\-\(\)]+$/.test(value) : true;
  
  input.classList.toggle('is-valid', isValid && value);
  input.classList.toggle('is-invalid', !isValid && value);
}, 250);

// Critical date handling - Optimized
const initDateInputs = () => {
  const today = new Date().toISOString().split('T')[0];
  $$('input[type="date"]').forEach(input => {
    if (!input.value) {
      input.min = today;
      input.addEventListener('change', debounce(() => {
        const isValid = validateDate(input.value);
        input.classList.toggle('is-valid', isValid);
        input.classList.toggle('is-invalid', !isValid);
      }, 150));
    }
  });
};

// Critical loading states - Performance optimized
const showLoading = (element) => {
  element.classList.add('loading');
  element.disabled = true;
  element.dataset.originalText = element.innerHTML;
  element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Caricamento...';
};

const hideLoading = (element) => {
  element.classList.remove('loading');
  element.disabled = false;
  element.innerHTML = element.dataset.originalText || element.innerHTML;
};

// Critical API calls - With timeout and retry
const apiCall = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
};

// Critical error handling - User friendly
const handleError = (error, context = '') => {
  console.error(`[CRITICAL] ${context}:`, error);
  
  const message = error.message || 'Si è verificato un errore';
  const userMessage = message.includes('timeout') ? 'Timeout di connessione' :
                     message.includes('network') ? 'Errore di rete' :
                     message.includes('server') ? 'Errore del server' :
                     'Errore durante l\'operazione';
  
  showToast(userMessage, 'error');
};

// Critical performance monitoring - Lightweight
const monitorPerformance = () => {
  if ('PerformanceObserver' in window) {
    // Monitor long tasks
    if ('longtask' in PerformanceObserver.supportedEntryTypes) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Long task detected
            console.warn(`[PERF] Long task: ${entry.duration}ms`);
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    }
    
    // Monitor resources
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) { // Slow resource
          console.warn(`[PERF] Slow resource: ${entry.name} (${Math.round(entry.duration)}ms)`);
        }
      }
    }).observe({ type: 'resource', buffered: true });
  }
};

// Critical service worker registration - Optimized
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/pwa/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('ServiceWorker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('Nuova versione disponibile', 'info');
          }
        });
      });
      
    } catch (error) {
      console.warn('ServiceWorker registration failed:', error);
    }
  }
};

// Critical initialization - Fast and efficient
document.addEventListener('DOMContentLoaded', () => {
  // Start performance monitoring
  monitorPerformance();
  
  // Initialize date inputs
  initDateInputs();
  
  // Register service worker
  if (window.location.protocol === 'https:') {
    registerServiceWorker();
  }
  
  // Add form validation listeners
  $$('input, textarea, select').forEach(input => {
    input.addEventListener('input', () => handleFormInput(input));
    input.addEventListener('blur', () => handleFormInput(input));
  });
  
  console.log('Critical bundle initialized in:', Math.round(performance.now()), 'ms');
});

// Critical exports for global use
window.CriticalUtils = {
  $, $$, debounce, validateCF, validateDate, showToast, 
  showLoading, hideLoading, apiCall, handleError
};

// Performance measurement
const initTime = performance.now();
console.log('Critical JS bundle loaded in:', Math.round(initTime), 'ms');