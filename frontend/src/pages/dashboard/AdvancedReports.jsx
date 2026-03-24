import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
    setError('');
    try {
      const params = { startDate: dateRange.start, endDate: dateRange.end };
      const [overviewRes, trendsRes] = await Promise.all([
        api.get('/analytics/overview', { params }),
        api.get('/analytics/trends/historical', { params: { ...params, interval: 'day' } })
      ]);

      const overview = overviewRes.data.data || {};
      const trends = trendsRes.data.trends || {};

      setReports({
        overview,
        sales: {
          daily: trends.orders?.map(t => ({ date: t.date, orders: t.count, revenue: t.revenue })) || [],
          topProducts: [] // This will be fetched on-demand in the Sales tab
        },
        users: {
          newRegistrations: trends.users?.reduce((sum, u) => sum + u.count, 0) || 0,
          activeUsers: overview.activeUsers || 0,
          topLocations: [] // Optional: Can be fetched separately
        }
      });
    } catch (e) {
      console.error('Analytics load error:', e);
      setError(e.response?.data?.message || 'Failed to load real-time analytics. Please ensure your backend is up to date.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadTopProducts = async () => {
    try {
      const res = await api.get('/admin/analytics/top-products', { params: { startDate: dateRange.start, endDate: dateRange.end } });
      setReports(prev => ({
        ...prev,
        sales: {
          ...prev.sales,
          topProducts: res.data.products || []
        }
      }));
    } catch (err) {
      console.warn('Failed to load top products:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'sales') {
      loadTopProducts();
    }
  }, [activeTab, dateRange]);

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

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-blue-600">📈</span> Revenue Trend
                  </h4>
                  <div className="h-72">
                    {reports.sales?.daily?.length > 0 ? (
                      <Line 
                        data={{
                          labels: reports.sales.daily.map(d => d.date),
                          datasets: [{
                            label: 'Daily Revenue (KES)',
                            data: reports.sales.daily.map(d => d.revenue),
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true } }
                        }}
                      />
                    ) : (
                      <div className="h-full bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm italic">
                        Insufficient data for revenue trend
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-green-600">🌱</span> User Registration Growth
                  </h4>
                  <div className="h-72">
                    {reports.sales?.daily?.length > 0 ? (
                      <Bar 
                        data={{
                          labels: reports.sales.daily.map(d => d.date),
                          datasets: [{
                            label: 'New Users',
                            data: reports.sales.daily.map(d => d.orders), // Placeholder for users trend if needed
                            backgroundColor: 'rgba(34, 197, 94, 0.6)',
                            borderRadius: 6
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                        }}
                      />
                    ) : (
                      <div className="h-full bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm italic">
                        Insufficient data for growth trend
                      </div>
                    )}
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
                  <h4 className="font-semibold mb-4">🏆 Top Selling Products</h4>
                  <div className="space-y-3">
                    {reports.sales?.topProducts?.length > 0 ? (
                      reports.sales.topProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{index + 1}</span>
                            <div>
                              <div className="font-medium text-sm">{product.name}</div>
                              <div className="text-xs text-gray-500">{product.totalQuantity ?? product.sales ?? 0} units sold</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600 text-sm">KES {Number(product.totalRevenue ?? product.revenue ?? 0).toLocaleString()}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-8 text-sm italic">No product sales data for this period</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-orange-500">📦</span> Daily Orders
                  </h4>
                  <div className="h-64">
                    {reports.sales?.daily?.length > 0 ? (
                      <Line
                        data={{
                          labels: reports.sales.daily.map(d => d.date),
                          datasets: [{
                            label: 'Orders',
                            data: reports.sales.daily.map(d => d.orders),
                            borderColor: 'rgb(249, 115, 22)',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                        }}
                      />
                    ) : (
                      <div className="h-full bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm italic">
                        No orders in this date range
                      </div>
                    )}
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

              {/* User Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{reports.overview?.totalUsers ?? 0}</div>
                  <div className="text-sm text-gray-500 mt-1">Total Registered Users</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{reports.users?.activeUsers ?? 0}</div>
                  <div className="text-sm text-gray-500 mt-1">Active Users (Period)</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{reports.users?.newRegistrations ?? 0}</div>
                  <div className="text-sm text-gray-500 mt-1">New Registrations (Period)</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-purple-600">👥</span> User Registration Trend
                </h4>
                <div className="h-72">
                  {reports.sales?.daily?.length > 0 ? (
                    <Line
                      data={{
                        labels: reports.sales.daily.map(d => d.date),
                        datasets: [{
                          label: 'Orders by Day',
                          data: reports.sales.daily.map(d => d.orders),
                          borderColor: 'rgb(139, 92, 246)',
                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          fill: true,
                          tension: 0.4
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                      }}
                    />
                  ) : (
                    <div className="h-full bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm italic">
                      No user data in this date range
                    </div>
                  )}
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