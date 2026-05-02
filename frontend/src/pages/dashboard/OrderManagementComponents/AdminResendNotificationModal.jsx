import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaRedo, FaExclamationTriangle, FaCheckCircle, FaUser, FaBell, FaSms, FaEnvelope, FaWhatsapp } from 'react-icons/fa';
import { adminApi } from '../../../services/api';

export default function AdminResendNotificationModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notifType, setNotifType] = useState('placed'); // placed, confirmed, shipped, cancelled
  
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

  const handleResend = async () => {
    if (!selectedOrder) return;
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminResendNotification({
        orderId: selectedOrder.id,
        type: notifType
      });
      if (onSuccess) onSuccess(res.data.message || `Notification resent successfully.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend notification.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setSearchTerm('');
    setOrders([]);
    setSelectedOrder(null);
    setNotifType('placed');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-rose-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaRedo className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Resend Notification</h2>
              <p className="text-rose-100 text-xs font-medium">Manually re-trigger order updates to customers</p>
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
            <label className="text-sm font-bold text-gray-700">Step 1: Find Order</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Order # or Customer..."
                className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-rose-500 transition-all outline-none"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Order Results List */}
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto pr-1">
              {orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedOrder?.id === order.id 
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/10' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-rose-700">#{order.orderNumber}</p>
                    <p className="text-[10px] font-bold text-gray-800">{order.customerName || order.user?.name || 'Guest'}</p>
                  </div>
                  {selectedOrder?.id === order.id && <FaCheckCircle className="text-rose-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Type */}
          {selectedOrder && (
            <div className="space-y-3 animate-fade-in">
              <label className="text-sm font-bold text-gray-700">Step 2: Select Notification Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'placed', label: 'Order Placed', desc: 'Welcome & receipt' },
                  { id: 'confirmed', label: 'Seller Confirmed', desc: 'Preparation started' },
                  { id: 'shipped', label: 'Out for Delivery', desc: 'Agent & tracking info' },
                  { id: 'cancelled', label: 'Order Cancelled', desc: 'Cancellation notice' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNotifType(type.id)}
                    className={`flex flex-col p-3 rounded-xl border-2 transition-all text-left ${
                      notifType === type.id 
                      ? 'border-rose-500 bg-rose-50' 
                      : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className="text-xs font-black text-gray-800">{type.label}</p>
                    <p className="text-[10px] text-gray-500">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 space-y-3">
              <div className="flex items-center gap-3">
                  <FaBell className="text-rose-400" />
                  <p className="text-[10px] font-medium text-rose-800">This will re-send the selected message to the customer via all enabled channels (SMS, Email, WhatsApp). Ensure the order details are correct before sending.</p>
              </div>
              <div className="flex gap-4 justify-center text-rose-300 text-lg">
                  <FaSms /> <FaEnvelope /> <FaWhatsapp />
              </div>
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
            onClick={handleResend}
            disabled={loadingSave || !selectedOrder}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[150px] bg-rose-600 hover:bg-rose-700"
          >
            {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Resend Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
