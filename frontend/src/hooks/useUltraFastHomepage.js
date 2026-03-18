import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHomepageCache } from '../utils/indexedDb';
import api from '../services/api';

export const useUltraFastHomepage = () => {
  const { getCachedData, cacheData, isStale } = useHomepageCache();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Check if we're offline
  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    setOfflineMode(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ultra-fast products query with Redis caching
  const {
    data: products = [],
    isPending,
    error,
    refetch,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['ultra-fast-products', currentPage, selectedCategory?.id, selectedSubcategory?.id, offlineMode],
    queryFn: async () => {
      console.log('[UltraFastHomepage] Fetching products:', {
        page: currentPage,
        categoryId: selectedCategory?.id,
        subcategoryId: selectedSubcategory?.id,
        offlineMode
      });

      // If offline and we have cached data, use it
      if (offlineMode) {
        console.log('[UltraFastHomepage] Offline mode - using cached data');
        const filters = {
          categoryId: selectedCategory?.id,
          subcategoryId: selectedSubcategory?.id
        };
        const cachedProducts = await getCachedData('products', filters);
        return cachedProducts.slice(0, currentPage * 20);
      }

      // Try ultra-fast endpoint first for homepage initial load
      if (currentPage === 1 && !selectedCategory && !selectedSubcategory) {
        try {
          console.log('[UltraFastHomepage] Using ultra-fast endpoint');
          const response = await api.get(`/ultra-fast/homepage?limit=20`);
          
          // Cache the response
          if (response.data?.products) {
            await cacheData('products', response.data.products);
          }
          
          // Set hasMore based on response
          setHasMore(response.data?.pagination?.hasMore || false);
          
          return response.data?.products || [];
        } catch (error) {
          console.warn('[UltraFastHomepage] Ultra-fast endpoint failed, falling back:', error.message);
          // Fall through to regular endpoint
        }
      }
      
      // Try batch endpoint for initial load without filters
      if (currentPage === 1 && !selectedCategory && !selectedSubcategory) {
        try {
          console.log('[UltraFastHomepage] Using batch endpoint');
          const response = await api.get('/ultra-fast/batch');
          
          // Cache the response
          if (response.data?.products) {
            await cacheData('products', response.data.products);
          }
          
          return response.data?.products || [];
        } catch (error) {
          console.warn('[UltraFastHomepage] Batch endpoint failed, using regular endpoint:', error.message);
        }
      }

      // Fallback to regular endpoint
      try {
        console.log('[UltraFastHomepage] Using regular products endpoint');
        let url = `/products?page=${currentPage}&limit=20`;
        
        if (selectedSubcategory?.id) {
          url += `&subcategoryId=${selectedSubcategory.id}`;
        } else if (selectedCategory?.id) {
          url += `&categoryId=${selectedCategory.id}`;
        }
        
        const response = await api.get(url);
        const products = response.data?.products || [];
        
        // Update pagination state
        setHasMore(response.data?.pagination?.hasMore || products.length === 20);
        
        return products;
      } catch (error) {
        console.error('[UltraFastHomepage] All endpoints failed:', error);
        
        // Final fallback to cached data
        if (currentPage === 1) {
          console.log('[UltraFastHomepage] Using cached data as final fallback');
          const filters = {
            categoryId: selectedCategory?.id,
            subcategoryId: selectedSubcategory?.id
          };
          const cachedProducts = await getCachedData('products', filters);
          return cachedProducts.slice(0, currentPage * 20);
        }
        
        throw error;
      }
    },
    staleTime: offlineMode ? Infinity : 1 * 60 * 1000, // 1 minute for ultra-fast data
    gcTime: offlineMode ? Infinity : 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: offlineMode ? 0 : 1, // Only retry once for ultra-fast
    networkMode: offlineMode ? 'offline' : 'online',
    placeholderData: [],
    // Enable background refetching
    refetchOnMount: true,
    refetchOnReconnect: true
  });

  // Categories with caching
  const {
    data: categories = [],
    isPending: categoriesLoading
  } = useQuery({
    queryKey: ['ultra-fast-categories', offlineMode],
    queryFn: async () => {
      if (offlineMode) {
        console.log('[UltraFastHomepage] Offline - using cached categories');
        return await getCachedData('categories');
      }

      try {
        // Check cached categories first
        const cachedCategories = await getCachedData('categories');
        if (cachedCategories.length > 0 && !await isStale(3 * 60 * 1000)) { // 3 minutes
          console.log('[UltraFastHomepage] Using cached categories');
          return cachedCategories;
        }

        // Fetch fresh categories with product counts
        const response = await api.get('/categories/with-counts');
        const categoriesData = Array.isArray(response.data) ? response.data : [];
        
        // Cache the categories
        await cacheData('categories', categoriesData);
        
        return categoriesData;
      } catch (error) {
        console.error('[UltraFastHomepage] Categories API error:', error);
        
        // Fallback to cached categories
        const cachedCategories = await getCachedData('categories');
        return cachedCategories;
      }
    },
    staleTime: offlineMode ? Infinity : 3 * 60 * 1000, // 3 minutes
    gcTime: offlineMode ? Infinity : 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: offlineMode ? 0 : 1
  });

  // Memoized categories with subcategories
  const categoriesWithSubcategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      subcategories: categories.filter(cat => cat.parentId === category.id)
    })).filter(category => !category.parentId);
  }, [categories]);

  // Load more products
  const loadMore = useCallback(() => {
    if (hasMore && !isPending && !offlineMode) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, isPending, offlineMode]);

  // Filter handlers
  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setCurrentPage(1);
    setHasMore(true);
  }, []);

  const handleSubcategorySelect = useCallback((subcategory) => {
    setSelectedSubcategory(subcategory);
    setCurrentPage(1);
    setHasMore(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setCurrentPage(1);
    setHasMore(true);
  }, []);

  // Enhanced performance metrics
  const performanceMetrics = useMemo(() => {
    const now = Date.now();
    const dataAge = dataUpdatedAt ? now - dataUpdatedAt : 0;
    
    return {
      isOffline: offlineMode,
      dataSource: offlineMode ? 'cache' : 'api',
      cacheHit: !isPending && products.length > 0 && currentPage === 1,
      loadTime: now,
      productsCount: products.length,
      hasMore,
      currentPage,
      isPending,
      categoriesCount: categories.length,
      dataAge: `${dataAge}ms`,
      responseTime: dataAge > 0 ? 'fast' : 'unknown'
    };
  }, [offlineMode, isPending, products.length, currentPage, hasMore, categories.length, dataUpdatedAt]);

  // Background refresh for stale data
  useEffect(() => {
    if (!offlineMode && dataUpdatedAt) {
      const dataAge = Date.now() - dataUpdatedAt;
      const staleThreshold = 2 * 60 * 1000; // 2 minutes
      
      if (dataAge > staleThreshold) {
        console.log('[UltraFastHomepage] Background refreshing stale data');
        refetch();
      }
    }
  }, [offlineMode, dataUpdatedAt, refetch]);

  return {
    // Data
    products,
    categories: categoriesWithSubcategories,
    
    // State
    currentPage,
    selectedCategory,
    selectedSubcategory,
    hasMore,
    offlineMode,
    
    // Loading states
    isPending,
    categoriesLoading,
    error,
    
    // Actions
    loadMore,
    handleCategorySelect,
    handleSubcategorySelect,
    clearFilters,
    refetch,
    
    // Performance
    performanceMetrics
  };
};