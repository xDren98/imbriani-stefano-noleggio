// Advanced Caching Configuration
const CACHE_CONFIG = {
  STATIC_CACHE: 'imbriani-static-v1',
  IMAGE_CACHE: 'imbriani-images-v1',
  API_CACHE: 'imbriani-api-v1',
  
  DURATIONS: {
    STATIC: 30 * 24 * 60 * 60,    // 30 days
    IMAGES: 30 * 24 * 60 * 60,   // 30 days
    API: 5 * 60                   // 5 minutes
  }
};

// Export for use in service worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CACHE_CONFIG };
}