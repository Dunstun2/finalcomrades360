import React, { useState, useEffect } from 'react';
import { FaTimes, FaBan, FaShieldAlt, FaPlus, FaTrash, FaExclamationTriangle, FaCheckCircle, FaGlobe, FaCalendarAlt } from 'react-icons/fa';
import { adminApi } from '../../../services/api';

export default function AdminIPBlocklistModal({ isOpen, onClose, onSuccess }) {
  const [ipList, setIpList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New Block form
  const [newIp, setNewIp] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent'); // permanent, 24h, 7d
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBlockedIPs();
    }
  }, [isOpen]);

  const fetchBlockedIPs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.adminGetBlockedIPs();
      setIpList(res.data.list || []);
    } catch (err) {
      setError('Failed to fetch blocked IPs.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBlock = async (e) => {
    e.preventDefault();
    if (!newIp) return;

    setSubmitting(true);
    setError('');
    
    let expiresAt = null;
    if (duration === '24h') expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (duration === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      const res = await adminApi.adminBlockIP({ ipAddress: newIp, reason, expiresAt });
      setNewIp('');
      setReason('');
      setDuration('permanent');
      fetchBlockedIPs();
      if (onSuccess) onSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to block IP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (id) => {
    if (!window.confirm('Are you sure you want to unblock this IP?')) return;
    try {
      await adminApi.adminUnblockIP(id);
      fetchBlockedIPs();
    } catch (err) {
      setError('Failed to unblock IP.');
    }
  };

  const closeModal = () => {
    setNewIp('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaBan className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">IP Blocklist Manager</h2>
              <p className="text-red-100 text-xs font-medium">Prevent unauthorized access and fraud</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Side */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <FaPlus className="text-red-500" /> Block New IP
            </h3>
            <form onSubmit={handleBlock} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">IP Address</label>
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="e.g. 192.168.1.1"
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm focus:border-red-500 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Reason for Blocking</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Fraudulent payment attempts"
                  rows={2}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 text-sm focus:border-red-500 transition-all outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {['permanent', '24h', '7d'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`py-1.5 rounded-lg border-2 text-[10px] font-black uppercase transition-all ${
                        duration === d ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-100 text-gray-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || !newIp}
                className="w-full bg-red-700 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply Block'}
              </button>
            </form>

            <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                <p className="text-[11px] font-bold text-red-900 flex items-center gap-2">
                   <FaShieldAlt /> Security Note
                </p>
                <p className="text-[10px] text-red-800 leading-relaxed">Blocked IPs are rejected at the middleware level. They will receive a 403 Forbidden response for all platform requests.</p>
            </div>
          </div>

          {/* List Side */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <FaGlobe className="text-gray-400" /> Active Blocks ({ipList.length})
            </h3>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {loading && <div className="text-center py-10 text-gray-400 text-xs font-bold animate-pulse">Loading blocklist...</div>}
              {!loading && ipList.length === 0 && <div className="text-center py-10 text-gray-300 text-[10px] font-bold italic">No active blocks.</div>}
              
              {ipList.map(block => (
                <div key={block.id} className="bg-white border border-gray-100 rounded-xl p-3 hover:border-red-200 transition-all group relative">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-black text-gray-900">{block.ipAddress}</p>
                    <button 
                        onClick={() => handleUnblock(block.id)}
                        className="text-gray-300 hover:text-red-600 transition-colors"
                        title="Unblock IP"
                    >
                        <FaTrash className="text-[10px]" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mb-2">{block.reason || 'No reason provided'}</p>
                  <div className="flex justify-between items-center text-[8px] font-black uppercase text-gray-400">
                    <span className="flex items-center gap-1"><FaCalendarAlt /> {new Date(block.createdAt).toLocaleDateString()}</span>
                    <span className={`px-1.5 py-0.5 rounded ${block.expiresAt ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                        {block.expiresAt ? `Expires: ${new Date(block.expiresAt).toLocaleDateString()}` : 'Permanent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
