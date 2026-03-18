import React, { useState, useEffect, useRef } from 'react';
import { resolveImageUrl } from '../utils/imageUtils';

// Enhanced image component with WebP support, CDN, and progressive loading
const OptimizedImageWithCDN = ({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  placeholder = 'blur',
  quality = 'auto',
  format = 'auto',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError,
  ...props
}) => {
  const imgRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState(null);

  // CDN URL transformation
  const getCDNUrl = (originalSrc) => {
    if (!originalSrc) return null;
    
    // If it's already a CDN URL, return as is
    if (originalSrc.includes('cdn.') || originalSrc.includes('cloudinary') || originalSrc.includes('imgix')) {
      return originalSrc;
    }
    
    // Transform local URLs to CDN format
    if (originalSrc.startsWith('/')) {
      const baseUrl = process.env.REACT_APP_CDN_URL || 'https://cdn.comrades360.com';
      const transformedUrl = `${baseUrl}${originalSrc}`;
      
      // Add optimization parameters
      const separator = transformedUrl.includes('?') ? '&' : '?';
      return `${transformedUrl}${separator}auto=format&q=${quality}&f=${format}&w=400`;
    }
    
    return originalSrc;
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || loading !== 'lazy') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          setLoadStartTime(performance.now());
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [loading]);

  // Generate WebP source with fallback
  const generateImageSources = (originalSrc) => {
    if (!originalSrc) return {};
    
    const cdnUrl = getCDNUrl(originalSrc);
    
    // WebP source
    const webpUrl = cdnUrl.includes('?') 
      ? `${cdnUrl}&f=webp`
      : `${cdnUrl}?f=webp`;
    
    // AVIF source (next-gen format)
    const avifUrl = cdnUrl.includes('?')
      ? `${cdnUrl}&f=avif`
      : `${cdnUrl}?f=avif`;
    
    return {
      fallback: cdnUrl,
      webp: webpUrl,
      avif: avifUrl
    };
  };

  // Handle image load
  const handleLoad = (event) => {
    setIsLoaded(true);
    setHasError(false);
    
    const loadTime = loadStartTime ? performance.now() - loadStartTime : 0;
    console.log(`[OptimizedImage] Loaded ${src} in ${loadTime.toFixed(2)}ms`);
    
    if (onLoad) {
      onLoad(event);
    }
  };

  // Handle image error
  const handleError = (event) => {
    setHasError(true);
    console.warn(`[OptimizedImage] Failed to load image: ${src}`);
    
    if (onError) {
      onError(event);
    }
  };

  // Generate placeholder image (base64 blur effect)
  const getPlaceholderSrc = () => {
    if (placeholder === 'blur') {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="blur">
              <feGaussianBlur stdDeviation="10"/>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="#f3f4f6" filter="url(#blur)"/>
          <rect x="150" y="120" width="100" height="60" fill="#e5e7eb" rx="8"/>
        </svg>
      `)}`;
    }
    return null;
  };

  // Don't render anything until in view for lazy loading
  if (loading === 'lazy' && !isInView && !isLoaded) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{
          aspectRatio: '4/3',
          backgroundImage: placeholder === 'blur' ? `url(${getPlaceholderSrc()})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        {...props}
      />
    );
  }

  // Generate image sources
  const imageSources = generateImageSources(imageSrc || src);

  // If WebP is supported, use picture element
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  const isWebPSupported = supportsWebP();

  if (hasError) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}
        style={{ aspectRatio: '4/3' }}
        {...props}
      >
        <div className="text-center">
          <svg className="h-12 w-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <p className="text-sm">Image not available</p>
        </div>
      </div>
    );
  }

  if (isWebPSupported && imageSources.webp) {
    return (
      <picture>
        <source
          srcSet={imageSources.avif}
          type="image/avif"
          sizes={sizes}
        />
        <source
          srcSet={imageSources.webp}
          type="image/webp"
          sizes={sizes}
        />
        <img
          ref={imgRef}
          src={imageSources.fallback}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          sizes={sizes}
          {...props}
        />
      </picture>
    );
  }

  // Fallback for browsers without WebP support
  return (
    <img
      ref={imgRef}
      src={imageSources.fallback || src}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      sizes={sizes}
      {...props}
    />
  );
};

// Image grid component with virtualization support
export const OptimizedImageGrid = ({ images = [], className = '', ...props }) => {
  const [visibleImages, setVisibleImages] = useState([]);
  const [loadedImages, setLoadedImages] = useState(new Set());

  useEffect(() => {
    // Simple virtualization - show first 20 images
    setVisibleImages(images.slice(0, 20));
  }, [images]);

  const handleImageLoad = (index) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${className}`}>
      {visibleImages.map((image, index) => (
        <OptimizedImageWithCDN
          key={image.id || index}
          src={image.src || image.url || image.coverImage}
          alt={image.alt || image.name || `Image ${index + 1}`}
          className={`w-full h-48 object-cover rounded-lg transition-all duration-300 ${
            loadedImages.has(index) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          onLoad={() => handleImageLoad(index)}
          quality="auto"
          format="auto"
          loading="lazy"
          {...props}
        />
      ))}
      
      {visibleImages.length === 0 && (
        <div className="col-span-full text-center py-8 text-gray-500">
          No images to display
        </div>
      )}
    </div>
  );
};

// Product image component with smart loading
export const ProductImage = ({ 
  product, 
  index = 0, 
  className = '', 
  showGallery = false,
  ...props 
}) => {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (product?.images && Array.isArray(product.images)) {
      setImages(product.images);
    } else if (product?.coverImage) {
      setImages([product.coverImage]);
    }
  }, [product]);

  const currentImage = images[currentIndex] || images[0];

  const handleImageChange = (newIndex) => {
    setCurrentIndex(newIndex);
  };

  if (!currentImage) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">No image</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <OptimizedImageWithCDN
        src={currentImage}
        alt={`${product?.name || 'Product'} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover"
        quality="auto"
        format="auto"
        onLoad={() => console.log(`[ProductImage] Loaded image for ${product?.name}`)}
        {...props}
      />
      
      {showGallery && images.length > 1 && (
        <div className="flex space-x-2 mt-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleImageChange(index)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                currentIndex === index ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <OptimizedImageWithCDN
                src={image}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                quality="auto"
                format="auto"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedImageWithCDN;