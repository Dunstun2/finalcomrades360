import React, { useState } from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import paymentService from '../services/paymentService';

const RefundRequestModal = ({ payment, isOpen, onClose, onRefundSuccess }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [amount, setAmount] = useState(payment?.amount || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refundReasons = [
    'Product not as described',
    'Product damaged or defective',
    'Wrong item delivered',
    'Delivery delay',
    'Changed mind',
    'Duplicate order',
    'Payment error',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason) {
      setError('Please select a reason for the refund');
      return;
    }

    const finalReason = reason === 'Other' ? customReason : reason;

    if (!finalReason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (refundAmount > payment.amount) {
      setError('Refund amount cannot exceed the payment amount');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await paymentService.processRefund(payment.id, {
        reason: finalReason,
        amount: refundAmount
      });

      if (response.success) {
        onRefundSuccess && onRefundSuccess(response.refund);
        onClose();
      } else {
        setError(response.message || 'Failed to process refund request');
      }

    } catch (err) {
      console.error('Refund request error:', err);
      setError(err.response?.data?.message || 'Failed to process refund request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !payment) return null;

  const canRefund = paymentService.canRefund(payment);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Request Refund</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {!canRefund && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <FaExclamationTriangle className="text-yellow-500 mr-2" />
                <span className="text-sm text-yellow-800">
                  Refunds are only available for completed payments within 30 days.
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Payment Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div><strong>Payment ID:</strong> {payment.id}</div>
                  <div><strong>Amount:</strong> {paymentService.formatAmount(payment.amount)}</div>
                  <div><strong>Method:</strong> {paymentService.getPaymentMethodDisplayName(payment.paymentMethod)}</div>
                  <div><strong>Date:</strong> {new Date(payment.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Refund Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Refund *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a reason</option>
                  {refundReasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Custom Reason */}
              {reason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify *
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Please provide details about your refund request..."
                    required
                  />
                </div>
              )}

              {/* Refund Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Amount (KES) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0.01"
                  max={payment.amount}
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum refund amount: {paymentService.formatAmount(payment.amount)}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !canRefund}
                >
                  {loading ? 'Processing...' : 'Request Refund'}
                </button>
              </div>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Refund requests are reviewed by our team. You will receive an email confirmation once your request is processed. Processing may take 3-5 business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundRequestModal;