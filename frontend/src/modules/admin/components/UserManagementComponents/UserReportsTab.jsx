import React, { useState, useEffect } from 'react';
import { adminApi } from '@/shared/services/api';
import { 
  FaChartPie, 
  FaDownload, 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaHourglassHalf,
  FaFileCsv,
  FaSync
} from 'react-icons/fa';

export default function UserReportsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUserAnalytics();
      setStats(res.data);
    } catch (err) {
      setError('Failed to load user analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminApi.exportUserReport();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed. The endpoint may not be implemented yet.');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const roleColors = {
    customer: 'bg-blue-500',
    marketer: 'bg-green-500',
    seller: 'bg-purple-500',
    delivery_agent: 'bg-orange-500',
    service_provider: 'bg-pink-500',
    admin: 'bg-red-500',
    super_admin: 'bg-gray-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FaChartPie className="text-blue-600" />
          User Insights & Analytics
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={loadStats}
            className="p-2 text-gray-500 hover:text-blue-600 transition"
            title="Refresh Data"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : (
              <>
                <FaFileCsv />
                Export Users CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats?.totalUsers, icon: FaUsers, color: 'blue' },
          { label: 'Active Users', value: stats?.activeUsers, icon: FaUserCheck, color: 'green' },
          { label: 'Deactivated', value: stats?.deactivatedUsers, icon: FaUserTimes, color: 'red' },
          { label: 'Pending Apps', value: stats?.pendingApplications, icon: FaHourglassHalf, color: 'orange' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-3 bg-${item.color}-50 text-${item.color}-600 rounded-xl`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className={`text-sm font-bold text-${item.color}-600 bg-${item.color}-50 px-2 py-1 rounded-lg`}>
                {stats?.totalUsers ? Math.round((item.value / stats.totalUsers) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-black text-gray-800">{item.value?.toLocaleString() || 0}</div>
            <div className="text-sm font-medium text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-6">User Role Distribution</h4>
          <div className="space-y-4">
            {stats?.roleCounts && Object.entries(stats.roleCounts).sort((a,b) => b[1] - a[1]).map(([role, count]) => {
              const percentage = stats.totalUsers ? (count / stats.totalUsers) * 100 : 0;
              return (
                <div key={role} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-700 capitalize">{role.replace('_', ' ')}</span>
                    <span className="text-gray-500 font-medium">{count.toLocaleString()} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${roleColors[role] || 'bg-blue-500'} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Health / Growth (Mock for now or simplified) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-4">Platform Growth</h4>
          <div className="h-64 flex flex-col justify-center items-center text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <FaChartPie className="w-8 h-8" />
            </div>
            <p className="text-gray-600 font-medium">Historical growth data and seasonal trends will be visualized here.</p>
            <p className="text-xs text-gray-400 mt-2 italic">Connect to Analytics Engine for real-time tracking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
