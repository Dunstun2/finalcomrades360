const express = require('express');
const {
  handleSecureWebhook,
  addToRetryQueue,
  reconcilePayments,
  requestRefund,
  approveRefund,
  processRefund,
  fileDispute,
  resolveDispute
} = require('../controllers/paymentEnhancementsController');
const { auth, adminOnly, adminOrFinance } = require('../middleware/auth');

const router = express.Router();

// Webhook (no auth - external callback)
router.post('/webhook/secure', handleSecureWebhook);

// Retry queue management (admin only)
router.post('/retry/add', auth, adminOnly, addToRetryQueue);

// Reconciliation (admin/finance)
router.get('/reconcile', auth, adminOrFinance, reconcilePayments);

// Refunds (customer can request, admin can approve/process)
router.post('/refund/request', auth, requestRefund);
router.post('/refund/approve', auth, adminOnly, approveRefund);
router.post('/refund/process', auth, adminOnly, processRefund);

// Disputes (customer can file, admin can resolve)
router.post('/dispute/file', auth, fileDispute);
router.post('/dispute/resolve', auth, adminOnly, resolveDispute);

module.exports = router;
