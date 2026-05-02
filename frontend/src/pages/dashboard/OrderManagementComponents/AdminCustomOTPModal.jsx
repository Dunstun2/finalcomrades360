import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaLock, FaExclamationTriangle, FaUserCircle, FaCheckCircle, FaKey, FaClipboard } from 'react-icons/fa';
import { adminApi } from '../../../services/api';

export default function AdminCustomOTPModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');

  // Auto-search users when modal opens or search term changes
  useEffect(() => {
    if (isOpen && searchTerm.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchUsers();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchTerm, isOpen]);

  if (!isOpen) return null;

  const handleSearchUsers = async () => {
    setLoadingSearch(true);
    setError('');
    try {
      const res = await adminApi.getAllUsers({ 
        search: searchTerm,
        limit: 10
      });
      setUsers(res.data.users || []);
    } catch (err) {
      setError('Failed to fetch users.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleGenerateOTP = async () => {
    if (!selectedUser) return;
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminGenerateOTP({
        userId: selectedUser.id
      });
      setGeneratedOtp(res.data.otp);
      if (onSuccess) onSuccess(`OTP ${res.data.otp} generated for ${selectedUser.name}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate OTP.');
    } finally {
      setLoadingSave(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedOtp) return;
    navigator.clipboard.writeText(generatedOtp);
    alert('OTP copied to clipboard!');
  };

  const closeModal = () => {
    setSearchTerm('');
    setUsers([]);
    setSelectedUser(null);
    setGeneratedOtp('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaLock className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Custom OTP Generator</h2>
              <p className="text-slate-300 text-xs font-medium">Manually bypass verification bottlenecks</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* User Search */}
          {!generatedOtp && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Step 1: Select User</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all outline-none"
                />
                {loadingSearch && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                     <div className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* User Results List */}
              <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto pr-1">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      selectedUser?.id === user.id 
                      ? 'border-slate-500 bg-slate-50 ring-2 ring-slate-500/10' 
                      : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${selectedUser?.id === user.id ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <FaUserCircle />
                      </div>
                      <div className="text-left truncate max-w-[200px]">
                        <p className="text-sm font-bold text-gray-800 truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{user.email || user.phone}</p>
                      </div>
                    </div>
                    {selectedUser?.id === user.id && (
                      <FaCheckCircle className="text-slate-700 text-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result Section */}
          {generatedOtp ? (
            <div className="py-6 space-y-6 text-center animate-fade-in">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verification Code for {selectedUser.name}</p>
                <div className="flex items-center justify-center gap-4">
                    <span className="text-5xl font-black text-slate-800 tracking-[0.2em]">{generatedOtp}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                >
                    <FaClipboard /> Copy Code
                </button>
                <button 
                    onClick={() => setGeneratedOtp('')}
                    className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors"
                >
                    Generate New
                </button>
              </div>

              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-xs font-medium border border-blue-100">
                You can now share this code with the user. It will expire in 30 minutes.
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center gap-3">
                    <FaKey className="text-slate-400" />
                    <p className="text-xs font-medium text-slate-600">This tool manually overwrites the user's current OTP and displays it here. Useful if SMS/Email providers are down or delayed.</p>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!generatedOtp && (
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={closeModal}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleGenerateOTP}
              disabled={loadingSave || !selectedUser}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[150px] bg-slate-700 hover:bg-slate-800"
            >
              {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Generate OTP'}
            </button>
          </div>
        )}
        
        {generatedOtp && (
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-center">
                <button
                    onClick={closeModal}
                    className="px-8 py-2.5 text-sm font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors"
                >
                    Done
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
