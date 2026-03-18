/**
 * Utility functions for product-related operations
 */

/**
 * Get a product by ID from a list of products
 * @param {Array} products - Array of product objects
 * @param {number|string} productId - The ID of the product to find
 * @returns {Object|null} The product object if found, null otherwise
 */
export const findProductById = (products, productId) => {
  if (!products || !Array.isArray(products)) return null;
  const id = typeof productId === 'string' ? parseInt(productId, 10) : productId;
  return products.find(product => product.id === id) || null;
};

/**
 * Check if a product exists in the system
 * @param {Array} products - Array of product objects
 * @param {number|string} productId - The ID of the product to check
 * @returns {boolean} True if the product exists, false otherwise
 */
export const productExists = (products, productId) => {
  return !!findProductById(products, productId);
};

/**
 * Get a list of all valid product IDs
 * @param {Array} products - Array of product objects
 * @returns {Array} Array of valid product IDs
 */
export const getAllProductIds = (products) => {
  if (!products || !Array.isArray(products)) return [];
  return products.map(product => product.id).filter(Boolean);
};

/**
 * Format a product URL
 * @param {number|string} productId - The ID of the product
 * @returns {string} Formatted product URL
 */
export const getProductUrl = (productId) => {
  return `/products/${productId}`;
};

/**
 * Format a product edit URL
 * @param {number|string} productId - The ID of the product
 * @returns {string} Formatted product edit URL
 */
export const getProductEditUrl = (productId) => {
  return `/dashboard/products/comrades/${productId}/edit`;
};
