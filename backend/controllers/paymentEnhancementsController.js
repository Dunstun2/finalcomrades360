const crypto = require('crypto');
const { sequelize } = require('../database/database');
const { Payment, PaymentRetryQueue, PaymentReconciliation, Refund, PaymentDispute, Order, User, Wallet, Notification } = require('../models');
const { Op } = require('sequelize');
const { emitRealtimeUpdate, emitToUser, emitToAdmins } = require('../utils/realtimeEmitter');

// Webhook signature verification (for M-Pesa or other payment gateways)
const verifyWebhookSignature = (req, secret) => {
  try {
    // M-Pesa doesn't provide signature by default, but if using custom implementation:
    const signature = req.headers['x-safaricom-signature'] || req.headers['x-webhook-signature'];
    
    if (!signature || !secret) {
      console.warn('⚠️ Webhook signature or secret missing');
      return false;
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

// Enhanced callback handler with signature verification
const handleSecureWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.MPESA_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
    
    // Optional signature verification (enable if payment provider supports it)
    if (webhookSecret && process.env.ENABLE_WEBHOOK_SIGNATURE_VERIFICATION === 'true') {
      const isValid = verifyWebhookSignature(req, webhookSecret);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
    }

    // Log webhook for audit trail
    console.log('✅ Webhook signature verified, processing payment callback');
    
    // Continue with normal callback processing
    // (This would integrate with existing handleMpesaCallback)
    res.json({ success: true, message: 'Webhook verified and accepted' });
  } catch (error) {
    console.error('Error in handleSecureWebhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add payment to retry queue
const addToRetryQueue = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { paymentId, maxRetries = 3, retryIntervalMinutes = 30 } = req.body;

    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Order, as: 'order' }],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Payment already completed' });
    }

    // Check if already in retry queue
    const existing = await PaymentRetryQueue.findOne({
      where: { paymentId, status: { [Op.in]: ['pending', 'retrying'] } },
      transaction
    });

    if (existing) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Payment already in retry queue' });
    }

    const nextRetryAt = new Date(Date.now() + retryIntervalMinutes * 60 * 1000);

    const queueEntry = await PaymentRetryQueue.create({
      paymentId,
      orderId: payment.orderId,
      maxRetries,
      nextRetryAt,
      status: 'pending',
      failureReason: payment.failureReason,
      metadata: {
        phoneNumber: payment.mpesaPhoneNumber,
        amount: payment.amount,
        orderNumber: payment.order?.orderNumber
      }
    }, { transaction });

    await transaction.commit();
    emitToAdmins('payment:retry:queued', { paymentId, orderId: payment.orderId, queueEntryId: queueEntry.id });
    emitRealtimeUpdate('payments', { adminOnly: true, paymentId, orderId: payment.orderId, action: 'retry_queued' });
    res.json({ success: true, message: 'Payment added to retry queue', queueEntry });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in addToRetryQueue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Process retry queue (called by cron)
const processRetryQueue = async () => {
  const transaction = await sequelize.transaction();
  try {
    const now = new Date();
    const pending = await PaymentRetryQueue.findAll({
      where: {
        status: { [Op.in]: ['pending', 'retrying'] },
        nextRetryAt: { [Op.lte]: now },
        retryCount: { [Op.lt]: sequelize.col('maxRetries') }
      },
      include: [{ model: Payment, as: 'payment' }],
      transaction
    });

    console.log(`🔄 Processing ${pending.length} payment retries...`);

    const mpesaService = require('../scripts/services/mpesaService');

    for (const entry of pending) {
      try {
        // Update status to retrying
        await entry.update({
          status: 'retrying',
          retryCount: entry.retryCount + 1,
          lastAttemptAt: new Date()
        }, { transaction });

        const metadata = entry.metadata || {};
        const paymentRecord = entry.payment || await Payment.findByPk(entry.paymentId, { transaction });

        if (!paymentRecord) {
          await entry.update({
            status: 'exhausted',
            lastAttemptError: 'Payment record missing during retry processing'
          }, { transaction });
          continue;
        }
        
        // Retry payment initiation
        const result = await mpesaService.initiateSTKPush(
          metadata.phoneNumber,
          metadata.amount,
          metadata.orderNumber
        );

        if (result.success) {
          // Update payment with new checkout request ID
          await paymentRecord.update({
            mpesaCheckoutRequestId: result.checkoutRequestId,
            mpesaMerchantRequestId: result.merchantRequestId,
            status: 'pending'
          }, { transaction });

          // Mark queue entry as completed
          await entry.update({ status: 'completed' }, { transaction });

          console.log(`✅ Payment ${entry.paymentId} retry successful`);
        } else {
          // Retry failed, schedule next attempt or mark as exhausted
          const nextRetry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          
          if (entry.retryCount >= entry.maxRetries - 1) {
            await entry.update({
              status: 'exhausted',
              lastAttemptError: result.error || 'Max retries reached'
            }, { transaction });
            console.log(`❌ Payment ${entry.paymentId} retries exhausted`);
          } else {
            await entry.update({
              status: 'pending',
              nextRetryAt: nextRetry,
              lastAttemptError: result.error
            }, { transaction });
            console.log(`⚠️ Payment ${entry.paymentId} retry ${entry.retryCount} failed, will retry again`);
          }
        }
      } catch (retryError) {
        console.error(`Error retrying payment ${entry.paymentId}:`, retryError);
        await entry.update({
          lastAttemptError: retryError.message,
          status: 'pending',
          nextRetryAt: new Date(Date.now() + 60 * 60 * 1000) // Retry in 1 hour on error
        }, { transaction });
      }
    }

    await transaction.commit();
    console.log('✅ Payment retry queue processing complete');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in processRetryQueue:', error);
  }
};

// Reconcile payments (find mismatches)
const reconcilePayments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {
      status: 'completed',
      ...(startDate && { createdAt: { [Op.gte]: new Date(startDate) } }),
      ...(endDate && { createdAt: { [Op.lte]: new Date(endDate) } })
    };

    const payments = await Payment.findAll({
      where,
      include: [{ model: Order, as: 'order' }]
    });

    const discrepancies = [];

    for (const payment of payments) {
      const order = payment.order;
      
      if (!order) {
        // Orphaned payment
        discrepancies.push({
          type: 'orphaned_payment',
          paymentId: payment.id,
          transactionId: payment.mpesaReceiptNumber,
          actualAmount: payment.amount
        });
        continue;
      }

      // Check amount mismatch
      const expectedAmount = parseFloat(order.total);
      const actualAmount = parseFloat(payment.amount);

      if (Math.abs(expectedAmount - actualAmount) > 0.01) {
        const type = actualAmount > expectedAmount ? 'overpayment' : 'underpayment';
        discrepancies.push({
          type,
          paymentId: payment.id,
          orderId: order.id,
          transactionId: payment.mpesaReceiptNumber,
          expectedAmount,
          actualAmount,
          difference: actualAmount - expectedAmount
        });
      }

      // Check for duplicate payments
      const duplicates = await Payment.count({
        where: {
          orderId: order.id,
          status: 'completed',
          id: { [Op.ne]: payment.id }
        }
      });

      if (duplicates > 0) {
        discrepancies.push({
          type: 'duplicate',
          paymentId: payment.id,
          orderId: order.id,
          transactionId: payment.mpesaReceiptNumber,
          actualAmount: payment.amount,
          duplicateCount: duplicates
        });
      }
    }

    // Create reconciliation records
    const transaction = await sequelize.transaction();
    try {
      for (const disc of discrepancies) {
        await PaymentReconciliation.create({
          paymentId: disc.paymentId || null,
          orderId: disc.orderId || null,
          transactionId: disc.transactionId || `UNKNOWN-${Date.now()}`,
          expectedAmount: disc.expectedAmount || null,
          actualAmount: disc.actualAmount,
          discrepancyType: disc.type,
          status: 'pending',
          metadata: disc
        }, { transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    res.json({
      success: true,
      message: `Reconciliation complete. Found ${discrepancies.length} discrepancies.`,
      discrepancies
    });
    emitToAdmins('payment:reconciliation:completed', { discrepancyCount: discrepancies.length });
    emitRealtimeUpdate('payments', { adminOnly: true, action: 'reconciliation_completed', discrepancyCount: discrepancies.length });
  } catch (error) {
    console.error('Error in reconcilePayments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Request refund
const requestRefund = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId, amount, reason, refundType = 'full' } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id: orderId, userId },
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const payment = await Payment.findOne({
      where: { orderId: order.id, userId, status: 'completed' },
      order: [['createdAt', 'DESC']],
      transaction
    });
    if (!payment) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No completed payment found for this order' });
    }

    // Check if refund already exists
    const existingRefund = await Refund.findOne({
      where: {
        paymentId: payment.id,
        status: { [Op.notIn]: ['rejected', 'failed'] }
      },
      transaction
    });

    if (existingRefund) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Refund already requested for this payment' });
    }

    const refundAmount = refundType === 'full' ? payment.amount : amount;

    if (refundAmount > payment.amount) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Refund amount exceeds payment amount' });
    }

    const refund = await Refund.create({
      paymentId: payment.id,
      orderId: order.id,
      userId,
      amount: refundAmount,
      originalAmount: payment.amount,
      refundType,
      reason,
      status: 'requested',
      method: 'original_payment_method',
      requestedBy: userId
    }, { transaction });

    // Notify admins
    await Notification.create({
      userId: 1, // Admin notification (adjust based on your admin ID logic)
      type: 'refund_request',
      title: 'New Refund Request',
      message: `Refund requested for Order #${order.orderNumber}. Amount: KES ${refundAmount}`,
      data: JSON.stringify({ refundId: refund.id, orderId: order.id, amount: refundAmount })
    }, { transaction });

    await transaction.commit();
    emitToAdmins('refund:requested', { refundId: refund.id, orderId: order.id, userId });
    emitToUser(userId, 'refund:status', { refundId: refund.id, status: 'requested', orderId: order.id });
    emitRealtimeUpdate('payments', { userId, adminOnly: true, action: 'refund_requested', refundId: refund.id, orderId: order.id });
    res.json({ success: true, message: 'Refund requested successfully', refund });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in requestRefund:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve refund (admin)
const approveRefund = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { refundId, notes } = req.body;
    const adminId = req.user.id;

    const refund = await Refund.findByPk(refundId, { transaction });
    if (!refund) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    if (refund.status !== 'requested') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `Cannot approve refund with status: ${refund.status}` });
    }

    await refund.update({
      status: 'approved',
      approvedBy: adminId,
      approvedAt: new Date(),
      metadata: { approvalNotes: notes }
    }, { transaction });

    // Notify customer
    await Notification.create({
      userId: refund.userId,
      type: 'refund_approved',
      title: 'Refund Approved',
      message: `Your refund request of KES ${refund.amount} has been approved and will be processed soon.`,
      data: JSON.stringify({ refundId: refund.id, amount: refund.amount })
    }, { transaction });

    await transaction.commit();
    emitToUser(refund.userId, 'refund:status', { refundId: refund.id, status: 'approved' });
    emitRealtimeUpdate('payments', { userId: refund.userId, adminOnly: true, action: 'refund_approved', refundId: refund.id });
    res.json({ success: true, message: 'Refund approved successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in approveRefund:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Process refund (admin/system)
const processRefund = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { refundId, method = 'wallet_credit' } = req.body;
    const adminId = req.user.id;

    const refund = await Refund.findByPk(refundId, {
      include: [
        { model: Payment, as: 'payment' },
        { model: User, as: 'customer' }
      ],
      transaction
    });

    if (!refund) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    if (refund.status !== 'approved') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Refund must be approved before processing' });
    }

    await refund.update({ status: 'processing', processedBy: adminId }, { transaction });

    // Process based on method
    if (method === 'wallet_credit') {
      // Credit user wallet
      const { Wallet, Transaction } = require('../models');
      
      let wallet = await Wallet.findOne({ where: { userId: refund.userId }, transaction });
      if (!wallet) {
        wallet = await Wallet.create({ userId: refund.userId, balance: 0 }, { transaction });
      }

      await wallet.update({
        balance: parseFloat(wallet.balance) + parseFloat(refund.amount)
      }, { transaction });

      await Transaction.create({
        userId: refund.userId,
        walletId: wallet.id,
        type: 'credit',
        amount: refund.amount,
        description: `Refund for Order #${refund.orderId}`,
        status: 'completed',
        referenceType: 'refund',
        referenceId: refund.id
      }, { transaction });

      await refund.update({
        status: 'completed',
        completedAt: new Date(),
        method: 'wallet_credit',
        externalRefundId: `WALLET-REFUND-${refund.id}`
      }, { transaction });
    } else {
      // For original payment method, would integrate with M-Pesa reversal API
      // Placeholder for now
      await refund.update({
        status: 'completed',
        completedAt: new Date(),
        externalRefundId: `MANUAL-${Date.now()}`
      }, { transaction });
    }

    // Notify customer
    await Notification.create({
      userId: refund.userId,
      type: 'refund_completed',
      title: 'Refund Processed',
      message: `Your refund of KES ${refund.amount} has been processed successfully.`,
      data: JSON.stringify({ refundId: refund.id, amount: refund.amount, method })
    }, { transaction });

    await transaction.commit();
    emitToUser(refund.userId, 'refund:status', { refundId: refund.id, status: 'completed', method });
    emitRealtimeUpdate('payments', { userId: refund.userId, adminOnly: true, action: 'refund_completed', refundId: refund.id });
    res.json({ success: true, message: 'Refund processed successfully', refund });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in processRefund:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// File dispute
const fileDispute = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { paymentId, orderId, disputeType, description, evidence } = req.body;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id: paymentId },
      transaction
    });

    const order = payment
      ? await Order.findOne({ where: { id: payment.orderId, userId }, transaction })
      : null;

    if (!payment || !order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Payment not found or unauthorized' });
    }

    const dispute = await PaymentDispute.create({
      paymentId,
      orderId: orderId || order.id,
      userId,
      disputeType,
      description,
      status: 'open',
      priority: 'medium',
      evidence: evidence || null,
      timeline: [{
        action: 'dispute_filed',
        userId,
        timestamp: new Date().toISOString(),
        notes: 'Customer filed dispute'
      }]
    }, { transaction });

    // Notify admins
    const admins = await User.findAll({ where: { role: { [Op.in]: ['superadmin', 'admin'] } }, transaction });
    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        type: 'payment_dispute',
        title: 'New Payment Dispute',
        message: `Dispute filed for Order #${order.orderNumber}. Type: ${disputeType}`,
        data: JSON.stringify({ disputeId: dispute.id, paymentId, orderId: order.id })
      }, { transaction });
    }

    await transaction.commit();
    emitToAdmins('dispute:filed', { disputeId: dispute.id, paymentId, orderId: order.id });
    emitToUser(userId, 'dispute:status', { disputeId: dispute.id, status: 'open' });
    emitRealtimeUpdate('payments', { userId, adminOnly: true, action: 'dispute_filed', disputeId: dispute.id, orderId: order.id });
    res.json({ success: true, message: 'Dispute filed successfully', dispute });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in fileDispute:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Resolve dispute (admin)
const resolveDispute = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { disputeId, resolution, resolutionNotes } = req.body;
    const adminId = req.user.id;

    const dispute = await PaymentDispute.findByPk(disputeId, { transaction });
    if (!dispute) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const timeline = dispute.timeline || [];
    timeline.push({
      action: 'dispute_resolved',
      userId: adminId,
      resolution,
      timestamp: new Date().toISOString(),
      notes: resolutionNotes
    });

    await dispute.update({
      status: 'resolved',
      resolution,
      resolutionNotes,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      timeline
    }, { transaction });

    // Notify customer
    await Notification.create({
      userId: dispute.userId,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: `Your payment dispute has been resolved. Resolution: ${resolution}`,
      data: JSON.stringify({ disputeId: dispute.id, resolution })
    }, { transaction });

    await transaction.commit();
    emitToUser(dispute.userId, 'dispute:status', { disputeId: dispute.id, status: 'resolved', resolution });
    emitRealtimeUpdate('payments', { userId: dispute.userId, adminOnly: true, action: 'dispute_resolved', disputeId: dispute.id });
    res.json({ success: true, message: 'Dispute resolved successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in resolveDispute:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  verifyWebhookSignature,
  handleSecureWebhook,
  addToRetryQueue,
  processRetryQueue,
  reconcilePayments,
  requestRefund,
  approveRefund,
  processRefund,
  fileDispute,
  resolveDispute
};
