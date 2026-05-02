import React, { useState } from 'react';
import { FaTimes, FaSearch, FaWallet, FaExclamationTriangle, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { adminApi } from '../../services/api';

export default function AdminWalletAdjustModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState('credit'); // 'credit' or 'debit'
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter an email or phone number.');
      return;
    }
    setLoadingSearch(true);
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
      setError(err.response?.data?.message || 'User not found.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAdjust = async () => {
    if (!user) return;
    if (!amount || isNaN(amount) || amount <= 0) {
        setError('Please enter a valid positive amount.');
        return;
    }
    if (!reason.trim()) {
        setError('Please provide a reason for this adjustment.');
        return;
    }
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminWalletAdjust({
          userId: user.id,
          amount: parseFloat(amount),
          reason: reason.trim(),
          type
      });
      if (onSuccess) onSuccess(`Wallet adjusted successfully. New balance is KES ${res.data.newBalance.toLocaleString()}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust wallet.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setSearchTerm('');
    setUser(null);
    setAmount('');
    setReason('');
    setType('credit');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaWallet className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Manual Wallet Adjustment</h2>
              <p className="text-indigo-100 text-xs font-medium">Credit or debit a user's wallet</p>
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
            <label className="text-sm font-bold text-gray-700">Find User</label>
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
                disabled={loadingSearch || !searchTerm}
                className="bg-indigo-600 text-white px-5 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {loadingSearch ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSearch />}
              </button>
            </div>
          </div>

          {user && (
              <>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">User Details</span>
                        <span className="text-[10px] bg-white text-gray-700 px-2 py-0.5 rounded-full font-bold border border-gray-200 shadow-sm">ID: {user.id}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email || user.phone}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 font-medium">Current Balance</p>
                            <p className="font-black text-lg text-indigo-600">KES {parseFloat(user.walletBalance || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setType('credit')}
                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${type === 'credit' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            <FaArrowUp className={type === 'credit' ? 'text-green-500' : 'text-gray-400'} /> Credit (Add)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('debit')}
                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${type === 'debit' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            <FaArrowDown className={type === 'debit' ? 'text-red-500' : 'text-gray-400'} /> Debit (Deduct)
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Amount (KES)</label>
                        <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g. 500"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Reason / Reference</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Refund for missing item, promotional bonus, etc."
                            rows="2"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                        ></textarea>
                    </div>
                </div>
              </>
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
            onClick={handleAdjust}
            disabled={loadingSave || !user || !amount || !reason}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[140px] ${type === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}
