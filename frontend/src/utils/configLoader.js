/**
 * Batched configuration loader to prevent rate limiting
 * Loads all platform configurations in a single coordinated batch
 */

import api from '@/shared/services/api';

// Singleton state
let configCache = null;
let configPromise = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load all platform configurations in a single batch
 * Returns a promise that resolves to the configuration object
 * Multiple simultaneous calls will share the same promise (deduplication)
 */
export const loadPlatformConfigs = async () => {
  const now = Date.now();

  // Return cached config if still fresh
  if (configCache && (now - lastFetchTime) < CACHE_TTL) {
    return Promise.resolve(configCache);
  }

  // If already fetching, return the existing promise (deduplication)
  if (configPromise) {
    return configPromise;
  }

  // Start a new fetch
  configPromise = (async () => {
    try {
      console.log('[ConfigLoader] Fetching platform configurations...');
      
      const keys = [
        'platform_settings',
        'maintenance_settings',
        'seo_settings',
        'seo_pages',
        'finance_settings',
        'logistic_settings'
      ];

      // Load all configs in parallel with error handling per config
      const results = await Promise.allSettled(
        keys.map(key => 
          api.get(`/platform/config/${key}`, { timeout: 10000 })
            .catch(err => {
              console.warn(`[ConfigLoader] Failed to load ${key}:`, err.message);
              return { data: { success: false } };
            })
        )
      );

      const config = {
        platform: {},
        maintenance: { enabled: false },
        seo: {},
        seo_pages: {},
        finance: {},
        logistic: {}
      };

      // Process results
      keys.forEach((key, index) => {
        const result = results[index];
        if (result.status === 'fulfilled' && result.value?.data?.success && result.value.data.data) {
          const stateKey = key === 'platform_settings' ? 'platform'
            : key === 'maintenance_settings' ? 'maintenance'
            : key === 'seo_settings' ? 'seo'
            : key === 'seo_pages' ? 'seo_pages'
            : key === 'finance_settings' ? 'finance'
            : key === 'logistic_settings' ? 'logistic'
            : key;

          const data = typeof result.value.data.data === 'string'
            ? JSON.parse(result.value.data.data)
            : result.value.data.data;

          config[stateKey] = data;
        }
      });

      configCache = config;
      lastFetchTime = Date.now();
      
      console.log('[ConfigLoader] Successfully loaded configurations');
      return config;

    } catch (error) {
      console.error('[ConfigLoader] Fatal error loading configs:', error);
      // Return a minimal config on fatal errors
      return {
        platform: {},
        maintenance: { enabled: false },
        seo: {},
        seo_pages: {},
        finance: {},
        logistic: {}
      };
    } finally {
      // Clear the promise so next call can retry
      configPromise = null;
    }
  })();

  return configPromise;
};

/**
 * Invalidate the config cache (force reload on next request)
 */
export const invalidateConfigCache = () => {
  configCache = null;
  lastFetchTime = 0;
  console.log('[ConfigLoader] Cache invalidated');
};

/**
 * Get cached config immediately (may be null)
 */
export const getCachedConfig = () => configCache;
