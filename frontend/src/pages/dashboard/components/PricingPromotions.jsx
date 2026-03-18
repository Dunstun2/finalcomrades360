import React, { useState, useEffect } from 'react';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../../utils/imageUtils';

import { FaArrowLeft as FaBack, FaTags, FaFire, FaChartLine, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { adminApi } from '../../../services/api';


const PricingPromotions = ({ onBack }) => {
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'flash-sales', 'category-promotions'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, productsRes] = await Promise.all([
        adminApi.getPromotionAnalytics(),
        adminApi.getAllProducts()
      ]);

      setAnalytics(analyticsRes.data);
      setProducts(productsRes.data || []);
    } catch (err) {
      setError('Failed to load pricing and promotions data');
      console.error('Pricing load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createFlashSale = async (productId) => {
    const discount = prompt('Enter discount percentage (e.g., 20 for 20% off):');
    const endTime = prompt('Enter end time (YYYY-MM-DD HH:mm):');

    if (discount && endTime) {
      try {
        await adminApi.setProductFlashSale(productId, {
          isFlashSale: true,
          discountPercentage: parseFloat(discount),
          flashSaleEndTime: endTime
        });
        loadData(); // Refresh data
      } catch (err) {
        setError('Failed to create flash sale');
      }
    }
  };

  const removeFlashSale = async (productId) => {
    try {
      await adminApi.setProductFlashSale(productId, {
        isFlashSale: false,
        discountPercentage: 0,
        flashSaleEndTime: null
      });
      loadData(); // Refresh data
    } catch (err) {
      setError('Failed to remove flash sale');
    }
  };

  const createCategoryPromotion = async () => {
    const categoryId = prompt('Enter category ID:');
    const discount = prompt('Enter discount percentage:');
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    const endDate = prompt('Enter end date (YYYY-MM-DD):');

    if (categoryId && discount && startDate && endDate) {
      try {
        await adminApi.createCategoryPromotion({
          categoryId: parseInt(categoryId),
          discountPercentage: parseFloat(discount),
          startDate,
          endDate
        });
        loadData(); // Refresh data
      } catch (err) {
        setError('Failed to create category promotion');
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const flashSaleProducts = products.filter(p => p.isFlashSale);
  const activePromotions = flashSaleProducts.filter(p =>
    new Date(p.flashSaleEndTime) > new Date()
  );

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-100">
            <FaBack className="text-lg text-gray-500" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold">Pricing & Promotions</h2>
            <p className="text-sm text-gray-500">Manage product pricing and promotional campaigns</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-outline">Refresh</button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('flash-sales')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'flash-sales' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Flash Sales
        </button>
        <button
          onClick={() => setActiveTab('category-promotions')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'category-promotions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Category Promotions
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <FaFire className="text-orange-600 text-2xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-orange-600">{activePromotions.length}</div>
                  <div className="text-sm text-gray-600">Active Flash Sales</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <FaTags className="text-green-600 text-2xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{flashSaleProducts.length}</div>
                  <div className="text-sm text-gray-600">Total Promotions</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <FaChartLine className="text-blue-600 text-2xl mr-3" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics ? Math.round(analytics.totalDiscountValue) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Discount Value</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('flash-sales')}
                className="bg-white p-4 rounded-lg border-2 border-dashed border-orange-300 hover:border-orange-500 text-left transition-colors"
              >
                <div className="flex items-center">
                  <FaFire className="text-orange-600 text-xl mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Create Flash Sale</div>
                    <div className="text-sm text-gray-600">Set up time-limited discounts</div>
                  </div>
                </div>
              </button>

              <button
                onClick={createCategoryPromotion}
                className="bg-white p-4 rounded-lg border-2 border-dashed border-green-300 hover:border-green-500 text-left transition-colors"
              >
                <div className="flex items-center">
                  <FaTags className="text-green-600 text-xl mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Category Promotion</div>
                    <div className="text-sm text-gray-600">Discount entire categories</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Pricing Insights */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Average Display Price</h4>
                <div className="text-3xl font-bold text-blue-600">
                  KSh {products.length > 0 ? Math.round(products.reduce((sum, p) => sum + (p.displayPrice || 0), 0) / products.length).toLocaleString() : 0}
                </div>
                <p className="text-sm text-gray-600 mt-1">Across all approved products</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Price Range Distribution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Under KSh 1,000</span>
                    <span>{products.filter(p => (p.displayPrice || 0) < 1000).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>KSh 1,000 - 5,000</span>
                    <span>{products.filter(p => (p.displayPrice || 0) >= 1000 && (p.displayPrice || 0) < 5000).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>KSh 5,000 - 10,000</span>
                    <span>{products.filter(p => (p.displayPrice || 0) >= 5000 && (p.displayPrice || 0) < 10000).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Over KSh 10,000</span>
                    <span>{products.filter(p => (p.displayPrice || 0) >= 10000).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flash Sales Tab */}
      {activeTab === 'flash-sales' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Flash Sales Management</h3>
            <button
              onClick={() => {
                const productId = prompt('Enter product ID:');
                if (productId) createFlashSale(productId);
              }}
              className="btn"
            >
              <FaPlus className="mr-2" />
              Create Flash Sale
            </button>
          </div>

          {flashSaleProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaFire className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No flash sales active</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first flash sale to boost sales!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ends</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {flashSaleProducts.map((product) => {
                    const salePrice = product.displayPrice * (1 - product.discountPercentage / 100);
                    const isActive = new Date(product.flashSaleEndTime) > new Date();

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={resolveImageUrl(product.images[0])}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded mr-3"
                              />
                            ) : (
                              <FaTags className="w-10 h-10 text-gray-400 mr-3" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">ID: {product.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-400 line-through">KSh {product.displayPrice?.toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <span className="text-red-600 font-medium">{product.discountPercentage}%</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-medium text-green-600">KSh {Math.round(salePrice).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-2">
                          {new Date(product.flashSaleEndTime).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {isActive ? 'Active' : 'Expired'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeFlashSale(product.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            <FaTrash className="inline mr-1" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Category Promotions Tab */}
      {activeTab === 'category-promotions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Category Promotions</h3>
            <button onClick={createCategoryPromotion} className="btn">
              <FaPlus className="mr-2" />
              Create Category Promotion
            </button>
          </div>

          <div className="bg-blue-50 rounded-lg p-6">
            <h4 className="font-medium text-blue-900 mb-2">How Category Promotions Work</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Apply discounts to all products in a specific category</li>
              <li>• Set start and end dates for the promotion</li>
              <li>• Automatically applies to new products added to the category</li>
              <li>• Can be combined with individual product flash sales</li>
            </ul>
          </div>

          <div className="text-center py-12 text-gray-500">
            <FaTags className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Category promotions feature</h3>
            <p className="mt-1 text-sm text-gray-500">Coming soon - full category-wide discount management</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPromotions;