/**
 * Standardized Product Display Configuration
 * This configuration applies the home page product display settings to all product display locations
 */

import { formatPrice as formatPriceUtil } from '../utils/currency';

// Product card styling configuration
export const PRODUCT_CARD_CONFIG = {
  // Image settings
  image: {
    height: 'pb-[75%]', // 4:3 aspect ratio for more compact cards
    objectFit: 'object-cover',
    hoverTransform: 'group-hover:scale-105',
    transition: 'transition-transform duration-300',
    fallbackClass: 'absolute inset-0 w-full h-full object-cover'
  },

  // Grid layout
  grid: {
    cols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3',
    responsive: true
  },

  // Price display
  price: {
    display: 'displayPrice', // Customer-facing price (set by super admin)
    fallback: 'basePrice',   // Fallback to seller price
    currency: 'KES',
    locale: 'en-KE',
    originalField: 'basePrice'
  },

  // Stock display
  stock: {
    lowThreshold: 5,
    outOfStockClass: 'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center',
    lowStockClass: 'absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded shadow-sm',
    inStock: true
  },

  // Badges
  badges: {
    discount: {
      class: 'bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm',
      show: 'discountPercentage > 0'
    },
    flashSale: {
      class: 'bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm',
      icon: '⚡ FLASH SALE'
    }
  },

  // Action buttons
  actions: {
    wishlist: {
      class: 'w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors',
      icon: {
        active: '❤️',
        inactive: '🤍'
      }
    },
    quickView: {
      class: 'w-8 h-8 bg-white text-gray-600 rounded-full flex items-center justify-center shadow-sm hover:bg-blue-500 hover:text-white transition-colors',
      icon: '👁️'
    },
    addToCart: {
      class: 'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
      states: {
        inCart: 'bg-green-500 text-white hover:bg-green-600',
        outOfStock: 'bg-gray-300 text-gray-500 cursor-not-allowed',
        default: 'bg-orange-500 text-white hover:bg-orange-600'
      }
    },
    viewDetails: {
      class: 'px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors'
    }
  },

  // Product info
  info: {
    name: {
      class: 'font-medium text-gray-900 line-clamp-2 h-12 mb-2 hover:text-blue-600 cursor-pointer'
    },
    seller: {
      show: true,
      class: 'flex items-center text-xs text-gray-500 mb-2',
      icon: '🏪',
      verifiedClass: 'ml-1 text-green-600 font-medium'
    },
    rating: {
      show: true,
      stars: '⭐'.repeat(4) + '☆',
      text: '(4.2)',
      sold: '• 127 sold'
    },
    delivery: {
      icon: '🚚',
      text: 'Free delivery',
      eligibleClass: 'ml-1 text-green-600 font-medium'
    },
    security: {
      icon1: '🔒',
      text1: 'Secure checkout',
      icon2: '↩️',
      text2: 'Easy returns'
    }
  }
};

// Common helper functions
export const PRODUCT_DISPLAY_HELPERS = {
  // Get display price (customer-facing price set by super admin, fallback to base price)
  getDisplayPrice: (product) => {
    return product.displayPrice || 0;
  },

  // Get original price (seller's base price)
  getOriginalPrice: (product) => {
    return product.basePrice;
  },

  // Check if product has discount
  hasDiscount: (product) => {
    return product.discountPercentage > 0;
  },

  // Calculate savings amount
  getSavings: (product) => {
    if (!PRODUCT_DISPLAY_HELPERS.hasDiscount(product)) return 0;
    const original = PRODUCT_DISPLAY_HELPERS.getOriginalPrice(product);
    return Math.round(original * (product.discountPercentage / 100));
  },

  // Check if product is low stock
  isLowStock: (product) => {
    return product.stock <= PRODUCT_CARD_CONFIG.stock.lowThreshold && product.stock > 0;
  },

  // Check if product is out of stock
  isOutOfStock: (product) => {
    return product.stock === 0;
  },

  // Check if product qualifies for free delivery
  qualifiesForFreeDelivery: (product) => {
    return product.deliveryFee === 0 || product.deliveryFee === "0" || product.deliveryFee === "0.00";
  },

  // Format price for display
  formatPrice: (price) => {
    return formatPriceUtil(price);
  },

  // Format currency
  formatCurrency: (amount, currency = 'KES') => {
    return formatPriceUtil(amount);
  }
};

// CSS classes for consistent styling
export const PRODUCT_CARD_CLASSES = {
  // Main card
  card: 'bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-blue-300 group',

  // Image container
  imageContainer: 'relative pb-[75%] bg-gray-50 overflow-hidden',

  // Product info section
  infoSection: 'p-4',

  // Action buttons container
  actionsContainer: 'flex gap-2',

  // Badge containers
  badgeContainer: 'absolute top-2 left-2 flex flex-col gap-1',
  actionButtons: 'absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200'
};

export default {
  PRODUCT_CARD_CONFIG,
  PRODUCT_DISPLAY_HELPERS,
  PRODUCT_CARD_CLASSES
};