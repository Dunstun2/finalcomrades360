import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { resolveImageUrl, FALLBACK_IMAGE } from '../utils/imageUtils';

export default function ProductShare() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
    if (referralCode) {
      trackClick();
    }
  }, [productId, referralCode]);

  const loadProduct = async () => {
    try {
      const response = await api.get(`/products/${productId}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackClick = async () => {
    try {
      await api.post('/sharing/track-click', {
        productId,
        referralCode,
        socialPlatform: searchParams.get('platform') || 'direct'
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  };

  const buyNow = async () => {
    if (!localStorage.getItem('token')) { alert('Please login'); window.location.href = '/login'; return; }
    try {
      await api.post('/cart/items', {
        productId: product.id,
        quantity: 1
      });
      window.location.href = '/cart';
    } catch (error) {
      alert(error.response?.data?.error || 'Unable to proceed');
    }
  };

  if (loading) {
    return <div className="container py-8">Loading product...</div>;
  }

  if (!product) {
    return <div className="container py-8">Product not found.</div>;
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        {referralCode && (
          <div className="bg-blue-100 border border-blue-300 rounded p-3 mb-6">
            <p className="text-blue-800">
              🎉 You're viewing this product through a student referral! 
              Support your fellow student by purchasing through this link.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <img 
              src={product.images?.[0] || '/placeholder.jpg'} 
              alt={product.name}
              className="w-full h-96 object-cover rounded-lg"
            />
            {product.images?.length > 1 && (
              <div className="flex space-x-2 mt-4">
                {product.images.slice(1, 5).map((img, index) => (
                  <img 
                    key={index}
                    src={img} 
                    alt={`${product.name} ${index + 2}`}
                    className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-75"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            
            <div className="mb-6">
              <div className="text-3xl font-bold text-green-600 mb-2">
                KES {Number(product.displayPrice || product.basePrice || 0).toLocaleString()}
              </div>
              {product.basePrice !== product.displayPrice && (
                <div className="text-lg text-gray-500 line-through">
                  KES {product.basePrice}
                </div>
              )}
              <div className="text-sm text-gray-600">
                + KES {product.deliveryFee} delivery fee
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{product.description}</p>
            </div>

            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">
                Stock: {product.stock} available
              </div>
              <div className="text-sm text-gray-600">
                Sold: {product.totalSales} times
              </div>
            </div>

            <div className="space-y-3">
              {product.stock === 0 ? (
                <button disabled className="w-full bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed">Out of Stock</button>
              ) : (
                <button
                  onClick={buyNow}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Buy Now
                </button>
              )}
            </div>

            {referralCode && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  💰 By purchasing through this referral link, you're helping a fellow student earn commission!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
