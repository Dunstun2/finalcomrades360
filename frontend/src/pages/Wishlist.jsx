import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../components/ui/use-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { resolveImageUrl } from '../utils/imageUtils';
import { FaHeart, FaShoppingCart, FaTrash, FaPlus, FaMinus, FaArrowRight, FaArrowLeft } from 'react-icons/fa';

import { formatPrice } from '../utils/currency';

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart, refreshCart, cart } = useCart();
  const {
    rawItems,
    loading,
    removeFromWishlist,
    clearWishlist,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection
  } = useWishlist();

  const [itemData, setItemData] = useState([]);

  // Process raw items into a unified format for rendering
  useEffect(() => {
    if (user && rawItems) {
      const processed = rawItems.map(wishItem => {
        const type = wishItem.itemType;
        const data = wishItem.Product || wishItem.Service || wishItem.FastFood;

        if (!data) return null;

        // Extract unified fields
        const id = data.id;
        const name = data.name || data.title || 'Untitled Item';
        const image = data.images?.[0] || data.mainImage || data.coverImage || data.thumbnail;

        // Standardized pricing logic
        const displayPrice = Number(data.discountPrice || data.displayPrice || data.basePrice || data.price || data.fee || data.baseFee || 0);
        const originalPrice = Number(data.displayPrice || data.basePrice || data.price || data.fee || data.baseFee || 0);
        const discountPercent = Number(data.discountPercentage || 0);

        return {
          ...data,
          id,
          name,
          image,
          originalPrice,
          discountPercent,
          displayPrice,
          itemType: type,
          compositeId: `${type}:${id}`,
          addedAt: wishItem.createdAt
        };
      }).filter(item => item !== null);

      setItemData(processed);
    } else {
      setItemData([]);
    }
  }, [user, rawItems]);

  // Handle individual item move to cart
  const handleMoveToCart = async (item) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      // Add to cart with correct type
      await addToCart(item.id, 1, { type: item.itemType });

      // Remove from wishlist
      await removeFromWishlist(item.id, item.itemType);

      toast({
        title: 'Moved to Cart',
        description: `${item.name} moved to your cart`,
      });

      await refreshCart();
    } catch (error) {
      console.error('Failed to move to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to move item to cart',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveOne = async (id, type) => {
    try {
      await removeFromWishlist(id, type);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleBulkMoveToCart = async () => {
    const selectedList = itemData.filter(item => selectedItems.has(item.compositeId));
    if (selectedList.length === 0) return;

    try {
      await Promise.all(selectedList.map(item =>
        addToCart(item.id, 1, { type: item.itemType })
      ));

      await Promise.all(selectedList.map(item =>
        removeFromWishlist(item.id, item.itemType)
      ));

      toast({
        title: 'Items Moved',
        description: `${selectedList.length} items moved to cart`,
      });

      clearSelection();
      await refreshCart();
    } catch (error) {
      console.error('Bulk move failed:', error);
    }
  };

  const handleBulkRemove = async () => {
    const idsToRemoving = Array.from(selectedItems);
    if (idsToRemoving.length === 0) return;

    try {
      await Promise.all(idsToRemoving.map(compositeId => {
        const [type, id] = compositeId.split(':');
        return removeFromWishlist(id, type);
      }));

      toast({
        title: 'Removed',
        description: `${idsToRemoving.length} items removed from wishlist`,
      });

      clearSelection();
    } catch (error) {
      console.error('Bulk remove failed:', error);
    }
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (selectedItems.size === itemData.length) {
      clearSelection();
    } else {
      selectAll(itemData.map(item => item.compositeId));
    }
  };

  const checkIsInCart = (id, type) => {
    if (!cart?.items) return false;
    return cart.items.some(cartItem =>
      cartItem.itemType === type &&
      (Number(cartItem.productId) === Number(id) ||
        Number(cartItem.serviceId) === Number(id) ||
        Number(cartItem.fastFoodId) === Number(id))
    );
  };

  const totals = useMemo(() => {
    const selectedList = itemData.filter(item => selectedItems.has(item.compositeId));
    const subtotal = selectedList.reduce((sum, item) => sum + item.displayPrice, 0);
    return { count: selectedList.length, subtotal };
  }, [itemData, selectedItems]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">Please log in to view and manage your wishlist.</p>
          <Link to="/login" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
            Login Now
          </Link>
        </div>
      </div>
    );
  }

  if (loading && itemData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Fetching your favorites..." />
      </div>
    );
  }

  if (itemData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaHeart className="text-gray-300 text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-8">Items you favorite will appear here for easy access later.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
            <span>Discover Items</span>
            <FaArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Back
        </button>
        {/* Navigation & Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link to="/" className="hover:text-blue-600">Home</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Wishlist</span>
            </nav>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">My Wishlist</h1>
            <p className="text-gray-500 font-medium mt-1">{itemData.length} items saved in total</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors pr-4 border-r border-gray-300"
            >
              {selectedItems.size === itemData.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={clearWishlist}
              className="text-sm font-bold text-red-600 hover:text-red-800 transition-colors"
            >
              Clear Everything
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedItems.size > 0 && (
          <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-blue-100 p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                {selectedItems.size}
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 uppercase tracking-wider">Items Selected</p>
                <p className="text-lg font-bold text-blue-600">{formatPrice(totals.subtotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleBulkMoveToCart}
                className="flex-1 sm:flex-none bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
              >
                <FaShoppingCart size={14} />
                <span>Move to Cart</span>
              </button>
              <button
                onClick={handleBulkRemove}
                className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-100 transition-all"
                title="Remove Selected"
              >
                <FaTrash size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {itemData.map((item) => {
            const inCart = checkIsInCart(item.id, item.itemType);
            const isSelected = selectedItems.has(item.compositeId);
            const isOutOfStock = (item.stock !== undefined && item.stock <= 0) || item.inventoryStatus === 'OUT_OF_STOCK';

            return (
              <div
                key={item.compositeId}
                className={`group relative bg-white rounded-lg border flex flex-col h-full transition-all duration-300 overflow-hidden ${isSelected ? 'border-blue-600 ring-2 ring-blue-100 scale-[1.02] shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md'
                  }`}
              >
                {/* Image Section */}
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
                  <img
                    src={resolveImageUrl(item.image)}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'; }}
                  />

                  {/* Selection Checkbox - Top Left */}
                  <div className="absolute top-2 left-2 z-20">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(item.id, item.itemType)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm bg-white/90"
                    />
                  </div>

                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white text-black px-2 py-1 rounded text-[10px] font-bold uppercase">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="font-medium text-gray-900 text-[11px] line-clamp-2 leading-tight mb-2 min-h-[2.5rem]">
                    {item.name}
                  </h3>

                  <div className="mt-auto">
                    <div className="flex items-baseline gap-1.5 flex-wrap mb-3">
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(item.displayPrice)}
                      </span>
                      {item.discountPercent > 0 && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Action Bar - Matching Home Page style */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-1">
                      {item.itemType !== 'service' && (
                        <button
                          onClick={() => {
                            if (item.itemType === 'service') {
                              navigate(`/service/${item.id}`);
                            } else {
                              handleMoveToCart(item);
                            }
                          }}
                          disabled={isOutOfStock || (inCart && item.itemType !== 'service')}
                          className={`flex-1 px-1 py-1.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap ${inCart && item.itemType !== 'service'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : isOutOfStock
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                        >
                          {inCart && item.itemType !== 'service' ? 'Remove' : isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveOne(item.id, item.itemType)}
                        className="p-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove from wishlist"
                      >
                        <FaHeart size={12} />
                      </button>

                      <button
                        onClick={() => navigate(item.itemType === 'service' ? `/service/${item.id}` : (item.itemType === 'fastfood' ? '/fastfood' : `/product/${item.id}`))}
                        className="px-1.5 py-1.5 text-[10px] font-bold text-white bg-blue-800 hover:bg-blue-900 rounded transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}