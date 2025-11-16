/**
 * Image Optimization System
 * Converts images to WebP format with PNG/JPEG fallbacks
 * Provides lazy loading and responsive image generation
 */

class ImageOptimizer {
  constructor() {
    this.webpSupported = this.checkWebPSupport();
    this.lazyImages = new Set();
    this.observer = null;
  }

  /**
   * Check if browser supports WebP format
   */
  checkWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Initialize lazy loading for images
   */
  initLazyLoading() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });
    }
  }

  /**
   * Load image with WebP/PNG fallback
   */
  loadImage(img) {
    const src = img.dataset.src;
    const webpSrc = img.dataset.webp;
    const fallbackSrc = img.dataset.fallback;

    if (!src && !webpSrc && !fallbackSrc) return;

    // Use WebP if supported, otherwise fallback
    const imageSrc = this.webpSupported && webpSrc ? webpSrc : (src || fallbackSrc);
    
    // Create new image to preload
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = imageSrc;
      img.classList.add('loaded');
      this.trackImageLoad(img);
    };
    tempImg.onerror = () => {
      // Fallback chain
      if (imageSrc === webpSrc && fallbackSrc) {
        tempImg.src = fallbackSrc;
      } else if (imageSrc === src && fallbackSrc) {
        tempImg.src = fallbackSrc;
      }
    };
    tempImg.src = imageSrc;
  }

  /**
   * Track image loading performance
   */
  trackImageLoad(img) {
    if (window.perfMetrics) {
      const loadTime = performance.now() - img.dataset.loadStart;
      window.perfMetrics.addCustomMetric(`img_${img.alt || 'unnamed'}`, loadTime);
    }
  }

  /**
   * Optimize all images in the document
   */
  optimizeImages() {
    const images = document.querySelectorAll('img[data-src], img[data-webp]');
    
    images.forEach(img => {
      // Add loading attribute for browser-level lazy loading
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Add fetchpriority for important images
      if (img.classList.contains('hero-image') || img.classList.contains('logo')) {
        img.setAttribute('fetchpriority', 'high');
      }

      // Set load start time for tracking
      img.dataset.loadStart = performance.now();

      if (this.observer) {
        this.observer.observe(img);
        this.lazyImages.add(img);
      } else {
        // Fallback for browsers without IntersectionObserver
        this.loadImage(img);
      }
    });
  }

  /**
   * Generate responsive image set
   */
  generateResponsiveImage(baseSrc, widths = [320, 640, 768, 1024, 1280]) {
    const srcset = widths.map(width => {
      const webpSrc = this.generateWebPSrc(baseSrc, width);
      const fallbackSrc = this.generateFallbackSrc(baseSrc, width);
      return {
        webp: `${webpSrc} ${width}w`,
        fallback: `${fallbackSrc} ${width}w`
      };
    });

    return {
      webpSrcset: srcset.map(s => s.webp).join(', '),
      fallbackSrcset: srcset.map(s => s.fallback).join(', ')
    };
  }

  /**
   * Generate WebP source path
   */
  generateWebPSrc(originalSrc, width) {
    const ext = originalSrc.split('.').pop();
    const baseName = originalSrc.replace(/\.[^/.]+$/, "");
    return `${baseName}-${width}w.webp`;
  }

  /**
   * Generate fallback source path
   */
  generateFallbackSrc(originalSrc, width) {
    const ext = originalSrc.split('.').pop();
    const baseName = originalSrc.replace(/\.[^/.]+$/, "");
    return `${baseName}-${width}w.${ext}`;
  }

  /**
   * Create optimized picture element
   */
  createPictureElement(config) {
    const picture = document.createElement('picture');
    
    // WebP source
    if (config.webpSrc) {
      const webpSource = document.createElement('source');
      webpSource.srcset = config.webpSrc;
      webpSource.type = 'image/webp';
      if (config.media) webpSource.media = config.media;
      picture.appendChild(webpSource);
    }

    // Fallback source
    if (config.fallbackSrc) {
      const fallbackSource = document.createElement('source');
      fallbackSource.srcset = config.fallbackSrc;
      fallbackSource.type = config.fallbackType || 'image/png';
      if (config.media) fallbackSource.media = config.media;
      picture.appendChild(fallbackSource);
    }

    // Default img element
    const img = document.createElement('img');
    img.src = config.defaultSrc || config.fallbackSrc || config.webpSrc;
    img.alt = config.alt || '';
    img.loading = 'lazy';
    
    if (config.className) img.className = config.className;
    if (config.width) img.width = config.width;
    if (config.height) img.height = config.height;

    picture.appendChild(img);
    return picture;
  }

  /**
   * Batch optimize images with service worker
   */
  async batchOptimize() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Send optimization request to service worker
        registration.active.postMessage({
          type: 'OPTIMIZE_IMAGES',
          images: Array.from(this.lazyImages).map(img => ({
            src: img.src,
            webp: img.dataset.webp,
            fallback: img.dataset.fallback
          }))
        });
      } catch (error) {
        console.warn('Service Worker optimization failed:', error);
      }
    }
  }

  /**
   * Initialize the optimizer
   */
  init() {
    this.initLazyLoading();
    this.optimizeImages();
    
    // Batch optimization after page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.batchOptimize());
    } else {
      this.batchOptimize();
    }
  }
}

// Performance-optimized image loading
function optimizeImageLoading() {
  const optimizer = new ImageOptimizer();
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => optimizer.init());
  } else {
    optimizer.init();
  }

  // Expose to global scope for debugging
  window.imageOptimizer = optimizer;
}

// Auto-initialize
optimizeImageLoading();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImageOptimizer, optimizeImageLoading };
}