/**
 * Price Display Utilities
 * Helper functions to determine which price to display based on context
 */

/**
 * Determines the appropriate price to display for a product in seller dashboard views.
 * Sellers see basePrice (their cost), while public views show displayPrice (customer price).
 * 
 * @param {Object} product - The product object
 * @param {Object} user - The current user object (optional)
 * @param {boolean} isSellerView - Whether this is a seller dashboard view (default: false)
 * @returns {number} The price to display
 */
export const getSellerViewPrice = (product, user = null, isSellerView = false) => {
    if (!product) return 0;

    // In seller dashboards, show basePrice for their own products
    if (isSellerView && user && product.sellerId === user.id) {
        return Number(product.basePrice || product.price || 0);
    }

    // Otherwise show customer-facing price (displayPrice or discounted price)
    return Number(product.displayPrice || product.price || product.basePrice || 0);
};

/**
 * Gets the price to display in seller dashboard product lists
 * Always returns basePrice for seller's own products
 * 
 * @param {Object} product - The product object
 * @returns {number} The base price
 */
export const getSellerProductPrice = (product) => {
    if (!product) return 0;
    return Number(product.basePrice || product.price || 0);
};

/**
 * Gets the customer-facing price for public pages
 * Returns displayPrice, discountPrice, or falls back to basePrice
 * 
 * @param {Object} product - The product object
 * @returns {number} The customer price
 */
export const getCustomerPrice = (product) => {
    if (!product) return 0;
    return Number(product.discountPrice || product.displayPrice || product.price || product.basePrice || 0);
};

/**
 * Formats a price value for display
 * 
 * @param {number} price - The price to format
 * @param {string} currency - Currency symbol (default: 'KES')
 * @returns {string} Formatted price string
 */
export const formatSellerPrice = (price, currency = 'KES') => {
    const numPrice = Number(price || 0);
    return `${currency} ${numPrice.toFixed(2)}`;
};
