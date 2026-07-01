import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/use-toast';
import { FaHeart, FaRegHeart, FaSpinner, FaShoppingCart, FaCheck } from 'react-icons/fa';
import { resolveImageUrl, FALLBACK_IMAGE, getResizedImageUrl } from '@/utils/imageUtils';
import { useImageVersion } from '@/hooks/useImageVersion';
import { formatPrice } from '@/utils/currency';
import { 
  normalizeVariants as unifyVariants, 
  getVariantId as unifiedGetVariantId, 
  getDefaultVariant as unifiedGetDefaultVariant 
} from '@/utils/variantUtils';
import api from '@/shared/services/api';

function HomeProductCard({
  product,
  isInCart = false,
  onView,
  onAddToCart,
  user,
  navigate: navigateProp,
  renderActions,
  statusBadge,
  contentClassName = '',
  className // Added className prop
}) {
  const navigateHook = useNavigate();
  const navigate = navigateProp || navigateHook;
  const isMarketing = localStorage.getItem('marketing_mode') === 'true';
  const { cart, addToCart, removeFromCart, refresh, addingToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // 1. Local lock to prevent double-clicks during async transitions
  const pendingRef = useRef(false);

  const isFastFood = product.itemType === 'fastfood' || !!product.fastFoodId;
  const isService = product.itemType === 'service' || !!product.serviceId;
  const itemType = isFastFood ? 'fastfood' : (isService ? 'service' : 'product');

  // 2. Calculate isInCart from context for instant feedback (even if props are stale)
  const currentIsInCart = useMemo(() => {
    if (!cart?.items) return false;
    return cart.items.some(item => {
      const pid = item.productId || item.product?.id;
      const fid = item.fastFoodId || item.fastFood?.id;
      const sid = item.serviceId || item.service?.id;
      return String(pid || fid || sid || '') === String(product.id);
    });
  }, [cart?.items, product.id]);

  const isAdding = addingToCart && addingToCart.has(Number(product.id));

  // Keep image URL derivation stable between renders for large grids.
  const imageUrls = useMemo(() => {
    let urls = [];
    
    // 1. Prioritize coverImage (already resolved or a simple string)
    if (product.coverImage) {
      urls.push(product.coverImage);
    }

    // 2. Fallback to galleryImages or images
    const gallery = product.galleryImages || product.images || [];
    if (Array.isArray(gallery)) {
      urls.push(...gallery.filter(img => img !== product.coverImage));
    } else if (typeof gallery === 'string' && gallery.length > 2) {
      try {
        const parsed = JSON.parse(gallery);
        if (Array.isArray(parsed)) {
          urls.push(...parsed.filter(img => img !== product.coverImage));
        }
      } catch (e) {
        // Not JSON, just a string URL?
        if (gallery !== product.coverImage) urls.push(gallery);
      }
    }

    return urls.length > 0 ? urls : [FALLBACK_IMAGE];
  }, [product.coverImage, product.galleryImages, product.images]);

  const { getVersionedUrl, refreshImages } = useImageVersion(imageUrls, product.id);
  const getVariantId = (v) => {
    return unifiedGetVariantId(v);
  };

  const productImageUrl = useMemo(() => {
    const originalUrl = resolveImageUrl(imageUrls?.[0] || FALLBACK_IMAGE);
    return getVersionedUrl(getResizedImageUrl(originalUrl, { width: 400, quality: 80 }));
  }, [imageUrls, getVersionedUrl]);

  const logAction = async (actionType) => {
    try {
      await api.post('/analytics/log-action', {
        itemId: product.id,
        itemType,
        actionType,
        sessionId: sessionStorage.getItem('site_session_id'),
        userId: authUser?.id
      });
    } catch (err) {
      console.warn(`[Analytics] ${actionType} tracking failed:`, err.message);
    }
  };

  const handleAddToCart = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Prevent double-clicks at the handler level
    if (isAdding || pendingRef.current) return;
    pendingRef.current = true;

    // Use current internal state for robustness
    const wasInCart = currentIsInCart;

    try {
      if (wasInCart) {
        // Find matching items in cart to handle specific variants if needed
        const matchingItems = cart?.items?.filter(item => {
          const pid = item.productId || item.product?.id;
          const fid = item.fastFoodId || item.fastFood?.id;
          const sid = item.serviceId || item.service?.id;
          return String(pid || fid || sid || '') === String(product.id);
        }) || [];

        if (matchingItems.length > 0) {
          for (const item of matchingItems) {
            await removeFromCart(product.id, itemType, { variantId: item.variantId });
          }
        } else {
          await removeFromCart(product.id, itemType);
        }

        toast({
          title: 'Removed from Cart',
          description: `${product.name} removed from your cart`,
        });
      } else {
        // Log conversion (Add to Cart)
        logAction('conversion');

        if (firstVariant && itemType === 'product') {
          const vId = getVariantId(firstVariant);
          await addToCart(product.id, 1, {
            type: itemType,
            product,
            variantId: vId,
            selectedVariant: {
              id: vId,
              name: firstVariant.name || firstVariant.variantName || firstVariant.size || firstVariant.title || vId,
              sku: firstVariant.sku,
              basePrice: firstVariant.basePrice || firstVariant.displayPrice || firstVariant.price,
              discountPrice: firstVariant.discountPrice || firstVariant.displayPrice || firstVariant.price,
            }
          });
        } else {
          await addToCart(product.id, 1, { product, type: itemType });
        }

        toast({
          title: 'Added to Cart',
          description: `${product.name} added to your cart`,
        });
      }
    } catch (error) {
      console.error('💥 Cart operation failed!', error);
      toast({
        title: 'Cart Error',
        description: error.response?.data?.message || 'Failed to update cart. Please try again.',
        variant: 'destructive'
      });
    } finally {
      pendingRef.current = false;
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

  const handleView = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    try {
      if (onView) {
        onView(product);
      } else {
        // Route fast food items to their dedicated detail page
        const path = isFastFood
          ? `/fastfood/${product.id}`
          : `/product/${product.id}`;
        navigate(path, { state: { from: window.location.pathname } });
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

  const handleCardClick = (e) => {
    logAction('click');
    handleView(e);
  };

  // Calculate display price - handle different API response structures
  const isWishlisted = isInWishlist(product.id);
  const isAuthenticated = !!authUser;

  // Unified Variant Logic
  const variants = useMemo(() => {
    if (isFastFood || isService) return [];
    return unifyVariants(product);
  }, [product, isFastFood, isService]);

  const firstVariant = useMemo(() => unifiedGetDefaultVariant(variants), [variants]);

  // Step 1: get the "original" (pre-discount) price
  // Ensure the display price (originalPrice) is always >= base price
  const pDisplay = Number(firstVariant?.displayPrice || product.displayPrice || 0);
  const pBase = Number(firstVariant?.basePrice || firstVariant?.price || product.basePrice || product.price || 0);
  const originalPrice = pDisplay > pBase ? pDisplay : pBase;

  const discountPercent = firstVariant
    ? Number(firstVariant.discountPercentage || 0)
    : Number(product.discountPercentage || 0);

  // Step 2: get an explicit discountPrice (trust it if it is > 0)
  const explicitDiscountPrice = Number(
    firstVariant?.discountPrice ||
    product.discountPrice ||
    0
  );

  // Step 3: compute discount from percentage if explicit discountPrice is not set
  const percentageDiscountPrice =
    discountPercent > 0 && originalPrice > 0
      ? parseFloat((originalPrice * (1 - discountPercent / 100)).toFixed(2))
      : 0;

  // Step 4: pick the best price to show
  const finalDisplayPrice =
    explicitDiscountPrice > 0 
      ? explicitDiscountPrice
      : percentageDiscountPrice > 0 
      ? percentageDiscountPrice
      : originalPrice;

  const hasDiscount = finalDisplayPrice > 0 && finalDisplayPrice < originalPrice;
  const savings = originalPrice > finalDisplayPrice ? originalPrice - finalDisplayPrice : 0;

  const hasValidPrice = originalPrice > 0 || finalDisplayPrice > 0;

  // Ensure we only mark as out of stock if stock is EXPLICITLY defined and <= 0
  const isOutOfStock = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;

  // If a fixed width is explicitly provided, use it (e.g. from scroll carousels).
  // Otherwise default to w-full so it fills its grid cell properly.
  const isFixedWidth = className?.includes('w-[') || className?.includes('min-w-[');
  const cardBase = isFixedWidth
    ? className
    : `w-full ${className || ''}`;

  return (
    <div data-testid="product-card" onClick={handleCardClick} className={`group flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200 border border-gray-100 cursor-pointer ${cardBase}`}>
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
        {isOutOfStock && (
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

      <div className={`${contentClassName} px-0 py-0 flex flex-col`}>
        {/* Product Name */}
        <h3
          className="px-2 sm:px-3 font-display font-semibold text-gray-900 mb-1 text-sm sm:text-base tracking-tight group-hover:text-blue-600 transition-colors truncate whitespace-nowrap"
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="px-2 sm:px-3 mb-1 flex flex-col justify-start min-h-[38px] sm:min-h-[42px]">
          <p className="font-sans text-sm sm:text-base font-black text-gray-900 leading-tight">
            {formatPrice(finalDisplayPrice)}
          </p>
          <div className="flex items-center -mt-0.5">
            {hasDiscount ? (
              <p className="text-[10px] sm:text-xs text-gray-500 line-through decoration-gray-400 leading-tight">
                {formatPrice(originalPrice)}
              </p>
            ) : (
              <p className="text-[10px] sm:text-xs text-gray-500 invisible leading-tight">-</p>
            )}
          </div>
        </div>

        {/* Action Bar - Stabilized for performance and zero layout shift */}
        {renderActions ? (
          renderActions({ handleView, handleAddToCart, handleWishlistToggle })
        ) : (
          <div className="flex items-center border-t border-gray-100 gap-1 p-1 h-11 sm:h-12 bg-gray-50/30">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
              className={`relative flex-1 h-full min-w-0 rounded-md font-bold transition-all duration-200 text-[10px] sm:text-xs overflow-hidden flex items-center justify-center
                ${isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isAdding
                    ? 'bg-orange-100 text-orange-600'
                    : currentIsInCart
                      ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 active:scale-95'
                      : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95 shadow-sm'
                }`}
            >
              {/* Stable Content Container */}
              <div className="relative flex items-center justify-center w-full h-full px-1">
                {isOutOfStock ? (
                  <span className="truncate">Out of Stock</span>
                ) : isAdding ? (
                  <FaShoppingCart className="text-lg opacity-50" />
                ) : currentIsInCart ? (
                  <span className="flex items-center gap-1 animate-in zoom-in duration-200">
                    <FaCheck className="hidden sm:inline" /> Remove
                  </span>
                ) : (
                  <span className="flex items-center gap-1 animate-in fade-in duration-300">
                    <FaShoppingCart className="hidden sm:inline" />
                    <span className="truncate">
                      <span className="sm:hidden">+ Cart</span>
                      <span className="hidden sm:inline">Add to Cart</span>
                    </span>
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={handleView}
              className="flex-1 h-full min-w-0 font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-all active:scale-95 text-[10px] sm:text-xs flex items-center justify-center shadow-sm"
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
    prevProps.product?.visibilityStatus === nextProps.product?.visibilityStatus &&
    prevProps.product?.suspended === nextProps.product?.suspended &&
    prevProps.product?.status === nextProps.product?.status &&
    prevProps.product?.approved === nextProps.product?.approved &&
    prevProps.product?.stock === nextProps.product?.stock &&
    prevProps.product?.displayPrice === nextProps.product?.displayPrice &&
    prevProps.product?.discountPrice === nextProps.product?.discountPrice &&
    prevProps.product?.discountPercentage === nextProps.product?.discountPercentage &&
    prevProps.product?.coverImage === nextProps.product?.coverImage &&
    (prevProps.product?.variants === nextProps.product?.variants || 
     prevProps.product?.tags?.variants === nextProps.product?.tags?.variants)
  );
};

export default React.memo(HomeProductCard, areEqual);