const { Payment, Order } = require('../../models');
const mpesaService = require('./mpesaService');
const { Op } = require('sequelize');

const ELIGIBLE_PAYMENT_CONFIRMATION_STATUSES = [
    'order_placed', 
    'seller_confirmed', 
    'super_admin_confirmed', 
    'en_route_to_warehouse', 
    'at_warehouse', 
    'at_warehouse', 
    'awaiting_delivery_assignment', 
    'processing'
];

class PaymentVerificationService {
  // Verify M-Pesa payment status with enhanced logic
  async verifyMpesaPayment(paymentId, forceUpdate = false) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [{ model: Order, as: 'order' }]
      });

      if (!payment || payment.paymentMethod !== 'mpesa') {
        throw new Error('Invalid payment or payment method');
      }

      // Skip verification if payment is already completed and not forced
      if (!forceUpdate && payment.status === 'completed') {
        return {
          verified: true,
          status: 'completed',
          message: 'Payment already completed'
        };
      }

      // Skip verification if payment is failed/cancelled and not forced
      if (!forceUpdate && ['failed', 'cancelled'].includes(payment.status)) {
        return {
          verified: false,
          status: payment.status,
          message: 'Payment already in final state'
        };
      }

      if (!payment.mpesaCheckoutRequestId) {
        throw new Error('No checkout request ID found for M-Pesa payment');
      }

      console.log(`🔍 Verifying M-Pesa payment ${paymentId} with CheckoutRequestID: ${payment.mpesaCheckoutRequestId}`);

      // Query M-Pesa for status
      const queryResult = await mpesaService.querySTKPushStatus(payment.mpesaCheckoutRequestId);

      if (!queryResult.success) {
        console.warn(`Failed to query M-Pesa status for payment ${paymentId}:`, queryResult.error);
        return {
          verified: false,
          status: 'unknown',
          message: queryResult.error || 'Failed to query payment status',
          queryResult
        };
      }

      const resultCode = queryResult.resultCode;
      const resultDesc = queryResult.resultDesc || mpesaService.getResultCodeDescription(resultCode);

      console.log(`📊 M-Pesa query result for payment ${paymentId}: Code=${resultCode}, Desc=${resultDesc}`);

      // Update payment based on query result
      let newStatus, verified, message;

      if (resultCode === '0') {
        // Payment successful
        newStatus = 'completed';
        verified = true;
        message = 'Payment verified successfully';

        // Update payment record
        await payment.update({
          status: newStatus,
          completedAt: new Date(),
          paymentDate: new Date(),
          metadata: JSON.stringify({
            ...payment.metadata ? JSON.parse(payment.metadata) : {},
            verificationQuery: queryResult,
            verifiedAt: new Date().toISOString()
          })
        });

        // Update order if not already updated
        if (!payment.order.paymentConfirmed) {
          const updateData = { paymentConfirmed: true };
          if (ELIGIBLE_PAYMENT_CONFIRMATION_STATUSES.includes(payment.order.status)) {
            updateData.status = 'paid';
          }
          await payment.order.update(updateData);
          console.log(`✅ Order ${payment.order.id} payment confirmed (status: ${payment.order.status})`);
        }

      } else if (['1', '1032', '1037', '2001'].includes(resultCode)) {
        // Payment cancelled or failed
        newStatus = resultCode === '1032' ? 'cancelled' : 'failed';
        verified = true;
        message = resultDesc || 'Payment was cancelled or failed';

        await payment.update({
          status: newStatus,
          failureReason: resultDesc,
          cancelledAt: resultCode === '1032' ? new Date() : null,
          metadata: JSON.stringify({
            ...payment.metadata ? JSON.parse(payment.metadata) : {},
            verificationQuery: queryResult,
            verifiedAt: new Date().toISOString()
          })
        });

      } else if (['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008'].includes(resultCode)) {
        // Still processing - keep as processing
        newStatus = 'processing';
        verified = false;
        message = 'Payment is still being processed';

        // Update metadata but don't change status
        await payment.update({
          metadata: JSON.stringify({
            ...payment.metadata ? JSON.parse(payment.metadata) : {},
            verificationQuery: queryResult,
            lastVerifiedAt: new Date().toISOString()
          })
        });

      } else {
        // Unknown result code - mark as failed
        newStatus = 'failed';
        verified = false;
        message = `Unknown result code: ${resultDesc}`;

        await payment.update({
          status: newStatus,
          failureReason: resultDesc,
          metadata: JSON.stringify({
            ...payment.metadata ? JSON.parse(payment.metadata) : {},
            verificationQuery: queryResult,
            verifiedAt: new Date().toISOString()
          })
        });
      }

      console.log(`📝 Payment ${paymentId} status updated to: ${newStatus}`);

      return {
        verified,
        status: newStatus,
        message,
        resultCode,
        resultDesc,
        queryResult
      };

    } catch (error) {
      console.error(`❌ Payment verification error for ${paymentId}:`, error);
      return {
        verified: false,
        status: 'error',
        message: error.message
      };
    }
  }

  // Verify bank transfer payment (manual verification)
  async verifyBankTransfer(paymentId, adminUserId, verificationData) {
    return this.verifyManualPayment(paymentId, adminUserId, {
      ...verificationData,
      method: 'bank_transfer'
    });
  }

  // Generic manual verification for M-Pesa, Bank Transfer, Airtel, etc.
  async verifyManualPayment(paymentId, verifierUserId, verificationData = {}) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [{ model: Order, as: 'order' }]
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const method = verificationData.method || payment.paymentMethod;

      // Update payment with verification data
      await payment.update({
        status: 'completed',
        bankReference: verificationData.reference || null,
        bankName: verificationData.bankName || null,
        paymentDate: new Date(),
        completedAt: new Date(),
        metadata: JSON.stringify({
          ...payment.metadata ? JSON.parse(payment.metadata) : {},
          verificationData,
          verifiedBy: verifierUserId,
          verifiedAt: new Date(),
          isManual: true
        })
      });

        // Update order
        const updateData = { 
            paymentConfirmed: true,
            paymentMethod: method?.toLowerCase().includes('mpesa') ? 'M-Pesa' : (method === 'bank_transfer' ? 'Bank Transfer' : (method === 'manual' ? 'Manual' : method))
        };
        
        if (ELIGIBLE_PAYMENT_CONFIRMATION_STATUSES.includes(payment.order.status)) {
            updateData.status = 'paid';
        }

        await payment.order.update(updateData);

      // Add tracking update
      let trackingUpdates = [];
      try { trackingUpdates = payment.order.trackingUpdates ? JSON.parse(payment.order.trackingUpdates) : []; } catch (_) { }
      trackingUpdates.push({
        status: payment.order.status,
        message: `Payment of KES ${payment.amount} manually verified by agent/admin.`,
        timestamp: new Date().toISOString(),
        updatedBy: verifierUserId
      });
      await payment.order.update({ trackingUpdates: JSON.stringify(trackingUpdates) });

      return {
        verified: true,
        status: 'completed',
        message: 'Payment verified manually successfully'
      };

    } catch (error) {
      console.error('Manual verification error:', error);
      return {
        verified: false,
        status: 'error',
        message: error.message
      };
    }
  }

  // Auto-verify payments based on time thresholds with enhanced logic
  async autoVerifyExpiredPayments() {
    try {
      const now = new Date();
      const expiredThreshold = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago
      const processingThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago for processing payments

      console.log('🔄 Starting auto-verification of expired payments...');

      // Find payments that need verification
      const paymentsToVerify = await Payment.findAll({
        where: {
          [require('sequelize').Op.or]: [
            {
              status: 'pending',
              createdAt: { [require('sequelize').Op.lt]: expiredThreshold }
            },
            {
              status: 'processing',
              createdAt: { [require('sequelize').Op.lt]: processingThreshold }
            }
          ],
          paymentMethod: 'mpesa' // Only auto-verify M-Pesa payments for now
        },
        include: [{ model: Order, as: 'order' }]
      });

      console.log(`Found ${paymentsToVerify.length} payments to auto-verify`);

      const results = [];

      for (const payment of paymentsToVerify) {
        try {
          console.log(`🔍 Auto-verifying payment ${payment.id} (${payment.status})`);

          if (payment.paymentMethod === 'mpesa' && payment.mpesaCheckoutRequestId) {
            // Try to verify M-Pesa payment
            const verificationResult = await this.verifyMpesaPayment(payment.id);

            results.push({
              paymentId: payment.id,
              status: verificationResult.status,
              message: verificationResult.message,
              verified: verificationResult.verified
            });

          } else {
            // For other payment methods, mark as expired if too old
            const ageInMinutes = (now - payment.createdAt) / (1000 * 60);

            if (ageInMinutes > 30) { // 30 minutes for non-M-Pesa payments
              await payment.update({
                status: 'cancelled',
                expiredAt: new Date(),
                failureReason: 'Payment expired - no response from payment provider'
              });

              results.push({
                paymentId: payment.id,
                status: 'expired',
                message: 'Payment marked as expired'
              });
            } else {
              results.push({
                paymentId: payment.id,
                status: 'skipped',
                message: 'Payment too recent to expire'
              });
            }
          }

        } catch (error) {
          console.error(`Failed to auto-verify payment ${payment.id}:`, error);
          results.push({
            paymentId: payment.id,
            status: 'error',
            message: error.message
          });
        }
      }

      console.log(`✅ Auto-verification completed. Processed ${results.length} payments`);
      return results;

    } catch (error) {
      console.error('Auto verification error:', error);
      throw error;
    }
  }

  // Get payment verification status
  async getVerificationStatus(paymentId) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [{ model: Order, as: 'order' }]
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const verificationInfo = {
        paymentId: payment.id,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        expiredAt: payment.expiredAt,
        canVerify: false,
        verificationMethods: []
      };

      // Determine verification capabilities based on payment method and status
      if (payment.status === 'pending' || payment.status === 'processing') {
        if (payment.paymentMethod === 'mpesa' && payment.mpesaCheckoutRequestId) {
          verificationInfo.canVerify = true;
          verificationInfo.verificationMethods.push('mpesa_query');
        }

        if (payment.paymentMethod === 'bank_transfer') {
          verificationInfo.canVerify = true;
          verificationInfo.verificationMethods.push('manual_verification');
        }
      }

      return verificationInfo;

    } catch (error) {
      console.error('Error getting verification status:', error);
      throw error;
    }
  }

  // Bulk verify payments (admin function)
  async bulkVerifyPayments(paymentIds, adminUserId) {
    const results = [];

    for (const paymentId of paymentIds) {
      try {
        const payment = await Payment.findByPk(paymentId);

        if (!payment) {
          results.push({
            paymentId,
            success: false,
            message: 'Payment not found'
          });
          continue;
        }

        let verificationResult;

        if (payment.paymentMethod === 'mpesa') {
          verificationResult = await this.verifyMpesaPayment(paymentId);
        } else if (payment.paymentMethod === 'bank_transfer') {
          // For bulk verification, we might need additional data
          verificationResult = {
            verified: false,
            status: 'needs_manual_verification',
            message: 'Bank transfers require manual verification'
          };
        } else {
          verificationResult = {
            verified: false,
            status: 'unsupported',
            message: 'Payment method not supported for bulk verification'
          };
        }

        results.push({
          paymentId,
          success: verificationResult.verified,
          status: verificationResult.status,
          message: verificationResult.message
        });

      } catch (error) {
        results.push({
          paymentId,
          success: false,
          status: 'error',
          message: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new PaymentVerificationService();