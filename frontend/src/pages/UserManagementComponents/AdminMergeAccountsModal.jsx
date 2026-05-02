import React, { useState } from 'react';
import { FaTimes, FaSearch, FaCodeBranch, FaExclamationTriangle, FaArrowRight, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { adminApi } from '../../services/api';

export default function AdminMergeAccountsModal({ isOpen, onClose, onSuccess }) {
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  
  const [sourceUser, setSourceUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMerge, setLoadingMerge] = useState(false);
  const [error, setError] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Search, 2: Confirm
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (type) => {
    const term = type === 'source' ? sourceSearch : targetSearch;
    if (!term.trim()) {
      setError(`Please enter an email or phone for the ${type} user.`);
      return;
    }
    setLoadingSearch(type);
    setError('');

    try {
      const res = await adminApi.adminSearchUserForVerify({ identifier: term });
      if (!res.data.users || res.data.users.length === 0) {
        throw new Error('User not found.');
      }
      const foundUser = res.data.users[0];
      
      if (type === 'source') {
        if (targetUser && targetUser.id === foundUser.id) {
            setError('Source and Target users cannot be the same.');
            setSourceUser(null);
        } else {
            setSourceUser(foundUser);
        }
      } else {
        if (sourceUser && sourceUser.id === foundUser.id) {
            setError('Source and Target users cannot be the same.');
            setTargetUser(null);
        } else {
            setTargetUser(foundUser);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || `User not found (${type}).`);
      if (type === 'source') setSourceUser(null);
      if (type === 'target') setTargetUser(null);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleMerge = async () => {
    if (!sourceUser || !targetUser) return;
    if (!adminPassword) {
        setError('Admin password is required to authorize this action.');
        return;
    }
    
    setLoadingMerge(true);
    setError('');
    
    try {
      await adminApi.adminMergeAccounts({
          sourceUserId: sourceUser.id,
          targetUserId: targetUser.id,
          adminPassword
      });
      if (onSuccess) onSuccess(`Successfully merged account #${sourceUser.id} into #${targetUser.id}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to merge accounts.');
    } finally {
      setLoadingMerge(false);
    }
  };

  const closeModal = () => {
    setSourceSearch('');
    setTargetSearch('');
    setSourceUser(null);
    setTargetUser(null);
    setError('');
    setAdminPassword('');
    setStep(1);
    onClose();
  };

  const renderUserCard = (user, type) => (
      <div className={`rounded-xl p-4 border ${type === 'source' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} space-y-3 relative`}>
        <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-xl px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: type === 'source' ? '#ef4444' : '#10b981' }}>
            {type === 'source' ? 'Source (Will be deleted)' : 'Target (Will receive data)'}
        </div>
        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mt-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">User Details</span>
          <span className="text-[10px] bg-white text-gray-700 px-2 py-0.5 rounded-full font-bold shadow-sm">ID: {user.id}</span>
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
          <div>
             <p className="text-xs text-gray-500 font-medium">Wallet Balance</p>
             <p className="font-bold text-gray-900">KES {parseFloat(user.walletBalance || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto py-10">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaCodeBranch className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Merge Duplicate Accounts</h2>
              <p className="text-indigo-100 text-xs font-medium">Combine two accounts into one</p>
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

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source User Search */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-red-700">1. Find Source User</label>
                        <p className="text-xs text-gray-500">This account will be permanently deactivated.</p>
                        <div className="flex gap-2">
                        <input
                            type="text"
                            value={sourceSearch}
                            onChange={(e) => setSourceSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch('source')}
                            placeholder="Email or Phone"
                            className="flex-1 border-2 border-red-100 rounded-xl px-4 py-2 text-sm focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all outline-none"
                        />
                        <button
                            onClick={() => handleSearch('source')}
                            disabled={loadingSearch === 'source' || !sourceSearch}
                            className="bg-red-100 text-red-600 px-4 rounded-xl font-bold hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                        >
                            {loadingSearch === 'source' ? <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" /> : <FaSearch />}
                        </button>
                        </div>
                    </div>
                    {sourceUser && renderUserCard(sourceUser, 'source')}
                </div>

                {/* Target User Search */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-green-700">2. Find Target User</label>
                        <p className="text-xs text-gray-500">This account will receive all data.</p>
                        <div className="flex gap-2">
                        <input
                            type="text"
                            value={targetSearch}
                            onChange={(e) => setTargetSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch('target')}
                            placeholder="Email or Phone"
                            className="flex-1 border-2 border-green-100 rounded-xl px-4 py-2 text-sm focus:border-green-400 focus:ring-4 focus:ring-green-400/10 transition-all outline-none"
                        />
                        <button
                            onClick={() => handleSearch('target')}
                            disabled={loadingSearch === 'target' || !targetSearch}
                            className="bg-green-100 text-green-600 px-4 rounded-xl font-bold hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                        >
                            {loadingSearch === 'target' ? <div className="w-4 h-4 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" /> : <FaSearch />}
                        </button>
                        </div>
                    </div>
                    {targetUser && renderUserCard(targetUser, 'target')}
                </div>
            </div>
          )}

          {step === 2 && sourceUser && targetUser && (
             <div className="space-y-6">
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm font-medium border border-amber-200">
                    <div className="flex items-start gap-3">
                        <FaExclamationTriangle className="text-amber-500 mt-1 text-xl shrink-0" />
                        <div>
                            <p className="font-bold text-amber-900 mb-1 text-base">Irreversible Action Warning</p>
                            <p className="mb-2">You are about to merge two accounts. This action cannot be undone.</p>
                            <ul className="list-disc list-inside space-y-1 text-xs opacity-90 ml-1">
                                <li>All orders and products from Source will be moved to Target.</li>
                                <li>Source Wallet Balance (KES {sourceUser.walletBalance || 0}) will be added to Target.</li>
                                <li>Source account ({sourceUser.email}) will be permanently deactivated and emails/phones released.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 py-4 opacity-70 pointer-events-none">
                    {renderUserCard(sourceUser, 'source')}
                    <FaArrowRight className="text-3xl text-gray-300" />
                    {renderUserCard(targetUser, 'target')}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <FaLock className="text-gray-400"/> Admin Password
                    </label>
                    <p className="text-xs text-gray-500">Please enter your admin password to authorize this sensitive action.</p>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </button>
                    </div>
                </div>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={step === 2 ? () => { setStep(1); setAdminPassword(''); setError(''); } : closeModal}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {step === 2 ? 'Back' : 'Cancel'}
          </button>
          
          {step === 1 && (
            <button
              onClick={() => { setError(''); setStep(2); }}
              disabled={!sourceUser || !targetUser}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm"
            >
               Proceed to Review
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleMerge}
              disabled={loadingMerge || !adminPassword}
              className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[140px] gap-2"
            >
              {loadingMerge ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FaExclamationTriangle /> Confirm Merge</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
