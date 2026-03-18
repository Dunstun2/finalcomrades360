import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';

export default function CustomerWishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart, addToCart: addToCartContext, removeFromCart } = useCart();

  const fileBase = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/?api\/?$/, '') : '';

  

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wishlist');
      setWishlistItems(response.data);
    } catch (err) {
      setError('Failed to load wishlist');
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      setWishlistItems(prev => prev.filter(item => item.productId !== productId));
    } catch (err) {
      alert('Failed to remove from wishlist');
      console.error('Error removing from wishlist:', err);
    }
  };

  const addToCart = async (product) => {
    try {
      await addToCartContext(product.id, 1);
      alert('Added to cart!');
      // Optionally remove from wishlist after adding to cart
      // removeFromWishlist(product.id);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to add to cart';
      alert(`Error: ${errorMessage}`);
      console.error('Error adding to cart:', err);
    }
  };

  const handleCartAction = async (product) => {
    const isInCart = cart?.items?.some(item => item.productId === product.id);
    if (isInCart) {
      try {
        await removeFromCart(product.id);
        alert('Removed from cart!');
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to remove from cart';
        alert(`Error: ${errorMessage}`);
        console.error('Error removing from cart:', err);
      }
    } else {
      await addToCart(product);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading wishlist...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchWishlist}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
        <p className="text-gray-600 mt-2">
          {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} in your wishlist
        </p>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">❤️</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-6">Start adding items you love to your wishlist!</p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <Link to={`/product/${item.Product.id}`}>
                <div className="aspect-w-1 aspect-h-1">
                  <img
                    src={resolveImageUrl(item.Product.images?.[0])}
                    alt={item.Product.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
              </Link>

              <div className="p-4">
                <Link to={`/product/${item.Product.id}`}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                    {item.Product.name}
                  </h3>
                </Link>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-green-600">
                    KES {item.Product.displayPrice?.toLocaleString() || item.Product.basePrice?.toLocaleString()}
                  </span>
                  {item.Product.discountPercentage > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                      {item.Product.discountPercentage}% OFF
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <p>Seller: {item.Product.Seller?.name || 'Comrades360'}</p>
                  <p>Stock: {item.Product.stock > 0 ? `${item.Product.stock} available` : 'Out of stock'}</p>
                </div>

                <div className="flex gap-2">
                  {(() => {
                    const isInCart = cart?.items?.some(cartItem => cartItem.productId === item.Product.id);
                    return (
                      <>
                        <button
                          onClick={() => handleCartAction(item.Product)}
                          disabled={item.Product.stock <= 0 && !isInCart}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                            item.Product.stock > 0 || isInCart
                              ? isInCart
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isInCart ? 'In Cart' : 'Add to Cart'}
                        </button>

                        <button
                          onClick={() => removeFromWishlist(item.productId)}
                          className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Remove from wishlist"
                        >
                          🗑️
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
