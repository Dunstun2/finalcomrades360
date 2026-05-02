import React, { useState } from 'react';
import { FaTimes, FaSearch, FaUserSecret, FaExclamationTriangle } from 'react-icons/fa';
import { adminApi } from '../../services/api';

export default function AdminImpersonateUserModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter an email or phone number.');
      return;
    }
    setLoading(true);
    setError('');
    setUser(null);

    try {
      const res = await adminApi.adminSearchUserForVerify({ identifier: searchTerm });
      if (res.data.users && res.data.users.length > 0) {
        setUser(res.data.users[0]);
      } else {
        setError('User not found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'User not found or error searching.');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await adminApi.adminImpersonateUser(user.id);
      
      // Save the old admin token if we want to build a "return to admin" button.
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        localStorage.setItem('admin_token_backup', currentToken);
      }

      // Save the new token
      localStorage.setItem('token', res.data.token);
      
      if (onSuccess) onSuccess('Impersonation started. Reloading page...');
      
      // Reload to apply new context
      setTimeout(() => {
          window.location.href = '/';
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start impersonation.');
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSearchTerm('');
    setUser(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaUserSecret className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Impersonate User</h2>
              <p className="text-indigo-100 text-xs font-medium">Log in as another user</p>
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

          {/* Search Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Search User</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Email or Phone"
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !searchTerm}
                className="bg-indigo-600 text-white px-5 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {loading && !user ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSearch />}
              </button>
            </div>
          </div>

          {/* User Details */}
          {user && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">User Details</span>
                <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">ID: {user.id}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Name</p>
                  <p className="font-bold text-gray-900 truncate">{user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Role</p>
                  <p className="font-bold text-gray-900 capitalize">{user.role}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 font-medium">Email / Phone</p>
                  <p className="font-bold text-gray-900 truncate">{user.email}</p>
                  <p className="font-bold text-gray-900">{user.phone}</p>
                </div>
              </div>
              
              <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg text-xs font-medium border border-indigo-200 mt-2 flex gap-2">
                <FaUserSecret className="shrink-0 mt-0.5 text-indigo-500 text-lg" />
                <span>By continuing, you will be logged out of your admin account and logged in as this user. To return to the admin panel, you will need to log out and log back in.</span>
              </div>
            </div>
          )}

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
            onClick={handleImpersonate}
            disabled={loading || !user}
            className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[120px]"
          >
            {loading && user ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Log in as User'}
          </button>
        </div>
      </div>
    </div>
  );
}
