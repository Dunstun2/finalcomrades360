import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import AdvancedVirtualizedGrid from '../AdvancedVirtualizedGrid';
import HomeProductCard from '../HomeProductCard';

const ProductGrid = ({
  products = [],
  loading = false,
  hasMore = false,
  onLoadMore = () => {},
  onAddToCart = () => {},
  onToggleWishlist = () => {},
  itemHeight = 400,
  containerHeight = 600,
  overscan = 3,
  className = '',
  ...productCardProps
}) => {
  // Memoize the product card renderer to prevent unnecessary re-renders
  const renderProductCard = useCallback((product) => (
    <HomeProductCard
      product={product}
      onAddToCart={onAddToCart}
      onToggleWishlist={onToggleWishlist}
      {...productCardProps}
    />
  ), [onAddToCart, onToggleWishlist, productCardProps]);

  return (
    <div className={`product-grid ${className}`}>
      <AdvancedVirtualizedGrid
        products={products}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        renderProductCard={renderProductCard}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        overscan={overscan}
        className="w-full"
      />
    </div>
  );
};

ProductGrid.propTypes = {
  products: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  hasMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  onAddToCart: PropTypes.func,
  onToggleWishlist: PropTypes.func,
  itemHeight: PropTypes.number,
  containerHeight: PropTypes.number,
  overscan: PropTypes.number,
  className: PropTypes.string,
};

export default React.memo(ProductGrid);
