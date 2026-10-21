const express = require('express');
const { Op } = require('sequelize');
const { User, Order, Subscription, Plan, SubscriptionInvoice } = require('../../../database/models.registry');
const { createNotification, sendCustomerNotificationAcrossChannels } = require('../../../utils/notificationHelpers');
const {
  getAllUsers,
  getPendingProducts,
  approveProduct,
  updateUserRole,
  setProductFlashSale,
  getAllProductsAdmin,
  notifySellerForProduct,
  deleteProduct,
  listDeletionRequests,
  approveDeletionRequest,
  denyDeletionRequest,
  rejectProduct,
  requestProductChanges,
  editAndApproveProduct,
  listCommissionsAdmin,
  bulkPayCommissions,
  bulkCancelCommissions,
  referralAnalytics,
  listMarketers,
  suspendMarketer,
  reactivateMarketer,
  suspendSeller,
  reactivateSeller,
  suspendDeliveryAgent,
  reactivateDeliveryAgent,
  suspendUserRoleGeneric,
  reactivateUserRoleGeneric,
  revokeReferralCode,
  assignReferralCode,
  updateProductCommissionRate,
  batchUpdateCategoryCommissionRate,
  getInventoryOverview,
  getInventoryItems,
  getLowStockAlerts,
  updateStockLevels,
  bulkUpdateStock,
  getProductAnalytics,
  getTopPerformingProducts,
  getProductPerformanceMetrics,
  getOrderAnalytics,
  bulkUpdateProducts,
  bulkUpdateCategories,
  bulkUpdatePrices,
  bulkUpdateStatus,
  getQualityMetrics,
  flagProductForReview,
  getFlaggedProducts,
  updateProductQualityScore,
  createCategoryPromotion,
  getPromotionAnalytics,
  manageFeaturedProducts,
  updateSearchPriority,
  getUserAnalytics,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  getSearchAnalytics,
  getRevenueAnalytics,
  verifyAdminPassword,
  getPlatformWalletDetails,
  withdrawPlatformFunds,
  getAdminCreatedItems,
  getItemPerformanceAnalytics
} = require('../controllers/controller');

const { auth, adminOnly, adminOrLogistics, adminOrLogisticsOrSeller, adminOrFinance } = require('../../../middleware/auth');
const { 
  adminListDeliveryAgents, 
  getAvailableAgentsForOrder, 
  adminGetGlobalMapData,
  adminApproveRequest,
  adminRejectRequest,
  adminBulkApproveRequests,
  adminBulkRejectRequests,
  getAdminAgentDetail,
  getAdminAgentHistory,
  toggleAgentActiveStatus
} = require('../../delivery/controllers/controller');
const { getConfig, updateConfig } = require('../../platform/controllers/config.controller');
const adminHeroPromotionRoutes = require('./heroPromotion.routes');

// Import payment verification functions

const router = express.Router();

// Authentication is required for all routes
router.use(auth);

// Public / General Logistics access
router.get('/config/:key', adminOrLogistics, getConfig);
router.post('/config/:key', adminOnly, updateConfig);

// User management (Admin Only)
router.get('/users', adminOnly, getAllUsers);
router.post('/users', adminOnly, createUser);
router.patch('/users/:userId', adminOnly, updateUser);
router.delete('/users/:userId', adminOnly, deleteUser);
router.post('/users/:userId/restore', adminOnly, restoreUser);
router.get('/users/deletion-requests', adminOnly, listDeletionRequests);
router.post('/users/:userId/deletion-approve', adminOnly, approveDeletionRequest);
router.post('/users/:userId/deletion-deny', adminOnly, denyDeletionRequest);
router.patch('/users/:userId/role', adminOnly, updateUserRole);

// Product management (Admin Only)
router.get('/products/pending', adminOnly, getPendingProducts);
router.get('/products', adminOnly, getAllProductsAdmin);
router.patch('/products/:productId/approve', adminOnly, approveProduct);
router.patch('/products/:productId/reject', adminOnly, rejectProduct);
router.patch('/products/:productId/request-changes', adminOnly, requestProductChanges);
router.patch('/products/:productId/edit-approve', adminOnly, editAndApproveProduct);
router.get('/products/deletion-requests', adminOnly, listDeletionRequests);
router.post('/products/deletion-approve', adminOnly, approveDeletionRequest);
router.post('/products/deletion-deny', adminOnly, denyDeletionRequest);
router.delete('/products/:productId', adminOnly, deleteProduct);
router.patch('/products/:productId/flash-sale', adminOnly, setProductFlashSale);
router.post('/products/:productId/notify', adminOnly, notifySellerForProduct);

// Commission rate management
router.patch('/products/:productId/commission-rate', adminOnly, updateProductCommissionRate);
router.patch('/categories/:categoryId/commission-rate', adminOnly, batchUpdateCategoryCommissionRate);

// Commissions management
router.get('/commissions', adminOrFinance, listCommissionsAdmin);
router.post('/commissions/pay-bulk', adminOrFinance, bulkPayCommissions);
router.post('/commissions/cancel-bulk', adminOrFinance, bulkCancelCommissions);

// Referral analytics
router.get('/referrals/analytics', adminOrFinance, referralAnalytics);

// Marketer management
router.get('/marketers', adminOnly, listMarketers);
router.post('/marketers/:userId/suspend', adminOnly, suspendMarketer);
router.post('/marketers/:userId/reactivate', adminOnly, reactivateMarketer);
router.post('/marketers/:userId/referral/revoke', adminOnly, revokeReferralCode);
router.post('/marketers/:userId/referral/assign', adminOnly, assignReferralCode);

// Seller management
router.post('/sellers/:userId/suspend', adminOnly, suspendSeller);
router.post('/sellers/:userId/reactivate', adminOnly, reactivateSeller);

// Delivery agents management
router.get('/delivery/agents', adminOrLogistics, adminListDeliveryAgents);
router.get('/delivery/agents/available/:orderId', adminOrLogistics, getAvailableAgentsForOrder);
router.get('/delivery/agents/:agentId/detail', adminOrLogistics, getAdminAgentDetail);
router.get('/delivery/agents/:agentId/history', adminOrLogistics, getAdminAgentHistory);
router.patch('/delivery/agents/:agentId/toggle-status', adminOrLogistics, toggleAgentActiveStatus);
router.post('/delivery/agents/:userId/suspend', adminOnly, suspendDeliveryAgent);
router.post('/delivery/agents/:userId/reactivate', adminOnly, reactivateDeliveryAgent);
router.get('/delivery/global-map-data', adminOrLogistics, adminGetGlobalMapData);
router.post('/delivery/requests/bulk-approve', adminOrLogistics, adminBulkApproveRequests);
router.post('/delivery/requests/bulk-reject', adminOrLogistics, adminBulkRejectRequests);
router.post('/delivery/requests/:taskId/approve', adminOrLogistics, adminApproveRequest);
router.post('/delivery/requests/:taskId/reject', adminOrLogistics, adminRejectRequest);

// Generic role-based suspension
router.post('/users/:userId/roles/suspend', adminOnly, suspendUserRoleGeneric);
router.post('/users/:userId/roles/reactivate', adminOnly, reactivateUserRoleGeneric);

// User Analytics
router.get('/analytics/users', adminOnly, getUserAnalytics);

// Advanced inventory management
router.get('/inventory/overview', adminOrLogisticsOrSeller, getInventoryOverview);
router.get('/inventory/items', adminOrLogisticsOrSeller, getInventoryItems);
router.get('/inventory/on-behalf-items', adminOnly, getAdminCreatedItems);
router.get('/inventory/low-stock-alerts', adminOrLogisticsOrSeller, getLowStockAlerts);
router.patch('/products/:productId/stock', adminOrLogisticsOrSeller, updateStockLevels);
router.post('/inventory/bulk-update-stock', adminOrLogistics, bulkUpdateStock);

// Product analytics
router.get('/analytics/products', adminOnly, getProductAnalytics);
router.get('/analytics/top-products', adminOnly, getTopPerformingProducts);
router.get('/analytics/item-performance', adminOnly, getItemPerformanceAnalytics);
router.get('/orders/analytics', adminOnly, getOrderAnalytics);
router.get('/products/:productId/performance', adminOnly, getProductPerformanceMetrics);

// Bulk operations
router.post('/products/bulk-update', adminOnly, bulkUpdateProducts);
router.post('/products/bulk-update-categories', adminOnly, bulkUpdateCategories);
router.post('/products/bulk-update-prices', adminOnly, bulkUpdatePrices);
router.post('/products/bulk-update-status', adminOnly, bulkUpdateStatus);

// Quality monitoring
router.get('/quality/metrics', adminOnly, getQualityMetrics);
router.post('/products/:productId/flag', adminOnly, flagProductForReview);
router.get('/products/flagged', adminOnly, getFlaggedProducts);
router.patch('/products/:productId/quality-score', adminOnly, updateProductQualityScore);

// Advanced promotions
router.use('/hero-promotions', adminHeroPromotionRoutes);
router.post('/promotions/category', adminOnly, createCategoryPromotion);
router.get('/promotions/analytics', adminOnly, getPromotionAnalytics);
router.patch('/products/:productId/featured', adminOnly, manageFeaturedProducts);

// Search and discovery
router.patch('/products/:productId/search-priority', adminOnly, updateSearchPriority);
router.get('/analytics/search', adminOnly, getSearchAnalytics);
router.get('/analytics/revenue', adminOrFinance, getRevenueAnalytics);
router.get('/finance/platform-wallet', adminOrFinance, getPlatformWalletDetails);
router.post('/finance/platform-wallet/withdraw', adminOnly, withdrawPlatformFunds); // Ensure adminOnly (we will check super_admin in controller)
router.post('/verify-password', adminOnly, verifyAdminPassword);

// ============================================
// PAYMENT VERIFICATION ROUTES
// ============================================

// Get pending payment verifications
router.get('/payments/pending-verification', adminOnly, async (req, res) => {
  try {
    const pendingOrders = await Order.findAll({
      where: {
        paymentType: 'prepay',
        needsPaymentVerification: true,
        paymentVerificationStatus: {
          [Op.or]: [null, 'pending']
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Plan,
              as: 'plan',
              attributes: ['id', 'name', 'description']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    const formattedOrders = pendingOrders.map(order => {
      // Prioritize guestData for display (which includes registered user info stored during order creation)
      let customerInfo = null;
      if (order.guestData) {
        customerInfo = {
          name: order.guestData.name,
          email: order.guestData.email,
          phone: order.guestData.phone,
          userId: order.guestData.userId || order.userId
        };
      } else if (order.user) {
        customerInfo = {
          name: order.user.name,
          email: order.user.email,
          phone: order.user.phone,
          userId: order.user.id
        };
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        subscriptionId: order.subscriptionId,
        amount: order.total,
        paymentSubType: order.paymentSubType,
        paymentProofUrl: order.paymentProofUrl,
        createdAt: order.createdAt,
        customerInfo: customerInfo,
        user: order.user, // Keep for backward compatibility
        planName: order.subscription?.plan?.name || 'Unknown Plan',
        planDescription: order.subscription?.plan?.description || ''
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// Approve payment
router.post('/payments/approve', adminOnly, async (req, res) => {
  try {
    const { orderId, subscriptionId } = req.body;

    // Update order status
    await Order.update({
      paymentVerificationStatus: 'approved',
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: req.user.id
    }, {
      where: { id: orderId }
    });

    // Load subscription + plan to correctly apply trial period (Bug #2)
    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [
        { model: Plan, as: 'plan' },
        { model: User, as: 'user' }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const trialDays = subscription.plan?.trialPeriodDays || 0;
    const newStatus = trialDays > 0 ? 'Trial' : 'Active';
    const now = new Date();

    await subscription.update({
      status: newStatus,
      activatedAt: now,
      // Stamp trial end if applicable
      ...(trialDays > 0 ? {
        trialEndsAt: new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
      } : {})
    });

    // Create SubscriptionInvoice record for this payment (Bug #20)
    try {
      const order = await Order.findByPk(orderId);
      await SubscriptionInvoice.create({
        subscriptionId,
        amount: order?.total || subscription.plan?.price || 0,
        currency: subscription.plan?.currency || 'KES',
        status: 'paid',
        paidAt: now,
        paymentReference: order?.orderNumber || String(orderId),
        dueDate: now,
        billingPeriodStart: subscription.startDate || now,
        billingPeriodEnd: subscription.expiryDate || now,
        paymentMethod: order?.paymentSubType || 'manual',
        adminVerifiedBy: req.user.id
      });
    } catch (invoiceErr) {
      console.error('[Approve] Failed to create SubscriptionInvoice:', invoiceErr);
    }

    // Reactivate seller benefits if seller plan (Bug #3)
    if (subscription.plan?.type === 'seller' && subscription.userId) {
      try {
        const SellerSubscriptionService = require('../../subscriptions/services/SellerSubscriptionService');
        await SellerSubscriptionService.reactivateSellerBenefits(subscription.userId);
      } catch (sellerErr) {
        console.error('[Approve] Failed to reactivate seller benefits:', sellerErr);
      }
    }

    // Audit log (Bug #21)
    console.log(`[ADMIN_AUDIT] Payment approved by admin ${req.user.id} (${req.user.name || req.user.email}) for subscription ${subscriptionId}, order ${orderId}, status set to ${newStatus}`);

    // Send notification — supports both registered users and guests (Bug #4)
    try {
      const planName = subscription.plan?.name || 'your subscription';
      const approvalMsg = `Hello {name}, great news! 🎉\n\nYour payment for the "{planName}" subscription plan has been verified and approved!\n\nYour subscription is now ${newStatus === 'Trial' ? 'in TRIAL mode' : 'ACTIVE'} and you can start enjoying all the benefits immediately.\n\nThank you for choosing Comrades360!`;

      if (subscription.user) {
        // Registered user
        await sendCustomerNotificationAcrossChannels('subscriptionPaymentApproved', {
          name: subscription.user.name,
          planName,
          title: 'Payment Approved! 🎉',
          type: 'success',
          defaultTemplate: approvalMsg
        }, subscription.user);
      } else if (subscription.guestEmail || subscription.guestPhone) {
        // Guest subscriber — send via whichever channels we have
        const guestRecipient = {
          name: subscription.guestName || 'Customer',
          email: subscription.guestEmail || null,
          phone: subscription.guestPhone || null
        };
        await sendCustomerNotificationAcrossChannels('subscriptionPaymentApproved', {
          name: guestRecipient.name,
          planName,
          title: 'Payment Approved! 🎉',
          type: 'success',
          defaultTemplate: approvalMsg
        }, guestRecipient);
      }
    } catch (notificationError) {
      console.error('Failed to send approval notification:', notificationError);
    }

    // Attempt same-day meal occurrence generation
    try {
      const MealSubscriptionService = require('../../subscriptions/services/MealSubscriptionService');
      const todayDateStr = new Date().toISOString().split('T')[0];
      MealSubscriptionService.generateDailyOccurrences(todayDateStr, {
        isSameDay: true,
        subscriptionId
      }).catch(err => {
        console.error(`[Admin] Failed to generate same-day occurrences for Sub #${subscriptionId}:`, err);
      });
    } catch (mealErr) {
      console.error('Error triggering same-day meal generation:', mealErr);
    }

    res.json({ 
      success: true, 
      message: 'Payment approved and subscription activated',
      subscription: {
        id: subscription.id,
        status: newStatus,
        planName: subscription.plan?.name
      }
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

// Reject payment
router.post('/payments/reject', adminOnly, async (req, res) => {
  try {
    const { orderId, subscriptionId, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A rejection reason is required.' });
    }

    const now = new Date();

    // Update order status
    await Order.update({
      paymentVerificationStatus: 'rejected',
      paymentRejectionReason: reason,
      paymentVerifiedAt: now,
      paymentVerifiedBy: req.user.id
    }, {
      where: { id: orderId }
    });

    // Cancel subscription
    await Subscription.update({
      status: 'Cancelled',
      cancelledAt: now,
      cancellationReason: `Payment rejected: ${reason}`
    }, {
      where: { id: subscriptionId }
    });

    // Audit log (Bug #21)
    console.log(`[ADMIN_AUDIT] Payment rejected by admin ${req.user.id} (${req.user.name || req.user.email}) for subscription ${subscriptionId}, order ${orderId}, reason: ${reason}`);

    // Get subscription details for notification
    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [
        { model: Plan, as: 'plan' },
        { model: User, as: 'user' }
      ]
    });

    // Send rejection notification — supports registered users AND guests (Bug #4)
    try {
      const planName = subscription?.plan?.name || 'your subscription';
      const rejectionMsg = `Hello {name}, we regret to inform you that your payment for the "{planName}" subscription plan could not be verified. ❌\n\nReason: ${reason}\n\nPlease re-submit a valid payment proof or try a different payment method. If you believe this is a mistake, please contact our support team.\n\n— Comrades360 Team`;

      if (subscription?.user) {
        // Registered user
        await sendCustomerNotificationAcrossChannels('subscriptionPaymentRejected', {
          name: subscription.user.name,
          planName,
          reason,
          title: 'Payment Rejected ❌',
          type: 'alert',
          defaultTemplate: rejectionMsg
        }, subscription.user);
      } else if (subscription?.guestEmail || subscription?.guestPhone) {
        // Guest subscriber
        const guestRecipient = {
          name: subscription.guestName || 'Customer',
          email: subscription.guestEmail || null,
          phone: subscription.guestPhone || null
        };
        await sendCustomerNotificationAcrossChannels('subscriptionPaymentRejected', {
          name: guestRecipient.name,
          planName,
          reason,
          title: 'Payment Rejected ❌',
          type: 'alert',
          defaultTemplate: rejectionMsg
        }, guestRecipient);
      }
    } catch (notificationError) {
      console.error('Failed to send rejection notification:', notificationError);
    }

    res.json({ 
      success: true, 
      message: 'Payment rejected and user notified',
      reason
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

// Send admin notification about new payment submission (Gap #7)
router.post('/payments/notify-admin', auth, async (req, res) => {
  try {
    const { orderId, subscriptionId, amount, paymentMethod, customerInfo } = req.body;

    console.log('🔔 New payment verification needed:', { orderId, subscriptionId, amount, paymentMethod, customerInfo });

    // Find all admin users and send them an in-app notification
    const admins = await User.findAll({
      where: {
        role: { [Op.in]: ['admin', 'superadmin', 'super_admin'] }
      },
      attributes: ['id', 'name', 'email', 'phone']
    });

    const planName = customerInfo?.planName || 'a subscription';
    const customerName = customerInfo?.name || 'A customer';
    const amountFormatted = `KES ${Number(amount || 0).toLocaleString()}`;

    const notifyPromises = admins.map(admin =>
      createNotification(
        admin.id,
        '🔔 New Payment Awaiting Verification',
        `${customerName} submitted a payment proof of ${amountFormatted} for "${planName}". Please review it in the Payment Verification queue.`,
        'subscription_payment_pending',
        { orderId, subscriptionId, amount, paymentMethod, customerInfo }
      ).catch(err => console.error(`Failed to notify admin ${admin.id}:`, err))
    );

    await Promise.allSettled(notifyPromises);

    res.json({ success: true, message: 'Admins notified', adminCount: admins.length });
  } catch (error) {
    console.error('Error notifying admin:', error);
    res.status(500).json({ error: 'Failed to notify admin' });
  }
});

module.exports = router;
