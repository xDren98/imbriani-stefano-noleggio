/**
 * Performance Optimizer v2.0 - Advanced loading strategies
 * Implements lazy loading, resource prioritization, and caching
 */

(function() {
  'use strict';
  
  // Performance monitoring
  const perfMetrics = {
    startTime: performance.now(),
    resourceLoadTimes: new Map(),
    lazyLoadedResources: [],
    cacheHits: 0,
    cacheMisses: 0
  };

  // Resource priority mapping
  const RESOURCE_PRIORITIES = {
    CRITICAL: ['styles.css', 'bootstrap', 'fonts.googleapis'],
    HIGH: ['scripts.js', 'shared-utils.js', 'config.js'],
    MEDIUM: ['font-awesome', 'booking-submit.js'],
    LOW: ['perf-monitor.js', 'pwa/', 'analytics']
  };

  // Advanced lazy loading with Intersection Observer
  class LazyResourceLoader {
    constructor() {
      this.observers = new Map();
      this.loadedResources = new Set();
      this.init();
    }

    init() {
      // Create intersection observer for below-fold content
      this.contentObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: '50px 0px',
          threshold: 0.01
        }
      );

      // Create observer for images
      this.imageObserver = new IntersectionObserver(
        this.handleImageIntersection.bind(this),
        {
          rootMargin: '100px 0px',
          threshold: 0.001
        }
      );
    }

    handleIntersection(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          this.loadResource(element);
          this.contentObserver.unobserve(element);
        }
      });
    }

    handleImageIntersection(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImage(img);
          this.imageObserver.unobserve(img);
        }
      });
    }

    loadResource(element) {
      const resourceType = element.dataset.resourceType;
      const resourceUrl = element.dataset.resourceUrl;
      
      if (!resourceUrl || this.loadedResources.has(resourceUrl)) return;

      const startTime = performance.now();
      
      switch (resourceType) {
        case 'script':
          this.loadScript(resourceUrl, element);
          break;
        case 'stylesheet':
          this.loadStylesheet(resourceUrl, element);
          break;
        case 'module':
          this.loadModule(resourceUrl, element);
          break;
      }
      
      this.loadedResources.add(resourceUrl);
      perfMetrics.lazyLoadedResources.push({
        url: resourceUrl,
        type: resourceType,
        loadTime: performance.now() - startTime
      });
    }

    loadScript(url, element) {
      const script = document.createElement('script');
      script.src = url;
      script.async = element.dataset.async !== 'false';
      script.defer = element.dataset.defer !== 'false';
      
      if (element.dataset.module === 'true') {
        script.type = 'module';
      }
      
      script.addEventListener('load', () => {
        this.onResourceLoaded(url, 'script');
      });
      
      script.addEventListener('error', () => {
        console.warn(`Failed to load script: ${url}`);
      });
      
      document.head.appendChild(script);
    }

    loadStylesheet(url, element) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      
      // Add priority if specified
      const priority = element.dataset.priority;
      if (priority) {
        link.fetchPriority = priority;
      }
      
      link.addEventListener('load', () => {
        this.onResourceLoaded(url, 'stylesheet');
      });
      
      document.head.appendChild(link);
    }

    loadModule(url, element) {
      if ('noModule' in HTMLScriptElement.prototype) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = url;
        
        script.addEventListener('load', () => {
          this.onResourceLoaded(url, 'module');
        });
        
        document.head.appendChild(script);
      } else {
        // Fallback for browsers without module support
        this.loadScript(url, element);
      }
    }

    loadImage(img) {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.onload = () => {
          img.classList.add('loaded');
        };
      }
      
      if (img.dataset.srcset) {
        img.srcset = img.dataset.srcset;
      }
    }

    onResourceLoaded(url, type) {
      const loadTime = performance.now() - perfMetrics.startTime;
      perfMetrics.resourceLoadTimes.set(url, loadTime);
      
      // Dispatch custom event for monitoring
      window.dispatchEvent(new CustomEvent('resourceLoaded', {
        detail: { url, type, loadTime }
      }));
    }

    observe(element) {
      if (element.tagName === 'IMG') {
        this.imageObserver.observe(element);
      } else {
        this.contentObserver.observe(element);
      }
    }
  }

  // Advanced caching strategy
  class ResourceCache {
    constructor() {
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
      this.initServiceWorkerCache();
    }

    async initServiceWorkerCache() {
      if ('caches' in window) {
        try {
          this.cacheStore = await caches.open('imbriani-resources-v1');
        } catch (error) {
          console.warn('Failed to open cache:', error);
        }
      }
    }

    async get(url) {
      const cacheKey = this.generateCacheKey(url);
      
      // Check memory cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          perfMetrics.cacheHits++;
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      // Check service worker cache
      if (this.cacheStore) {
        try {
          const response = await this.cacheStore.match(url);
          if (response) {
            perfMetrics.cacheHits++;
            const data = await response.text();
            this.set(url, data, false); // Update memory cache
            return data;
          }
        } catch (error) {
          console.warn('Cache retrieval failed:', error);
        }
      }

      perfMetrics.cacheMisses++;
      return null;
    }

    set(url, data, updateServiceWorker = true) {
      const cacheKey = this.generateCacheKey(url);
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      if (updateServiceWorker && this.cacheStore) {
        this.cacheStore.put(url, new Response(data)).catch(error => {
          console.warn('Cache storage failed:', error);
        });
      }
    }

    generateCacheKey(url) {
      return `resource_${url}`;
    }

    getStats() {
      return {
        hits: perfMetrics.cacheHits,
        misses: perfMetrics.cacheMisses,
        hitRate: perfMetrics.cacheHits / (perfMetrics.cacheHits + perfMetrics.cacheMisses) || 0
      };
    }
  }

  // Priority-based resource loading
  class PriorityLoader {
    constructor() {
      this.queues = {
        critical: [],
        high: [],
        medium: [],
        low: []
      };
      this.loading = new Set();
      this.loaded = new Set();
    }

    addResource(url, priority = 'medium', type = 'script') {
      const resource = { url, type, priority, added: performance.now() };
      this.queues[priority].push(resource);
      this.processQueue();
    }

    async processQueue() {
      const priorities = ['critical', 'high', 'medium', 'low'];
      
      for (const priority of priorities) {
        const queue = this.queues[priority];
        
        while (queue.length > 0) {
          const resource = queue.shift();
          
          if (this.loading.has(resource.url) || this.loaded.has(resource.url)) {
            continue;
          }
          
          this.loading.add(resource.url);
          
          try {
            await this.loadResource(resource);
            this.loaded.add(resource.url);
          } catch (error) {
            console.warn(`Failed to load resource: ${resource.url}`, error);
          } finally {
            this.loading.delete(resource.url);
          }
        }
      }
    }

    loadResource(resource) {
      return new Promise((resolve, reject) => {
        const element = document.createElement(resource.type === 'stylesheet' ? 'link' : 'script');
        
        if (resource.type === 'stylesheet') {
          element.rel = 'stylesheet';
          element.href = resource.url;
          element.fetchPriority = resource.priority;
        } else {
          element.src = resource.url;
          element.async = resource.priority === 'low';
          element.defer = resource.priority !== 'critical';
        }
        
        element.addEventListener('load', resolve);
        element.addEventListener('error', reject);
        
        document.head.appendChild(element);
      });
    }
  }

  // Initialize performance optimizer
  const lazyLoader = new LazyResourceLoader();
  const resourceCache = new ResourceCache();
  const priorityLoader = new PriorityLoader();

  // Expose global API
  window.PerformanceOptimizer = {
    lazyLoad: lazyLoader,
    cache: resourceCache,
    priorityLoad: priorityLoader,
    metrics: perfMetrics,
    
    // Utility methods
    optimizeImages: function() {
      const images = document.querySelectorAll('img[data-src], img[data-srcset]');
      images.forEach(img => lazyLoader.observe(img));
    },
    
    lazyLoadResources: function(selector) {
      const elements = document.querySelectorAll(selector || '[data-lazy]');
      elements.forEach(el => lazyLoader.observe(el));
    },
    
    getPerformanceMetrics: function() {
      return {
        ...perfMetrics,
        cacheStats: resourceCache.getStats(),
        totalLoadTime: performance.now() - perfMetrics.startTime,
        memoryUsage: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      };
    }
  };

  // Auto-optimize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOptimization);
  } else {
    initializeOptimization();
  }

  function initializeOptimization() {
    // Optimize images
    window.PerformanceOptimizer.optimizeImages();
    
    // Lazy load non-critical resources
    window.PerformanceOptimizer.lazyLoadResources('[data-lazy]:not(img)');
    
    // Priority load critical resources
    RESOURCE_PRIORITIES.critical.forEach(pattern => {
      const elements = document.querySelectorAll(`[src*="${pattern}"], [href*="${pattern}"]`);
      elements.forEach(el => {
        if (el.tagName === 'SCRIPT') {
          priorityLoader.addResource(el.src, 'critical', 'script');
        } else if (el.tagName === 'LINK' && el.rel === 'stylesheet') {
          priorityLoader.addResource(el.href, 'critical', 'stylesheet');
        }
      });
    });
    
    console.log('🚀 Performance Optimizer initialized');
  }

  // Monitor Core Web Vitals
  function monitorWebVitals() {
    // LCP (Largest Contentful Paint)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.startTime < 4000) { // Only consider early LCP
          console.log('LCP:', entry.startTime, 'ms');
        }
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        console.log('FID:', entry.processingStart - entry.startTime, 'ms');
      }
    }).observe({ entryTypes: ['first-input'] });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          console.log('CLS:', clsValue);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Start monitoring after a delay to avoid affecting initial load
  setTimeout(monitorWebVitals, 1000);

})();