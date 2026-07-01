import React, { useState } from 'react';
import { FaTimes, FaMoneyCheck, FaSpinner, FaLock, FaCheckCircle, FaReceipt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';
import { useToast } from '@/shared/components/use-toast';

const AdminManualConfirmPaymentModal = ({ isOpen, onClose, onActionComplete }) => {
  const [orderId, setOrderId] = useState('');
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderId || !adminPassword || !reason) {
      toast({
        title: 'Validation Error',
        description: 'Order ID, Admin Password, and Reason are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await adminApi.adminManualConfirmPayment({
        orderId,
        mpesaReceiptNumber,
        amount: amount ? parseFloat(amount) : null,
        adminPassword,
        reason
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message || 'Payment confirmed manually.',
        });
        if (onActionComplete) onActionComplete(response.data);
        onClose();
        // Reset form
        setOrderId('');
        setMpesaReceiptNumber('');
        setAmount('');
        setAdminPassword('');
        setReason('');
      }
    } catch (error) {
      console.error('Manual confirmation error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to confirm payment manually.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <FaMoneyCheck className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Manual Payment</h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Force Confirm Order Payment</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Target Order ID</label>
            <div className="relative">
              <FaReceipt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="e.g. 1234"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-green-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">M-Pesa Receipt (Optional)</label>
              <input 
                type="text"
                placeholder="QE7..."
                value={mpesaReceiptNumber}
                onChange={(e) => setMpesaReceiptNumber(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Amount (Optional)</label>
              <input 
                type="number"
                placeholder="Order total"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Reason for Manual Action</label>
            <textarea 
              placeholder="e.g. STK Push failed but customer shared receipt via WhatsApp"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-green-500 transition-all min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 text-red-500">Your Admin Password</label>
            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your identity"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-red-50/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-2xl font-black tracking-tight hover:shadow-lg hover:shadow-green-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
              {loading ? 'Confirming...' : 'CONFIRM PAYMENT MANUALLY'}
            </button>
          </div>
          
          <p className="text-[10px] text-center text-gray-400 font-medium px-4">
            This action will mark the order as paid, trigger commission calculations, and alert the seller. This action is permanently logged.
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminManualConfirmPaymentModal;
