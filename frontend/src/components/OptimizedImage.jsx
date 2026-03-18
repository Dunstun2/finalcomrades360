import React, { useState, useEffect, useRef, useCallback } from 'react';
import { resolveImageUrl, FALLBACK_IMAGE } from '../utils/imageUtils';

const OptimizedImage = ({
  src,
  alt = '',
  className = '',
  placeholder = '/images/image-placeholder.jpg',
  fallback = FALLBACK_IMAGE,
  loading = 'lazy',
  decoding = 'async',
  quality = 'auto',
  format = 'auto', // 'auto', 'webp', 'jpeg', 'png'
  progressive = true,
  blur = true,
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'lazy' ? false : true);
  const [errorCount, setErrorCount] = useState(0);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading !== 'lazy' || isInView) return;

    const imageElement = imgRef.current;
    if (!imageElement) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    observerRef.current.observe(imageElement);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading, isInView]);

  // Generate optimized image URL
  const getOptimizedUrl = useCallback((originalSrc, attempt = 0) => {
    if (!originalSrc || attempt >= 3) return fallback;
    
    try {
      const resolvedUrl = resolveImageUrl(originalSrc);
      
      // If it's already a base64 data URL, return as is
      if (resolvedUrl.startsWith('data:')) {
        return resolvedUrl;
      }
      
      // Add image optimization parameters for external URLs
      const url = new URL(resolvedUrl, window.location.origin);
      
      // Add quality and format parameters for optimization
      if (quality !== 'auto') {
        url.searchParams.set('q', quality);
      }
      
      if (format !== 'auto') {
        url.searchParams.set('fm', format);
      }
      
      // Add width parameter for responsive loading
      const containerWidth = imgRef.current?.parentElement?.clientWidth || 400;
      url.searchParams.set('w', Math.min(containerWidth * 2, 800)); // 2x for retina
      
      return url.toString();
    } catch (error) {
      console.warn('Error optimizing image URL:', error);
      return fallback;
    }
  }, [quality, format, fallback]);

  // Load image with retry logic
  const loadImage = useCallback((attempt = 0) => {
    if (attempt >= 3) {
      setImageSrc(fallback);
      onError?.(new Error('Failed to load image after 3 attempts'));
      return;
    }

    const optimizedSrc = getOptimizedUrl(src, attempt);
    
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(optimizedSrc);
      setIsLoaded(true);
      onLoad?.(img);
    };
    
    img.onerror = () => {
      console.warn(`Failed to load image (attempt ${attempt + 1}):`, optimizedSrc);
      setErrorCount(attempt + 1);
      
      // Try with fallback or original URL
      if (attempt === 0 && src !== fallback) {
        loadImage(attempt + 1);
      } else {
        setImageSrc(fallback);
        onError?.(new Error(`Failed to load image: ${optimizedSrc}`));
      }
    };
    
    img.src = optimizedSrc;
  }, [src, getOptimizedUrl, fallback, onLoad, onError]);

  // Load image when in view and source changes
  useEffect(() => {
    if (isInView && src) {
      loadImage();
    }
  }, [isInView, src, loadImage]);

  // Progressive image loading: show low quality first, then high quality
  const shouldShowProgressive = progressive && isLoaded && format === 'auto';

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      {/* Placeholder/Blur image */}
      {blur && !isLoaded && (
        <img
          ref={imgRef}
          src={placeholder}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={isInView ? imageSrc : placeholder}
        alt={alt}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${blur && !isLoaded ? 'blur-sm' : ''}
        `}
        loading={loading}
        decoding={decoding}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (errorCount < 2) {
            loadImage(errorCount + 1);
          } else {
            setImageSrc(fallback);
            onError?.(new Error('Image failed to load'));
          }
        }}
      />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Error indicator (for debugging) */}
      {process.env.NODE_ENV === 'development' && errorCount > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
          Error: {errorCount}
        </div>
      )}
    </div>
  );
};

// Image component with built-in caching
export const CachedOptimizedImage = React.memo(OptimizedImage, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.className === nextProps.className
  );
});

CachedOptimizedImage.displayName = 'CachedOptimizedImage';

export default OptimizedImage;