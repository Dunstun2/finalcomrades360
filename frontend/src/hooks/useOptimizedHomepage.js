import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHomepageCache } from '../utils/indexedDb';
import api from '../services/api';

export const useOptimizedHomepage = () => {
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

  // Optimized products query with multiple cache layers
  const {
    data: products = [],
    isPending,
    error,
    refetch
  } = useQuery({
    queryKey: ['optimized-products', currentPage, selectedCategory?.id, selectedSubcategory?.id, offlineMode],
    queryFn: async () => {
      console.log('[OptimizedHomepage] Fetching products:', {
        page: currentPage,
        categoryId: selectedCategory?.id,
        subcategoryId: selectedSubcategory?.id,
        offlineMode
      });

      // If offline and we have cached data, use it
      if (offlineMode) {
        console.log('[OptimizedHomepage] Offline mode - using cached data');
        const filters = {
          categoryId: selectedCategory?.id,
          subcategoryId: selectedSubcategory?.id
        };
        const cachedProducts = await getCachedData('products', filters);
        return cachedProducts.slice(0, currentPage * 8);
      }

      // Check if we have fresh cached data for the first page
      if (currentPage === 1 && !selectedCategory && !selectedSubcategory) {
        const dataIsStale = await isStale(2 * 60 * 1000); // 2 minutes
        if (!dataIsStale) {
          console.log('[OptimizedHomepage] Using fresh cached data');
          const cachedProducts = await getCachedData('products');
          if (cachedProducts.length > 0) {
            return cachedProducts.slice(0, 8);
          }
        }
      }

      try {
        let response;
        
        // Use fast endpoint for homepage initial load
        if (currentPage === 1 && !selectedCategory && !selectedSubcategory) {
          console.log('[OptimizedHomepage] Using fast homepage endpoint');
          response = await api.get(`/ultra-fast/homepage?limit=8`);
          
          // Cache the response
          if (response.data?.products) {
            await cacheData('products', response.data.products);
          }
          
          return response.data?.products || [];
        }
        
        // Use regular endpoint for filtered results or pagination
        console.log('[OptimizedHomepage] Using regular products endpoint');
        const url = `/products?page=${currentPage}&limit=8`;
        
        if (selectedSubcategory?.id) {
          response = await api.get(`${url}&subcategoryId=${selectedSubcategory.id}`);
        } else if (selectedCategory?.id) {
          response = await api.get(`${url}&categoryId=${selectedCategory.id}`);
        } else {
          response = await api.get(url);
        }
        
        const products = response.data?.products || [];
        
        // Update pagination state
        setHasMore(products.length === 8);
        
        return products;
      } catch (error) {
        console.error('[OptimizedHomepage] API error:', error);
        
        // Fallback to cached data on API error
        if (currentPage === 1) {
          console.log('[OptimizedHomepage] API failed, using cached data');
          const filters = {
            categoryId: selectedCategory?.id,
            subcategoryId: selectedSubcategory?.id
          };
          const cachedProducts = await getCachedData('products', filters);
          return cachedProducts.slice(0, currentPage * 8);
        }
        
        throw error;
      }
    },
    staleTime: offlineMode ? Infinity : 2 * 60 * 1000, // 2 minutes, or infinite if offline
    gcTime: offlineMode ? Infinity : 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: offlineMode ? 0 : 2,
    networkMode: offlineMode ? 'offline' : 'online',
    placeholderData: []
  });

  // Categories with caching
  const {
    data: categories = [],
    isPending: categoriesLoading
  } = useQuery({
    queryKey: ['optimized-categories', offlineMode],
    queryFn: async () => {
      if (offlineMode) {
        console.log('[OptimizedHomepage] Offline - using cached categories');
        return await getCachedData('categories');
      }

      try {
        // Check cached categories
        const cachedCategories = await getCachedData('categories');
        if (cachedCategories.length > 0 && !await isStale(5 * 60 * 1000)) {
          console.log('[OptimizedHomepage] Using cached categories');
          return cachedCategories;
        }

        // Fetch fresh categories
        const response = await api.get('/categories');
        const categoriesData = Array.isArray(response.data) ? response.data : [];
        
        // Cache the categories
        await cacheData('categories', categoriesData);
        
        return categoriesData;
      } catch (error) {
        console.error('[OptimizedHomepage] Categories API error:', error);
        
        // Fallback to cached categories
        const cachedCategories = await getCachedData('categories');
        return cachedCategories;
      }
    },
    staleTime: offlineMode ? Infinity : 5 * 60 * 1000, // 5 minutes
    gcTime: offlineMode ? Infinity : 30 * 60 * 1000, // 30 minutes
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

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    return {
      isOffline: offlineMode,
      dataSource: offlineMode ? 'cache' : 'api',
      cacheHit: !isPending && products.length > 0 && currentPage === 1,
      loadTime: Date.now(),
      productsCount: products.length,
      hasMore,
      currentPage,
      isPending,
      categoriesCount: categories.length
    };
  }, [offlineMode, isPending, products.length, currentPage, hasMore, categories.length]);

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