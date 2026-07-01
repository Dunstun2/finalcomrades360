import React, { useState } from 'react';
import { FaTimes, FaBullhorn, FaUsers, FaExclamationTriangle, FaCheckCircle, FaPaperPlane, FaSms, FaEnvelope, FaWhatsapp, FaMobileAlt } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';

export default function AdminBroadcastModal({ isOpen, onClose, onSuccess }) {
  const [targetRole, setTargetRole] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState(['in_app']); // in_app, sms, whatsapp, email
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleChannel = (channel) => {
    setChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const handleBroadcast = async () => {
    if (!message || channels.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to send this broadcast to ${targetRole === 'all' ? 'ALL USERS' : 'all ' + targetRole + 's'}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await adminApi.adminBroadcastMessage({
        targetRole,
        title: title || 'Comrades360 Announcement',
        message,
        channels
      });
      if (onSuccess) onSuccess(res.data.message || `Broadcast sent to ${res.data.userCount} users.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate broadcast.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setTargetRole('all');
    setTitle('');
    setMessage('');
    setChannels(['in_app']);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaBullhorn className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Broadcast Message</h2>
              <p className="text-purple-100 text-xs font-medium">Platform-wide mass communication</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Target Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Step 1: Select Target Audience</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All Users' },
                { id: 'customer', label: 'Customers' },
                { id: 'seller', label: 'Sellers' },
                { id: 'marketer', label: 'Marketers' },
                { id: 'delivery_agent', label: 'Delivery Agents' },
                { id: 'service_provider', label: 'Service Providers' },
              ].map(role => (
                <button
                  key={role.id}
                  onClick={() => setTargetRole(role.id)}
                  className={`py-2 px-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                    targetRole === role.id 
                    ? 'border-purple-600 bg-purple-50 text-purple-700' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Step 2: Select Channels</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'in_app', icon: <FaBell />, label: 'In-App' },
                { id: 'whatsapp', icon: <FaWhatsapp />, label: 'WhatsApp' },
                { id: 'sms', icon: <FaSms />, label: 'SMS' },
                { id: 'email', icon: <FaEnvelope />, label: 'Email' },
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    channels.includes(ch.id) 
                    ? 'border-purple-600 bg-purple-50 text-purple-700' 
                    : 'border-gray-100 bg-white text-gray-300'
                  }`}
                >
                  <span className="text-lg">{ch.icon}</span>
                  <span className="text-[10px] font-bold">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700">Step 3: Compose Message</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement Title (e.g., Weekend Promo!)"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm focus:border-purple-500 transition-all outline-none"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-purple-500 transition-all outline-none resize-none"
            />
          </div>

          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex gap-3">
              <FaExclamationTriangle className="text-purple-600 shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-purple-900 uppercase">Pro Tip</p>
                <p className="text-[10px] text-purple-800 leading-relaxed">Keep messages concise for SMS/WhatsApp to ensure readability. Broadcasts are processed in real-time — please verify all details before sending.</p>
              </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleBroadcast}
            disabled={loading || !message || channels.length === 0}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[150px] bg-purple-700 hover:bg-purple-800"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <span className="flex items-center gap-2"><FaPaperPlane /> Send Broadcast</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
