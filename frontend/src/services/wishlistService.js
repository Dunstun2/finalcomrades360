import api from './api';

const wishlistService = {
  // Get user's wishlist
  getWishlist: async () => {
    try {
      const response = await api.get('/wishlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  },

  // Add item to wishlist
  addToWishlist: async (productId, itemType = 'product') => {
    try {
      const response = await api.post('/wishlist', { productId, itemType });
      return response.data;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  },

  // Remove item from wishlist
  removeFromWishlist: async (productId, itemType = 'product') => {
    try {
      const response = await api.delete(`/wishlist/${productId}`, {
        params: { itemType }
      });
      return response.data;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  // Check if item is in wishlist
  checkWishlistStatus: async (productId, itemType = 'product') => {
    try {
      const response = await api.get(`/wishlist/check/${productId}`, {
        params: { itemType }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      throw error;
    }
  },

  // Toggle item in wishlist
  toggleWishlist: async (productId, isInWishlist, itemType = 'product') => {
    try {
      if (isInWishlist) {
        return await wishlistService.removeFromWishlist(productId, itemType);
      } else {
        return await wishlistService.addToWishlist(productId, itemType);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      throw error;
    }
  },

  // Get wishlist item IDs for quick checking
  getWishlistIds: async () => {
    try {
      const wishlist = await wishlistService.getWishlist();
      // Return a structured object or flat list if only products? 
      // Better to return full object for context to process.
      return wishlist;
    } catch (error) {
      console.error('Error fetching wishlist IDs:', error);
      return [];
    }
  }
};

export default wishlistService;