const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const adminToolController = require('../controllers/adminToolController');
const { auditLog } = require('../middleware/auditLog');

// Prefix: /api/admin-tools

// User Management Tools
router.post('/users/force-reset-password', auth, adminOnly, auditLog('FORCE_RESET_PASSWORD', 'User'), adminToolController.forceResetPassword);
router.post('/users/merge-accounts', auth, adminOnly, auditLog('MERGE_ACCOUNTS', 'User'), adminToolController.mergeAccounts);
router.post('/users/impersonate', auth, adminOnly, auditLog('IMPERSONATE_USER', 'User'), adminToolController.impersonateUser);
router.post('/users/wallet-adjust', auth, adminOnly, auditLog('WALLET_ADJUST', 'User'), adminToolController.walletAdjust);
router.get('/users/:userId/activity', auth, adminOnly, adminToolController.getUserActivity);

// Order Management Tools
router.get('/orders/all', auth, adminOnly, adminToolController.getAllOrders);
router.get('/orders/payments/search', auth, adminOnly, adminToolController.searchPayments);
router.post('/orders/force-status', auth, adminOnly, auditLog('FORCE_ORDER_STATUS', 'Order'), adminToolController.forceOrderStatus);
router.post('/orders/reassign-agent', auth, adminOnly, auditLog('REASSIGN_DELIVERY_AGENT', 'Order'), adminToolController.reassignDeliveryAgent);
router.post('/orders/issue-refund', auth, adminOnly, auditLog('ISSUE_REFUND', 'Order'), adminToolController.issueRefund);
router.post('/orders/clone', auth, adminOnly, auditLog('CLONE_ORDER', 'Order'), adminToolController.cloneOrder);
router.post('/orders/manual-confirm-payment', auth, adminOnly, require('../controllers/paymentController').confirmManualPayment);

// Product & Seller Tools
router.post('/products/force-shop-status', auth, adminOnly, auditLog('FORCE_SHOP_STATUS', 'User'), adminToolController.forceShopStatus);
router.post('/products/bulk-toggle', auth, adminOnly, auditLog('BULK_TOGGLE_ITEMS', 'Product'), adminToolController.bulkToggleItems);
router.get('/products/by-seller/:sellerId', auth, adminOnly, adminToolController.getProductsBySeller);
router.get('/products/fastfood-by-vendor/:vendorId', auth, adminOnly, adminToolController.getFastFoodByVendor);

router.post('/comms/generate-otp', auth, adminOnly, auditLog('GENERATE_CUSTOM_OTP', 'User'), adminToolController.generateCustomOTP);
router.post('/comms/resend-notification', auth, adminOnly, auditLog('RESEND_NOTIFICATION', 'Order'), adminToolController.resendOrderNotification);
router.post('/comms/broadcast', auth, adminOnly, auditLog('BROADCAST_MESSAGE', 'System'), adminToolController.broadcastMessage);

// System Tools
router.get('/audit-logs', auth, adminOnly, adminToolController.getAuditLogs);
router.post('/system/cleanup', auth, adminOnly, auditLog('DATABASE_CLEANUP', 'System'), adminToolController.runDatabaseCleanup);

// IP Blocklist
router.get('/security/ip-blocklist', auth, adminOnly, adminToolController.getBlockedIPs);
router.post('/security/ip-blocklist', auth, adminOnly, auditLog('BLOCK_IP', 'System'), adminToolController.blockIP);
router.delete('/security/ip-blocklist/:id', auth, adminOnly, auditLog('UNBLOCK_IP', 'System'), adminToolController.unblockIP);

// Analytics
router.get('/analytics/advanced', auth, adminOnly, adminToolController.getAdvancedAnalytics);

// Sessions
router.get('/users/:userId/sessions', auth, adminOnly, adminToolController.getUserSessions);
router.post('/users/force-logout', auth, adminOnly, auditLog('FORCE_LOGOUT', 'User'), adminToolController.forceLogoutUser);

// Templates
router.get('/comms/templates', auth, adminOnly, adminToolController.getNotificationTemplates);
router.put('/comms/templates', auth, adminOnly, adminToolController.updateNotificationTemplate);

module.exports = router;
