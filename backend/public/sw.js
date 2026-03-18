// Service Worker for Comrades360 Homepage Performance Optimization
const CACHE_NAME = 'comrades360-v1.2.0';
const API_CACHE_NAME = 'comrades360-api-v1.2.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/images/logo.png',
  '/images/favicon.ico',
  '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/ultra-fast/homepage',
  '/api/products',
  '/api/categories',
  '/api/hero-promotions/active'
];

// Network first strategy for critical APIs
const NETWORK_FIRST_APIS = [
  '/api/ultra-fast/homepage',
  '/api/products',
  '/api/categories'
];

// Cache first strategy for static assets
const CACHE_FIRST_ASSETS = [
  '/images/',
  '/static/',
  '/fonts/'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Pre-cache API responses
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching API endpoints');
        return Promise.allSettled(
          API_ENDPOINTS.map(endpoint => 
            fetch(endpoint)
              .then(response => {
                if (response.ok) {
                  cache.put(endpoint, response.clone());
                  console.log(`[SW] Cached API: ${endpoint}`);
                }
              })
              .catch(err => console.log(`[SW] Failed to cache ${endpoint}:`, err))
          )
        );
      })
    ]).then(() => {
      console.log('[SW] Service worker installed successfully');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName =>
              cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE_NAME
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),


      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker activated and critical data preloaded');
    })
  );
});


self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  if (CACHE_FIRST_ASSETS.some(asset => url.pathname.startsWith(asset))) {
    event.respondWith(handleCacheFirst(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
});

// Handle API requests with different strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  try {
    // Network first for critical APIs
    if (NETWORK_FIRST_APIS.includes(endpoint)) {
      return await networkFirst(request, API_CACHE_NAME);
    }
    
    // Cache first for less critical APIs
    return await cacheFirst(request, API_CACHE_NAME);
  } catch (error) {
    console.log('[SW] API request failed, trying cache:', error);
    
    // Fallback to cache
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
        cached: false
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      console.log('[SW] Network first: cached response for', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache first: serving from cache', request.url);
    
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
        console.log('[SW] Cache first: updated cache for', request.url);
      }
    }).catch(() => {
      // Ignore fetch errors for background updates
    });
    
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cache first: fetched and cached', request.url);
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback to cached index.html
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return basic offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comrades360 - Offline</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #f5f5f5; 
            }
            .offline-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .offline-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; line-height: 1.5; }
            .retry-btn {
              background: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 20px;
              font-size: 16px;
            }
            .retry-btn:hover {
              background: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1>You're Offline</h1>
            <p>It looks like you're not connected to the internet. Some features may not be available.</p>
            <p>Please check your connection and try again.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Try Again
            </button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Refresh cached API data
    const cache = await caches.open(API_CACHE_NAME);
    
    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await cache.put(endpoint, response.clone());
          console.log('[SW] Background sync: updated', endpoint);
        }
      } catch (error) {
        console.log('[SW] Background sync failed for', endpoint, error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync error:', error);
  }
}

// Push notifications for new products (future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/images/logo.png',
      badge: '/images/badge.png',
      tag: 'new-products',
      data: data.data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[SW] Service worker loaded');