/**
 * Compresses an image file using HTML5 Canvas.
 * @param {File} file - The image file to compress.
 * @param {Object} options - Compression options.
 * @param {number} options.maxSizeMB - Maximum file size in MB.
 * @param {number} options.maxWidthOrHeight - Maximum width or height of the image.
 * @returns {Promise<File>} - A promise that resolves to the compressed File object.
 */
export const compressImage = async (file, { maxSizeMB = 5, maxWidthOrHeight = 1920 } = {}) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Check if initial size is already within limits
    const initialSizeMB = file.size / (1024 * 1024);
    if (initialSizeMB <= maxSizeMB && !maxWidthOrHeight) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Handle resizing
                if (maxWidthOrHeight && (width > maxWidthOrHeight || height > maxWidthOrHeight)) {
                    if (width > height) {
                        height = Math.round((height * maxWidthOrHeight) / width);
                        width = maxWidthOrHeight;
                    } else {
                        width = Math.round((width * maxWidthOrHeight) / height);
                        height = maxWidthOrHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Start with high quality and lower if still too large
                let quality = 0.8;
                const targetSizeBytes = maxSizeMB * 1024 * 1024;

                const attemptCompression = (q) => {
                    canvas.toBlob((blob) => {
                        if (blob.size <= targetSizeBytes || q <= 0.1) {
                            const compressedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            // Recursively attempt with lower quality if still too large
                            attemptCompression(q - 0.1);
                        }
                    }, file.type, q);
                };

                attemptCompression(quality);
            };
            img.onerror = (err) => reject(new Error('Failed to load image for compression'));
        };
        reader.onerror = (err) => reject(new Error('Failed to read file for compression'));
    });
};
