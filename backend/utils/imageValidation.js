const fs = require('fs').promises;
const path = require('path');

/**
 * Validates and normalizes image URLs/paths
 * @param {string|Array} images - Image URLs or paths
 * @returns {Array} Normalized image paths
 */
const validateAndNormalizeImages = (imagesInput) => {
  let images = imagesInput;
  if (typeof images === 'string') {
    try {
      if (images.startsWith('[')) { images = JSON.parse(images); }
      else { return [images]; } // Handle single string path if passed
    } catch (e) { return [images]; }
  }

  if (!Array.isArray(images)) return [];

  return images
    .map(img => {
      if (typeof img === 'string') {
        const trimmed = img.trim();

        // First, check if this is a data URI (base64 image) - return as-is immediately
        // Use a case-insensitive regex for better robustness
        if (/^(data:image\/|data:application\/)/i.test(trimmed) || trimmed.startsWith('data:')) {
          return trimmed;
        }

        // Check for HTTP/HTTPS URLs - return as-is
        if (/^https?:\/\//i.test(trimmed)) {
          return trimmed;
        }

        // Only process paths that are actual file paths, not data URIs
        // If it contains base64-marker, it's likely a data URI
        if (trimmed.toLowerCase().includes('base64,')) {
          return trimmed;
        }

        // Ensure consistent path format for relative upload paths only
        if (trimmed.startsWith('uploads/')) {
          return '/' + trimmed;
        }
        if (!trimmed.startsWith('/uploads/')) {
          return `/uploads/products/${trimmed}`;
        }
        return trimmed;
      }
      return img;
    })
    .filter(img => img); // Remove empty entries
};

/**
 * Checks if an image file exists on disk
 * @param {string} imagePath - Image path
 * @returns {Promise<boolean>} True if file exists
 */
const imageFileExists = async (imagePath) => {
  try {
    if (!imagePath || typeof imagePath !== 'string') return false;

    // Extract filename from path
    const filename = path.basename(imagePath);
    const fullPath = path.join(__dirname, '../uploads/products', filename);

    await fs.access(fullPath);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates image file type and size
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 50MB' };
  }

  return { valid: true };
};

/**
 * Generates a unique filename for uploaded images
 * @param {string} originalName - Original filename
 * @param {string} prefix - Filename prefix (default: 'prod')
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName, prefix = 'prod') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName).toLowerCase();

  return `${prefix}_${timestamp}_${random}${extension}`;
};

/**
 * Cleans up orphaned image files
 * @param {Array} currentImages - Current image paths
 * @param {Array} previousImages - Previous image paths
 * @returns {Promise<void>}
 */
const cleanupOrphanedImages = async (currentImages, previousImages) => {
  try {
    const toDelete = previousImages.filter(img => !currentImages.includes(img));

    for (const imagePath of toDelete) {
      try {
        const filename = path.basename(imagePath);
        const fullPath = path.join(__dirname, '../uploads/products', filename);

        // Check if file exists and delete it
        await fs.access(fullPath);
        await fs.unlink(fullPath);
        console.log(`Cleaned up orphaned image: ${filename}`);
      } catch (error) {
        // File doesn't exist or can't be deleted, continue
        console.warn(`Could not cleanup image ${imagePath}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error during image cleanup:', error);
  }
};

const FALLBACK_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSIyMDAiIHk9IjIwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5Y2EzYWYiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

const ensureImagesExist = async (imagesInput) => {
  try {
    let images = imagesInput;

    // Handle stringified JSON (common in SQLite/Legacy)
    if (typeof images === 'string') {
      try {
        if (images.startsWith('[')) {
          images = JSON.parse(images);
        } else {
          images = [images];
        }
      } catch (e) {
        images = [images]; // Treat as single path
      }
    }

    // If images is not an array or is empty, return fallback
    if (!Array.isArray(images) || images.length === 0) return [FALLBACK_DATA_URI];

    // Process images in parallel for better performance
    const processedImages = await Promise.all(
      images.map(async (img) => {
        try {
          // Skip processing if image is already a data URI or URL
          const trimmed = typeof img === 'string' ? img.trim() : img;

          if (typeof trimmed !== 'string' || /^data:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
            return trimmed;
          }

          // Some products may have corrupted paths that still contain base64/data markers.
          if (trimmed.toLowerCase().includes('base64,') || trimmed.toLowerCase().includes('data:image')) {
            return trimmed;
          }

          // Extract filename and validate
          const filename = path.basename(img);
          if (!filename) return FALLBACK_DATA_URI;

          // Check if file exists
          const fullPath = path.join(__dirname, '../uploads/products', filename);
          await fs.access(fullPath);
          return img; // Return original image if it exists
        } catch (error) {
          // Keep the warning concise to avoid flooding logs
          console.warn('Image not found or invalid, using fallback for:', img);
          return FALLBACK_DATA_URI;
        }
      })
    );

    // Ensure we always return at least one image
    return processedImages.length > 0 ? processedImages : [FALLBACK_DATA_URI];
  } catch (error) {
    console.error('Error in ensureImagesExist:', error);
    return [FALLBACK_DATA_URI];
  }
};

/**
 * Optimizes an image buffer using sharp
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Buffer>} Optimized image buffer
 */
const optimizeImage = async (buffer) => {
  try {
    const sharp = require('sharp');
    return await sharp(buffer)
      .resize(1920, 1920, { // High res limit, but prevents massive 4k+ images
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 95 }) // High quality WebP
      .toBuffer();
  } catch (error) {
    console.error('Image optimization failed:', error);
    return buffer; // Return original if optimization fails
  }
};

module.exports = {
  validateAndNormalizeImages,
  imageFileExists,
  validateImageFile,
  generateUniqueFilename,
  cleanupOrphanedImages,
  ensureImagesExist,
  optimizeImage
};