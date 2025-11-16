/**
 * Advanced Performance Monitor v2.0
 * Core Web Vitals monitoring with performance optimization tracking
 */

(function() {
  'use strict';
  
  // Performance metrics storage
  const perfMetrics = {
    navigation: {},
    webVitals: {},
    resources: [],
    customMetrics: {},
    startTime: performance.now()
  };

  // Initialize performance monitoring
  function initPerformanceMonitoring() {
    try {
      // Navigation timing
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        perfMetrics.navigation = {
          dns: nav.domainLookupEnd - nav.domainLookupStart,
          tcp: nav.connectEnd - nav.connectStart,
          ttfb: nav.responseStart,
          responseTime: nav.responseEnd - nav.responseStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
          loadComplete: nav.loadEventEnd - nav.loadEventStart,
          totalLoadTime: nav.loadEventEnd - nav.fetchStart
        };
        
        console.log('[PERF] Navigation:', perfMetrics.navigation);
      }

      // Resource loading monitoring
      monitorResourceLoading();
      
      // Core Web Vitals monitoring
      monitorCoreWebVitals();
      
      // Custom performance metrics
      monitorCustomMetrics();
      
    } catch (error) {
      console.warn('[PERF] Monitoring initialization failed:', error);
    }
  }

  // Monitor resource loading with detailed tracking
  function monitorResourceLoading() {
    try {
      const resources = performance.getEntriesByType('resource');
      
      resources.forEach(resource => {
        const resourceData = {
          name: resource.name,
          type: resource.initiatorType,
          duration: resource.duration,
          size: resource.transferSize || 0,
          startTime: resource.startTime,
          responseEnd: resource.responseEnd,
          cached: resource.transferSize === 0 && resource.decodedBodySize > 0
        };
        
        perfMetrics.resources.push(resourceData);
        
        // Log slow resources
        if (resource.duration > 1000) {
          console.warn(`[PERF] Slow resource: ${resource.name} (${Math.round(resource.duration)}ms)`);
        }
      });

      // Monitor new resources
      if ('PerformanceObserver' in window) {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceData = {
                name: entry.name,
                type: entry.initiatorType,
                duration: entry.duration,
                size: entry.transferSize || 0,
                cached: entry.transferSize === 0 && entry.decodedBodySize > 0
              };
              
              console.log('[PERF] Resource loaded:', resourceData);
            }
          }
        });
        
        resourceObserver.observe({ type: 'resource', buffered: true });
      }
      
    } catch (error) {
      console.warn('[PERF] Resource monitoring failed:', error);
    }
  }

  // Monitor Core Web Vitals with detailed tracking
  function monitorCoreWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Largest Contentful Paint (LCP)
      let lcpValue = 0;
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.startTime > lcpValue) {
            lcpValue = entry.startTime;
            perfMetrics.webVitals.lcp = {
              value: lcpValue,
              element: entry.element?.tagName || 'unknown',
              size: entry.size,
              timestamp: Date.now()
            };
            
            console.log('[PERF] LCP updated:', Math.round(lcpValue), 'ms');
            
            // LCP quality assessment
            if (lcpValue < 2500) {
              console.log('%c[PERF] LCP: Good ✓', 'color: #10B981');
            } else if (lcpValue < 4000) {
              console.log('%c[PERF] LCP: Needs Improvement ⚠', 'color: #F59E0B');
            } else {
              console.log('%c[PERF] LCP: Poor ✗', 'color: #EF4444');
            }
          }
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = entry.processingStart - entry.startTime;
          perfMetrics.webVitals.fid = {
            value: fid,
            type: entry.name,
            timestamp: Date.now()
          };
          
          console.log('[PERF] FID:', Math.round(fid), 'ms');
          
          // FID quality assessment
          if (fid < 100) {
            console.log('%c[PERF] FID: Good ✓', 'color: #10B981');
          } else if (fid < 300) {
            console.log('%c[PERF] FID: Needs Improvement ⚠', 'color: #F59E0B');
          } else {
            console.log('%c[PERF] FID: Poor ✗', 'color: #EF4444');
          }
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            perfMetrics.webVitals.cls = {
              value: clsValue,
              timestamp: Date.now()
            };
            
            console.log('[PERF] CLS updated:', clsValue.toFixed(4));
            
            // CLS quality assessment
            if (clsValue < 0.1) {
              console.log('%c[PERF] CLS: Good ✓', 'color: #10B981');
            } else if (clsValue < 0.25) {
              console.log('%c[PERF] CLS: Needs Improvement ⚠', 'color: #F59E0B');
            } else {
              console.log('%c[PERF] CLS: Poor ✗', 'color: #EF4444');
            }
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            perfMetrics.webVitals.fcp = {
              value: entry.startTime,
              timestamp: Date.now()
            };
            
            console.log('[PERF] FCP:', Math.round(entry.startTime), 'ms');
            
            // FCP quality assessment
            if (entry.startTime < 1800) {
              console.log('%c[PERF] FCP: Good ✓', 'color: #10B981');
            } else if (entry.startTime < 3000) {
              console.log('%c[PERF] FCP: Needs Improvement ⚠', 'color: #F59E0B');
            } else {
              console.log('%c[PERF] FCP: Poor ✗', 'color: #EF4444');
            }
          }
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

    } catch (error) {
      console.warn('[PERF] Core Web Vitals monitoring failed:', error);
    }
  }

  // Monitor custom performance metrics
  function monitorCustomMetrics() {
    try {
      // Time to Interactive (TTI) approximation
      let ttiMeasured = false;
      
      function measureTTI() {
        if (ttiMeasured) return;
        
        // Simple TTI measurement: DOM ready + 5 seconds without long tasks
        const domReady = performance.timing.domContentLoadedEventEnd;
        const currentTime = performance.now();
        
        if (currentTime - domReady > 5000) {
          perfMetrics.customMetrics.tti = currentTime;
          console.log('[PERF] TTI (approx):', Math.round(currentTime), 'ms');
          ttiMeasured = true;
        }
      }
      
      // Measure TTI after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(measureTTI, 5000);
        });
      } else {
        setTimeout(measureTTI, 5000);
      }

      // Monitor long tasks
      if ('PerformanceObserver' in window && 'longtask' in PerformanceObserver.supportedEntryTypes) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.warn(`[PERF] Long task detected: ${entry.duration}ms`);
          }
        });
        longTaskObserver.observe({ type: 'longtask', buffered: true });
      }

    } catch (error) {
      console.warn('[PERF] Custom metrics monitoring failed:', error);
    }
  }

  // Performance report generator
  function generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metrics: {
        navigation: perfMetrics.navigation,
        webVitals: perfMetrics.webVitals,
        resources: {
          total: perfMetrics.resources.length,
          slow: perfMetrics.resources.filter(r => r.duration > 1000).length,
          cached: perfMetrics.resources.filter(r => r.cached).length
        },
        custom: perfMetrics.customMetrics
      },
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };

    console.log('[PERF] Performance Report:', report);
    return report;
  }

  // Initialize monitoring
  initPerformanceMonitoring();

  // Expose API
  window.PerformanceMonitor = {
    getMetrics: () => perfMetrics,
    generateReport: generatePerformanceReport,
    getResourceStats: () => ({
      total: perfMetrics.resources.length,
      slow: perfMetrics.resources.filter(r => r.duration > 1000).length,
      cached: perfMetrics.resources.filter(r => r.cached).length,
      averageLoadTime: perfMetrics.resources.reduce((acc, r) => acc + r.duration, 0) / perfMetrics.resources.length
    }),
    exportData: () => JSON.stringify(perfMetrics, null, 2)
  };

  // Generate report after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      generatePerformanceReport();
    }, 3000);
  });

  // Monitor performance continuously
  setInterval(() => {
    if (performance.now() - perfMetrics.startTime < 30000) { // Monitor for 30 seconds
      const currentLCP = perfMetrics.webVitals.lcp?.value || 0;
      const currentFID = perfMetrics.webVitals.fid?.value || 0;
      const currentCLS = perfMetrics.webVitals.cls?.value || 0;
      
      // Alert if metrics are poor
      if (currentLCP > 4000 || currentFID > 300 || currentCLS > 0.25) {
        console.warn('[PERF] Poor performance metrics detected');
      }
    }
  }, 5000);

})();

