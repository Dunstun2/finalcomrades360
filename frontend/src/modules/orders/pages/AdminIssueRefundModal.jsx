import React, { useState } from 'react';
import { FaTimes, FaSearch, FaMoneyBillWave, FaExclamationTriangle, FaBox, FaUser, FaCheckCircle, FaUndo } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';

export default function AdminIssueRefundModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState(null);
  
  const [refundAmount, setRefundAmount] = useState('');
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
    setRefundAmount('');

    try {
      const res = await adminApi.adminGetOrder(searchTerm);
      const orderData = res.data.order || res.data;
      setOrder(orderData);
      setRefundAmount(orderData.total || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found. Please verify the ID.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleIssueRefund = async () => {
    if (!order) return;
    
    if (!refundAmount || isNaN(refundAmount) || parseFloat(refundAmount) <= 0) {
      setError('Please enter a valid refund amount.');
      return;
    }

    if (parseFloat(refundAmount) > parseFloat(order.total)) {
      setError(`Refund amount cannot exceed the order total of KSh ${order.total}.`);
      return;
    }
    
    if (!reason.trim()) {
      setError('Please provide a reason for this refund.');
      return;
    }
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminIssueRefund({
        orderId: order.id,
        amount: parseFloat(refundAmount),
        reason: reason.trim()
      });
      if (onSuccess) onSuccess(res.data.message || `Refund of KSh ${refundAmount} issued successfully.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue refund.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setSearchTerm('');
    setOrder(null);
    setRefundAmount('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaUndo className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Issue Wallet Refund</h2>
              <p className="text-emerald-100 text-xs font-medium">Credit a user's wallet for an order issue</p>
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

          {/* Search Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Find Order</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter Order ID or Number"
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loadingSearch || !searchTerm}
                className="bg-emerald-600 text-white px-5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {loadingSearch ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSearch />}
              </button>
            </div>
          </div>

          {order && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><FaBox/> Order Summary</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-200 font-bold text-gray-500">#{order.orderNumber}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Customer</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{order.user?.name || 'Guest User'}</p>
                    <p className="text-[10px] text-gray-500">{order.user?.email || order.customerEmail || 'No email'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Total Amount</p>
                    <p className="text-lg font-black text-emerald-600">KSh {parseFloat(order.total || 0).toLocaleString()}</p>
                  </div>
                </div>

                {!order.userId && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
                    <FaExclamationTriangle className="text-amber-500 text-xs shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 font-medium">Guest order detected. Refunds can only be issued to registered users with wallets. Please consider manual M-Pesa refund instead.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-gray-700">Refund Amount (KSh)</label>
                    <button 
                      onClick={() => setRefundAmount(order.total)}
                      className="text-[10px] font-bold text-emerald-600 hover:underline"
                    >
                      Refund Full Amount
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">KSh</span>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3 text-lg font-black focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Reason for Refund</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Out of stock, customer cancellation, item damaged, etc."
                    rows="2"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
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
            onClick={handleIssueRefund}
            disabled={loadingSave || !order || !order.userId || !refundAmount || !reason.trim()}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[150px] bg-emerald-600 hover:bg-emerald-700"
          >
            {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}
