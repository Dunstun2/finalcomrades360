import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/use-toast';
import wishlistService from '../services/wishlistService';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wishlistItems, setWishlistItems] = useState(new Set()); // Stores "type:id"
  const [rawItems, setRawItems] = useState([]); // Stores full objects from server
  const [selectedItems, setSelectedItems] = useState(new Set()); // New: managed selection state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Prevent duplicate simultaneous requests
  const loadingRef = useRef(false);

  const loadWishlist = useCallback(async () => {
    if (!user || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const wishlist = await wishlistService.getWishlist();
      setRawItems(wishlist);

      const compositeKeys = new Set(wishlist.map(item => {
        const id = item.productId || item.serviceId || item.fastFoodId;
        return `${item.itemType}:${id}`;
      }));
      setWishlistItems(compositeKeys);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      setError('Failed to load wishlist');
      toast({
        title: 'Error',
        description: 'Failed to load your wishlist',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user, toast]);

  // Load wishlist on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadWishlist();
    } else {
      setWishlistItems(new Set());
      setRawItems([]);
      setSelectedItems(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only reload when user ID changes, not when loadWishlist changes

  // Listen to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const onRealtimeUpdate = (event) => {
      const scope = event?.detail?.payload?.scope;
      if (['wishlist', 'products', 'orders'].includes(scope)) {
        loadWishlist();
      }
    };

    window.addEventListener('realtime:data-updated', onRealtimeUpdate);
    return () => window.removeEventListener('realtime:data-updated', onRealtimeUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-subscribe when user ID changes, not when loadWishlist changes

  const toggleSelection = useCallback((id, type) => {
    const compositeId = `${type}:${id}`;
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compositeId)) newSet.delete(compositeId);
      else newSet.add(compositeId);
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedItems(new Set()), []);
  const selectAll = useCallback((compositeIds) => setSelectedItems(new Set(compositeIds)), []);

  const addToWishlist = useCallback(async (productId, itemType = 'product') => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: `Please log in to add ${itemType}s to your wishlist`,
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);

    try {
      await wishlistService.addToWishlist(productId, itemType);

      // Update local set immediately for instant UI feedback on cards
      setWishlistItems(prev => new Set([...prev, `${itemType}:${productId}`]));

      // Note: Removed loadWishlist() call here - optimistic update is sufficient
      // The realtime sync will handle background updates if needed

      toast({
        title: 'Added to Wishlist',
        description: 'Added to your wishlist successfully',
      });

      return true;
    } catch (error) {
      console.error('Failed to add to wishlist:', error);

      let errorMessage = 'Failed to add to wishlist';
      if (error.response?.status === 409) {
        errorMessage = 'Already in wishlist';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const removeFromWishlist = useCallback(async (productId, itemType = 'product') => {
    if (!user) return false;

    setLoading(true);

    try {
      await wishlistService.removeFromWishlist(productId, itemType);

      const compositeId = `${itemType}:${productId}`;
      setWishlistItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(compositeId);
        return newSet;
      });

      // Cleanup selection
      setSelectedItems(prev => {
        if (!prev.has(compositeId)) return prev;
        const newSet = new Set(prev);
        newSet.delete(compositeId);
        return newSet;
      });

      // Note: Removed loadWishlist() call here - optimistic update is sufficient
      // The realtime sync will handle background updates if needed

      toast({
        title: 'Removed from Wishlist',
        description: 'Removed from your wishlist',
      });

      return true;
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);

      toast({
        title: 'Error',
        description: 'Failed to remove from wishlist',
        variant: 'destructive'
      });

      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const toggleWishlist = useCallback(async (productId, itemType = 'product') => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to manage your wishlist',
        variant: 'destructive'
      });
      return false;
    }

    const isInWishlist = wishlistItems.has(`${itemType}:${productId}`);

    if (isInWishlist) {
      return await removeFromWishlist(productId, itemType);
    } else {
      return await addToWishlist(productId, itemType);
    }
  }, [user, wishlistItems, addToWishlist, removeFromWishlist, toast]);

  const isInWishlist = useCallback((productId, itemType = 'product') => {
    return wishlistItems.has(`${itemType}:${productId}`);
  }, [wishlistItems]);

  const wishlistCount = useMemo(() => wishlistItems.size, [wishlistItems]);

  const clearWishlist = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const promises = Array.from(wishlistItems).map(compositeId => {
        const [type, id] = compositeId.split(':');
        return wishlistService.removeFromWishlist(id, type);
      });

      await Promise.all(promises);
      setWishlistItems(new Set());
      setRawItems([]);
      setSelectedItems(new Set());

      toast({
        title: 'Wishlist Cleared',
        description: 'All items removed from your wishlist',
      });
    } catch (error) {
      console.error('Failed to clear wishlist:', error);

      toast({
        title: 'Error',
        description: 'Failed to clear wishlist',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, wishlistItems, toast]);

  const value = useMemo(() => ({
    // State
    wishlistItems,
    rawItems,
    selectedItems,
    loading,
    error,
    wishlistCount,

    // Actions
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    loadWishlist,
    clearWishlist,

    // Selection
    toggleSelection,
    clearSelection,
    selectAll,

    // Utility
    refreshWishlist: loadWishlist
  }), [
    wishlistItems,
    rawItems,
    selectedItems,
    loading,
    error,
    wishlistCount,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    loadWishlist,
    clearWishlist,
    toggleSelection,
    clearSelection,
    selectAll
  ]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;