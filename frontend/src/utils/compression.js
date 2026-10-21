/**
 * High-performance image and video media utilities for client-side compression.
 */

/**
 * Checks if the browser supports WebP canvas export
 */
const supportsWebP = (() => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
        return false;
    }
})();

/**
 * Compresses an image file using HTML5 Canvas to WebP or optimized JPEG.
 * @param {File} file - The image file to compress.
 * @param {Object} options - Compression options.
 * @param {number} options.maxSizeMB - Maximum file size in MB (defaults to 0.35 MB / 350KB).
 * @param {number} options.maxWidthOrHeight - Maximum width or height of the image (defaults to 1600).
 * @param {number} options.quality - Initial quality (defaults to 0.82).
 * @param {boolean} options.preferWebP - Whether to prefer WebP format (defaults to true).
 * @returns {Promise<File>} - A promise that resolves to the compressed File object.
 */
export const compressImage = async (
    file,
    { maxSizeMB = 0.35, maxWidthOrHeight = 1600, quality = 0.82, preferWebP = true } = {}
) => {
    // Only compress images, skip SVGs and animated GIFs
    if (!file || !file.type || !file.type.startsWith('image/')) {
        return file;
    }

    if (file.type.includes('svg') || file.type.includes('gif')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.naturalWidth || img.width;
                    let height = img.naturalHeight || img.height;

                    // Proportional resizing maintaining aspect ratio
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

                    const ctx = canvas.getContext('2d', { alpha: true });
                    if (!ctx) return resolve(file);

                    // High-quality downsampling smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Target output format: prefer webp, fallback to jpeg (or preserve png if alpha)
                    const outputType = (preferWebP && supportsWebP) ? 'image/webp' : 'image/jpeg';
                    const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
                    const targetName = `${file.name.replace(/\.[^/.]+$/, '')}${ext}`;

                    const targetSizeBytes = maxSizeMB * 1024 * 1024;

                    const attemptCompression = (q) => {
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    return resolve(file);
                                }

                                if (blob.size <= targetSizeBytes || q <= 0.35) {
                                    const compressedFile = new File([blob], targetName, {
                                        type: outputType,
                                        lastModified: Date.now(),
                                    });

                                    const origKb = (file.size / 1024).toFixed(0);
                                    const compKb = (compressedFile.size / 1024).toFixed(0);
                                    console.log(`[compressImage] Optimized ${file.name}: ${origKb}KB → ${compKb}KB (${width}x${height})`);

                                    resolve(compressedFile);
                                } else {
                                    // Step down quality progressively
                                    attemptCompression(Math.max(0.35, q - 0.12));
                                }
                            },
                            outputType,
                            q
                        );
                    };

                    attemptCompression(quality);
                } catch (err) {
                    console.warn('[compressImage] Processing failed, falling back to original:', err);
                    resolve(file);
                }
            };

            img.onerror = (err) => {
                console.warn('[compressImage] Failed to load image element, using original:', err);
                resolve(file);
            };
        };

        reader.onerror = (err) => {
            console.warn('[compressImage] FileReader error, using original:', err);
            resolve(file);
        };
    });
};

/**
 * Extracts a lightweight video poster image (thumbnail) from an uploaded video file.
 * Enables instant banner rendering before heavy video streams download.
 * @param {File|Blob} videoFile - The video file.
 * @param {Object} options
 * @param {number} options.maxWidth - Maximum width of poster thumbnail.
 * @param {number} options.quality - JPEG quality for thumbnail.
 * @returns {Promise<File|null>}
 */
export const extractVideoPoster = (videoFile, { maxWidth = 1280, quality = 0.82 } = {}) => {
    return new Promise((resolve) => {
        if (!videoFile || !videoFile.type || !videoFile.type.startsWith('video/')) {
            return resolve(null);
        }

        let isCleanedUp = false;
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const fileUrl = URL.createObjectURL(videoFile);
        video.src = fileUrl;

        const cleanup = () => {
            if (isCleanedUp) return;
            isCleanedUp = true;
            try {
                URL.revokeObjectURL(fileUrl);
                video.pause();
                video.removeAttribute('src');
                video.load();
                video.remove();
            } catch {}
        };

        const timeout = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 6000);

        video.onloadedmetadata = () => {
            // Seek to 0.5s or 10% in to avoid initial black frames
            const seekTime = Math.min(0.5, (video.duration || 1) * 0.1);
            video.currentTime = seekTime;
        };

        video.onseeked = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                let width = video.videoWidth || 1280;
                let height = video.videoHeight || 720;

                if (maxWidth && width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    cleanup();
                    return resolve(null);
                }

                ctx.drawImage(video, 0, 0, width, height);

                const outputType = supportsWebP ? 'image/webp' : 'image/jpeg';
                const ext = outputType === 'image/webp' ? '.webp' : '.jpg';

                canvas.toBlob((blob) => {
                    cleanup();
                    if (!blob) return resolve(null);

                    const baseName = videoFile.name ? videoFile.name.replace(/\.[^/.]+$/, '') : 'video_poster';
                    const posterFile = new File([blob], `${baseName}_poster${ext}`, {
                        type: outputType,
                        lastModified: Date.now()
                    });

                    console.log(`[extractVideoPoster] Generated lightweight poster: ${(posterFile.size / 1024).toFixed(0)}KB (${width}x${height})`);
                    resolve(posterFile);
                }, outputType, quality);
            } catch (err) {
                cleanup();
                console.warn('[extractVideoPoster] Frame capture error:', err);
                resolve(null);
            }
        };

        video.onerror = () => {
            clearTimeout(timeout);
            cleanup();
            resolve(null);
        };
    });
};
