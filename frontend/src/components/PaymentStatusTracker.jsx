import React, { useState, useEffect, useCallback } from 'react';
import paymentService from '../services/paymentService';
import RefundRequestModal from './RefundRequestModal';
import { FaCheckCircle, FaClock, FaTimesCircle, FaSpinner, FaRedo, FaUndo, FaExclamationTriangle, FaSync } from 'react-icons/fa';

const PaymentStatusTracker = ({ paymentId, orderId, onStatusChange }) => {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Adaptive polling intervals based on payment status
  const getPollingInterval = useCallback((status) => {
    switch (status) {
      case 'processing':
      case 'pending':
        return 8000; // Poll more frequently when active
      case 'completed':
      case 'failed':
      case 'cancelled':
        return 30000; // Poll less frequently when final
      default:
        return 15000; // Default interval
    }
  }, []);

  useEffect(() => {
    if (paymentId) {
      loadPaymentStatus();
      // Start adaptive polling
      const interval = setInterval(checkStatus, getPollingInterval(payment?.status));
      return () => clearInterval(interval);
    }
  }, [paymentId, payment?.status, getPollingInterval]);

  const loadPaymentStatus = async () => {
    try {
      setLoading(true);
      const response = await paymentService.checkPaymentStatus(paymentId);
      if (response.success) {
        setPayment(response.payment);
        onStatusChange && onStatusChange(response.payment);
      }
    } catch (err) {
      setError('Failed to load payment status');
      console.error('Error loading payment status:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = useCallback(async (force = false) => {
    if (!paymentId || (polling && !force)) return;

    try {
      setPolling(true);
      const response = await paymentService.checkPaymentStatus(paymentId, !force); // Use cache unless forced

      if (response.success) {
        const newPayment = response.payment;
        const statusChanged = newPayment.status !== payment?.status;

        if (statusChanged || force) {
          setPayment(newPayment);
          onStatusChange && onStatusChange(newPayment);

          // Clear any errors if status changed to success
          if (statusChanged && ['completed', 'processing'].includes(newPayment.status)) {
            setError(null);
          }
        }

        // Auto-stop polling for final states
        if (['completed', 'failed', 'cancelled', 'refunded'].includes(newPayment.status)) {
          setPolling(false);
        }
      }
    } catch (err) {
      console.warn('Error checking payment status:', err);

      // Set error state for network issues
      if (err.message?.includes('network') || err.message?.includes('unavailable')) {
        setError('Connection issue - status updates may be delayed');
      }
    } finally {
      setPolling(false);
    }
  }, [paymentId, polling, payment?.status, onStatusChange]);

  // Retry payment functionality
  const handleRetryPayment = async (newPhoneNumber = null) => {
    if (!payment || retrying) return;

    try {
      setRetrying(true);
      setError(null);

      const result = await paymentService.retryPayment(payment.id, newPhoneNumber);

      if (result.success) {
        setRetryCount(prev => prev + 1);
        setPayment(prev => ({ ...prev, status: 'processing' }));

        // Clear cache and force refresh
        paymentService.clearStatusCache(payment.id);
        await checkStatus(true);

        // Show success message
        alert('Payment retry initiated successfully! Check your phone for the new STK push.');
      }
    } catch (err) {
      console.error('Error retrying payment:', err);
      setError(err.message || 'Failed to retry payment');
    } finally {
      setRetrying(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500" size={20} />;
      case 'processing':
      case 'pending':
        return <FaSpinner className="text-blue-500 animate-spin" size={20} />;
      case 'failed':
        return <FaTimesCircle className="text-red-500" size={20} />;
      case 'cancelled':
        return <FaTimesCircle className="text-gray-500" size={20} />;
      case 'refunded':
      case 'partially_refunded':
        return <FaCheckCircle className="text-orange-500" size={20} />;
      default:
        return <FaClock className="text-yellow-500" size={20} />;
    }
  };

  const getStatusMessage = (payment) => {
    if (!payment) return 'Loading payment status...';

    const statusInfo = paymentService.getPaymentStatusInfo(payment.status);
    const methodName = paymentService.getPaymentMethodDisplayName(payment.paymentMethod);

    switch (payment.status) {
      case 'completed':
        return `✅ Payment of ${paymentService.formatAmount(payment.amount)} via ${methodName} was successful!`;
      case 'processing':
        return `🔄 Processing ${methodName} payment of ${paymentService.formatAmount(payment.amount)}...`;
      case 'pending':
        return `⏳ ${methodName} payment of ${paymentService.formatAmount(payment.amount)} is pending completion.`;
      case 'failed':
        const canRetry = paymentService.canRetryPayment(payment);
        const retryText = canRetry ? ' You can retry the payment below.' : '';
        return `❌ ${methodName} payment failed. ${payment.failureReason || 'Please try again or contact support.'}${retryText}`;
      case 'cancelled':
        return `🚫 ${methodName} payment was cancelled.`;
      case 'refunded':
        return `💰 Payment of ${paymentService.formatAmount(payment.amount)} has been fully refunded.`;
      case 'partially_refunded':
        return `💰 Payment partially refunded. Refunded: ${paymentService.formatAmount(payment.refundAmount)}`;
      default:
        return `${methodName} payment status: ${statusInfo.label}`;
    }
  };

  const getPaymentInstructions = (payment) => {
    if (!payment) return null;

    return paymentService.getPaymentInstructions(payment.paymentMethod, payment);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <FaSpinner className="animate-spin text-blue-500 mr-2" />
          <span>Loading payment status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-red-600 text-center">
          {error}
          <button
            onClick={loadPaymentStatus}
            className="ml-2 text-blue-600 hover:text-blue-800"
          >
            <FaRedo size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-gray-600 text-center">No payment information found</div>
      </div>
    );
  }

  const statusInfo = paymentService.getPaymentStatusInfo(payment.status);
  const instructions = getPaymentInstructions(payment);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
        <div className="flex items-center space-x-2">
          {paymentService.canRefund(payment) && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
              title="Request refund"
            >
              <FaUndo size={12} className="inline mr-1" />
              Refund
            </button>
          )}

          {paymentService.canRetryPayment(payment) && (
            <button
              onClick={() => handleRetryPayment()}
              disabled={retrying}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              title="Retry payment"
            >
              <FaSync size={12} className={`inline mr-1 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Retry'}
            </button>
          )}

          <button
            onClick={() => checkStatus(true)}
            disabled={polling}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
            title="Refresh status"
          >
            <FaRedo size={16} className={polling ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-3 mb-4">
        {getStatusIcon(payment.status)}
        <div>
          <div className={`text-sm font-medium ${
            statusInfo.color === 'green' ? 'text-green-700' :
            statusInfo.color === 'red' ? 'text-red-700' :
            statusInfo.color === 'blue' ? 'text-blue-700' :
            statusInfo.color === 'yellow' ? 'text-yellow-700' :
            statusInfo.color === 'orange' ? 'text-orange-700' :
            'text-gray-700'
          }`}>
            {statusInfo.label}
          </div>
          <div className="text-sm text-gray-600">
            {paymentService.getPaymentMethodDisplayName(payment.paymentMethod)} • {paymentService.formatAmount(payment.amount)}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-700 mb-4">
        {getStatusMessage(payment)}
      </div>

      {payment.status === 'pending' && instructions && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-900 mb-2">{instructions.title}</h4>
          <ol className="text-sm text-blue-800 space-y-1 mb-2">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="font-medium mr-2">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          {instructions.note && (
            <p className="text-xs text-blue-700 italic">{instructions.note}</p>
          )}
        </div>
      )}

      {payment.status === 'failed' && paymentService.canRetryPayment(payment) && (
        <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
          <div className="flex items-start">
            <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Payment Failed</h4>
              <p className="text-sm text-yellow-800 mb-2">
                {payment.failureReason || 'Your payment could not be processed.'}
              </p>
              <p className="text-xs text-yellow-700">
                You can retry the payment using the same or a different phone number.
                {retryCount > 0 && ` (Retry attempts: ${retryCount})`}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
          <div className="flex items-start">
            <FaExclamationTriangle className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-900 mb-1">Connection Issue</h4>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => checkStatus(true)}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {payment.mpesaReceiptNumber && (
        <div className="text-sm text-gray-600">
          <strong>M-Pesa Receipt:</strong> {payment.mpesaReceiptNumber}
        </div>
      )}

      {payment.transactionId && (
        <div className="text-sm text-gray-600">
          <strong>Transaction ID:</strong> {payment.transactionId}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4 pt-4 border-t">
        Payment ID: {payment.id} • Created: {new Date(payment.createdAt).toLocaleString()}
        {payment.completedAt && ` • Completed: ${new Date(payment.completedAt).toLocaleString()}`}
        {payment.refundedAt && ` • Refunded: ${new Date(payment.refundedAt).toLocaleString()}`}
      </div>

      {/* Refund Request Modal */}
      <RefundRequestModal
        payment={payment}
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onRefundSuccess={(refund) => {
          // Refresh payment data
          loadPaymentStatus();
          alert(`Refund request submitted successfully!\nAmount: ${paymentService.formatAmount(refund.amount)}\nReason: ${refund.reason}`);
        }}
      />
    </div>
  );
};

export default PaymentStatusTracker;