import React, { useState, useEffect } from 'react';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

// Get API base URL for image display
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:6000/api';
const SERVER_BASE = API_BASE.replace('/api', '');

export default function PaymentVerificationQueue() {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [reviewedPayments, setReviewedPayments] = useState(new Set());
  const [viewedProofs, setViewedProofs] = useState(new Set());
  const [rejectModal, setRejectModal] = useState({ isOpen: false, orderId: null, subscriptionId: null, reason: '' });

  const handleViewProof = (payment) => {
    setViewedProofs(prev => new Set(prev).add(payment.orderId));
    window.open(getImageUrl(payment.paymentProofUrl), '_blank');
  };

  // Helper function to get the full image URL
  const getImageUrl = (paymentProofUrl) => {
    if (!paymentProofUrl || paymentProofUrl === 'pending_stk_push') {
      return null;
    }
    
    let finalUrl;
    if (paymentProofUrl.startsWith('http')) {
      finalUrl = paymentProofUrl;
    } else {
      // Ensure there's a leading slash if missing
      const path = paymentProofUrl.startsWith('/') ? paymentProofUrl : `/${paymentProofUrl}`;
      // Use the backend server URL directly
      finalUrl = `${SERVER_BASE}${path}`;
    }
    
    return finalUrl;
  };

  // Test image accessibility
  const testImageAccess = async (imageUrl, orderId) => {
    console.log(`🧪 Testing image access for order ${orderId}:`, imageUrl);
    
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      console.log(`✅ Image HEAD request successful for order ${orderId}:`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      return true;
    } catch (error) {
      console.error(`❌ Image HEAD request failed for order ${orderId}:`, {
        error: error.message,
        imageUrl
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPendingPayments();
    // Poll for new payments every 30 seconds
    const interval = setInterval(fetchPendingPayments, 30000);
    return () => clearInterval(interval);
  }, []);

  // Test all payment proof images when data loads
  useEffect(() => {
    if (pendingPayments.length > 0) {
      console.log('🧪 Running automatic image accessibility tests...');
      pendingPayments.forEach(async (payment) => {
        if (payment.paymentProofUrl) {
          const imageUrl = getImageUrl(payment.paymentProofUrl);
          await testImageAccess(imageUrl, payment.orderId);
        }
      });
    }
  }, [pendingPayments]);

  const fetchPendingPayments = async () => {
    try {
      console.log('🔄 Fetching pending payments from API...');
      const response = await api.get('/admin/payments/pending-verification');
      console.log('📋 Payment verification API response:', response.data);
      
      // Debug each payment's paymentProofUrl with more detail
      response.data?.forEach((payment, index) => {
        const imageUrl = getImageUrl(payment.paymentProofUrl);
        console.log(`Payment ${index + 1} detailed info:`, {
          orderId: payment.orderId,
          orderNumber: payment.orderNumber,
          paymentProofUrl: payment.paymentProofUrl,
          fullImageUrl: imageUrl,
          hasPaymentProof: !!payment.paymentProofUrl,
          paymentMethod: payment.paymentSubType,
          status: payment.paymentVerificationStatus,
          amount: payment.amount || payment.total,
          customerInfo: payment.customerInfo,
          customerName: payment.customerInfo?.name || payment.user?.name || 'Unknown',
          customerEmail: payment.customerInfo?.email || payment.user?.email || 'Not provided',
          customerPhone: payment.customerInfo?.phone || 'Not provided',
          hasUserId: !!(payment.customerInfo?.userId || payment.user?.id)
        });
        
        // Test if the constructed URL looks correct
        if (payment.paymentProofUrl) {
          console.log(`🔗 Testing URL construction for payment ${payment.orderId}:`, {
            original: payment.paymentProofUrl,
            startsWithHttp: payment.paymentProofUrl.startsWith('http'),
            startsWithSlash: payment.paymentProofUrl.startsWith('/'),
            constructed: imageUrl,
            serverBase: SERVER_BASE,
            expectedPattern: payment.paymentProofUrl.startsWith('/uploads/') ? '✅ Correct pattern' : '❌ Unexpected pattern'
          });
        }
      });
      
      setPendingPayments(response.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch pending payments:', {
        error: err,
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data
      });
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (orderId, subscriptionId) => {
    if (!reviewedPayments.has(orderId)) {
      toast.warning('⚠️ Please check the review confirmation box before approving.');
      return;
    }

    setProcessingIds(prev => new Set(prev).add(orderId));
    
    try {
      await api.post(`/admin/payments/approve`, {
        orderId,
        subscriptionId
      });
      
      toast.success('✅ Payment approved! Subscription activated and user notified.');
      
      // Remove from pending list
      setPendingPayments(prev => prev.filter(p => p.orderId !== orderId));
      
    } catch (err) {
      console.error('Failed to approve payment:', err);
      toast.error('Failed to approve payment. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleRejectPayment = async (orderId, subscriptionId, reason) => {
    if (!reason) return;

    setProcessingIds(prev => new Set(prev).add(orderId));
    
    try {
      await api.post(`/admin/payments/reject`, {
        orderId,
        subscriptionId,
        reason
      });
      
      toast.success('❌ Payment rejected and user notified.');
      
      // Remove from pending list
      setPendingPayments(prev => prev.filter(p => p.orderId !== orderId));
      
    } catch (err) {
      console.error('Failed to reject payment:', err);
      toast.error('Failed to reject payment. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount) => {
    return `KES ${Number(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
          Payment Verification Queue
          {pendingPayments.length > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
              {pendingPayments.length}
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Review and approve subscription payments with proof
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {pendingPayments.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending payments</h3>
            <p className="text-gray-500">All subscription payments have been verified.</p>
          </div>
        ) : (
          pendingPayments.map((payment) => (
            <div key={payment.orderId} className="px-6 py-6 border-b border-gray-100 last:border-b-0">
              <div className="flex flex-col gap-6">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Order #{payment.orderNumber || payment.orderId}
                    </h4>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                      Pending Verification
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <div className="space-y-1">
                        <p className="font-medium text-base">
                          {payment.customerInfo?.name || payment.user?.name || 'Unknown Customer'}
                        </p>
                        {payment.customerInfo?.phone && (
                          <p className="text-sm text-green-600">
                            {payment.customerInfo.phone}
                          </p>
                        )}
                        {payment.customerInfo?.userId && (
                          <p className="text-xs text-gray-500">
                            User ID: {payment.customerInfo.userId}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="font-bold text-lg text-green-600">
                        {formatAmount(payment.amount || payment.total)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Payment Method</p>
                      <p className="font-medium capitalize">
                        {payment.paymentSubType?.replace('_', ' ')}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Submitted</p>
                      <p className="font-medium">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-gray-500">Subscription Plan:</p>
                      <p className="font-medium text-base text-gray-900">{payment.planName}</p>
                    </div>
                    {payment.planDescription && (
                      <p className="text-sm text-gray-600">{payment.planDescription}</p>
                    )}
                  </div>

                  {payment.paymentProofUrl === 'pending_stk_push' ? (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Payment Proof</p>
                      <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl flex items-center gap-3 w-fit shadow-sm">
                        <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                        <span className="font-semibold text-sm">Awaiting M-Pesa STK Push...</span>
                      </div>
                    </div>
                  ) : payment.paymentProofUrl ? (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Payment Proof</p>
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 relative">
                          <div id={`loading-${payment.orderId}`} className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <div className="text-xs text-gray-500 text-center">
                              <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mb-1"></div>
                              <br/>Loading...
                            </div>
                          </div>
                          
                          <img 
                            src={getImageUrl(payment.paymentProofUrl)} 
                            alt="Payment Proof" 
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleViewProof(payment)}
                            onError={(e) => {
                              console.error('❌ Image failed to display:', {
                                src: e.target.src,
                                originalUrl: payment.paymentProofUrl
                              });
                              const loadingDiv = document.getElementById(`loading-${payment.orderId}`);
                              if (loadingDiv) loadingDiv.style.display = 'none';
                              
                              e.target.style.display = 'none';
                              e.target.parentNode.style.display = 'flex';
                              e.target.parentNode.style.alignItems = 'center';
                              e.target.parentNode.style.justifyContent = 'center';
                              e.target.parentNode.style.flexDirection = 'column';
                              e.target.parentNode.style.backgroundColor = '#fee2e2';
                              
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'text-center p-2';
                              errorDiv.innerHTML = `
                                <div class="text-red-500 text-xl mb-1">❌</div>
                                <div class="text-red-600 text-xs font-medium">Image</div>
                                <div>Not Found</div>
                                <div class="mt-1 text-red-500 text-xs font-mono">${e.target.src.split('/').pop()}</div>
                              `;
                              e.target.parentNode.appendChild(errorDiv);
                            }}
                            onLoad={(e) => {
                              const loadingDiv = document.getElementById(`loading-${payment.orderId}`);
                              if (loadingDiv) loadingDiv.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-1">Payment Screenshot</p>
                          <p className="text-xs text-gray-500 mb-2">Click image or button to view full size</p>
                          <div className="flex gap-2 flex-wrap mb-4">
                            <button
                              onClick={() => handleViewProof(payment)}
                              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                            >
                              🔍 Open Full Size
                            </button>
                            <button
                              onClick={() => setRejectModal({ isOpen: true, orderId: payment.orderId, subscriptionId: payment.subscriptionId, reason: '' })}
                              disabled={processingIds.has(payment.orderId)}
                              className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${processingIds.has(payment.orderId) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              <span>✗</span>
                              Reject
                            </button>
                          </div>

                          <div 
                            className={`mt-2 p-2 rounded border w-fit ${viewedProofs.has(payment.orderId) ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'}`}
                            onClick={() => {
                              if (!viewedProofs.has(payment.orderId)) {
                                toast.info('Please open the full size image first to review it.');
                              }
                            }}
                          >
                            <label className={`flex items-center gap-2 ${viewedProofs.has(payment.orderId) ? 'cursor-pointer' : 'cursor-not-allowed pointer-events-none'}`}>
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                checked={reviewedPayments.has(payment.orderId)}
                                disabled={!viewedProofs.has(payment.orderId)}
                                onChange={(e) => {
                                  setReviewedPayments(prev => {
                                    const newSet = new Set(prev);
                                    if (e.target.checked) newSet.add(payment.orderId);
                                    else newSet.delete(payment.orderId);
                                    return newSet;
                                  });
                                }}
                              />
                              <span className="text-sm font-medium text-gray-700 select-none">I confirm I have reviewed this payment proof</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Payment Proof</p>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <p className="text-sm text-gray-600">❌ No payment proof uploaded</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => handleRejectPayment(payment.orderId, payment.subscriptionId)}
                    disabled={processingIds.has(payment.orderId)}
                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span>✗</span>
                    Reject
                  </button>

                  <button
                    onClick={() => handleApprovePayment(payment.orderId, payment.subscriptionId)}
                    disabled={processingIds.has(payment.orderId)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  >
                    {processingIds.has(payment.orderId) ? <LoadingSpinner size="sm" /> : <span>✓</span>}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Reject Payment</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this payment. The customer will receive this message via their notification channels.
              </p>
              
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. The M-Pesa code is invalid, or the amount is incorrect."
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 outline-none transition-all h-28 resize-none"
                autoFocus
              />
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectModal({ isOpen: false, orderId: null, subscriptionId: null, reason: '' })}
                className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectModal.reason.trim()) {
                    handleRejectPayment(rejectModal.orderId, rejectModal.subscriptionId, rejectModal.reason);
                    setRejectModal({ isOpen: false, orderId: null, subscriptionId: null, reason: '' });
                  } else {
                    toast.error('Please provide a rejection reason.');
                  }
                }}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-md active:scale-95"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}