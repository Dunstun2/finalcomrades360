import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaStore, FaExclamationTriangle, FaUserCircle, FaCheckCircle, FaClock, FaDoorOpen, FaDoorClosed } from 'react-icons/fa';
import { adminApi } from '../../../services/api';

export default function AdminForceShopStatusModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [status, setStatus] = useState('AUTO'); // AUTO, OPEN, CLOSED
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');

  // Auto-search sellers when modal opens or search term changes
  useEffect(() => {
    if (isOpen && searchTerm.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchSellers();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchTerm, isOpen]);

  if (!isOpen) return null;

  const handleSearchSellers = async () => {
    setLoadingSearch(true);
    setError('');
    try {
      // Using getAllUsers with role=seller
      const res = await adminApi.getAllUsers({ 
        role: 'seller', 
        search: searchTerm,
        limit: 10
      });
      setSellers(res.data.users || []);
    } catch (err) {
      setError('Failed to fetch sellers.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleForceStatus = async () => {
    if (!selectedSeller) return;
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminForceShopStatus({
        sellerId: selectedSeller.id,
        status: status
      });
      if (onSuccess) onSuccess(res.data.message || `Shop status for ${selectedSeller.businessName || selectedSeller.name} updated.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update shop status.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setSearchTerm('');
    setSellers([]);
    setSelectedSeller(null);
    setStatus('AUTO');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-orange-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaStore className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Force Shop Status</h2>
              <p className="text-orange-100 text-xs font-medium">Override a seller's operating hours</p>
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

          {/* Seller Search */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Find Seller / Shop</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by business name, owner name, or ID..."
                className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Seller Results List */}
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
              {sellers.map(seller => (
                <button
                  key={seller.id}
                  onClick={() => setSelectedSeller(seller)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedSeller?.id === seller.id 
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/10' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${selectedSeller?.id === seller.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <FaUserCircle />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-800">{seller.businessName || seller.name}</p>
                      <p className="text-[10px] text-gray-500">{seller.name} • {seller.phone}</p>
                    </div>
                  </div>
                  {selectedSeller?.id === seller.id && (
                    <FaCheckCircle className="text-orange-600 text-lg" />
                  )}
                </button>
              ))}
              {searchTerm.length >= 2 && sellers.length === 0 && !loadingSearch && (
                <p className="text-center py-4 text-xs text-gray-400 italic">No sellers found matching "{searchTerm}"</p>
              )}
              {searchTerm.length < 2 && sellers.length === 0 && (
                <p className="text-center py-4 text-[10px] text-gray-400 uppercase font-bold tracking-widest">Type to search sellers</p>
              )}
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-bold text-gray-700">Select Override Status</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'AUTO', label: 'Auto', icon: <FaClock />, color: 'gray', desc: 'Follow Schedule' },
                { id: 'OPEN', label: 'Open', icon: <FaDoorOpen />, color: 'emerald', desc: 'Force Open' },
                { id: 'CLOSED', label: 'Closed', icon: <FaDoorClosed />, color: 'rose', desc: 'Force Closed' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setStatus(opt.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    status === opt.id 
                    ? `border-${opt.color}-500 bg-${opt.color}-50 ring-2 ring-${opt.color}-500/10` 
                    : 'border-gray-100 bg-white hover:border-gray-200 text-gray-400'
                  }`}
                >
                  <span className={`text-xl ${status === opt.id ? `text-${opt.color}-600` : 'text-gray-300'}`}>{opt.icon}</span>
                  <div className="text-center">
                    <p className={`text-xs font-bold ${status === opt.id ? `text-${opt.color}-700` : 'text-gray-500'}`}>{opt.label}</p>
                    <p className="text-[8px] uppercase tracking-tighter font-bold opacity-60">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-[11px] font-medium border border-orange-100 flex gap-2">
            <FaExclamationTriangle className="shrink-0 mt-0.5 text-orange-500" />
            <span>This will update all items (products/fastfood) for this seller. OPEN forces them to appear even if outside their schedule. CLOSED hides them from the marketplace.</span>
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
            onClick={handleForceStatus}
            disabled={loadingSave || !selectedSeller}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[150px] bg-orange-600 hover:bg-orange-700"
          >
            {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply Override'}
          </button>
        </div>
      </div>
    </div>
  );
}
