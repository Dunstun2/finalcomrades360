import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import HomeProductCard from './HomeProductCard';

const AdvancedVirtualizedGrid = ({
  products = [],
  loading = false,
  hasMore = false,
  onLoadMore = () => {},
  renderProductCard = null,
  itemHeight = 280, // Optimized height for better performance
  containerHeight = 600,
  overscan = 3, // Reduced overscan for better performance
  className = '',
  ...props
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Calculate responsive grid columns with mobile-first approach
  const columns = useMemo(() => {
    if (containerWidth < 480) return 2; // Small mobile
    if (containerWidth < 640) return 2; // Mobile
    if (containerWidth < 768) return 3; // Small tablet
    if (containerWidth < 1024) return 4; // Tablet
    if (containerWidth < 1280) return 5; // Small desktop
    if (containerWidth < 1536) return 6; // Desktop
    return 6; // Large desktop
  }, [containerWidth]);

  // Calculate visible range with enhanced windowing
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      products.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, products.length, overscan]);

  // Calculate total height needed
  const totalHeight = useMemo(() => {
    const rows = Math.ceil(products.length / columns);
    return rows * itemHeight;
  }, [products.length, columns, itemHeight]);

  // Enhanced scroll handler with debouncing
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Load more when user scrolls near the bottom
    if (hasMore && !loading) {
      const scrollPercentage = (newScrollTop + containerHeight) / totalHeight;
      if (scrollPercentage > 0.7) { // Load more when 70% scrolled (earlier trigger)
        onLoadMore();
      }
    }

    // Reset scrolling state after debounce
    clearTimeout(handleScroll.timeoutId);
    handleScroll.timeoutId = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [hasMore, loading, onLoadMore, containerHeight, totalHeight]);

  // Measure container width with debouncing
  useEffect(() => {
    const measureWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    measureWidth();
    
    // Debounce resize events
    const debouncedMeasure = debounce(measureWidth, 100);
    window.addEventListener('resize', debouncedMeasure);
    
    return () => {
      window.removeEventListener('resize', debouncedMeasure);
    };
  }, []);

  // Render visible products with enhanced performance
  const visibleProducts = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return products.slice(startIndex, endIndex + 1);
  }, [products, visibleRange]);

  // Calculate grid positioning with error handling
  const getItemPosition = useCallback((index) => {
    try {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      return {
        top: row * itemHeight,
        left: `${(col * 100) / columns}%`,
        width: `${100 / columns}%`,
        height: itemHeight
      };
    } catch (error) {
      console.warn('Error calculating item position:', error);
      return {
        top: 0,
        left: 0,
        width: '100%',
        height: itemHeight
      };
    }
  }, [columns, itemHeight]);

  // Enhanced skeleton loader component
  const ProductSkeleton = useCallback(({ index }) => {
    const position = getItemPosition(index);
    
    return (
      <div
        className="absolute p-2"
        style={position}
      >
        <div className="bg-gray-100 rounded-lg h-full overflow-hidden">
          {/* Image skeleton */}
          <div className="h-48 bg-gray-200 animate-pulse"></div>
          
          {/* Content skeleton */}
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }, [getItemPosition]);

  // Optimized loading skeletons
  const loadingSkeletons = useMemo(() => {
    const skeletonCount = Math.min(overscan * 2, 12);
    return Array.from({ length: skeletonCount }, (_, i) => (
      <ProductSkeleton key={`skeleton-${i}`} index={i} />
    ));
  }, [ProductSkeleton, overscan]);

  // Performance monitoring
  useEffect(() => {
    if (visibleProducts.length > 0) {
      const renderTime = performance.now();
      console.log(`[AdvancedVirtualizedGrid] Rendered ${visibleProducts.length} visible items out of ${products.length} total`);
      
      requestAnimationFrame(() => {
        const frameTime = performance.now() - renderTime;
        if (frameTime > 16) { // Warn if frame took longer than 60fps
          console.warn(`[AdvancedVirtualizedGrid] Slow render: ${frameTime.toFixed(2)}ms`);
        }
      });
    }
  }, [visibleProducts.length, products.length]);

  return (
    <div className={`relative ${className}`} {...props}>
      {/* Scrollable container with optimized styling */}
      <div
        ref={containerRef}
        className={`overflow-auto relative ${isScrolling ? 'scroll-smooth' : ''}`}
        style={{ 
          height: containerHeight,
          scrollBehavior: isScrolling ? 'smooth' : 'auto'
        }}
        onScroll={handleScroll}
      >
        {/* Total content area */}
        <div 
          style={{ 
            height: totalHeight, 
            position: 'relative',
            willChange: 'contents' // Optimize for scrolling performance
          }}
        >
          {/* Loading skeletons - only show when no visible products */}
          {loading && visibleProducts.length === 0 && (
            <div className="absolute inset-0">
              {loadingSkeletons}
            </div>
          )}

          {/* Visible products with enhanced performance */}
          {visibleProducts.map((product, relativeIndex) => {
            const absoluteIndex = visibleRange.startIndex + relativeIndex;
            const position = getItemPosition(absoluteIndex);
            
            return (
              <div
                key={`product-${product.id || absoluteIndex}`}
                className="absolute p-2"
                style={position}
              >
                {renderProductCard ? (
                  renderProductCard(product)
                ) : (
                  <HomeProductCard
                    product={product}
                    className="h-full"
                  />
                )}
              </div>
            );
          })}

          {/* Enhanced load more trigger */}
          {hasMore && !loading && visibleProducts.length > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4"
              style={{ top: totalHeight }}
            >
              <button
                onClick={() => onLoadMore()}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg text-xs sm:text-base"
              >
                Load More Products
              </button>
            </div>
          )}

          {/* Enhanced end message */}
          {!hasMore && products.length > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4 text-gray-500"
              style={{ top: totalHeight }}
            >
              <div className="text-center">
                <p className="text-lg">🎉</p>
                <p className="text-sm font-medium">You've seen all products</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced scroll progress indicator */}
      {products.length > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(100, (scrollTop / Math.max(1, totalHeight - containerHeight)) * 100)}%`
            }}
          />
        </div>
      )}

      {/* Performance indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {visibleProducts.length}/{products.length} items
        </div>
      )}
    </div>
  );
};

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default AdvancedVirtualizedGrid;