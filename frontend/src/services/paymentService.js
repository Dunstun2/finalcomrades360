import api from './api';

class PaymentService {
  // Create payment record
  async createPayment(orderId, paymentData) {
    try {
      const response = await api.post('/payments/create', {
        orderId,
        ...paymentData
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Initiate M-Pesa payment with enhanced error handling
  async initiateMpesaPayment(orderId, phoneNumber, amount = null, checkoutGroupId = null) {
    try {
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 12) {
        throw new Error('Invalid phone number format');
      }

      const payload = {
        phoneNumber: cleanPhone
      };

      // Add orderId if provided, otherwise the backend will handle cart-based payment
      if (orderId) {
        payload.orderId = orderId;
      }

      // Add checkoutGroupId if provided
      if (checkoutGroupId) {
        payload.checkoutGroupId = checkoutGroupId;
      }

      // Add amount if provided (for cart-based payments)
      if (amount) {
        payload.amount = amount;
      }

      const response = await api.post('/payments/mpesa/initiate', payload);

      if (response.data.success) {
        console.log('M-Pesa payment initiated:', response.data);
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to initiate M-Pesa payment');
      }
    } catch (error) {
      console.error('Error initiating M-Pesa payment:', error);

      // Provide more specific error messages
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid payment request');
      } else if (error.response?.status === 404) {
        throw new Error('Order not found');
      } else if (error.response?.status >= 500) {
        throw new Error('Payment service temporarily unavailable. Please try again.');
      }

      throw error;
    }
  }

  // Initiate Airtel Money payment
  async initiateAirtelMoneyPayment(orderId, phoneNumber, amount = null, checkoutGroupId = null) {
    try {
      const payload = {
        phoneNumber: phoneNumber.replace(/\D/g, '')
      };

      if (orderId) payload.orderId = orderId;
      if (checkoutGroupId) payload.checkoutGroupId = checkoutGroupId;
      if (amount) payload.amount = amount;

      const response = await api.post('/payments/airtel/initiate', payload);
      return response.data;
    } catch (error) {
      console.error('Error initiating Airtel Money payment:', error);
      throw error;
    }
  }

  // Create bank transfer payment
  async createBankTransferPayment(orderId, transferData) {
    try {
      const response = await api.post('/payments/bank-transfer/create', {
        orderId,
        ...transferData
      });
      return response.data;
    } catch (error) {
      console.error('Error creating bank transfer payment:', error);
      throw error;
    }
  }

  // Create Lipa Mdogo Mdogo payment
  async createLipaMdogoMdogoPayment(orderId, phoneNumber) {
    try {
      const response = await api.post('/payments/lipa-mdogo-mdogo/create', {
        orderId,
        phoneNumber
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Lipa Mdogo Mdogo payment:', error);
      throw error;
    }
  }

  // Check payment status with enhanced polling and caching
  async checkPaymentStatus(paymentId, useCache = true) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      // Simple caching to avoid excessive API calls
      const cacheKey = `payment_status_${paymentId}`;
      const cached = useCache ? this._statusCache?.[cacheKey] : null;

      if (cached && (Date.now() - cached.timestamp) < 10000) { // 10 second cache
        return cached.data;
      }

      const response = await api.get(`/payments/status/${paymentId}`);

      if (response.data.success) {
        // Cache the result
        if (!this._statusCache) this._statusCache = {};
        this._statusCache[cacheKey] = {
          data: response.data,
          timestamp: Date.now()
        };

        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to check payment status');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);

      if (error.response?.status === 404) {
        throw new Error('Payment not found');
      } else if (error.response?.status >= 500) {
        throw new Error('Payment service temporarily unavailable');
      }

      throw error;
    }
  }

  // Clear status cache for a specific payment
  clearStatusCache(paymentId) {
    if (this._statusCache) {
      delete this._statusCache[`payment_status_${paymentId}`];
    }
  }

  // Get user's payments
  async getUserPayments(page = 1, limit = 10) {
    try {
      const response = await api.get('/payments/user', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }

  // Process refund
  async processRefund(paymentId, refundData) {
    try {
      const response = await api.post(`/payments/refund/${paymentId}`, refundData);
      return response.data;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Get payment verification info
  async getPaymentVerificationInfo(paymentId) {
    try {
      const response = await api.get(`/payments/verification-info/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting verification info:', error);
      throw error;
    }
  }

  // Verify payment (admin only)
  async verifyPayment(paymentId, verificationData) {
    try {
      const response = await api.post(`/payments/verify/${paymentId}`, verificationData);
      return response.data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Format payment amount for display
  formatAmount(amount, currency = 'KES') {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Get payment method display name
  getPaymentMethodDisplayName(method) {
    const methodNames = {
      mpesa: 'M-Pesa',
      airtel_money: 'Airtel Money',
      bank_transfer: 'Bank Transfer',
      lipa_mdogo_mdogo: 'Lipa Mdogo Mdogo',
      card: 'Card Payment',
      cash: 'Cash on Delivery'
    };
    return methodNames[method] || method;
  }

  // Get payment status display info
  getPaymentStatusInfo(status) {
    const statusInfo = {
      pending: { label: 'Pending', color: 'yellow', description: 'Payment initiated, awaiting completion' },
      processing: { label: 'Processing', color: 'blue', description: 'Payment is being processed' },
      completed: { label: 'Completed', color: 'green', description: 'Payment successful' },
      failed: { label: 'Failed', color: 'red', description: 'Payment failed' },
      cancelled: { label: 'Cancelled', color: 'gray', description: 'Payment cancelled' },
      refunded: { label: 'Refunded', color: 'orange', description: 'Payment refunded' },
      partially_refunded: { label: 'Partially Refunded', color: 'orange', description: 'Payment partially refunded' }
    };
    return statusInfo[status] || { label: status, color: 'gray', description: 'Unknown status' };
  }

  // Check if payment can be refunded
  canRefund(payment) {
    return payment &&
      payment.status === 'completed' &&
      payment.refundAmount === 0 &&
      (Date.now() - new Date(payment.completedAt).getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days
  }

  // Get payment instructions for different methods with enhanced M-Pesa details
  getPaymentInstructions(paymentMethod, paymentData) {
    switch (paymentMethod) {
      case 'mpesa':
      case 'mpesa_prepay':
        return {
          title: 'M-Pesa Payment Instructions',
          steps: [
            'Check your phone for the STK push notification from M-Pesa',
            'Enter your M-Pesa PIN when prompted',
            'Confirm the payment amount and details',
            'Wait for payment confirmation (usually instant)'
          ],
          note: 'Payment must be completed within 5 minutes. If you don\'t receive the STK push, check your M-Pesa menu or contact support.',
          troubleshooting: [
            'Ensure your phone has sufficient airtime for SMS',
            'Check that your M-Pesa account is active',
            'Verify the phone number is correct',
            'Try restarting your phone if issues persist'
          ]
        };

      case 'airtel_money':
      case 'airtel_money_prepay':
        return {
          title: 'Airtel Money Payment Instructions',
          steps: [
            'Check your phone for the STK push notification from Airtel Money',
            'Enter your Airtel Money PIN when prompted',
            'Confirm the payment amount and details',
            'Wait for payment confirmation'
          ],
          note: 'Payment must be completed within 5 minutes. Ensure your Airtel Money account is active.',
          troubleshooting: [
            'Ensure your phone has sufficient airtime',
            'Check that your Airtel Money account is registered',
            'Verify the phone number is correct'
          ]
        };

      case 'bank_transfer':
      case 'bank_transfer_prepay':
        return {
          title: 'Bank Transfer Instructions',
          steps: [
            `Transfer ${this.formatAmount(paymentData?.amount)} to:`,
            `Bank: ${paymentData?.bankName || 'Equity Bank'}`,
            `Account: ${paymentData?.accountNumber || '1130180617720'}`,
            `Account Name: ${paymentData?.accountName || 'Comrades360 Ltd'}`,
            `Reference: Order ${paymentData?.orderId || paymentData?.orderNumber}`
          ],
          note: 'Payment will be verified within 24 hours. Include the exact reference to speed up verification.',
          important: 'Use the exact amount and reference number for faster processing'
        };

      case 'lipa_mdogo_mdogo':
        return {
          title: 'Lipa Mdogo Mdogo Instructions',
          steps: [
            'You will receive payment prompts on your phone',
            'Pay any amount you can afford when convenient',
            'Continue making payments until the full amount is reached',
            'Order will be confirmed once all installments are complete'
          ],
          note: 'Flexible payment plan - no rush to pay everything at once.',
          benefits: [
            'Pay what you can afford',
            'No interest charges',
            'Order held until full payment',
            'Convenient installment reminders'
          ]
        };

      default:
        return {
          title: 'Payment Instructions',
          steps: ['Follow the payment instructions provided'],
          note: 'Contact support if you need assistance',
          support: 'Call 0712345678 or email support@comrades360.com'
        };
    }
  }

  // Add retry payment functionality
  async retryPayment(paymentId, newPhoneNumber = null) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const response = await api.post(`/payments/retry/${paymentId}`, {
        phoneNumber: newPhoneNumber
      });

      if (response.data.success) {
        // Clear status cache after retry
        this.clearStatusCache(paymentId);
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to retry payment');
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      throw error;
    }
  }

  // Check if payment can be retried
  canRetryPayment(payment) {
    if (!payment) return false;

    // Can retry if payment failed and is within retry window (24 hours)
    const isFailed = payment.status === 'failed';
    const isWithinTimeLimit = payment.createdAt &&
      (Date.now() - new Date(payment.createdAt).getTime()) < (24 * 60 * 60 * 1000);

    return isFailed && isWithinTimeLimit;
  }
}

export default new PaymentService();