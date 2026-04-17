import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function MarketerManagement() {
  const [marketers, setMarketers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('all-marketers');

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadMarketers = async () => {
    try {
      setLoading(true);
      const r = await api.get('/admin/users?role=marketer&limit=1000');
      // The unified endpoint returns { success: true, users: [...] }
      setMarketers(r.data.users || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load marketers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketers();
  }, []);

  const suspendMarketer = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this marketer?')) return;
    resetAlerts();
    try {
      await api.post(`/admin/marketers/${userId}/suspend`);
      setSuccess('Marketer suspended');
      loadMarketers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to suspend marketer');
    }
  };

  const reactivateMarketer = async (userId) => {
    resetAlerts();
    try {
      await api.post(`/admin/marketers/${userId}/reactivate`);
      setSuccess('Marketer reactivated');
      loadMarketers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reactivate marketer');
    }
  };

  const revokeReferralCode = async (userId) => {
    if (!window.confirm('Are you sure you want to revoke this referral code?')) return;
    resetAlerts();
    try {
      await api.post(`/admin/marketers/${userId}/referral/revoke`);
      setSuccess('Referral code revoked');
      loadMarketers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to revoke referral code');
    }
  };

  const assignReferralCode = async (userId) => {
    const code = window.prompt('Enter referral code:');
    if (!code) return;
    resetAlerts();
    try {
      await api.post(`/admin/marketers/${userId}/referral/assign`, { code });
      setSuccess('Referral code assigned');
      loadMarketers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to assign referral code');
    }
  };

  const tabs = [
    { id: 'all-marketers', name: 'All Marketers', icon: '📋' },
    { id: 'performance', name: 'Performance', icon: '📈' },

    { id: 'referrals', name: 'Referrals', icon: '🔗' },
    { id: 'commissions', name: 'Commissions', icon: '💰' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'all-marketers':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">Marketer Management</h1>
              <button className="btn" onClick={loadMarketers}>Refresh</button>
            </div>

            {/* Alerts */}
            {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
            {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

            {marketers.length === 0 ? (
              <div className="card p-6 text-center text-gray-600">No marketers found.</div>
            ) : (
              <div className="card">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Referral Code</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Referrals</th>
                        <th className="p-3">Commission Earned</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketers.map(marketer => (
                        <tr key={marketer.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{marketer.name}</td>
                          <td className="p-3">{marketer.email}</td>
                          <td className="p-3 font-mono">
                            {marketer.referralCode || (
                              <span className="text-gray-400 italic">No code</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${!marketer.isDeactivated
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                              }`}>
                              {!marketer.isDeactivated ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3">{marketer.referralCount || 0}</td>
                          <td className="p-3">KES {marketer.totalCommission?.toFixed(2) || '0.00'}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {marketer.referralCode ? (
                                <button
                                  className="btn-danger btn-xs"
                                  onClick={() => revokeReferralCode(marketer.id)}
                                >
                                  Revoke Code
                                </button>
                              ) : (
                                <button
                                  className="btn btn-xs"
                                  onClick={() => assignReferralCode(marketer.id)}
                                >
                                  Assign Code
                                </button>
                              )}
                              {!marketer.isDeactivated ? (
                                <button
                                  className="btn-warning btn-xs"
                                  onClick={() => suspendMarketer(marketer.id)}
                                >
                                  Suspend
                                </button>
                              ) : (
                                <button
                                  className="btn-success btn-xs"
                                  onClick={() => reactivateMarketer(marketer.id)}
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{marketers.length}</div>
                <div className="text-gray-600">Total Marketers</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {marketers.filter(m => !m.isDeactivated).length}
                </div>
                <div className="text-gray-600">Active Marketers</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {marketers.reduce((sum, m) => sum + (m.referralCount || 0), 0)}
                </div>
                <div className="text-gray-600">Total Referrals</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  KES {marketers.reduce((sum, m) => sum + (m.totalCommission || 0), 0).toFixed(2)}
                </div>
                <div className="text-gray-600">Total Commissions</div>
              </div>
            </div>
          </div>
        );
      case 'performance':
        return (
          <div className="p-6 text-center text-gray-600">
            <h2 className="text-xl font-semibold mb-4">Performance Analytics</h2>
            <p>Marketer performance metrics will be displayed here.</p>
          </div>
        );
      case 'referrals':
        return (
          <div className="p-6 text-center text-gray-600">
            <h2 className="text-xl font-semibold mb-4">Referral Tracking</h2>
            <p>Referral tracking and analytics will be displayed here.</p>
          </div>
        );
      case 'commissions':
        return (
          <div className="p-6 text-center text-gray-600">
            <h2 className="text-xl font-semibold mb-4">Commission Management</h2>
            <p>Commission tracking and payout management will be implemented here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Top Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Marketer Management</h1>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}