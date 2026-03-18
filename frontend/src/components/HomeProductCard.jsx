import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { resolveImageUrl, FALLBACK_IMAGE, getResizedImageUrl } from '../utils/imageUtils';
import { useImageVersion } from '../hooks/useImageVersion';

import { formatPrice } from '../utils/currency';

function HomeProductCard({
  product,
  isInCart = false,
  onView,
  onAddToCart,
  user,
  navigate,
  renderActions,
  statusBadge,
  contentClassName = '',
  className // Added className prop
}) {
  const isMarketing = localStorage.getItem('marketing_mode') === 'true';
  const { addToCart, removeFromCart, refresh } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // Keep image URL derivation stable between renders for large grids.
  const imageUrls = useMemo(() => {
    let urls = [];
    if (product.coverImage) urls.push(product.coverImage);

    if (product.galleryImages) {
      let gallery = product.galleryImages;
      if (typeof gallery === 'string') {
        try { gallery = JSON.parse(gallery); } catch (e) { }
      }
      if (Array.isArray(gallery)) urls.push(...gallery);
    }

    if (urls.length === 0 && product.images) {
      let legacy = product.images;
      if (typeof legacy === 'string') {
        try { legacy = JSON.parse(legacy); } catch (e) { }
      }
      if (Array.isArray(legacy)) urls = legacy;
    }

    if (urls.length === 0) {
      return [FALLBACK_IMAGE];
    }

    return urls;
  }, [product.coverImage, product.galleryImages, product.images]);

  const { getVersionedUrl, refreshImages } = useImageVersion(imageUrls, product.id);
  const productImageUrl = useMemo(() => {
    const originalUrl = resolveImageUrl(imageUrls?.[0] || FALLBACK_IMAGE);
    return getVersionedUrl(getResizedImageUrl(originalUrl, { width: 400, quality: 80 }));
  }, [imageUrls, getVersionedUrl]);

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Login check removed to allow guest cart
    // if (!authUser) {
    //   navigate('/login');
    //   return;
    // }

    // Optimistic UI update for instant feedback
    const wasInCart = isInCart;

    try {
      if (wasInCart) {
        // Fire and forget - optimistic update already happened in removeFromCart
        removeFromCart(product.id).then(() => {
          toast({
            title: 'Removed from Cart',
            description: `${product.name} has been removed from your cart`,
          });
        }).catch((error) => {
          console.error('Cart operation failed:', error);

          // Provide specific error messages based on error type
          let errorMessage = 'Failed to update cart. Please try again.';

          if (error.response?.status === 400) {
            errorMessage = error.response.data?.message || 'Invalid product or quantity.';
          } else if (error.response?.status === 404) {
            errorMessage = 'Product not found or no longer available.';
          } else if (error.response?.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          }

          toast({
            title: 'Cart Error',
            description: errorMessage,
            variant: 'destructive'
          });
        });
      } else {
        // Fire and forget - optimistic update already happened in addToCart
        addToCart(product.id, 1, { product }).then(() => {
          toast({
            title: 'Added to Cart',
            description: `${product.name} has been added to your cart`,
          });
        }).catch((error) => {
          console.error('Cart operation failed:', error);

          // Provide specific error messages based on error type
          let errorMessage = 'Failed to update cart. Please try again.';

          if (error.response?.status === 400) {
            errorMessage = error.response.data?.message || 'Invalid product or quantity.';
          } else if (error.response?.status === 404) {
            errorMessage = 'Product not found or no longer available.';
          } else if (error.response?.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          }

          toast({
            title: 'Cart Error',
            description: errorMessage,
            variant: 'destructive'
          });
        });
      }
    } catch (error) {
      console.error('Cart operation failed:', error);

      // Provide specific error messages based on error type
      let errorMessage = 'Failed to update cart. Please try again.';

      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid product or quantity.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Product not found or no longer available.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      toast({
        title: 'Cart Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!authUser) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add items to your wishlist',
        variant: 'destructive'
      });
      // Don't redirect immediately, let user finish browsing
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      await toggleWishlist(product.id);
      // Success feedback is handled by the WishlistContext
    } catch (error) {
      console.error('Wishlist toggle error:', error);

      // Provide specific error messages
      let errorMessage = 'Failed to update wishlist. Please try again.';

      if (error.response?.status === 404) {
        errorMessage = 'Product not found.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Product already in wishlist.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      toast({
        title: 'Wishlist Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Removed handleMoveToCart function entirely

  const handleView = (e) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      if (onView) {
        onView(product);
      } else {
        // Fallback to direct navigation if onView is not provided
        navigate(`/product/${product.id}`, { state: { from: window.location.pathname } });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: 'Navigation Error',
        description: 'Failed to open product details. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Calculate display price - handle different API response structures
  const isWishlisted = isInWishlist(product.id);
  const isAuthenticated = !!authUser;

  // Standardized Price Calculation
  const finalDisplayPrice = Number(product.discountPrice || product.displayPrice || product.price || 0);
  const originalPrice = Number(product.displayPrice || product.price || 0);
  const discountPercent = Number(product.discountPercentage || 0);
  const hasDiscount = discountPercent > 0 && finalDisplayPrice < originalPrice;
  const savings = originalPrice - finalDisplayPrice;

  // Check if price is available
  const hasValidPrice = originalPrice > 0;

  // If a fixed width is explicitly provided, use it (e.g. from scroll carousels).
  // Otherwise default to w-full so it fills its grid cell properly.
  const isFixedWidth = className?.includes('w-[') || className?.includes('min-w-[');
  const cardBase = isFixedWidth
    ? className
    : `w-full ${className || ''}`;

  return (
    <div data-testid="product-card" className={`group flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200 border border-gray-100 ${cardBase} sm:max-w-[420px]`}>
      <div className="relative h-28 sm:h-40 md:h-48 overflow-hidden bg-gray-100">
        <img
          src={productImageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            if (e.target.src !== FALLBACK_IMAGE) {
              e.target.src = FALLBACK_IMAGE;
            }
          }}
        />

        {/* Image loading state - shows if image is taking too long */}
        <div
          className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-xs"
          style={{ display: 'none' }}
          id={`loading-${product.id}`}
        >
          Loading...
        </div>

        {/* Status Badges - Top Right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {product.isFlashSale && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded font-medium">
              ⚡ FLASH
            </span>
          )}
          {isMarketing && product.marketingCommission > 1 && (
            <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-lg border border-purple-500 w-fit">
              KSH {Number(product.marketingCommission).toFixed(2)}
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-bold tracking-wide">Out of Stock</span>
          </div>
        )}

        {!renderActions && (
          <button
            onClick={handleWishlistToggle}
            className={`absolute top-0 left-0 sm:top-2 sm:left-2 z-20 transition-colors ${isWishlisted ? 'text-green-600' : 'text-red-700 hover:text-red-600'}`}
            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <FaHeart size={16} />
          </button>
        )}
      </div>

      <div className={`${contentClassName} px-2 sm:px-4 py-0 flex flex-col`}>
        {/* Product Name */}
        <h3
          className="font-display font-semibold text-gray-900 mb-1 text-sm sm:text-base tracking-tight group-hover:text-blue-600 transition-colors truncate whitespace-nowrap"
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="mb-0.5 flex flex-wrap gap-x-1.5 gap-y-0 items-baseline">
          <p className="font-sans text-sm sm:text-base font-black text-gray-900">
            {formatPrice(finalDisplayPrice)}
          </p>
          {hasDiscount ? (
            <p className="text-xs text-gray-500 line-through decoration-gray-400">
              {formatPrice(originalPrice)}
            </p>
          ) : (
            <p className="text-xs text-gray-500 line-through decoration-gray-400 invisible">-</p>
          )}
        </div>

        {/* Keep only a tiny buffer between price and actions */}
        {/* Removed spacer below price */}

        {/* Action Bar - Conditional rendering based on renderActions prop */}
        {renderActions ? (
          // Custom actions from parent component (e.g., ProductListingView)
          renderActions({ handleView, handleAddToCart, handleWishlistToggle })
        ) : (
          // Default action bar for homepage and other standard views
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-1">
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className={`flex-1 px-1.5 py-1 sm:px-3 sm:py-3 rounded font-bold transition-colors whitespace-nowrap text-[11px] sm:text-sm
                ${product.stock <= 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isInCart
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                }`}
            >
              {product.stock <= 0 ? 'Out of Stock' : isInCart ? 'Remove' : (
                <>
                  <span className="sm:hidden">+ Cart</span>
                  <span className="hidden sm:inline">Add to Cart</span>
                </>
              )}
            </button>

            <button
              onClick={handleView}
              className="flex-1 px-1.5 py-1 sm:px-3 sm:py-3 text-[11px] sm:text-sm font-bold text-white bg-blue-800 hover:bg-blue-900 rounded transition-colors"
            >
              View
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.isInCart === nextProps.isInCart &&
    prevProps.className === nextProps.className &&
    prevProps.contentClassName === nextProps.contentClassName &&
    prevProps.product?.id === nextProps.product?.id &&
    prevProps.product?.updatedAt === nextProps.product?.updatedAt &&
    prevProps.product?.stock === nextProps.product?.stock &&
    prevProps.product?.displayPrice === nextProps.product?.displayPrice &&
    prevProps.product?.discountPrice === nextProps.product?.discountPrice &&
    prevProps.product?.discountPercentage === nextProps.product?.discountPercentage &&
    prevProps.product?.coverImage === nextProps.product?.coverImage
  );
};

export default React.memo(HomeProductCard, areEqual);