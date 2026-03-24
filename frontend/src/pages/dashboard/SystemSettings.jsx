import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    platform: { siteName: 'Comrades360', siteDescription: 'Your trusted marketplace', contactEmail: 'admin@comrades360.com', supportPhone: '+254700000000', currency: 'KES', timezone: 'Africa/Nairobi' },
    mpesa_config: { consumerKey: '', consumerSecret: '', passkey: '', shortcode: '174379', stkTimeout: 60, mockMode: false },
    mpesa_manual_instructions: { paybill: '714888', accountNumber: '223052' },
    airtel_config: { clientId: '', clientSecret: '', callbackUrl: '' },
    sms_config: { username: '', apiKey: '', provider: 'africastalking' },
    whatsapp_config: { 
      method: 'local',
      templates: {
        orderPlaced: 'Hi {name}, your order #{orderNumber} has been received! Total: KES {total}.',
        orderInTransit: 'Good news! Your order #{orderNumber} has been collected by {agentName} and is in transit. 🚚',
        orderReadyPickup: 'Your order #{orderNumber} is ready for collection at {stationName}! 📦',
        orderDelivered: 'Hi {name}, your order #{orderNumber} has been delivered. Thank you!',
        agentArrived: 'Your delivery agent {agentName} has arrived at your location! 📍 Please meet them to collect order #{orderNumber}.',
        agentTaskAssigned: 'You have been assigned a new delivery task for order #{orderNumber}. Type: {deliveryType}',
        agentTaskReassigned: 'A delivery task for order #{orderNumber} has been reassigned to you.',
        adminTaskRejected: 'Delivery agent {agentName} rejected task for order #{orderNumber}. Reason: {reason}',
        phoneVerification: 'Your Comrades360 verification OTP is {otp}. It expires in 10 minutes.',
        withdrawalStatus: 'Your withdrawal of KES {amount} has been processed successfully! 💰'
      }
    },
    finance_settings: { referralSplit: { primary: 0.6, secondary: 0.4 }, minPayout: { seller: 1000, marketer: 500, delivery_agent: 200, station_manager: 500, warehouse_manager: 1000, service_provider: 500 } },
    logistic_settings: { warehouseHours: { open: '08:00', close: '20:00' }, autoCancelUnpaidHours: 24, deliveryFeeBuffer: 0, fastfoodTaskExpiryMinutes: 5, productTaskExpiryMinutes: 30, stuckDeliveryHours: 3 },
    seo_settings: { title: 'Comrades360', description: 'Student Marketplace', keywords: 'university, marketplace', socialLinks: { facebook: '', instagram: '', twitter: '' } },
    maintenance_settings: { enabled: false, message: 'System is currently under maintenance.' },
    security: { sessionTimeout: 30, passwordMinLength: 8, twoFactorEnabled: false, loginAttempts: 5, ipWhitelist: [] },
    notifications: { emailNotifications: true, smsNotifications: true, pushNotifications: false, orderConfirmations: true, deliveryUpdates: true },
    system_env: { server: { port: 4000, nodeEnv: 'development', baseUrl: 'http://localhost:4000', apiUrl: '/api' }, app: { frontendUrl: 'http://localhost:3000', supportEmail: 'support@comrades360.com' }, database: { dialect: 'sqlite', storage: './database.sqlite' } }
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('platform');

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadSettings = async () => {
    setFetching(true);
    try {
      const keys = [
        'platform_settings', 
        'mpesa_config', 
        'mpesa_manual_instructions', 
        'airtel_config',
        'sms_config',
        'whatsapp_config',
        'finance_settings',
        'logistic_settings',
        'seo_settings',
        'maintenance_settings',
        'security_settings',
        'notification_settings',
        'system_env'
      ];

      const results = await Promise.all(
        keys.map(key => api.get(`/admin/config/${key}`).catch(err => {
          console.warn(`[SystemSettings] Failed to fetch ${key}:`, err.message);
          return { data: { success: false } };
        }))
      );

      setSettings(prev => {
        const next = { ...prev };
        keys.forEach((key, index) => {
          const res = results[index];
          if (res.data?.success && res.data?.data) {
            const stateKey = key === 'platform_settings' ? 'platform' 
                           : key === 'security_settings' ? 'security'
                           : key === 'notification_settings' ? 'notifications'
                           : key;
            
            const incomingData = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
            
            // Special deep merge for whatsapp_config.templates and finance_settings.minPayout
            if (stateKey === 'whatsapp_config' && incomingData.templates) {
              next[stateKey] = { ...prev[stateKey], ...incomingData, templates: { ...prev[stateKey].templates, ...incomingData.templates } };
            } else if (stateKey === 'finance_settings' && incomingData.minPayout) {
              next[stateKey] = { ...prev[stateKey], ...incomingData, minPayout: { ...prev[stateKey].minPayout, ...incomingData.minPayout } };
            } else {
              next[stateKey] = { ...prev[stateKey], ...incomingData };
            }
          }
        });
        console.log('[SystemSettings] Final Merged Config (Stringified):', JSON.stringify(next, null, 2));
        return next;
      });
    } catch (e) {
      console.error('Failed to load settings:', e);
      setError('Failed to load settings');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (section, data) => {
    resetAlerts();
    setLoading(true);
    try {
      const keyMap = {
        platform: 'platform_settings',
        mpesa_config: 'mpesa_config',
        mpesa_manual_instructions: 'mpesa_manual_instructions',
        airtel_config: 'airtel_config',
        sms_config: 'sms_config',
        whatsapp_config: 'whatsapp_config',
        finance_settings: 'finance_settings',
        logistic_settings: 'logistic_settings',
        seo_settings: 'seo_settings',
        maintenance_settings: 'maintenance_settings',
        security: 'security_settings',
        notifications: 'notification_settings'
      };

      const dbKey = keyMap[section];
      await api.post(`/admin/config/${dbKey}`, { value: data });
      
      setSettings(prev => ({ ...prev, [section]: data }));
      setSuccess(`${section.replace(/_/g, ' ').toUpperCase()} updated successfully`);
    } catch (e) {
      console.error(`Failed to update ${section} settings:`, e);
      setError(e.response?.data?.message || e.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'platform', name: 'Platform', icon: '🏢' },
    { id: 'payment', name: 'Payments', icon: '💳' },
    { id: 'messaging', name: 'Messaging', icon: '📱' },
    { id: 'finance', name: 'Finance', icon: '💰' },
    { id: 'logistics', name: 'Logistics', icon: '🚚' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'environment', name: 'Environment', icon: '🌐' }
  ];

  if (fetching) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
        <button className="btn bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={loadSettings}>Refresh Data</button>
      </div>

      {/* Alerts */}
      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 animate-pulse">{error}</div>}
      {success && <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">{success}</div>}

      <div className="space-y-6">
        {/* Horizontal Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all border ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' 
                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10">

          
          {/* PLATFORM TAB */}
          {activeTab === 'platform' && (
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">General Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Site Name" value={settings.platform.siteName} onChange={(v) => setSettings(p => ({...p, platform: {...p.platform, siteName: v}}))} />
                  <FormInput label="Support Phone" value={settings.platform.supportPhone} onChange={(v) => setSettings(p => ({...p, platform: {...p.platform, supportPhone: v}}))} />
                  <FormInput label="Contact Email" value={settings.platform.contactEmail} className="md:col-span-2" onChange={(v) => setSettings(p => ({...p, platform: {...p.platform, contactEmail: v}}))} />
                </div>
                <div className="mt-4">
                   <label className="block text-sm font-semibold text-gray-600 mb-1">Site Description</label>
                   <textarea className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" rows={3} value={settings.platform.siteDescription} onChange={(e) => setSettings(p => ({...p, platform: {...p.platform, siteDescription: e.target.value}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('platform', settings.platform)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">🚨 Maintenance Mode</h3>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-4 mb-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.maintenance_settings.enabled} onChange={(e) => setSettings(p => ({...p, maintenance_settings: {...p.maintenance_settings, enabled: e.target.checked}}))} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      <span className="ml-3 text-sm font-bold text-red-800">{settings.maintenance_settings.enabled ? 'SYSTEM LOCKED' : 'SYSTEM ONLINE'}</span>
                    </label>
                  </div>
                  <label className="block text-sm font-semibold text-red-700 mb-1">Broadcast Message</label>
                  <textarea className="w-full border-red-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 outline-none h-24" value={settings.maintenance_settings.message} onChange={(e) => setSettings(p => ({...p, maintenance_settings: {...p.maintenance_settings, message: e.target.value}}))} />
                  <SaveButton onClick={() => updateSettings('maintenance_settings', settings.maintenance_settings)} loading={loading} variant="red" />
                </div>
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">SEO & Metadata</h3>
                <div className="space-y-4">
                  <FormInput label="SEO Page Title" value={settings.seo_settings.title} onChange={(v) => setSettings(p => ({...p, seo_settings: {...p.seo_settings, title: v}}))} />
                  <FormInput label="Keywords (Comma separated)" value={settings.seo_settings.keywords} onChange={(v) => setSettings(p => ({...p, seo_settings: {...p.seo_settings, keywords: v}}))} />
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Meta Description</label>
                    <textarea className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" rows={3} value={settings.seo_settings.description} onChange={(e) => setSettings(p => ({...p, seo_settings: {...p.seo_settings, description: e.target.value}}))} />
                  </div>
                  <SaveButton onClick={() => updateSettings('seo_settings', settings.seo_settings)} loading={loading} />
                </div>
              </section>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payment' && (
            <div className="space-y-10">
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-1">M-Pesa STK Push (Express)</h3>
                <p className="text-sm text-gray-500 mb-6">Manage API keys for automated STK push payments.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Consumer Key" value={settings.mpesa_config.consumerKey} onChange={(v) => setSettings(p => ({...p, mpesa_config: {...p.mpesa_config, consumerKey: v}}))} />
                  <FormInput label="Consumer Secret" value={settings.mpesa_config.consumerSecret} type="password" onChange={(v) => setSettings(p => ({...p, mpesa_config: {...p.mpesa_config, consumerSecret: v}}))} />
                  <FormInput label="Passkey" value={settings.mpesa_config.passkey} onChange={(v) => setSettings(p => ({...p, mpesa_config: {...p.mpesa_config, passkey: v}}))} />
                  <FormInput label="Shortcode" value={settings.mpesa_config.shortcode} onChange={(v) => setSettings(p => ({...p, mpesa_config: {...p.mpesa_config, shortcode: v}}))} />
                  <FormInput label="STK Timeout (Seconds)" value={settings.mpesa_config.stkTimeout} type="number" onChange={(v) => setSettings(p => ({...p, mpesa_config: {...p.mpesa_config, stkTimeout: v}}))} />
                  <div className="flex items-center gap-3 h-full pt-6">
                    <input type="checkbox" id="mpesa-mock" checked={settings.mpesa_config.mockMode} onChange={(e) => setSettings(p => ({...p, mpesa_config: {...p.mpesa_config, mockMode: e.target.checked}}))} />
                    <label htmlFor="mpesa-mock" className="text-sm font-bold text-blue-700">Enable Mock Mode (Sandbox)</label>
                  </div>
                </div>
                <SaveButton onClick={() => updateSettings('mpesa_config', settings.mpesa_config)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">M-Pesa Manual (Paybill/Till)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Paybill / Buy Goods Number" value={settings.mpesa_manual_instructions.paybill} onChange={(v) => setSettings(p => ({...p, mpesa_manual_instructions: {...p.mpesa_manual_instructions, paybill: v}}))} />
                  <FormInput label="Account Number (Required for Paybill)" value={settings.mpesa_manual_instructions.accountNumber} onChange={(v) => setSettings(p => ({...p, mpesa_manual_instructions: {...p.mpesa_manual_instructions, accountNumber: v}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('mpesa_manual_instructions', settings.mpesa_manual_instructions)} loading={loading} />
              </section>
              
              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Airtel Money API</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Client ID" value={settings.airtel_config.clientId} onChange={(v) => setSettings(p => ({...p, airtel_config: {...p.airtel_config, clientId: v}}))} />
                  <FormInput label="Client Secret" value={settings.airtel_config.clientSecret} type="password" onChange={(v) => setSettings(p => ({...p, airtel_config: {...p.airtel_config, clientSecret: v}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('airtel_config', settings.airtel_config)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">💬 Payment Notifications</h3>
                <div className="max-w-xl">
                  <TemplateInput label="Order Received Template" templateKey="orderPlaced" value={settings.whatsapp_config.templates?.orderPlaced} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, orderPlaced: v}} }))} />
                  <p className="mt-2 text-xs text-blue-600">Placeholders: {"{name}, {orderNumber}, {total}"}</p>
                </div>
                <SaveButton onClick={() => updateSettings('whatsapp_config', settings.whatsapp_config)} loading={loading} />
              </section>
            </div>
          )}

          {/* MESSAGING TAB */}
          {activeTab === 'messaging' && (
            <div className="space-y-10">
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Africa's Talking (SMS Gateway)</h3>
                <p className="text-sm text-gray-500 mb-6">Manage API keys for automated SMS communications.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Username" value={settings.sms_config.username} onChange={(v) => setSettings(p => ({...p, sms_config: {...p.sms_config, username: v}}))} />
                  <FormInput label="API Key" value={settings.sms_config.apiKey} type="password" onChange={(v) => setSettings(p => ({...p, sms_config: {...p.sms_config, apiKey: v}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('sms_config', settings.sms_config)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-2">WhatsApp Configuration</h3>
                <p className="text-sm text-gray-500 mb-6">Set the integration method for all platform WhatsApp messages.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Integration Method</label>
                    <select className="w-full border rounded-xl p-2.5 outline-none" value={settings.whatsapp_config.method} onChange={(e) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, method: e.target.value}}))}>
                      <option value="local">Local WhatsApp (Web.js)</option>
                      <option value="cloud">Meta Cloud API (Official)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-xs text-blue-800">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="font-bold mb-1 uppercase tracking-wider text-[10px]">Messaging Status</p>
                    <p>Gateway credentials are used for all automated communications. Message templates are now conveniently managed within their respective tabs (Payments, Finance, Logistics, etc.) for better context.</p>
                  </div>
                </div>
                <SaveButton onClick={() => updateSettings('whatsapp_config', settings.whatsapp_config)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              {/* TEMPLATE QUICK OVERVIEW */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4 font-mono">📜 Quick Template Review</h3>
                <p className="text-sm text-gray-500 mb-6">A summary of the current messages being sent. Click "Edit" to jump to the corresponding tab.</p>
                <div className="space-y-4">
                  {[
                    { label: 'Order Received', key: 'orderPlaced', tab: 'payment', icon: '💳' },
                    { label: 'Withdrawal Status', key: 'withdrawalStatus', tab: 'finance', icon: '💰' },
                    { label: 'In Transit', key: 'orderInTransit', tab: 'logistics', icon: '🚚' },
                    { label: 'Ready for Pickup', key: 'orderReadyPickup', tab: 'logistics', icon: '📦' },
                    { label: 'OTP Verification', key: 'phoneVerification', tab: 'security', icon: '🔒' },
                  ].map(item => (
                    <div key={item.key} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <span>{item.icon}</span> {item.label}
                        </p>
                        <p className="text-sm text-gray-700 italic">"{(settings.whatsapp_config.templates?.[item.key] || 'No template set')}"</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab(item.tab)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
                      >
                        Edit in {item.tab.toUpperCase()}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* TEMPLATE QUICK OVERVIEW */}
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4 font-mono">📜 Quick Template Review</h3>
                <p className="text-sm text-gray-500 mb-6">A summary of the current messages being sent. Click "Edit" to jump to the corresponding tab.</p>
                <div className="space-y-4">
                  {[
                    { label: 'Order Received', key: 'orderPlaced', tab: 'payment', icon: '💳' },
                    { label: 'Withdrawal Status', key: 'withdrawalStatus', tab: 'finance', icon: '💰' },
                    { label: 'In Transit', key: 'orderInTransit', tab: 'logistics', icon: '🚚' },
                    { label: 'Ready for Pickup', key: 'orderReadyPickup', tab: 'logistics', icon: '📦' },
                    { label: 'OTP Verification', key: 'phoneVerification', tab: 'security', icon: '🔒' },
                  ].map(item => (
                    <div key={item.key} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <span>{item.icon}</span> {item.label}
                        </p>
                        <p className="text-sm text-gray-700 italic">"{(settings.whatsapp_config.templates?.[item.key] || 'No template set')}"</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab(item.tab)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
                      >
                        Edit in {item.tab.toUpperCase()}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* FINANCE TAB */}
          {activeTab === 'finance' && (
            <div className="space-y-10">
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Referral Commission Splitting</h3>
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-blue-800 mb-2">Primary Referrer Share: {Math.round(settings.finance_settings.referralSplit?.primary * 100)}%</label>
                    <input type="range" min="0" max="1" step="0.05" className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer" value={settings.finance_settings.referralSplit?.primary || 0.6} onChange={(e) => {
                      const primary = parseFloat(e.target.value);
                      const secondary = Math.max(0, 1 - primary);
                      setSettings(p => ({...p, finance_settings: {...p.finance_settings, referralSplit: { primary, secondary: Number(secondary.toFixed(2)) }}}))
                    }} />
                    <div className="flex justify-between text-xs text-blue-600 mt-2 font-medium">
                      <span>Primary: {Math.round(settings.finance_settings.referralSplit?.primary * 100)}%</span>
                      <span>Secondary: {Math.round(settings.finance_settings.referralSplit?.secondary * 100)}%</span>
                    </div>
                  </div>
                  <div className="w-full md:w-32 p-3 bg-white rounded-xl shadow-sm border border-blue-200 text-center">
                    <span className="text-xs text-gray-500 block uppercase font-bold tracking-wider">Total</span>
                    <span className="text-xl font-black text-blue-700">100%</span>
                  </div>
                </div>
                <SaveButton onClick={() => updateSettings('finance_settings', settings.finance_settings)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Role-Based Withdrawal Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput label="Seller Min Payout" value={settings.finance_settings.minPayout?.seller} type="number" onChange={(v) => setSettings(p => ({...p, finance_settings: {...p.finance_settings, minPayout: {...p.finance_settings.minPayout, seller: v}}}))} />
                  <FormInput label="Marketer Min Payout" value={settings.finance_settings.minPayout?.marketer} type="number" onChange={(v) => setSettings(p => ({...p, finance_settings: {...p.finance_settings, minPayout: {...p.finance_settings.minPayout, marketer: v}}}))} />
                  <FormInput label="Agent Min Payout" value={settings.finance_settings.minPayout?.delivery_agent} type="number" onChange={(v) => setSettings(p => ({...p, finance_settings: {...p.finance_settings, minPayout: {...p.finance_settings.minPayout, delivery_agent: v}}}))} />
                  <FormInput label="Station Mgr Min Payout" value={settings.finance_settings.minPayout?.station_manager} type="number" onChange={(v) => setSettings(p => ({...p, finance_settings: {...p.finance_settings, minPayout: {...p.finance_settings.minPayout, station_manager: v}}}))} />
                  <FormInput label="Warehouse Mgr Min Payout" value={settings.finance_settings.minPayout?.warehouse_manager} type="number" onChange={(v) => setSettings(p => ({...p, finance_settings: {...p.finance_settings, minPayout: {...p.finance_settings.minPayout, warehouse_manager: v}}}))} />
                  <FormInput label="Service Provider Min" value={settings.finance_settings.minPayout?.service_provider} type="number" onChange={(v) => setSettings(p => ({...p, finance_settings: {...p.finance_settings, minPayout: {...p.finance_settings.minPayout, service_provider: v}}}))} />
                </div>
                <p className="mt-3 text-xs text-gray-400">Values in KES. Requests below these amounts will be blocked at the withdrawal stage.</p>
                <SaveButton onClick={() => updateSettings('finance_settings', settings.finance_settings)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">💬 Financial Notifications</h3>
                <div className="max-w-xl">
                  <TemplateInput label="Withdrawal Processed Template" templateKey="withdrawalStatus" value={settings.whatsapp_config.templates?.withdrawalStatus} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, withdrawalStatus: v}} }))} />
                  <p className="mt-2 text-xs text-blue-600">Placeholders: {"{amount}"}</p>
                </div>
                <SaveButton onClick={() => updateSettings('whatsapp_config', settings.whatsapp_config)} loading={loading} />
              </section>
            </div>
          )}

          {/* LOGISTICS TAB */}
          {activeTab === 'logistics' && (
            <div className="space-y-10">
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Warehouse & Hub Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                  <FormInput label="Opens At" value={settings.logistic_settings.warehouseHours?.open} type="time" onChange={(v) => setSettings(p => ({...p, logistic_settings: {...p.logistic_settings, warehouseHours: {...p.logistic_settings.warehouseHours, open: v}}}))} />
                  <FormInput label="Closes At" value={settings.logistic_settings.warehouseHours?.close} type="time" onChange={(v) => setSettings(p => ({...p, logistic_settings: {...p.logistic_settings, warehouseHours: {...p.logistic_settings.warehouseHours, close: v}}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('logistic_settings', settings.logistic_settings)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Order Expiration Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                    <FormInput label="Cancel unpaid orders after (Hours)" value={settings.logistic_settings.autoCancelUnpaidHours} type="number" onChange={(v) => setSettings(p => ({...p, logistic_settings: {...p.logistic_settings, autoCancelUnpaidHours: v}}))} />
                    <p className="mt-2 text-xs text-gray-400">Affects 'M-Pesa Manual' and 'Airtel' orders that remain in PENDING status.</p>
                   </div>
                   <div>
                    <FormInput label="Fast Food Acceptance Timeout (Minutes)" value={settings.logistic_settings.fastfoodTaskExpiryMinutes} type="number" onChange={(v) => setSettings(p => ({...p, logistic_settings: {...p.logistic_settings, fastfoodTaskExpiryMinutes: v}}))} />
                    <p className="mt-2 text-xs text-orange-500">Time for agent to accept Fast Food orders before auto-expiry &amp; reassignment (e.g. 5 mins).</p>
                   </div>
                   <div>
                    <FormInput label="Product Acceptance Timeout (Minutes)" value={settings.logistic_settings.productTaskExpiryMinutes} type="number" onChange={(v) => setSettings(p => ({...p, logistic_settings: {...p.logistic_settings, productTaskExpiryMinutes: v}}))} />
                    <p className="mt-2 text-xs text-blue-600">Time for agent to accept Product orders before auto-expiry &amp; reassignment (e.g. 30 mins).</p>
                   </div>
                   <div>
                    <FormInput label="Stuck Delivery Threshold (Hours)" value={settings.logistic_settings.stuckDeliveryHours} type="number" onChange={(v) => setSettings(p => ({...p, logistic_settings: {...p.logistic_settings, stuckDeliveryHours: v}}))} />
                    <p className="mt-2 text-xs text-orange-500">Alert admin if a delivery is in-progress for longer than this without completion.</p>
                   </div>
                </div>
                <SaveButton onClick={() => updateSettings('logistic_settings', settings.logistic_settings)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">💬 Delivery Notifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-bold text-xs text-blue-600 uppercase mb-3 text-[10px] tracking-widest">Customer Updates</h5>
                    <div className="space-y-4">
                      <TemplateInput label="Out for Delivery" value={settings.whatsapp_config.templates?.orderInTransit} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, orderInTransit: v}} }))} />
                      <TemplateInput label="Ready for Pickup" value={settings.whatsapp_config.templates?.orderReadyPickup} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, orderReadyPickup: v}} }))} />
                      <TemplateInput label="Delivery Success" value={settings.whatsapp_config.templates?.orderDelivered} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, orderDelivered: v}} }))} />
                      <TemplateInput label="Agent Arrived" value={settings.whatsapp_config.templates?.agentArrived} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, agentArrived: v}} }))} />
                    </div>
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-orange-600 uppercase mb-3 text-[10px] tracking-widest">Agent & Admin Updates</h5>
                    <div className="space-y-4">
                      <TemplateInput label="Task Assigned" value={settings.whatsapp_config.templates?.agentTaskAssigned} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, agentTaskAssigned: v}} }))} />
                      <TemplateInput label="Task Reassigned" value={settings.whatsapp_config.templates?.agentTaskReassigned} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, agentTaskReassigned: v}} }))} />
                      <TemplateInput label="Task Rejected (to Admin)" value={settings.whatsapp_config.templates?.adminTaskRejected} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, adminTaskRejected: v}} }))} />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-[10px] text-gray-400 font-medium">Available Placeholders: {"{orderNumber}, {agentName}, {stationName}, {deliveryType}, {reason}"}</p>
                <SaveButton onClick={() => updateSettings('whatsapp_config', settings.whatsapp_config)} loading={loading} />
              </section>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-10">
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Advanced Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Session Timeout (Min)" value={settings.security.sessionTimeout} type="number" onChange={(v) => setSettings(p => ({...p, security: {...p.security, sessionTimeout: v}}))} />
                  <FormInput label="Password Min Length" value={settings.security.passwordMinLength} type="number" onChange={(v) => setSettings(p => ({...p, security: {...p.security, passwordMinLength: v}}))} />
                  <FormInput label="Lock account after (Failed Attempts)" value={settings.security.loginAttempts} type="number" onChange={(v) => setSettings(p => ({...p, security: {...p.security, loginAttempts: v}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('security', settings.security)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">💬 Security Notifications</h3>
                <div className="max-w-xl">
                  <TemplateInput label="OTP Verification Template" templateKey="phoneVerification" value={settings.whatsapp_config.templates?.phoneVerification} onChange={(v) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, templates: {...p.whatsapp_config.templates, phoneVerification: v}} }))} />
                  <p className="mt-2 text-xs text-blue-600">Placeholders: {"{otp}"}</p>
                </div>
                <SaveButton onClick={() => updateSettings('whatsapp_config', settings.whatsapp_config)} loading={loading} />
              </section>
            </div>
          )}

          {/* ENVIRONMENT TAB */}
          {activeTab === 'environment' && (
            <div className="space-y-10">
              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Server Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Port" value={settings.system_env.server?.port} type="number" onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, server: {...p.system_env.server, port: v}}}))} />
                  <FormInput label="Node Environment" value={settings.system_env.server?.nodeEnv} onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, server: {...p.system_env.server, nodeEnv: v}}}))} />
                  <FormInput label="Base URL (Backend)" value={settings.system_env.server?.baseUrl} className="md:col-span-2" onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, server: {...p.system_env.server, baseUrl: v}}}))} />
                  <FormInput label="API Path" value={settings.system_env.server?.apiUrl} placeholder="/api" onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, server: {...p.system_env.server, apiUrl: v}}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('system_env', settings.system_env)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Frontend & App Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Frontend URL" value={settings.system_env.app?.frontendUrl} onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, app: {...p.system_env.app, frontendUrl: v}}}))} />
                  <FormInput label="Support Email" value={settings.system_env.app?.supportEmail} onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, app: {...p.system_env.app, supportEmail: v}}}))} />
                </div>
                <SaveButton onClick={() => updateSettings('system_env', settings.system_env)} loading={loading} />
              </section>

              <hr className="border-gray-100" />

              <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">System Paths & Records</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput label="Database Dialect" value={settings.system_env.database?.dialect} onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, database: {...p.system_env.database, dialect: v}}}))} disabled />
                  <FormInput label="Storage Path" value={settings.system_env.database?.storage} onChange={(v) => setSettings(p => ({...p, system_env: {...p.system_env, database: {...p.system_env.database, storage: v}}}))} />
                </div>
                <p className="mt-3 text-xs text-orange-600 font-medium">⚠️ Changing database paths may require a data migration or manual file move.</p>
                <SaveButton onClick={() => updateSettings('system_env', settings.system_env)} loading={loading} />
              </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const FormInput = ({ label, value, onChange, type = "text", className = "", placeholder = "" }) => (

  <div className={className}>
    <label className="block text-sm font-semibold text-gray-600 mb-1">{label}</label>
    <input
      type={type}
      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-300"
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
    />
  </div>
);

const TemplateInput = ({ label, value, onChange, templateKey }) => {
  const defaults = {
    orderPlaced: 'Hi {name}, your order #{orderNumber} has been received! Total: KES {total}.',
    orderInTransit: 'Good news! Your order #{orderNumber} has been collected by {agentName} and is in transit. 🚚',
    orderReadyPickup: 'Your order #{orderNumber} is ready for collection at {stationName}! 📦',
    orderDelivered: 'Hi {name}, your order #{orderNumber} has been delivered. Thank you!',
    agentArrived: 'Your delivery agent {agentName} has arrived at your location! 📍 Please meet them to collect order #{orderNumber}.',
    agentTaskAssigned: 'You have been assigned a new delivery task for order #{orderNumber}. Type: {deliveryType}',
    agentTaskReassigned: 'A delivery task for order #{orderNumber} has been reassigned to you.',
    adminTaskRejected: 'Delivery agent {agentName} rejected task for order #{orderNumber}. Reason: {reason}',
    phoneVerification: 'Your Comrades360 verification OTP is {otp}. It expires in 10 minutes.',
    withdrawalStatus: 'Your withdrawal of KES {amount} has been processed successfully! 💰'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-tighter">{label}</label>
        <button 
          onClick={() => onChange(defaults[templateKey] || '')}
          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white border border-blue-50 px-2 py-0.5 rounded-full shadow-sm hover:shadow-md transition-all"
        >
          🔄 Restore Default
        </button>
      </div>
      <textarea 
        className="w-full border border-gray-100 bg-gray-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type message template..."
      />
      <div className="flex flex-wrap gap-2 mt-1">
        {['{name}', '{orderNumber}', '{total}', '{agentName}', '{stationName}', '{otp}', '{amount}'].map(tag => (
          <span key={tag} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400 cursor-pointer hover:text-blue-600 hover:border-blue-200" onClick={() => onChange((value || '') + ' ' + tag)}>{tag}</span>
        ))}
      </div>
    </div>
  );
};

const SaveButton = ({ onClick, loading, variant = "blue" }) => (
  <button
    className={`mt-6 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-md active:transform active:scale-95 disabled:opacity-50 ${
      variant === 'red' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
    }`}
    disabled={loading}
    onClick={onClick}
  >
    {loading ? (
      <span className="flex items-center gap-2">
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Saving Changes...
      </span>
    ) : (
      'Apply Changes'
    )}
  </button>
);