import React, { useEffect, useState } from 'react';
import { FaChartLine, FaShoppingCart, FaMoneyBillWave, FaUsers, FaBox, FaTruck, FaCheckCircle, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import api from '../../services/api';
import { formatPrice } from '../../utils/currency';

export default function OrderAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/orders/analytics?range=${timeRange}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  const formatPercentage = (value, total) => {
    if (!total) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
  };

  const getStatusColor = (status) => {
    const colors = {
      'delivered': 'bg-green-100 text-green-800',
      'shipped': 'bg-blue-100 text-blue-800',
      'processing': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'returned': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <FaChartLine className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data available</h3>
        <p className="mt-1 text-sm text-gray-500">Unable to load order analytics at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Order Analytics</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalOrders)}</p>
              <div className="flex items-center mt-2">
                {analytics.orderGrowth >= 0 ? (
                  <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <FiTrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${analytics.orderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(analytics.orderGrowth)}% from last period
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.totalRevenue)}</p>
              <div className="flex items-center mt-2">
                {analytics.revenueGrowth >= 0 ? (
                  <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <FiTrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(analytics.revenueGrowth)}% from last period
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaMoneyBillWave className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order Value</p>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.averageOrderValue)}</p>
              <div className="flex items-center mt-2">
                {analytics.aovGrowth >= 0 ? (
                  <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <FiTrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${analytics.aovGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(analytics.aovGrowth)}% from last period
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaChartLine className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.conversionRate}%</p>
              <div className="flex items-center mt-2">
                {analytics.conversionGrowth >= 0 ? (
                  <FiTrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <FiTrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${analytics.conversionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(analytics.conversionGrowth)}% from last period
                </span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FaUsers className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status Distribution</h3>
          <div className="space-y-3">
            {analytics.statusDistribution.map((status) => (
              <div key={status.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status).split(' ')[0]}`}></div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {status.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{status.count} orders</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPercentage(status.count, analytics.totalOrders)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
          <div className="space-y-3">
            {analytics.topProducts.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.totalSold} sold</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(product.totalRevenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Trends */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <FaChartLine className="mx-auto h-12 w-12 mb-2" />
            <p>Revenue chart visualization would go here</p>
            <p className="text-sm">Integration with charting library needed</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Order Activity</h3>
        <div className="space-y-3">
          {analytics.recentOrders.slice(0, 10).map((order) => (
            <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status).split(' ')[0]}`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{order.User?.name || 'Unknown Customer'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatPrice(order.total)}</p>
                <p className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('en-KE', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fulfillment Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Processing Time</span>
              <span className="text-sm font-medium">{analytics.averageProcessingTime} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Delivery Time</span>
              <span className="text-sm font-medium">{analytics.averageDeliveryTime} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">On-time Delivery Rate</span>
              <span className="text-sm font-medium text-green-600">{analytics.onTimeDeliveryRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Satisfaction</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Return Rate</span>
              <span className="text-sm font-medium">{analytics.returnRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cancellation Rate</span>
              <span className="text-sm font-medium">{analytics.cancellationRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Repeat Purchase Rate</span>
              <span className="text-sm font-medium text-green-600">{analytics.repeatPurchaseRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Geographic Insights</h3>
          <div className="space-y-3">
            {analytics.topRegions.slice(0, 3).map((region, index) => (
              <div key={region.region} className="flex justify-between">
                <span className="text-sm text-gray-600">{region.region}</span>
                <span className="text-sm font-medium">{region.orderCount} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}