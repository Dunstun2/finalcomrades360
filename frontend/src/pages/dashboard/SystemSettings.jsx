import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SystemSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('platform');

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadSettings = async () => {
    try {
      const platformRes = await api.get('/admin/config/platform_settings').catch(() => ({ data: { success: false } }));
      setSettings({
        platform: platformRes.data.success ? platformRes.data.data : {
          siteName: 'Comrades360',
          siteDescription: 'Your trusted marketplace',
          contactEmail: 'admin@comrades360.com',
          supportPhone: '+254700000000',
          currency: 'KES',
          timezone: 'Africa/Nairobi'
        },
        security: {
          sessionTimeout: 30,
          passwordMinLength: 8,
          twoFactorEnabled: false,
          loginAttempts: 5,
          ipWhitelist: []
        },
        notifications: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: false,
          orderConfirmations: true,
          deliveryUpdates: true
        }
      });
    } catch (e) {
      setError('Failed to load settings');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (section, newSettings) => {
    resetAlerts();
    setLoading(true);
    try {
      setSettings(prev => ({ ...prev, [section]: { ...prev[section], ...newSettings } }));
      setSuccess('Settings updated successfully');
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'platform', name: 'Platform', icon: '🏢' },
    { id: 'delivery', name: 'Delivery Fees', icon: '🚚' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
        <button className="btn" onClick={loadSettings}>Refresh</button>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {/* Settings Tabs */}
      <div className="card">
        <div className="border-b">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
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
          {/* Platform Settings */}
          {activeTab === 'platform' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Platform Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Site Name</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={settings.platform?.siteName || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      platform: { ...prev.platform, siteName: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email</label>
                  <input
                    type="email"
                    className="w-full border rounded p-2"
                    value={settings.platform?.contactEmail || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      platform: { ...prev.platform, contactEmail: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Support Phone</label>
                  <input
                    type="tel"
                    className="w-full border rounded p-2"
                    value={settings.platform?.supportPhone || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      platform: { ...prev.platform, supportPhone: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <select
                    className="w-full border rounded p-2"
                    value={settings.platform?.currency || 'KES'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      platform: { ...prev.platform, currency: e.target.value }
                    }))}
                  >
                    <option value="KES">KES - Kenyan Shilling</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site Description</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={3}
                  value={settings.platform?.siteDescription || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    platform: { ...prev.platform, siteDescription: e.target.value }
                  }))}
                />
              </div>
              <button
                className="btn"
                disabled={loading}
                onClick={() => updateSettings('platform', settings.platform)}
              >
                {loading ? 'Saving...' : 'Save Platform Settings'}
              </button>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Security Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={settings.security?.sessionTimeout || 30}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password Min Length</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={settings.security?.passwordMinLength || 8}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev.security, passwordMinLength: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={settings.security?.loginAttempts || 5}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev.security, loginAttempts: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="twoFactor"
                    className="mr-2"
                    checked={settings.security?.twoFactorEnabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev.security, twoFactorEnabled: e.target.checked }
                    }))}
                  />
                  <label htmlFor="twoFactor" className="text-sm font-medium">Enable Two-Factor Authentication</label>
                </div>
              </div>
              <button
                className="btn"
                disabled={loading}
                onClick={() => updateSettings('security', settings.security)}
              >
                {loading ? 'Saving...' : 'Save Security Settings'}
              </button>
            </div>
          )}

          {/* Delivery Fees Info */}
          {activeTab === 'delivery' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Delivery Fee Policy</h3>
              </div>

              {/* Info Panel */}
              <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                <p className="text-sm font-bold text-blue-800">ℹ️ How delivery fees work on this platform</p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Delivery fees are <strong>set per product</strong> by the admin when listing or editing a product.
                  There is no global flat rate &mdash; each product carries its own delivery fee that is automatically
                  applied to the customer&apos;s order total when the order leaves the warehouse for delivery.
                </p>
              </div>

              {/* Route summary table — read-only */}
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-700">Route</th>
                      <th className="px-4 py-3 font-bold text-gray-700">Charged To</th>
                      <th className="px-4 py-3 font-bold text-gray-700">Fee Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-700">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">Seller → Warehouse</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-0.5 font-semibold">Seller</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 italic text-xs">N/A (seller's responsibility)</td>
                    </tr>
                    <tr className="hover:bg-gray-50 bg-blue-50/40">
                      <td className="px-4 py-3 font-medium">Warehouse → Customer</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5 font-semibold">Customer</span>
                      </td>
                      <td className="px-4 py-3 text-blue-700 font-semibold text-xs">Per-product delivery fee (set at product listing)</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">Customer → Seller (Returns)</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-0.5 font-semibold">Seller</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 italic text-xs">N/A (seller's responsibility)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 italic">
                To change the delivery fee for a product, go to <strong>Products → Edit Product → Delivery Fee</strong>.
              </p>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications' },
                  { key: 'smsNotifications', label: 'SMS Notifications' },
                  { key: 'pushNotifications', label: 'Push Notifications' },
                  { key: 'orderConfirmations', label: 'Order Confirmations' },
                  { key: 'deliveryUpdates', label: 'Delivery Updates' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={key}
                      className="mr-2"
                      checked={settings.notifications?.[key] || false}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, [key]: e.target.checked }
                      }))}
                    />
                    <label htmlFor={key} className="text-sm font-medium">{label}</label>
                  </div>
                ))}
              </div>
              <button
                className="btn"
                disabled={loading}
                onClick={() => updateSettings('notifications', settings.notifications)}
              >
                {loading ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}