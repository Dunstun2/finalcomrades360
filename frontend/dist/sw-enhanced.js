// Enhanced Service Worker for Comrades360 Homepage Performance Optimization
const CACHE_NAME = 'comrades360-v2.0.0';
const API_CACHE_NAME = 'comrades360-api-v2.0.0';
const IMAGE_CACHE_NAME = 'comrades360-images-v2.0.0';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  homepageLoadTime: 600, // 0.6 seconds
  apiResponseTime: 200, // 0.2 seconds
  imageLoadTime: 300 // 0.3 seconds
};

// Assets to cache immediately for instant loading
const CRITICAL_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// API endpoints with different caching strategies
const API_ENDPOINTS = {
  // Network first for critical APIs
  networkFirst: [
    '/api/ultra-fast/homepage',
    '/api/ultra-fast/batch',
    '/api/ultra-fast/homepage',
    '/api/products'
  ],
  
  // Cache first for static data
  cacheFirst: [
    '/api/categories',
    '/api/hero-promotions/active'
  ],
  
  // Stale while revalidate for frequently updated data
  staleWhileRevalidate: [
    '/api/services'
  ]
};

// Cache first strategy for static assets
const STATIC_CACHE_FIRST = [
  '/images/',
  '/static/',
  '/fonts/',
  '/icons/'
];

// Network first strategy for dynamic content
const NETWORK_FIRST = [
  '/api/ultra-fast/',
  '/api/products/',
  '/api/cart/',
  '/api/orders/'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing enhanced service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache critical assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      
      // Pre-warm API cache with critical endpoints
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-warming API cache');
        return Promise.allSettled(
          API_ENDPOINTS.networkFirst.map(endpoint => 
            fetch(endpoint)
              .then(response => {
                if (response.ok) {
                  cache.put(endpoint, response.clone());
                  console.log(`[SW] Pre-cached API: ${endpoint}`);
                }
              })
              .catch(err => console.log(`[SW] Failed to pre-cache ${endpoint}:`, err))
          )
        );
      }),
      
      // Initialize image cache
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        console.log('[SW] Image cache initialized');
      })
    ]).then(() => {
      console.log('[SW] Enhanced service worker installed successfully');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating enhanced service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              !cacheName.includes('v2.0.0') && 
              cacheName.startsWith('comrades360-')
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all clients
      self.clients.claim(),
      
      // Initialize performance monitoring
      initPerformanceMonitoring()
    ]).then(() => {
      console.log('[SW] Enhanced service worker activated');
    })
  );
});

// Enhanced fetch handler with performance tracking
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Add performance tracking
  const startTime = performance.now();
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request, startTime));
    return;
  }
  
  if (STATIC_CACHE_FIRST.some(asset => url.pathname.startsWith(asset))) {
    event.respondWith(handleStaticAsset(request, startTime));
    return;
  }
  
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(handleImageRequest(request, startTime));
    return;
  }
  
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, startTime));
    return;
  }
});

// Enhanced API request handler
async function handleApiRequest(request, startTime) {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  try {
    // Determine caching strategy
    if (API_ENDPOINTS.networkFirst.some(path => endpoint.includes(path))) {
      return await networkFirstWithPerformance(request, API_CACHE_NAME, startTime);
    } else if (API_ENDPOINTS.cacheFirst.some(path => endpoint.includes(path))) {
      return await cacheFirstWithPerformance(request, API_CACHE_NAME, startTime);
    } else if (API_ENDPOINTS.staleWhileRevalidate.some(path => endpoint.includes(path))) {
      return await staleWhileRevalidate(request, API_CACHE_NAME, startTime);
    }
    
    // Default to network first
    return await networkFirstWithPerformance(request, API_CACHE_NAME, startTime);
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    console.log(`[SW] API request failed for ${endpoint}:`, error, `(${responseTime.toFixed(2)}ms)`);
    
    // Try cache fallback
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This content is not available offline',
        cached: false,
        responseTime: `${responseTime.toFixed(2)}ms`
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`
        }
      }
    );
  }
}

// Network first with performance tracking
async function networkFirstWithPerformance(request, cacheName, startTime) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    const responseTime = performance.now() - startTime;
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      
      // Performance monitoring
      trackApiPerformance(request.url, responseTime, 'network');
      console.log(`[SW] Network first: cached response for ${request.url} (${responseTime.toFixed(2)}ms)`);
    }
    
    return networkResponse;
  } catch (error) {
    const responseTime = performance.now() - startTime;
    console.log(`[SW] Network failed, trying cache for ${request.url} (${responseTime.toFixed(2)}ms)`);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      trackApiPerformance(request.url, responseTime, 'cache');
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache first with performance tracking
async function cacheFirstWithPerformance(request, cacheName, startTime) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const responseTime = performance.now() - startTime;
    console.log(`[SW] Cache first: serving from cache ${request.url} (${responseTime.toFixed(2)}ms)`);
    
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
        console.log(`[SW] Cache first: updated cache for ${request.url}`);
      }
    }).catch(() => {
      // Ignore fetch errors for background updates
    });
    
    trackApiPerformance(request.url, responseTime, 'cache');
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      const responseTime = performance.now() - startTime;
      console.log(`[SW] Cache first: fetched and cached ${request.url} (${responseTime.toFixed(2)}ms)`);
      trackApiPerformance(request.url, responseTime, 'network');
    }
    return networkResponse;
  } catch (error) {
    const responseTime = performance.now() - startTime;
    trackApiPerformance(request.url, responseTime, 'error');
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName, startTime) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      const responseTime = performance.now() - startTime;
      console.log(`[SW] Stale while revalidate: updated cache for ${request.url} (${responseTime.toFixed(2)}ms)`);
      trackApiPerformance(request.url, responseTime, 'network');
    }
    return networkResponse;
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    const responseTime = performance.now() - startTime;
    trackApiPerformance(request.url, responseTime, 'cache');
    fetchPromise.catch(() => {}); // Suppress unhandled promise rejection
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

// Handle static assets
async function handleStaticAsset(request, startTime) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const responseTime = performance.now() - startTime;
    console.log(`[SW] Static asset: serving from cache ${request.url} (${responseTime.toFixed(2)}ms)`);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      const responseTime = performance.now() - startTime;
      console.log(`[SW] Static asset: fetched and cached ${request.url} (${responseTime.toFixed(2)}ms)`);
    }
    return networkResponse;
  } catch (error) {
    console.error(`[SW] Failed to fetch static asset ${request.url}:`, error);
    throw error;
  }
}

// Handle image requests with optimization
async function handleImageRequest(request, startTime) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const responseTime = performance.now() - startTime;
    console.log(`[SW] Image: serving from cache ${request.url} (${responseTime.toFixed(2)}ms)`);
    
    // Track image performance
    if (responseTime > PERFORMANCE_THRESHOLDS.imageLoadTime) {
      console.warn(`[SW] Slow image load: ${request.url} took ${responseTime.toFixed(2)}ms`);
    }
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      const responseTime = performance.now() - startTime;
      console.log(`[SW] Image: fetched and cached ${request.url} (${responseTime.toFixed(2)}ms)`);
      
      // Track performance
      if (responseTime > PERFORMANCE_THRESHOLDS.imageLoadTime) {
        console.warn(`[SW] Slow image fetch: ${request.url} took ${responseTime.toFixed(2)}ms`);
      }
    }
    return networkResponse;
  } catch (error) {
    console.error(`[SW] Failed to fetch image ${request.url}:`, error);
    throw error;
  }
}

// Handle navigation requests
async function handleNavigation(request, startTime) {
  try {
    const networkResponse = await fetch(request);
    const responseTime = performance.now() - startTime;
    
    // Track navigation performance
    if (responseTime > PERFORMANCE_THRESHOLDS.homepageLoadTime) {
      console.warn(`[SW] Slow navigation: ${request.url} took ${responseTime.toFixed(2)}ms`);
    }
    
    return networkResponse;
  } catch (error) {
    const responseTime = performance.now() - startTime;
    console.log(`[SW] Navigation failed, trying cache for ${request.url} (${responseTime.toFixed(2)}ms)`);
    
    // Fallback to cached index.html
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return enhanced offline page
    return new Response(getOfflinePage(), {
      headers: { 
        'Content-Type': 'text/html',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`
      }
    });
  }
}

// Performance tracking
function trackApiPerformance(url, responseTime, source) {
  if (responseTime > PERFORMANCE_THRESHOLDS.apiResponseTime) {
    console.warn(`[SW] Slow API response: ${url} took ${responseTime.toFixed(2)}ms from ${source}`);
  }
  
  // Store performance metrics (could be sent to analytics)
  if (!self.performanceMetrics) {
    self.performanceMetrics = [];
  }
  
  self.performanceMetrics.push({
    url,
    responseTime: Math.round(responseTime),
    source,
    timestamp: Date.now()
  });
  
  // Keep only last 100 metrics
  if (self.performanceMetrics.length > 100) {
    self.performanceMetrics = self.performanceMetrics.slice(-100);
  }
}

// Enhanced offline page
function getOfflinePage() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comrades360 - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 50px 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .offline-container {
            max-width: 400px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
          }
          .offline-icon {
            font-size: 64px;
            margin-bottom: 20px;
            animation: bounce 2s infinite;
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          h1 { 
            color: white; 
            margin-bottom: 10px; 
            font-size: 2rem;
            font-weight: 700;
          }
          p { 
            color: rgba(255,255,255,0.8); 
            line-height: 1.6; 
            margin-bottom: 20px;
          }
          .retry-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 12px 24px;
            border-radius: 50px;
            cursor: pointer;
            margin-top: 20px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          }
          .retry-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
          .features {
            margin-top: 30px;
            text-align: left;
          }
          .feature {
            display: flex;
            align-items: center;
            margin: 10px 0;
            color: rgba(255,255,255,0.7);
          }
          .feature-icon {
            margin-right: 10px;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📡</div>
          <h1>You're Offline</h1>
          <p>No internet connection detected. Some features may not be available.</p>
          <button class="retry-btn" onclick="window.location.reload()">
            🔄 Try Again
          </button>
          
          <div class="features">
            <div class="feature">
              <span class="feature-icon">🛒</span>
              <span>View cached products</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📱</span>
              <span>Offline shopping cart</span>
            </div>
            <div class="feature">
              <span class="feature-icon">⚡</span>
              <span>Fast loading when back online</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Initialize performance monitoring
function initPerformanceMonitoring() {
  console.log('[SW] Initializing performance monitoring');
  
  // Monitor cache hit rates
  setInterval(() => {
    if (self.performanceMetrics && self.performanceMetrics.length > 0) {
      const recentMetrics = self.performanceMetrics.slice(-10);
      const cacheHits = recentMetrics.filter(m => m.source === 'cache').length;
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
      
      console.log(`[SW] Cache hit rate: ${(cacheHits / recentMetrics.length * 100).toFixed(1)}%`);
      console.log(`[SW] Avg response time: ${avgResponseTime.toFixed(2)}ms`);
    }
  }, 30000); // Every 30 seconds
}

// Background sync for cache warming
self.addEventListener('sync', (event) => {
  if (event.tag === 'warm-homepage-cache') {
    console.log('[SW] Background sync: warming homepage cache');
    event.waitUntil(warmHomepageCache());
  }
});

async function warmHomepageCache() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const endpoints = [
      '/api/ultra-fast/homepage',
      '/api/ultra-fast/batch',
      '/api/categories'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await cache.put(endpoint, response.clone());
          console.log(`[SW] Warmed cache for ${endpoint}`);
        }
      } catch (error) {
        console.log(`[SW] Failed to warm cache for ${endpoint}:`, error);
      }
    }
  } catch (error) {
    console.error('[SW] Cache warming failed:', error);
  }
}

// Push notifications for new products
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/images/logo.png',
      badge: '/images/badge.png',
      tag: 'new-products',
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View Products'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Enhanced service worker loaded');