// Enhanced Resource Preloader for Critical Assets
// Targets: 0.6-1 second for Phase 2, 0.35-0.6 seconds for Phase 3

class ResourcePreloader {
  constructor() {
    this.preloadedResources = new Set();
    this.preloadQueue = [];
    this.isPreloading = false;
    this.criticalResources = [
      '/',
      '/static/js/bundle.js',
      '/static/css/main.css',
      '/manifest.json'
    ];
    this.importantImages = [
      '/images/logo.png',
      '/images/favicon.ico',
      '/images/placeholder.jpg'
    ];
  }

  // Initialize preloading on page load
  async initialize() {
    console.log('[ResourcePreloader] Initializing...');
    
    // Preload critical resources immediately
    await this.preloadCriticalResources();
    
    // Preload homepage data
    await this.preloadHomepageData();
    
    // Setup intersection observer for lazy preloading
    this.setupLazyPreloading();
    
    // Setup connection-based preloading
    this.setupConnectionBasedPreloading();
  }

  // Preload critical resources for instant rendering
  async preloadCriticalResources() {
    console.log('[ResourcePreloader] Preloading critical resources...');
    
    const criticalPromises = [
      // Critical CSS
      this.preloadCSS('/static/css/main.css'),
      
      // Critical JavaScript
      this.preloadScript('/static/js/bundle.js'),
      
      // Manifest
      this.preloadResource('/manifest.json', 'fetch'),
      
      // Critical images
      ...this.importantImages.map(img => this.preloadImage(img))
    ];

    try {
      await Promise.allSettled(criticalPromises);
      console.log('[ResourcePreloader] Critical resources preloaded');
    } catch (error) {
      console.warn('[ResourcePreloader] Some critical resources failed to preload:', error);
    }
  }

  // Preload homepage data for instant display
  async preloadHomepageData() {
    console.log('[ResourcePreloader] Preloading homepage data...');
    
    try {
      // Preload ultra-fast endpoints
      const homepagePromises = [
        this.preloadAPI('/api/ultra-fast/homepage'),
        this.preloadAPI('/api/ultra-fast/batch'),
        this.preloadAPI('/api/categories'),
        this.preloadAPI('/api/hero-promotions/active')
      ];

      const results = await Promise.allSettled(homepagePromises);
      
      // Log results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`[ResourcePreloader] ✅ Preloaded: ${['homepage', 'batch', 'categories', 'hero-promotions'][index]}`);
        } else {
          console.warn(`[ResourcePreloader] ❌ Failed to preload: ${['homepage', 'batch', 'categories', 'hero-promotions'][index]}`);
        }
      });

    } catch (error) {
      console.warn('[ResourcePreloader] Homepage data preload failed:', error);
    }
  }

  // Preload API endpoint
  async preloadAPI(endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-Preload': 'true'
        }
      });
      
      if (response.ok) {
        // Cache the response in memory for immediate use
        const data = await response.json();
        this.cacheResponse(endpoint, data);
        return data;
      }
    } catch (error) {
      console.warn(`[ResourcePreloader] Failed to preload API ${endpoint}:`, error);
      throw error;
    }
  }

  // Preload CSS file
  preloadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = 'style';
      link.onload = () => {
        console.log(`[ResourcePreloader] ✅ CSS preloaded: ${href}`);
        resolve();
      };
      link.onerror = () => {
        console.warn(`[ResourcePreloader] ❌ CSS preload failed: ${href}`);
        reject(new Error(`Failed to preload CSS: ${href}`));
      };
      document.head.appendChild(link);
    });
  }

  // Preload JavaScript file
  preloadScript(src) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = src;
      link.as = 'script';
      link.onload = () => {
        console.log(`[ResourcePreloader] ✅ Script preloaded: ${src}`);
        resolve();
      };
      link.onerror = () => {
        console.warn(`[ResourcePreloader] ❌ Script preload failed: ${src}`);
        reject(new Error(`Failed to preload script: ${src}`));
      };
      document.head.appendChild(link);
    });
  }

  // Preload generic resource
  preloadResource(href, type = 'fetch') {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = type;
      link.onload = () => {
        console.log(`[ResourcePreloader] ✅ Resource preloaded: ${href}`);
        resolve();
      };
      link.onerror = () => {
        console.warn(`[ResourcePreloader] ❌ Resource preload failed: ${href}`);
        reject(new Error(`Failed to preload resource: ${href}`));
      };
      document.head.appendChild(link);
    });
  }

  // Preload image with optimization
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log(`[ResourcePreloader] ✅ Image preloaded: ${src}`);
        resolve();
      };
      img.onerror = () => {
        console.warn(`[ResourcePreloader] ❌ Image preload failed: ${src}`);
        reject(new Error(`Failed to preload image: ${src}`));
      };
      img.src = src;
    });
  }

  // Setup intersection observer for lazy preloading
  setupLazyPreloading() {
    if (!('IntersectionObserver' in window)) {
      console.log('[ResourcePreloader] IntersectionObserver not supported, skipping lazy preloading');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const resourceUrl = element.dataset.preload;
          
          if (resourceUrl && !this.preloadedResources.has(resourceUrl)) {
            this.preloadResource(resourceUrl).then(() => {
              this.preloadedResources.add(resourceUrl);
            });
          }
        }
      });
    }, {
      rootMargin: '200px 0px', // Start loading 200px before entering viewport
      threshold: 0.1
    });

    // Observe all elements with data-preload attribute
    document.querySelectorAll('[data-preload]').forEach(element => {
      observer.observe(element);
    });

    console.log('[ResourcePreloader] Lazy preloading setup complete');
  }

  // Setup connection-based preloading
  setupConnectionBasedPreloading() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      // Adjust preloading strategy based on connection
      if (connection.effectiveType === '4g') {
        console.log('[ResourcePreloader] Fast connection detected, aggressive preloading enabled');
        this.aggressivePreload();
      } else if (connection.effectiveType === '3g') {
        console.log('[ResourcePreloader] Medium connection detected, moderate preloading enabled');
        this.moderatePreload();
      } else {
        console.log('[ResourcePreloader] Slow connection detected, minimal preloading enabled');
        this.minimalPreload();
      }

      // Listen for connection changes
      connection.addEventListener('change', () => {
        console.log('[ResourcePreloader] Connection changed to:', connection.effectiveType);
        this.adjustPreloadingStrategy(connection.effectiveType);
      });
    }
  }

  // Aggressive preloading for fast connections
  async aggressivePreload() {
    console.log('[ResourcePreloader] Starting aggressive preloading...');
    
    const additionalResources = [
      '/api/services',
      '/api/products?page=1&limit=20',
      '/images/category-electronics.png',
      '/images/category-food.png',
      '/images/category-books.png'
    ];

    const preloadPromises = additionalResources.map(resource => 
      this.preloadResource(resource, this.getResourceType(resource))
    );

    try {
      await Promise.allSettled(preloadPromises);
      console.log('[ResourcePreloader] Aggressive preloading complete');
    } catch (error) {
      console.warn('[ResourcePreloader] Some aggressive preloading failed:', error);
    }
  }

  // Moderate preloading for medium connections
  async moderatePreload() {
    console.log('[ResourcePreloader] Starting moderate preloading...');
    
    const essentialResources = [
      '/api/services',
      '/images/category-electronics.png'
    ];

    const preloadPromises = essentialResources.map(resource => 
      this.preloadResource(resource, this.getResourceType(resource))
    );

    try {
      await Promise.allSettled(preloadPromises);
      console.log('[ResourcePreloader] Moderate preloading complete');
    } catch (error) {
      console.warn('[ResourcePreloader] Some moderate preloading failed:', error);
    }
  }

  // Minimal preloading for slow connections
  async minimalPreload() {
    console.log('[ResourcePreloader] Starting minimal preloading...');
    
    // Only preload most essential resources
    try {
      await this.preloadAPI('/api/services');
      console.log('[ResourcePreloader] Minimal preloading complete');
    } catch (error) {
      console.warn('[ResourcePreloader] Minimal preloading failed:', error);
    }
  }

  // Adjust preloading strategy based on connection
  adjustPreloadingStrategy(connectionType) {
    switch (connectionType) {
      case '4g':
        this.aggressivePreload();
        break;
      case '3g':
        this.moderatePreload();
        break;
      default:
        this.minimalPreload();
    }
  }

  // Get resource type for preloading
  getResourceType(url) {
    if (url.includes('.css')) return 'style';
    if (url.includes('.js')) return 'script';
    if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) return 'font';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) return 'image';
    if (url.includes('/api/')) return 'fetch';
    return 'script';
  }

  // Cache API responses in memory for instant access
  cacheResponse(endpoint, data) {
    if (!this.responseCache) {
      this.responseCache = new Map();
    }
    
    this.responseCache.set(endpoint, {
      data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });
    
    console.log(`[ResourcePreloader] Cached API response: ${endpoint}`);
  }

  // Get cached response
  getCachedResponse(endpoint) {
    if (!this.responseCache) return null;
    
    const cached = this.responseCache.get(endpoint);
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.responseCache.delete(endpoint);
      return null;
    }
    
    return cached.data;
  }

  // Preload images for categories and products
  async preloadProductImages(products) {
    console.log('[ResourcePreloader] Preloading product images...');
    
    const imageUrls = products
      .map(product => product.coverImage || (product.images && product.images[0]))
      .filter(Boolean)
      .slice(0, 10); // Limit to first 10 images
    
    const imagePromises = imageUrls.map(url => this.preloadImage(url));
    
    try {
      await Promise.allSettled(imagePromises);
      console.log(`[ResourcePreloader] Preloaded ${imageUrls.length} product images`);
    } catch (error) {
      console.warn('[ResourcePreloader] Some product images failed to preload:', error);
    }
  }

  // Clear preloaded resources
  clearPreloadedResources() {
    this.preloadedResources.clear();
    if (this.responseCache) {
      this.responseCache.clear();
    }
    console.log('[ResourcePreloader] Cleared preloaded resources');
  }

  // Get preloading statistics
  getStats() {
    return {
      preloadedResources: this.preloadedResources.size,
      cachedResponses: this.responseCache ? this.responseCache.size : 0,
      isPreloading: this.isPreloading,
      preloadQueue: this.preloadQueue.length
    };
  }
}

// Create singleton instance
const resourcePreloader = new ResourcePreloader();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    resourcePreloader.initialize();
  });
} else {
  resourcePreloader.initialize();
}

// Export for use in components
export { resourcePreloader as default };

// Export utility functions for manual use
export {
  preloadResource,
  preloadImage,
  preloadAPI,
  getCachedResponse,
  preloadProductImages
};