// IndexedDB utilities for advanced homepage caching
class HomepageCache {
  constructor() {
    this.dbName = 'Comrades360Cache';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('timestamp', 'timestamp', { unique: false });
          productStore.createIndex('categoryId', 'categoryId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
    });
  }

  async cacheProducts(products, source = 'api') {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    
    const timestamp = Date.now();
    const productsWithMeta = products.map(product => ({
      ...product,
      timestamp,
      source,
      cached: true
    }));
    
    // Clear old products first
    await this.clearOldProducts();
    
    // Add new products
    for (const product of productsWithMeta) {
      await store.put(product);
    }
    
    // Update metadata
    await this.updateMeta('lastProductUpdate', timestamp);
    await this.updateMeta('productCount', products.length);
    
    return productsWithMeta;
  }

  async getCachedProducts(filters = {}) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        let products = request.result;
        
        // Apply filters
        if (filters.categoryId) {
          products = products.filter(p => p.categoryId === filters.categoryId);
        }
        
        if (filters.subcategoryId) {
          products = products.filter(p => p.subcategoryId === filters.subcategoryId);
        }
        
        // Sort by timestamp (newest first)
        products.sort((a, b) => b.timestamp - a.timestamp);
        
        resolve(products);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async cacheCategories(categories) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    
    const timestamp = Date.now();
    const categoriesWithMeta = categories.map(category => ({
      ...category,
      timestamp,
      cached: true
    }));
    
    // Clear old categories
    await store.clear();
    
    // Add new categories
    for (const category of categoriesWithMeta) {
      await store.put(category);
    }
    
    await this.updateMeta('lastCategoryUpdate', timestamp);
    
    return categoriesWithMeta;
  }

  async getCachedCategories() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const categories = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(categories);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async updateMeta(key, value) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['meta'], 'readwrite');
    const store = transaction.objectStore('meta');
    await store.put({ key, value, timestamp: Date.now() });
  }

  async getMeta(key) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['meta'], 'readonly');
    const store = transaction.objectStore('meta');
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async isDataStale(maxAge = 5 * 60 * 1000) { // 5 minutes default
    const lastUpdate = await this.getMeta('lastProductUpdate');
    if (!lastUpdate) return true;
    
    return Date.now() - lastUpdate > maxAge;
  }

  async clearOldProducts() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const index = store.index('timestamp');
    
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const range = IDBKeyRange.upperBound(cutoffTime);
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheStats() {
    const productCount = await this.getMeta('productCount') || 0;
    const lastUpdate = await this.getMeta('lastProductUpdate');
    const isStale = await this.isDataStale();
    
    return {
      productCount,
      lastUpdate,
      isStale,
      cacheAge: lastUpdate ? Date.now() - lastUpdate : null
    };
  }

  async clearAll() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['products', 'categories', 'meta'], 'readwrite');
    
    await Promise.all([
      transaction.objectStore('products').clear(),
      transaction.objectStore('categories').clear(),
      transaction.objectStore('meta').clear()
    ]);
  }
}

// Singleton instance
export const homepageCache = new HomepageCache();

// React hook for using IndexedDB cache
export const useHomepageCache = () => {
  const getCachedData = async (type, filters = {}) => {
    switch (type) {
      case 'products':
        return await homepageCache.getCachedProducts(filters);
      case 'categories':
        return await homepageCache.getCachedCategories();
      default:
        throw new Error(`Unknown cache type: ${type}`);
    }
  };

  const cacheData = async (type, data) => {
    switch (type) {
      case 'products':
        return await homepageCache.cacheProducts(data);
      case 'categories':
        return await homepageCache.cacheCategories(data);
      default:
        throw new Error(`Unknown cache type: ${type}`);
    }
  };

  const isStale = async (maxAge) => {
    return await homepageCache.isDataStale(maxAge);
  };

  const getStats = async () => {
    return await homepageCache.getCacheStats();
  };

  return {
    getCachedData,
    cacheData,
    isStale,
    getStats,
    clearAll: () => homepageCache.clearAll()
  };
};

export default homepageCache;