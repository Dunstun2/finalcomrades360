import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { 
  FaShieldAlt, 
  FaLock, 
  FaUserShield, 
  FaHistory, 
  FaBan, 
  FaSync, 
  FaSave, 
  FaPlus, 
  FaTrash,
  FaClock,
  FaKey,
  FaExclamationTriangle
} from 'react-icons/fa';

export default function SecuritySettingsTab() {
  const [config, setConfig] = useState({
    sessionTimeout: 30,
    passwordMinLength: 8,
    twoFactorEnabled: false,
    loginAttempts: 5,
    ipWhitelist: []
  });
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newIP, setNewIP] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('policies');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [configRes, ipsRes, logsRes] = await Promise.all([
        adminApi.getPlatformConfig('security_settings'),
        adminApi.adminGetBlockedIPs(),
        adminApi.adminGetAuditLogs({ limit: 10 })
      ]);

      if (configRes.data.success) setConfig(configRes.data.data);
      if (ipsRes.data) setBlockedIPs(ipsRes.data.ips || ipsRes.data.list || ipsRes.data || []);
      if (logsRes.data.success) setAuditLogs(logsRes.data.logs);
    } catch (err) {
      console.error('Failed to load security data:', err);
      setError('Failed to load some security settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const cleanedConfig = {
        ...config,
        sessionTimeout: parseInt(config.sessionTimeout) || 0,
        passwordMinLength: parseInt(config.passwordMinLength) || 0,
        loginAttempts: parseInt(config.loginAttempts) || 0
      };
      await adminApi.updatePlatformConfig('security_settings', cleanedConfig);
      setConfig(cleanedConfig);
      setSuccess('Security policies updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save policies');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockIP = async (e) => {
    e.preventDefault();
    if (!newIP.trim()) return;
    try {
      await adminApi.adminBlockIP({ ipAddress: newIP, reason: 'Manual Admin Block' });
      setNewIP('');
      loadAllData();
      setSuccess('IP blocked successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to block IP');
    }
  };

  const handleUnblockIP = async (id) => {
    if (!window.confirm('Are you sure you want to unblock this IP?')) return;
    try {
      await adminApi.adminUnblockIP(id);
      loadAllData();
      setSuccess('IP unblocked successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unblock IP');
    }
  };

  const renderPolicies = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FaClock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-800">Session Management</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (Minutes)
              </label>
              <input 
                type="number"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={config.sessionTimeout}
                onChange={(e) => setConfig({...config, sessionTimeout: e.target.value === '' ? '' : parseInt(e.target.value)})}
              />
              <p className="text-xs text-gray-500 mt-1">Users will be logged out after this period of inactivity.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <FaKey className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-800">Authentication Policy</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Password Length
              </label>
              <input 
                type="number"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={config.passwordMinLength}
                onChange={(e) => setConfig({...config, passwordMinLength: e.target.value === '' ? '' : parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input 
                type="number"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={config.loginAttempts}
                onChange={(e) => setConfig({...config, loginAttempts: e.target.value === '' ? '' : parseInt(e.target.value)})}
              />
              <p className="text-xs text-gray-500 mt-1">Account will be locked after this many failed attempts.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <FaShieldAlt className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-800">Multi-Factor Authentication</h4>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={config.twoFactorEnabled}
              onChange={(e) => setConfig({...config, twoFactorEnabled: e.target.checked})}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600">Force all administrative users to use Two-Factor Authentication (Email/SMS/WebOTP) for login.</p>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSaveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50"
        >
          {saving ? 'Saving...' : (
            <>
              <FaSave />
              Apply Policies
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderIPBlocklist = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h4 className="font-bold text-gray-800 mb-4">Add IP to Blocklist</h4>
        <form onSubmit={handleBlockIP} className="flex gap-4">
          <input 
            type="text"
            placeholder="Enter IP address (e.g. 192.168.1.1)"
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
          />
          <button 
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
          >
            <FaPlus />
            Block IP
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">IP Address</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Blocked At</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {blockedIPs.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-10 text-center text-gray-500">No IPs currently blocked</td>
              </tr>
            ) : (
              blockedIPs.map((ip) => (
                <tr key={ip.id || ip.ipAddress} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{ip.ipAddress}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ip.reason || 'Manual block'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(ip.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleUnblockIP(ip.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Unblock"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAuditLogs = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h4 className="font-bold text-gray-800">Security Audit Logs</h4>
        <button onClick={loadAllData} className="text-blue-600 hover:text-blue-800">
          <FaSync className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Admin</th>
            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Action</th>
            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Target</th>
            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {auditLogs.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-6 py-10 text-center text-gray-500">No security logs found</td>
            </tr>
          ) : (
            auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">{log.admin?.name || 'System'}</div>
                  <div className="text-xs text-gray-500">{log.admin?.email || 'automated'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    log.action.includes('RESET') ? 'bg-orange-100 text-orange-700' :
                    log.action.includes('BLOCK') ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700">{log.targetName}</div>
                  <div className="text-xs text-gray-400">{log.targetType} #{log.targetId}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <FaExclamationTriangle />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
          {success}
        </div>
      )}

      <div className="flex gap-4 border-b">
        <button 
          onClick={() => setActiveSubTab('policies')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeSubTab === 'policies' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Policies
        </button>
        <button 
          onClick={() => setActiveSubTab('ip')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeSubTab === 'ip' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          IP Blocklist
        </button>
        <button 
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeSubTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Security Logs
        </button>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeSubTab === 'policies' && renderPolicies()}
            {activeSubTab === 'ip' && renderIPBlocklist()}
            {activeSubTab === 'audit' && renderAuditLogs()}
          </>
        )}
      </div>
    </div>
  );
}
