import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ReferralAnalytics() {
  const [analytics, setAnalytics] = useState({});
  const [marketers, setMarketers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadData = async () => {
    try {
      const [analyticsRes, marketersRes] = await Promise.all([
        api.get('/admin/referrals/analytics'),
        api.get('/admin/marketers')
      ]);
      setAnalytics(analyticsRes.data);
      setMarketers(marketersRes.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load referral analytics');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const topMarketers = marketers
    .filter(m => m.referralCount > 0)
    .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
    .slice(0, 10);

  const topEarners = marketers
    .filter(m => (m.totalCommission || 0) > 0)
    .sort((a, b) => (b.totalCommission || 0) - (a.totalCommission || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Referral Analytics</h1>
        <button className="btn" onClick={loadData}>Refresh</button>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{analytics.totalReferrals || 0}</div>
          <div className="text-gray-600">Total Referrals</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{analytics.activeMarketers || 0}</div>
          <div className="text-gray-600">Active Marketers</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            KES {(analytics.totalCommissionPaid || 0).toFixed(2)}
          </div>
          <div className="text-gray-600">Total Commissions Paid</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            KES {(analytics.averageCommissionPerReferral || 0).toFixed(2)}
          </div>
          <div className="text-gray-600">Avg Commission/Referral</div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4">Top Referrers</h3>
          {topMarketers.length === 0 ? (
            <div className="text-gray-600 text-center py-4">No referral data available</div>
          ) : (
            <div className="space-y-3">
              {topMarketers.map((marketer, index) => (
                <div key={marketer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{marketer.name}</div>
                      <div className="text-sm text-gray-600">{marketer.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">{marketer.referralCount} referrals</div>
                    <div className="text-sm text-gray-600">
                      KES {(marketer.totalCommission || 0).toFixed(2)} earned
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Earners */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4">Top Earners</h3>
          {topEarners.length === 0 ? (
            <div className="text-gray-600 text-center py-4">No earnings data available</div>
          ) : (
            <div className="space-y-3">
              {topEarners.map((marketer, index) => (
                <div key={marketer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{marketer.name}</div>
                      <div className="text-sm text-gray-600">{marketer.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      KES {(marketer.totalCommission || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {marketer.referralCount || 0} referrals
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Marketer Performance */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">Marketer Performance Details</h3>
        {marketers.length === 0 ? (
          <div className="text-gray-600 text-center py-4">No marketers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Marketer</th>
                  <th className="p-3">Referral Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Referrals</th>
                  <th className="p-3">Commission Earned</th>
                  <th className="p-3">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {marketers.map(marketer => (
                  <tr key={marketer.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{marketer.name}</div>
                        <div className="text-sm text-gray-600">{marketer.email}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      {marketer.referralCode ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                          {marketer.referralCode}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No code</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        marketer.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {marketer.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{marketer.referralCount || 0}</td>
                    <td className="p-3 font-semibold text-green-600">
                      KES {(marketer.totalCommission || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {marketer.referralCount > 0 ? (
                        <span className="text-blue-600">
                          {((marketer.totalCommission || 0) / marketer.referralCount).toFixed(2)} avg
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}