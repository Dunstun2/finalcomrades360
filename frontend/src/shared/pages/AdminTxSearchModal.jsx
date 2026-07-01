import React, { useState } from 'react';
import { FaTimes, FaSearch, FaExclamationTriangle, FaCheckCircle, FaUser, FaPhone, FaMoneyBillWave, FaCalendarAlt, FaHashtag } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';

export default function AdminTxSearchModal({ isOpen, onClose, onSuccess }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    try {
      const res = await adminApi.adminSearchPayments({ query });
      setResults(res.data.payments || []);
      if (res.data.payments.length === 0) {
        setError('No transactions found matching your query.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search transactions.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setQuery('');
    setResults([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaSearch className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Transaction Search</h2>
              <p className="text-emerald-100 text-xs font-medium">Find payments by Ref, Phone, or Receipt</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="M-Pesa Receipt, Phone, or Order #..."
                className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:border-emerald-500 transition-all outline-none shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Search'}
            </button>
          </form>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2 animate-shake">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Results List */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {results.map(tx => (
              <div key={tx.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-emerald-500 transition-all hover:shadow-md group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{tx.paymentMethod}</p>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <FaHashtag className="text-gray-300" /> {tx.mpesaReceiptNumber || tx.transactionId || 'N/A'}
                    </h3>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                    tx.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tx.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Amount</p>
                    <p className="text-xs font-black text-gray-800 flex items-center gap-1">
                      <FaMoneyBillWave className="text-emerald-500" /> {tx.currency} {tx.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Phone</p>
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      <FaPhone className="text-gray-300" /> {tx.mpesaPhoneNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Order</p>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                       #{tx.order?.orderNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Date</p>
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      <FaCalendarAlt className="text-gray-300" /> {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                    <FaUser />
                  </div>
                  <p className="text-[11px] font-medium text-gray-600">
                    {tx.user?.name} <span className="text-gray-400 italic">({tx.user?.email})</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3">
              <FaCheckCircle className="text-emerald-600 shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-emerald-900 uppercase">Verification Tip</p>
                <p className="text-[10px] text-emerald-800 leading-relaxed">Always cross-reference the Receipt Number with the customer's payment screenshot or your M-Pesa statement for absolute certainty.</p>
              </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={closeModal}
            className="px-8 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
