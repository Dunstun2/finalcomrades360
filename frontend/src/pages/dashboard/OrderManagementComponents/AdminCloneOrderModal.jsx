import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaCopy, FaExclamationTriangle, FaCheckCircle, FaUser, FaCalendarAlt, FaTruck } from 'react-icons/fa';
import { adminApi } from '../../../services/api';

export default function AdminCloneOrderModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');

  // Auto-search orders
  useEffect(() => {
    if (isOpen && searchTerm.length >= 3) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchOrders();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchTerm, isOpen]);

  if (!isOpen) return null;

  const handleSearchOrders = async () => {
    setLoadingSearch(true);
    setError('');
    try {
      const res = await adminApi.getAllOrders({ 
        search: searchTerm,
        limit: 5 
      });
      setOrders(res.data.orders || []);
    } catch (err) {
      setError('Failed to fetch orders.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleCloneOrder = async () => {
    if (!selectedOrder) return;
    
    if (!window.confirm(`Are you sure you want to clone Order #${selectedOrder.orderNumber}? This will create a NEW order with the same items and customer details.`)) {
      return;
    }

    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminCloneOrder({
        originalOrderId: selectedOrder.id
      });
      if (onSuccess) onSuccess(res.data.message || `Order #${selectedOrder.orderNumber} cloned successfully.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clone order.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setSearchTerm('');
    setOrders([]);
    setSelectedOrder(null);
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
              <FaCopy className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Clone / Re-create Order</h2>
              <p className="text-indigo-100 text-xs font-medium">Duplicate an existing order for reprocessing</p>
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

          {/* Order Search */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Find Original Order</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Order # or Customer Name..."
                className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-indigo-500 transition-all outline-none"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Order Results List */}
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
              {orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`flex flex-col p-3 rounded-xl border-2 transition-all text-left ${
                    selectedOrder?.id === order.id 
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/10' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-black text-indigo-700">#{order.orderNumber}</p>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <FaCalendarAlt /> {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <FaUser className="text-[10px] text-gray-400" />
                    <p className="text-xs font-bold text-gray-800">{order.customerName || order.user?.name || 'Guest'}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-gray-500">Total: KSh {parseFloat(order.total).toLocaleString()}</p>
                    <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-black ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>{order.status.replace(/_/g, ' ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedOrder && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2 animate-fade-in">
              <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Order Summary to Clone</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase">Customer</p>
                  <p className="text-xs font-bold text-gray-800">{selectedOrder.customerName || selectedOrder.user?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase">Phone</p>
                  <p className="text-xs font-bold text-gray-800">{selectedOrder.customerPhone || selectedOrder.user?.phone || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-indigo-600 font-bold uppercase">Delivery Method</p>
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <FaTruck /> {selectedOrder.deliveryMethod.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-[11px] font-medium border border-orange-100 flex gap-2">
            <FaExclamationTriangle className="shrink-0 mt-0.5 text-orange-500" />
            <span>Cloning will create a NEW order in 'order_placed' status. Payment will NOT be copied (the new order will start unpaid).</span>
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
            onClick={handleCloneOrder}
            disabled={loadingSave || !selectedOrder}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[150px] bg-indigo-600 hover:bg-indigo-700"
          >
            {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Clone'}
          </button>
        </div>
      </div>
    </div>
  );
}
