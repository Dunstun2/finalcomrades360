import React, { useState, useEffect } from 'react';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../../utils/imageUtils';
import { FaArrowLeft as FaBack, FaChartBar, FaEye, FaShoppingCart, FaStar, FaChartLine, FaUsers } from 'react-icons/fa';
import { adminApi } from '../../../services/api';


const ProductAnalytics = ({ onBack }) => {
  const [analytics, setAnalytics] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productMetrics, setProductMetrics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, topProductsRes] = await Promise.all([
        adminApi.getProductAnalytics(),
        adminApi.getTopPerformingProducts()
      ]);

      setAnalytics(analyticsRes.data);
      setTopProducts(topProductsRes.data || []);
    } catch (err) {
      setError('Failed to load product analytics');
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProductMetrics = async (productId) => {
    try {
      const metricsRes = await adminApi.getProductPerformanceMetrics(productId);
      setProductMetrics(metricsRes.data);
      setSelectedProduct(productId);
    } catch (err) {
      setError('Failed to load product metrics');
    }
  };

  const getPerformanceColor = (conversionRate) => {
    if (conversionRate >= 5) return 'text-green-600';
    if (conversionRate >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (conversionRate) => {
    if (conversionRate >= 5) return 'Excellent';
    if (conversionRate >= 2) return 'Good';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-100">
            <FaBack className="text-lg text-gray-500" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold">Product Analytics</h2>
            <p className="text-sm text-gray-500">Performance metrics and insights for your products</p>
          </div>
        </div>
        <button onClick={loadAnalytics} className="btn-outline">Refresh</button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* Overview Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaChartBar className="text-blue-600 text-2xl mr-3" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{analytics.overview.totalProducts}</div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaShoppingCart className="text-green-600 text-2xl mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-600">{analytics.overview.approvedProducts}</div>
                <div className="text-sm text-gray-600">Approved Products</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaEye className="text-yellow-600 text-2xl mr-3" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{analytics.overview.pendingProducts}</div>
                <div className="text-sm text-gray-600">Pending Approval</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaChartLine className="text-purple-600 text-2xl mr-3" />
              <div>
                <div className="text-2xl font-bold text-purple-600">{analytics.overview.featuredProducts}</div>
                <div className="text-sm text-gray-600">Featured Products</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Average Metrics */}
      {analytics && analytics.averages && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Pricing</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              KSh {Math.round(analytics.averages.avgPrice).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">Average display price across all products</p>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Rating</h3>
            <div className="text-3xl font-bold text-yellow-600 mb-2 flex items-center">
              <FaStar className="mr-2" />
              {analytics.averages.avgRating.toFixed(1)}
            </div>
            <p className="text-sm text-gray-600">Average customer rating</p>
          </div>
        </div>
      )}

      {/* Top Performing Products */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaChartBar className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No performance data available yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topProducts.slice(0, 10).map((product, index) => {
                  const conversionRate = product.viewCount > 0 ? (product.orderCount / product.viewCount) * 100 : 0;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadProductMetrics(product.id)}>
                      <td className="px-4 py-2">
                        <span className="font-medium text-gray-900">#{index + 1}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={resolveImageUrl(product.images[0])}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded mr-3"
                            />
                          ) : (
                            <FaChartBar className="w-10 h-10 text-gray-400 mr-3" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">ID: {product.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{product.viewCount || 0}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{product.orderCount || 0}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{conversionRate.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          <FaStar className="text-yellow-400 mr-1" />
                          <span className="font-medium">{(product.averageRating || 0).toFixed(1)}</span>
                          <span className="text-gray-500 text-sm ml-1">({product.reviewCount || 0})</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          conversionRate >= 5 ? 'bg-green-100 text-green-800' :
                          conversionRate >= 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getPerformanceLabel(conversionRate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Product Metrics Modal */}
      {selectedProduct && productMetrics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Product Performance Details</h3>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setProductMetrics(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Product Info */}
                <div className="flex items-center space-x-4">
                  {productMetrics.product.images && productMetrics.product.images.length > 0 ? (
                    <img
                      src={resolveImageUrl(productMetrics.product.images[0])}
                      alt={productMetrics.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <FaChartBar className="w-16 h-16 text-gray-400" />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{productMetrics.product.name}</h4>
                    <p className="text-sm text-gray-500">ID: {productMetrics.product.id}</p>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{productMetrics.product.viewCount || 0}</div>
                    <div className="text-sm text-gray-600">Total Views</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{productMetrics.product.orderCount || 0}</div>
                    <div className="text-sm text-gray-600">Total Orders</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className={`text-2xl font-bold ${getPerformanceColor(productMetrics.metrics.conversionRate)}`}>
                      {productMetrics.metrics.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Conversion Rate</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600 flex items-center">
                      <FaStar className="mr-1" />
                      {(productMetrics.product.averageRating || 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Avg Rating</div>
                  </div>
                </div>

                {/* Performance Assessment */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Performance Assessment</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      productMetrics.metrics.performance.excellent ? 'bg-green-100 text-green-800' :
                      productMetrics.metrics.performance.good ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {getPerformanceLabel(productMetrics.metrics.conversionRate)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {productMetrics.metrics.conversionRate >= 5 ? 'Excellent conversion rate!' :
                       productMetrics.metrics.conversionRate >= 2 ? 'Good performance, room for improvement' :
                       'Needs attention - low conversion rate'}
                    </span>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Activity (Last 30 Days)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{productMetrics.metrics.recentOrders}</div>
                      <div className="text-sm text-gray-600">Orders this month</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">
                        Last ordered: {productMetrics.product.lastOrderedAt ? new Date(productMetrics.product.lastOrderedAt).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Last viewed: {productMetrics.product.lastViewedAt ? new Date(productMetrics.product.lastViewedAt).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalytics;