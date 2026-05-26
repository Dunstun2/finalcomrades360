import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PromoPoster from '../../components/PromoPoster';

const MarketerPromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posterPromo, setPosterPromo] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const fetchPromoCodes = async () => {
      try {
        const { data } = await api.get('/promo-codes');
        setPromoCodes(data.data || []);
      } catch (err) {
        console.error('Failed to fetch promo codes:', err);
      } finally {
        setLoading(false);
      }
    };
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Available Promo Codes</h1>
          <p className="text-sm text-gray-500 mt-1">View active promo codes and generate promotional posters.</p>
        </div>
      </div>

      <div className={`bg-white rounded-lg shadow overflow-x-auto ${promoCodes.length > 0 ? 'pb-28' : ''}`}>
        {loading ? (
          <p className="p-4 text-center text-gray-500">Loading...</p>
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
                    <div className="text-gray-500 mb-1">Uses: {promo.usageCount}{promo.maxUsageLimit ? ` / ${promo.maxUsageLimit}` : ''}</div>
                    {promo.minUserOrderCount > 0 && <div className="text-blue-600 font-medium">Min Orders: {promo.minUserOrderCount}</div>}
                    {promo.minUserLifetimeSpend > 0 && <div className="text-blue-600 font-medium">Min Spend: KES {promo.minUserLifetimeSpend}</div>}
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
                            onClick={() => { setPosterPromo(promo); setOpenMenuId(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2 font-medium"
                          >
                            🖼️ Generate Poster
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {promoCodes.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-400">No promo codes available.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {posterPromo && (
        <PromoPoster
          promo={posterPromo}
          onClose={() => setPosterPromo(null)}
        />
      )}
    </div>
  );
};

export default MarketerPromoCodes;
