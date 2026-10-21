import api from '@/shared/services/api';
import { compressImage } from '@/utils/compression';

/**
 * Uploads a file with automatic client-side compression for images.
 * @param {File|Blob} file - The file to upload.
 * @param {Object} options - Optional compression/upload options.
 * @returns {Promise<string>} Uploaded file URL.
 */
export const uploadFile = async (file, options = {}) => {
  let fileToUpload = file;

  // Compress images client-side before sending to server (reduces 10MB images to ~200KB instantly)
  if (
    file &&
    file.type &&
    file.type.startsWith('image/') &&
    !file.type.includes('svg') &&
    !file.type.includes('gif') &&
    !options.skipCompress
  ) {
    try {
      fileToUpload = await compressImage(file, {
        maxSizeMB: options.maxSizeMB || 0.35, // Target ~350KB for fast banner loading
        maxWidthOrHeight: options.maxWidthOrHeight || 1600,
        quality: options.quality || 0.82
      });
    } catch (err) {
      console.warn('[uploadFile] Client compression error, falling back to original:', err);
      fileToUpload = file;
    }
  }

  const fd = new FormData();
  fd.append('file', fileToUpload);
  const query = options.skipCompress ? '?skipCompress=1' : '';
  const r = await api.post(`/upload${query}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return r.data.url;
};
