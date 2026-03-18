import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdvancedReports() {
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadReports = async () => {
    setLoading(true);
    try {
      // This would load various analytics from the backend
      // For now, we'll use placeholder data
      setReports({
        overview: {
          totalUsers: 1250,
          totalOrders: 340,
          totalRevenue: 125000,
          totalProducts: 450,
          activeUsers: 890,
          conversionRate: 12.5
        },
        sales: {
          daily: [
            { date: '2024-01-01', orders: 12, revenue: 4500 },
            { date: '2024-01-02', orders: 15, revenue: 5200 },
            // ... more data
          ],
          topProducts: [
            { name: 'Product A', sales: 45, revenue: 13500 },
            { name: 'Product B', sales: 38, revenue: 11400 },
            // ... more data
          ]
        },
        users: {
          newRegistrations: 145,
          activeUsers: 890,
          topLocations: [
            { location: 'Nairobi', users: 450 },
            { location: 'Mombasa', users: 180 },
            // ... more data
          ]
        }
      });
    } catch (e) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const exportReport = async (type) => {
    resetAlerts();
    try {
      // This would trigger a download from the backend
      setSuccess(`${type} report exported successfully`);
    } catch (e) {
      setError('Failed to export report');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'sales', name: 'Sales', icon: '💰' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'products', name: 'Products', icon: '📦' },
    { id: 'custom', name: 'Custom Reports', icon: '🔧' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Advanced Reports & Analytics</h1>
        <div className="flex gap-2">
          <div className="flex gap-2 items-center">
            <label className="text-sm">From:</label>
            <input
              type="date"
              className="border rounded p-1"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <label className="text-sm">To:</label>
            <input
              type="date"
              className="border rounded p-1"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <button className="btn" onClick={loadReports} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {/* Report Tabs */}
      <div className="card">
        <div className="border-b">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Platform Overview</h3>
                <div className="flex gap-2">
                  <button className="btn-outline btn-sm" onClick={() => exportReport('PDF')}>Export PDF</button>
                  <button className="btn-outline btn-sm" onClick={() => exportReport('CSV')}>Export CSV</button>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{reports.overview?.totalUsers || 0}</div>
                  <div className="text-gray-600">Total Users</div>
                  <div className="text-sm text-green-600 mt-1">+12% from last month</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{reports.overview?.totalOrders || 0}</div>
                  <div className="text-gray-600">Total Orders</div>
                  <div className="text-sm text-green-600 mt-1">+8% from last month</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    KES {(reports.overview?.totalRevenue || 0).toLocaleString()}
                  </div>
                  <div className="text-gray-600">Total Revenue</div>
                  <div className="text-sm text-green-600 mt-1">+15% from last month</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{reports.overview?.totalProducts || 0}</div>
                  <div className="text-gray-600">Total Products</div>
                  <div className="text-sm text-green-600 mt-1">+5% from last month</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{reports.overview?.activeUsers || 0}</div>
                  <div className="text-gray-600">Active Users</div>
                  <div className="text-sm text-green-600 mt-1">+10% from last month</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{reports.overview?.conversionRate || 0}%</div>
                  <div className="text-gray-600">Conversion Rate</div>
                  <div className="text-sm text-red-600 mt-1">-2% from last month</div>
                </div>
              </div>

              {/* Charts Placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h4 className="font-semibold mb-4">Revenue Trend</h4>
                  <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                    Chart would be displayed here (Revenue over time)
                  </div>
                </div>
                <div className="card p-4">
                  <h4 className="font-semibold mb-4">User Growth</h4>
                  <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                    Chart would be displayed here (User registrations over time)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Sales Analytics</h3>
                <button className="btn-outline btn-sm" onClick={() => exportReport('Sales Report')}>Export Report</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h4 className="font-semibold mb-4">Top Selling Products</h4>
                  <div className="space-y-3">
                    {reports.sales?.topProducts?.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600">{product.sales} units sold</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">KES {product.revenue.toLocaleString()}</div>
                        </div>
                      </div>
                    )) || <div className="text-gray-500">No data available</div>}
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold mb-4">Sales Chart</h4>
                  <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                    Sales chart would be displayed here
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">User Analytics</h3>
                <button className="btn-outline btn-sm" onClick={() => exportReport('User Report')}>Export Report</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h4 className="font-semibold mb-4">User Locations</h4>
                  <div className="space-y-3">
                    {reports.users?.topLocations?.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="font-medium">{location.location}</div>
                        <div className="font-semibold text-blue-600">{location.users} users</div>
                      </div>
                    )) || <div className="text-gray-500">No data available</div>}
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold mb-4">User Registration Trend</h4>
                  <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                    User registration chart would be displayed here
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Product Analytics</h3>
                <button className="btn-outline btn-sm" onClick={() => exportReport('Product Report')}>Export Report</button>
              </div>

              <div className="card p-4">
                <h4 className="font-semibold mb-4">Product Performance</h4>
                <div className="text-center text-gray-500 py-8">
                  Product analytics charts and tables would be displayed here
                </div>
              </div>
            </div>
          )}

          {/* Custom Reports Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Custom Report Builder</h3>

              <div className="card p-4">
                <div className="text-center text-gray-500 py-8">
                  <div className="text-lg mb-2">🔧 Custom Report Builder</div>
                  <p>Advanced filtering, custom metrics, and scheduled reports would be available here.</p>
                  <p className="text-sm mt-2">Features would include:</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• Date range filtering</li>
                    <li>• Custom metric selection</li>
                    <li>• Advanced segmentation</li>
                    <li>• Scheduled report delivery</li>
                    <li>• Export to multiple formats</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}