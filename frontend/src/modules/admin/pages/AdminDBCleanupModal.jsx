import React, { useState } from 'react';
import { FaTimes, FaDatabase, FaExclamationTriangle, FaTrash, FaBroom, FaShieldAlt, FaClock, FaHistory } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';

export default function AdminDBCleanupModal({ isOpen, onClose, onSuccess }) {
  const [target, setTarget] = useState('otp'); // otp, logs, soft_deleted
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCleanup = async () => {
    const confirmMsg = target === 'soft_deleted' 
        ? "PERMANENT DELETION: Are you absolutely sure? This will permanently remove items that were soft-deleted more than 30 days ago. This action cannot be reversed."
        : `Are you sure you want to run cleanup for "${target}"?`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setError('');
    
    try {
      const res = await adminApi.adminRunCleanup({ target });
      if (onSuccess) onSuccess(res.data.message || `Cleanup for ${target} completed. ${res.data.itemsRemoved} items affected.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run database cleanup.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setTarget('otp');
    setError('');
    onClose();
  };

  const targets = [
    { id: 'otp', label: 'Expired OTPs', icon: <FaClock />, desc: 'Remove 6-digit verification codes older than 24 hours.' },
    { id: 'logs', label: 'Diagnostic Logs', icon: <FaHistory />, desc: 'Clear the notification debug and diagnostic log files.' },
    { id: 'soft_deleted', label: 'Old Deleted Items', icon: <FaTrash />, desc: 'Permanently purge products/food deleted > 30 days ago.' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaDatabase className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">System Cleanup</h2>
              <p className="text-slate-400 text-xs font-medium">Safe database maintenance & purging</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700">Select Maintenance Task</label>
            <div className="space-y-2">
              {targets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTarget(t.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    target === t.id 
                    ? 'border-slate-800 bg-slate-50 ring-4 ring-slate-800/5' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${target === t.id ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {t.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${target === t.id ? 'text-slate-900' : 'text-gray-700'}`}>{t.label}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3">
              <FaShieldAlt className="text-orange-600 shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-orange-900 uppercase">System Safeguard</p>
                <p className="text-[10px] text-orange-800 leading-relaxed">Cleanup tasks are designed to be safe. We only target ephemeral or old data that is no longer required for business operations. This action will be logged in the audit trail.</p>
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
            onClick={handleCleanup}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[150px] bg-slate-800 hover:bg-slate-900"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <span className="flex items-center gap-2"><FaBroom /> Run Cleanup</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
