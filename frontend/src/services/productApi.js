import api from './api';

const productApi = {
  // Get all products - simple like services
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/products', { params });
      // Ensure consistent response structure like services
      if (response.data && response.data.products) {
        return {
          products: response.data.products,
          totalCount: response.data.pagination?.totalProducts || response.data.products.length,
          currentPage: response.data.pagination?.currentPage || 1,
          totalPages: response.data.pagination?.totalPages || 1
        };
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get homepage products - ultra-fast endpoint
  getHomepageProducts: async (params = {}) => {
    try {
      const response = await api.get('/ultra-fast/homepage', { params });
      console.log('[productApi] Homepage products response:', response);
      // Handle both possible response structures
      const products = response.data?.products || response.data || [];
      console.log('[productApi] Processed products:', products);
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.error('Error fetching homepage products:', error);
      throw error;
    }
  },

  // Get a single product by ID
  getProductById: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Get categories
  getCategories: async () => {
    try {
      const response = await api.get('/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get subcategories for a category
  getSubcategories: async (categoryId) => {
    try {
      const response = await api.get(`/categories/${categoryId}/subcategories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },

  // Social Media Accounts
  getSocialMediaAccounts: async () => {
    try {
      const response = await api.get('/social-media-accounts');
      return response.data;
    } catch (error) {
      console.error('Error fetching social media accounts:', error);
      throw error;
    }
  }
};

export default productApi;