/**
 * Utility for normalizing product variants across different data sources (Home, Products, Detail)
 * Handles legacy and current variant structures consistently.
 */

export const isSku = (val) => {
  if (!val || typeof val !== 'string') return false;
  // Common patterns for SKUs in this app: starting with SKU- or contains multiple hyphens/uppercase
  return val.startsWith('SKU-') || (val.includes('-') && val === val.toUpperCase() && val.length > 8);
};

const ensureArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) { return []; }
  }
  return [val];
};

/**
 * Normalizes a product's variants into a flat list of consistent variant rows.
 * @param {Object} product - The raw product object from API
 * @returns {Array} - List of normalized variant objects
 */
export const normalizeVariants = (product) => {
  if (!product) return [];
  
  const rawVariants = ensureArray(product.variants || product.tags?.variants);
  if (!rawVariants.length) return [];

  const basePrice = Number(product.discountPrice || product.displayPrice || product.basePrice || product.price || 0);
  const baseOriginalPrice = Number(product.displayPrice || product.basePrice || product.price || 0);

  return rawVariants.flatMap((v, vIdx) => {
    // 1. Handle Legacy structure (Object with options array)
    if (v.options && Array.isArray(v.options)) {
      const baseSku = v.sku || v.SKU || v.optionSku || '';
      const vPrice = Number(v.basePrice || v.displayPrice || v.price || basePrice);
      const vDiscPrice = v.discountPrice ? Number(v.discountPrice) : (v.discountPercentage ? (vPrice * (1 - v.discountPercentage / 100)) : null);

      return v.options.map((opt, optIdx) => {
        const details = (v.optionDetails && v.optionDetails[opt]) || {};
        return {
          id: details.id || `${vIdx}-${optIdx}`,
          optionName: opt,
          name: opt,
          sku: details.sku || baseSku || '-',
          basePrice: Number(details.basePrice || vPrice),
          discountPrice: details.discountPrice ? Number(details.discountPrice) : (vDiscPrice || null),
          stock: Number(details.stock ?? v.stock ?? 1),
          isLegacy: true
        };
      });
    }

    // 2. Handle Simple structure (Direct variant object)
    const sku = v.sku || v.SKU || v.optionSku || '-';
    return {
      id: v.id || v._id || `${vIdx}`,
      optionName: v.optionName || v.name || v.size || v.variantName || v.title || v.id || `Option ${vIdx + 1}`,
      name: v.name || v.optionName || v.size || v.variantName || v.title || v.id || `Option ${vIdx + 1}`,
      sku: sku && sku !== '-' ? sku : '-',
      basePrice: Number(v.basePrice || v.displayPrice || v.price || basePrice),
      discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
      stock: Number(v.stock ?? 1),
      originalData: v
    };
  });
};

/**
 * Returns a consistent unique identifier for a variant.
 * Prefers numeric id, then display name. SKU is intentionally excluded
 * because the backend variant lookup searches by id/name/size, not SKU.
 */
export const getVariantId = (variant) => {
  if (!variant) return null;
  // Prefer the numeric/stable id, then fall back to display name
  const numericId = variant.id !== undefined && variant.id !== null ? String(variant.id).trim() : '';
  if (numericId) return numericId;
  return String(variant.optionName || variant.name || variant.size || variant.variantName || variant.title || '').trim() || null;
};

/**
 * Finds a specific variant in a product by its ID (SKU or Name)
 */
export const findVariant = (product, variantId) => {
  if (!product || !variantId) return null;
  const variants = normalizeVariants(product);
  const targetId = String(variantId).toLowerCase();
  return variants.find(v => getVariantId(v).toLowerCase() === targetId);
};

/**
 * Returns a friendly label for the variant, ensuring we don't show the SKU if a name exists.
 */
export const getVariantLabel = (variant) => {
  if (!variant) return '';
  if (typeof variant === 'string') return isSku(variant) ? '' : variant;
  
  // High priority names
  const preferred = variant.optionName || variant.name || variant.size || variant.variantName || variant.title;
  if (preferred && !isSku(preferred)) return preferred;
  
  // Fallback to SKU only if absolutely necessary
  return variant.sku || variant.id || '';
};

/**
 * Finds the default variant (first with stock, or first available)
 */
export const getDefaultVariant = (normalizedVariants) => {
  if (!normalizedVariants || !normalizedVariants.length) return null;
  return normalizedVariants.find(v => Number(v.stock ?? 0) > 0) || normalizedVariants[0];
};
