// Performance monitoring and optimization utilities

/**
 * Track page load time and report to analytics
 */
export function trackPageLoadTime() {
  // Prevent logging the same page load multiple times
  if (window.__lastPageLoadLogged && window.__lastPageLoadLogged === window.location.pathname) {
    return null;
  }

  if (window.performance && window.performance.timing) {
    // Get timing data
    const timing = window.performance.timing;

    // Calculate load times with validation to prevent negative values
    const pageLoadTime = timing.loadEventEnd > 0 && timing.navigationStart > 0
      ? timing.loadEventEnd - timing.navigationStart
      : 0;

    const domReadyTime = timing.domComplete > 0 && timing.domLoading > 0
      ? timing.domComplete - timing.domLoading
      : 0;

    const networkLatency = timing.responseEnd > 0 && timing.fetchStart > 0
      ? timing.responseEnd - timing.fetchStart
      : 0;

    // Only track if we have valid timing data
    if (pageLoadTime > 0) {
      window.__lastPageLoadLogged = window.location.pathname;
    }

    // Report to analytics only if we have valid data
    if (window.gtag && pageLoadTime > 0) {
      window.gtag('event', 'timing_complete', {
        name: 'page_load',
        value: pageLoadTime,
        event_category: 'Page Load',
        event_label: 'Full Page Load'
      });
    }

    // Return metrics for further processing
    return { pageLoadTime, domReadyTime, networkLatency };
  }
  return null;
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  // Track initial page load
  if (document.readyState === 'complete') {
    trackPageLoadTime();
  } else {
    window.addEventListener('load', trackPageLoadTime);
  }
  
  // Track route changes (for SPAs)
  if (window.history) {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function() {
      originalPushState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
    };
    
    window.history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
    };
    
    window.addEventListener('popstate', () => {
      window.dispatchEvent(new Event('locationchange'));
    });
    
    // Track route changes
    window.addEventListener('locationchange', () => {
      // Small delay to ensure new content is loaded
      setTimeout(trackPageLoadTime, 100);
    });
  }
}

/**
 * Lazy load images with intersection observer
 * @param {string} selector - CSS selector for images to lazy load
 */
export function lazyLoadImages(selector = 'img[data-src]') {
  if ('IntersectionObserver' in window) {
    const lazyImages = document.querySelectorAll(selector);
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          img.removeAttribute('data-src');
          img.removeAttribute('data-srcset');
          imageObserver.unobserve(img);
        }
      });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
  }
}

/**
 * Preload critical resources
 * @param {Array} resources - Array of resource URLs to preload
 */
export function preloadResources(resources) {
  resources.forEach(resource => {
    // Skip if no URL provided
    if (!resource || !resource.url) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.url;
    
    // Auto-detect resource type based on file extension
    const url = resource.url.toLowerCase();
    let as = resource.as || 'script';
    
    if (url.includes('.css')) {
      as = 'style';
    } else if (url.includes('.js')) {
      as = 'script';
    } else if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) {
      as = 'font';
    } else if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp') || url.includes('.svg')) {
      as = 'image';
    } else if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) {
      as = 'video';
    } else if (url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg')) {
      as = 'audio';
    } else if (url.includes('.json')) {
      as = 'fetch';
    } else {
      as = resource.as || 'script';
    }
    
    link.as = as;
    
    // Add crossorigin only if specified and for appropriate resources
    if (resource.crossorigin && (as === 'fetch' || as === 'script' || as === 'style')) {
      link.crossOrigin = resource.crossorigin;
    }
    
    // Only add if not already present to avoid duplicate warnings
    const existingLink = document.querySelector(`link[rel="preload"][href="${resource.url}"]`);
    if (!existingLink) {
      document.head.appendChild(link);
    }
  });
}

/**
 * Load non-critical CSS asynchronously
 * @param {string} href - CSS file URL
 */
export function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => { link.media = 'all'; };
  document.head.appendChild(link);
}

/**
 * Defer non-critical JavaScript
 * @param {string} src - JavaScript file URL
 * @param {Function} callback - Callback function when script loads
 */
export function deferScript(src, callback) {
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  if (callback) script.onload = callback;
  document.body.appendChild(script);
}

// Initialize performance monitoring when imported (prevent double initialization)
if (typeof window !== 'undefined' && !window.__performanceInitialized) {
  window.__performanceInitialized = true;
  initPerformanceMonitoring();
}
