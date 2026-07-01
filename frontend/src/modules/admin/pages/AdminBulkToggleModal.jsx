import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaToggleOn, FaToggleOff, FaExclamationTriangle, FaUserCircle, FaCheckCircle, FaBoxes, FaHamburger } from 'react-icons/fa';
import { adminApi, productApi, fastFoodApi } from '@/shared/services/api';

export default function AdminBulkToggleModal({ isOpen, onClose, onSuccess }) {
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  
  const [itemType, setItemType] = useState('product'); // product or fastfood
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');

  // Auto-search sellers
  useEffect(() => {
    if (isOpen && sellerSearch.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchSellers();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [sellerSearch, isOpen]);

  // Load items when seller or type changes
  useEffect(() => {
    if (selectedSeller) {
      handleLoadItems();
    } else {
      setItems([]);
      setSelectedItems([]);
    }
  }, [selectedSeller, itemType]);

  if (!isOpen) return null;

  const handleSearchSellers = async () => {
    setLoadingSearch(true);
    try {
      const res = await adminApi.getAllUsers({ 
        role: 'seller', 
        search: sellerSearch,
        limit: 5
      });
      setSellers(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleLoadItems = async () => {
    setLoadingItems(true);
    setError('');
    try {
      let res;
      if (itemType === 'product') {
        res = await productApi.getSellerProducts(selectedSeller.id);
        setItems(res.data.products || []);
      } else {
        res = await fastFoodApi.getVendorProducts(selectedSeller.id);
        setItems(res.data.products || []);
      }
      // Reset selection when loading new items
      setSelectedItems([]);
    } catch (err) {
      setError('Failed to load items for this seller.');
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleItemSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedItems(items.map(i => i.id));
  };

  const selectNone = () => {
    setSelectedItems([]);
  };

  const handleBulkToggle = async (isActive) => {
    if (selectedItems.length === 0) return;
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminBulkToggleItems({
        itemIds: selectedItems,
        isActive,
        type: itemType
      });
      if (onSuccess) onSuccess(res.data.message || `Bulk update successful.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update items.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setSellerSearch('');
    setSellers([]);
    setSelectedSeller(null);
    setItemType('product');
    setItems([]);
    setSelectedItems([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaToggleOn className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Bulk Product Toggle</h2>
              <p className="text-teal-100 text-xs font-medium">Activate or deactivate multiple items at once</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* 1. Seller Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Step 1: Select Seller</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                placeholder="Search seller name or business..."
                className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-teal-500 transition-all outline-none"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <div className="w-4 h-4 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {sellers.length > 0 && !selectedSeller && (
              <div className="grid grid-cols-1 gap-2 mt-2">
                {sellers.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeller(s)}
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center"><FaUserCircle/></div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">{s.businessName || s.name}</p>
                      <p className="text-[10px] text-gray-500">{s.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedSeller && (
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center"><FaUserCircle/></div>
                  <div>
                    <p className="text-xs font-bold text-teal-900">{selectedSeller.businessName || selectedSeller.name}</p>
                    <p className="text-[10px] text-teal-700">{selectedSeller.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSeller(null)} className="text-[10px] font-bold text-teal-600 hover:underline">Change</button>
              </div>
            )}
          </div>

          {selectedSeller && (
            <>
              {/* 2. Type Selection */}
              <div className="flex gap-2">
                <button
                  onClick={() => setItemType('product')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border-2 transition-all ${itemType === 'product' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-100'}`}
                >
                  <FaBoxes /> Products
                </button>
                <button
                  onClick={() => setItemType('fastfood')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border-2 transition-all ${itemType === 'fastfood' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-100'}`}
                >
                  <FaHamburger /> Fast Food
                </button>
              </div>

              {/* 3. Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Step 2: Select Items ({selectedItems.length} selected)</label>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-[10px] font-bold text-teal-600 hover:underline">Select All</button>
                    <button onClick={selectNone} className="text-[10px] font-bold text-gray-500 hover:underline">Clear</button>
                  </div>
                </div>

                <div className="border-2 border-gray-50 rounded-xl overflow-hidden">
                  <div className="max-h-60 overflow-y-auto bg-gray-50/30 p-2 space-y-1">
                    {loadingItems ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                        <p className="text-xs font-medium text-gray-400">Loading {itemType} items...</p>
                      </div>
                    ) : items.length > 0 ? (
                      items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => toggleItemSelection(item.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedItems.includes(item.id) ? 'bg-white border-teal-500 ring-2 ring-teal-500/5' : 'bg-white border-transparent hover:border-gray-200'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                <img 
                                  src={item.coverImage || item.mainImage || '/uploads/default-product.jpg'} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => e.target.src = '/uploads/default-product.jpg'}
                                />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {item.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">KSh {parseFloat(item.price || item.basePrice || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          {selectedItems.includes(item.id) && <FaCheckCircle className="text-teal-600" />}
                        </button>
                      ))
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-xs font-medium text-gray-400">No {itemType} items found for this seller.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkToggle(true)}
              disabled={loadingSave || selectedItems.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-green-700 transition-all disabled:opacity-50"
            >
              <FaToggleOn /> Activate Selected
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              disabled={loadingSave || selectedItems.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              <FaToggleOff /> Deactivate Selected
            </button>
          </div>

          <button
            onClick={closeModal}
            className="px-5 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
