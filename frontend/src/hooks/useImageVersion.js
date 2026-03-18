import { useState, useEffect, useCallback } from 'react';
import { updateImageVersion, getImageVersion, generateCacheBustedUrl } from '../utils/imageUtils';

/**
 * Custom hook for managing image versions to ensure consistency across components
 * @param {string|Array<string>} imageUrls - Single image URL or array of image URLs
 * @param {string} productId - Optional product ID for tracking
 * @returns {Object} Object containing current version and update functions
 */
export const useImageVersion = (imageUrls, productId = null) => {
  const [version, setVersion] = useState(() => {
    // Get current version from the first image URL or product ID
    const url = Array.isArray(imageUrls) ? imageUrls[0] : imageUrls;
    if (url) {
      return getImageVersion(url) || Date.now();
    }
    return Date.now();
  });

  // Update version when image URLs change
  useEffect(() => {
    const url = Array.isArray(imageUrls) ? imageUrls[0] : imageUrls;
    if (url) {
      const currentVersion = getImageVersion(url);
      if (currentVersion) {
        setVersion(currentVersion);
      }
    }
  }, [imageUrls]);

  /**
   * Force update image version to trigger cache refresh
   * @param {string|number} newVersion - Optional custom version, defaults to timestamp
   */
  const refreshImages = useCallback((newVersion = null) => {
    const versionToUse = newVersion || Date.now();
    
    if (Array.isArray(imageUrls)) {
      // Update version for all image URLs
      imageUrls.forEach(url => {
        if (url) {
          updateImageVersion(url, versionToUse);
        }
      });
    } else if (imageUrls) {
      // Update version for single image URL
      updateImageVersion(imageUrls, versionToUse);
    }

    // If productId is provided, also update version for product-based tracking
    if (productId) {
      updateImageVersion(`product_${productId}`, versionToUse);
    }

    setVersion(versionToUse);
    console.log(`🔄 Images refreshed with version: ${versionToUse}`);
  }, [imageUrls, productId]);

  /**
   * Get versioned image URL
   * @param {string} imageUrl - Image URL to version
   * @returns {string} Versioned image URL
   */
  const getVersionedUrl = useCallback((imageUrl) => {
    if (!imageUrl) return imageUrl;
    
    // Use the imported generateCacheBustedUrl function
    return generateCacheBustedUrl(imageUrl, version);
  }, [version]);

  /**
   * Get versioned array of image URLs
   * @param {Array<string>} imageUrls - Array of image URLs
   * @returns {Array<string>} Array of versioned image URLs
   */
  const getVersionedUrls = useCallback((imageUrls = []) => {
    return imageUrls.map(url => getVersionedUrl(url));
  }, [getVersionedUrl]);

  return {
    version,
    refreshImages,
    getVersionedUrl,
    getVersionedUrls,
    // Helper to force re-render with new version
    forceRefresh: () => refreshImages()
  };
};

export default useImageVersion;