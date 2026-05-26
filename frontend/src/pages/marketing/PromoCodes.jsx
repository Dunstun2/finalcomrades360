import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PromoPoster from '../../components/PromoPoster';
import { toast } from 'react-hot-toast';

const PromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [posterPromo, setPosterPromo] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [formData, setFormData] = useState({ 
    id: null, code: '', discountPercentage: 10, isActive: true, autoApply: false, orderType: 'all',
    validFrom: '', validUntil: '', targetAudience: 'all', applicableProductIds: '',
    minOrderValue: 0, maxDiscountAmount: '', maxUsageLimit: '',
    minUserOrderCount: '', minUserLifetimeSpend: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const { data } = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
          if (data) {
            const results = [];
            if (data.products && (formData.orderType === 'all' || formData.orderType === 'ecommerce')) {
              results.push(...data.products.map(p => ({ ...p, type: 'product' })));
            }
            if (data.fastfood && (formData.orderType === 'all' || formData.orderType === 'fastfood')) {
              results.push(...data.fastfood.map(f => ({ ...f, type: 'fastfood' })));
            }
            setSearchResults(results);
          }
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, formData.orderType]);

  const handleProductSelect = (res) => {
    const currentIds = formData.applicableProductIds ? formData.applicableProductIds.split(',').map(id => id.trim()).filter(id => id) : [];
    
    // Clean name by removing commas/colons to avoid parsing issues
    const cleanName = res.name ? res.name.replace(/[,:]/g, '').trim() : 'Unknown';
    const formattedId = `${res.type}_${res.id}:${cleanName}`;
    
    const exists = currentIds.some(id => id === String(res.id) || id.startsWith(`${res.type}_${res.id}`));
    
    if (!exists) {
      currentIds.push(formattedId);
      setFormData({ ...formData, applicableProductIds: currentIds.join(', ') });
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/promo-codes');
      if (data.success) {
        setPromoCodes(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch promo codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        validFrom: formData.validFrom || null,
        validUntil: formData.validUntil || null,
        applicableProductIds: formData.applicableProductIds 
          ? formData.applicableProductIds.split(',').map(id => id.trim()).filter(id => id)
          : null,
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        maxUsageLimit: formData.maxUsageLimit ? parseInt(formData.maxUsageLimit) : null,
        minUserOrderCount: (formData.minUserOrderCount !== '' && formData.minUserOrderCount !== null && formData.minUserOrderCount !== undefined) ? parseInt(formData.minUserOrderCount) : null,
        minUserLifetimeSpend: (formData.minUserLifetimeSpend !== '' && formData.minUserLifetimeSpend !== null && formData.minUserLifetimeSpend !== undefined) ? parseFloat(formData.minUserLifetimeSpend) : null,
      };

      if (formData.id) {
        const { data } = await api.put(`/promo-codes/${formData.id}`, payload);
        if (data.success) {
          toast.success('Promo code updated');
          setShowModal(false);
          fetchPromoCodes();
        }
      } else {
        const { data } = await api.post('/promo-codes', payload);
        if (data.success) {
          toast.success('Promo code created');
          setShowModal(false);
          fetchPromoCodes();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving promo code');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this promo code?')) {
      try {
        const { data } = await api.delete(`/promo-codes/${id}`);
        if (data.success) {
          toast.success('Promo code deleted');
          fetchPromoCodes();
        }
      } catch (error) {
        toast.error('Error deleting promo code');
      }
    }
  };

  const openEditModal = (promo) => {
    setFormData({ 
      id: promo.id, code: promo.code, discountPercentage: promo.discountPercentage, isActive: promo.isActive, autoApply: promo.autoApply || false, orderType: promo.orderType || 'all',
      validFrom: promo.validFrom ? promo.validFrom.split('T')[0] : '',
      validUntil: promo.validUntil ? promo.validUntil.split('T')[0] : '',
      targetAudience: promo.targetAudience || 'all',
      applicableProductIds: promo.applicableProductIds 
        ? (Array.isArray(promo.applicableProductIds) ? promo.applicableProductIds.join(', ') : (typeof promo.applicableProductIds === 'string' && promo.applicableProductIds.startsWith('[') ? JSON.parse(promo.applicableProductIds).join(', ') : promo.applicableProductIds))
        : '',
      minOrderValue: promo.minOrderValue || 0,
      maxDiscountAmount: promo.maxDiscountAmount || '',
      maxUsageLimit: promo.maxUsageLimit || '',
      minUserOrderCount: promo.minUserOrderCount !== null ? promo.minUserOrderCount : '',
      minUserLifetimeSpend: promo.minUserLifetimeSpend !== null ? promo.minUserLifetimeSpend : ''
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setFormData({ 
      id: null, code: '', discountPercentage: 10, isActive: true, autoApply: false, orderType: 'all',
      validFrom: '', validUntil: '', targetAudience: 'all', applicableProductIds: '',
      minOrderValue: 0, maxDiscountAmount: '', maxUsageLimit: '',
      minUserOrderCount: '', minUserLifetimeSpend: ''
    });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center sm:text-left">Promo Codes</h1>
        <button 
          onClick={openCreateModal} 
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition w-full sm:w-auto text-center font-bold"
        >
          + Add Promo Code
        </button>
      </div>

      <div className={`bg-white rounded-lg shadow overflow-x-auto ${promoCodes.length > 0 ? 'pb-28' : ''}`}>
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : (
          <table className="w-full text-left border-collapse" style={{ minWidth: '1000px' }}>
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 border-b">Code</th>
                <th className="p-4 border-b">Discount %</th>
                <th className="p-4 border-b">Order Type</th>
                <th className="p-4 border-b">Audience</th>
                <th className="p-4 border-b">Validity</th>
                <th className="p-4 border-b">Min/Max (KES)</th>
                <th className="p-4 border-b">Usage & Loyalty</th>
                <th className="p-4 border-b">Product IDs</th>
                <th className="p-4 border-b">Status</th>
                <th className="p-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50 border-b last:border-0">
                  <td className="p-4 font-bold">{promo.code}</td>
                  <td className="p-4">{promo.discountPercentage}%</td>
                  <td className="p-4 capitalize">
                    {promo.orderType || 'all'}
                    {promo.autoApply && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">Auto</span>}
                  </td>
                  <td className="p-4 capitalize">{promo.targetAudience === 'new_users' ? 'New Users' : 'All'}</td>
                  <td className="p-4 text-xs text-gray-600">
                    <div>From: {promo.validFrom ? new Date(promo.validFrom).toLocaleDateString() : 'N/A'}</div>
                    <div>Until: {promo.validUntil ? new Date(promo.validUntil).toLocaleDateString() : 'N/A'}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-600">
                    <div>Min: {promo.minOrderValue || 0}</div>
                    <div>Max: {promo.maxDiscountAmount || 'None'}</div>
                  </td>
                  <td className="p-4 text-xs">
                    <div className="text-gray-500 mb-1">Usages: {promo.usageCount}{promo.maxUsageLimit ? ` / ${promo.maxUsageLimit}` : ''}</div>
                    {promo.minUserOrderCount > 0 && <div className="text-blue-600 font-medium">Min Orders: {promo.minUserOrderCount}</div>}
                    {promo.minUserLifetimeSpend > 0 && <div className="text-blue-600 font-medium">Min Spend: {promo.minUserLifetimeSpend}</div>}
                  </td>
                  <td className="p-4 text-xs text-gray-500 max-w-xs truncate">
                    {promo.applicableProductIds 
                      ? (Array.isArray(promo.applicableProductIds) ? promo.applicableProductIds.join(', ') : promo.applicableProductIds)
                      : 'All'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs text-white ${promo.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                      {promo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-sm relative text-right">
                    <div className="relative inline-block text-left actions-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === promo.id ? null : promo.id);
                        }}
                        className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg leading-none transition"
                        title="Actions"
                      >⋮</button>
                      {openMenuId === promo.id && (
                        <div
                          className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl w-44 overflow-hidden"
                          onMouseLeave={() => setOpenMenuId(null)}
                        >
                          <button
                            onClick={() => { openEditModal(promo); setOpenMenuId(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => { setPosterPromo(promo); setOpenMenuId(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2 font-medium"
                          >
                            🖼️ Generate Poster
                          </button>
                          <div className="border-t border-gray-100" />
                          <button
                            onClick={() => { handleDelete(promo.id); setOpenMenuId(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 font-medium"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {promoCodes.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-4 text-center text-gray-500">No promo codes found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{formData.id ? 'Edit Promo Code' : 'Create Promo Code'}</h2>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full font-bold text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">Discount Percentage <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  className="w-full px-3 py-2 border rounded"
                  value={formData.discountPercentage === '' ? '' : formData.discountPercentage}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Order Type <span className="text-red-500">*</span></label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={formData.orderType}
                    onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                  >
                    <option value="all">All Orders</option>
                    <option value="fastfood">Fastfood Only</option>
                    <option value="product">Product Only</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Target Audience <span className="text-red-500">*</span></label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  >
                    <option value="all">Everyone</option>
                    <option value="new_users">New Users Only</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Valid From <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Valid Until <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border rounded"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Min Order Value (KES)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border rounded"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Max Discount Amount (KES)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Leave empty for no limit"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">Usage Limit (Global)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Leave empty for unlimited"
                    value={formData.maxUsageLimit}
                    onChange={(e) => setFormData({ ...formData, maxUsageLimit: e.target.value })}
                  />
                </div>
                <div className="mb-4 md:col-span-2">
                  <label className="block text-gray-700 font-bold mb-2">Applicable Product IDs</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded mb-2"
                    placeholder="Comma-separated IDs (e.g., 1, 2, 5). Leave empty for all products."
                    value={formData.applicableProductIds}
                    onChange={(e) => setFormData({ ...formData, applicableProductIds: e.target.value })}
                  />
                  
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded"
                      placeholder="Search for an item to add its ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && <div className="absolute right-3 top-3 text-gray-400 text-sm">Searching...</div>}
                    
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((item) => (
                          <div 
                            key={item.id} 
                            onClick={() => handleProductSelect(item)}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                          >
                            <span>{item.name}</span>
                            <span className="text-gray-500 text-sm">ID: {item.id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Removed checkboxes here */}
              {/* Loyalty Requirements Section */}
              <div className="pt-4 mt-2 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Loyalty Requirements (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum User Orders</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. 5"
                      value={formData.minUserOrderCount}
                      onChange={(e) => setFormData({ ...formData, minUserOrderCount: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">User must have this many past delivered orders.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Lifetime Spend (KES)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. 5000"
                      value={formData.minUserLifetimeSpend}
                      onChange={(e) => setFormData({ ...formData, minUserLifetimeSpend: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">User must have spent this much historically.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-100 mt-6">
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span className="text-gray-700 font-bold">Active</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoApply}
                      onChange={(e) => setFormData({ ...formData, autoApply: e.target.checked })}
                    />
                    <span className="text-gray-700 font-bold">Auto Apply</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {posterPromo && (
        <PromoPoster 
          promo={posterPromo} 
          onClose={() => setPosterPromo(null)} 
        />
      )}
    </div>
  );
};

export default PromoCodes;
