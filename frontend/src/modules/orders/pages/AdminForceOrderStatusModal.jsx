import React, { useState } from 'react';
import { FaTimes, FaSearch, FaExchangeAlt, FaExclamationTriangle, FaBox } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';

const ORDER_STATUSES = [
  'pending',
  'processing',
  'ready_for_pickup',
  'dispatched',
  'delivered',
  'cancelled',
  'returned'
];

export default function AdminForceOrderStatusModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState(null);
  
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter an Order ID.');
      return;
    }
    setLoadingSearch(true);
    setError('');
    setOrder(null);
    setNewStatus('');

    try {
      // Fetch order by ID using the adminApi
      const res = await adminApi.adminGetOrder(searchTerm);
      setOrder(res.data.order || res.data);
      setNewStatus(res.data.order?.status || res.data?.status || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found. Please verify the ID.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleForceStatus = async () => {
    if (!order) return;
    if (!newStatus || newStatus === order.status) {
        setError('Please select a different status.');
        return;
    }
    if (!reason.trim()) {
        setError('Please provide a reason for this override.');
        return;
    }
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminForceOrderStatus({
          orderId: order.id,
          newStatus,
          reason: reason.trim()
      });
      if (onSuccess) onSuccess(res.data.message || `Order #${order.id} status forcefully changed to ${newStatus}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to override order status.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setSearchTerm('');
    setOrder(null);
    setNewStatus('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-amber-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaExchangeAlt className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Force Order Status</h2>
              <p className="text-amber-100 text-xs font-medium">Manually override a stuck order's status</p>
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
            <label className="text-sm font-bold text-gray-700">Find Order</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter Order ID"
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loadingSearch || !searchTerm}
                className="bg-amber-600 text-white px-5 rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {loadingSearch ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSearch />}
              </button>
            </div>
          </div>

          {order && (
              <>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><FaBox/> Order Details</span>
                        <span className="text-[10px] bg-white text-gray-700 px-2 py-0.5 rounded-full font-bold border border-gray-200 shadow-sm">ID: {order.id}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Current Status</p>
                            <span className="inline-block px-2 py-1 mt-1 rounded text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-200">
                                {order.status}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 font-medium">Total Amount</p>
                            <p className="font-black text-lg text-gray-900">KES {parseFloat(order.totalAmount || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                        <span>User ID: {order.userId}</span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs font-medium border border-amber-200 flex gap-2">
                        <FaExclamationTriangle className="shrink-0 mt-0.5 text-amber-500" />
                        <span>Warning: Forcing an order status bypasses normal validation (like checking if payment was received or agent accepted). This may cause inconsistencies.</span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">New Status</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none font-medium capitalize"
                        >
                            {ORDER_STATUSES.map(status => (
                                <option key={status} value={status} disabled={status === order.status}>
                                    {status.replace(/_/g, ' ')} {status === order.status ? '(Current)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Reason for Override</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. System got stuck, payment confirmed manually offline, etc."
                            rows="2"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none resize-none"
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
            onClick={handleForceStatus}
            disabled={loadingSave || !order || !reason || newStatus === order.status}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[140px] bg-amber-600 hover:bg-amber-700`}
          >
            {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Force Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
