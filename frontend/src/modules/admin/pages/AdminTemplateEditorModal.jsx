import React, { useState, useEffect } from 'react';
import { FaTimes, FaEdit, FaEnvelopeOpenText, FaSave, FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaCode } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';

export default function AdminTemplateEditorModal({ isOpen, onClose, onSuccess }) {
  const [templates, setTemplates] = useState({});
  const [selectedKey, setSelectedKey] = useState('');
  const [message, setMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.adminGetTemplates();
      setTemplates(res.data.templates || {});
      const keys = Object.keys(res.data.templates || {});
      if (keys.length > 0) {
        setSelectedKey(keys[0]);
        setMessage(res.data.templates[keys[0]]);
      }
    } catch (err) {
      setError('Failed to fetch notification templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChange = (key) => {
    setSelectedKey(key);
    setMessage(templates[key] || '');
  };

  const handleSave = async () => {
    if (!selectedKey || !message) return;

    setSaving(true);
    setError('');
    try {
      const res = await adminApi.adminUpdateTemplate({ key: selectedKey, message });
      setTemplates(prev => ({ ...prev, [selectedKey]: message }));
      if (onSuccess) onSuccess(res.data.message);
    } catch (err) {
      setError('Failed to update template.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const closeModal = () => {
    setError('');
    onClose();
  };

  const placeholders = {
    orderPlaced: ['{name}', '{orderNumber}', '{total}'],
    sellerConfirmed: ['{name}', '{orderNumber}', '{sellerName}'],
    orderInTransit: ['{name}', '{orderNumber}', '{agentName}'],
    orderCancelled: ['{name}', '{orderNumber}', '{reason}']
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-indigo-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaEnvelopeOpenText className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Notification Template Editor</h2>
              <p className="text-indigo-100 text-xs font-medium">Customize automated SMS, WhatsApp, and Email alerts</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar - Template List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Template</h3>
            <div className="space-y-1">
              {Object.keys(templates).map(key => (
                <button
                  key={key}
                  onClick={() => handleKeyChange(key)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    selectedKey === key 
                    ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200' 
                    : 'text-gray-600 hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              ))}
            </div>
            
            {loading && <div className="py-10 text-center animate-pulse text-gray-300 text-[10px] font-bold">Loading...</div>}
          </div>

          {/* Editor Side */}
          <div className="md:col-span-2 space-y-5">
            {selectedKey ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</label>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">LIVE PREVIEW</span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 transition-all outline-none resize-none shadow-inner font-medium leading-relaxed"
                    placeholder="Enter message text..."
                  />
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <FaCode /> Available Placeholders
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {(placeholders[selectedKey] || ['{name}']).map(p => (
                        <button 
                          key={p}
                          onClick={() => setMessage(prev => prev + ' ' + p)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors border border-gray-200"
                        >
                          {p}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                    <FaInfoCircle className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">Changes made here take effect immediately for all subsequent notifications. Ensure placeholders like <code className="bg-amber-100 px-1 rounded">{"{name}"}</code> are used correctly.</p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                    <FaExclamationTriangle className="text-red-500 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !message}
                    className="bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FaSave /> Save Changes</>}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-30">
                <FaEnvelopeOpenText className="text-5xl text-gray-300" />
                <p className="text-sm font-bold text-gray-400">Select a template to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
