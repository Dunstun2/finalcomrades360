const express = require('express');
const { auth, checkRole } = require('../middleware/auth');
const {
    getDeliveryConfig,
    updateDeliveryConfig,
    getSystemIncome,
    getPendingPayouts,
    verifyEarnings,
    getSuccessBalances,
    getSuccessTransactions,
    getAutomaticPayoutStatus,
    toggleAutomaticPayout,
    getDeliveryTaskHistory,
    collectSystemRevenue,
    getDeliveryChargeLedger,
    getDeliveryChargeSummary,
    getSellerSalesHistory,
    settleLogisticsCharge,
    getWithdrawalHistory
} = require('../controllers/financeController');
const { 
    getPlatformWalletDetails, 
    withdrawPlatformFunds 
} = require('../controllers/adminController');

const router = express.Router();
const fs = require('fs');
const path = require('path');

router.use((req, res, next) => {
    const logMsg = `[financeRoutes] ${new Date().toISOString()} Hit: ${req.method} ${req.path}\n`;
    fs.appendFileSync(path.join(__dirname, '../error.log'), logMsg);
    next();
});

// protect all routes - only admin/superadmin/finance_manager
// router.use(auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'));

// Config checks: Delivery agents need to read config
router.get('/config', auth, getDeliveryConfig);
// Updates only for admins
router.post('/config', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), updateDeliveryConfig);
// Income only for admins
router.get('/system-income', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getSystemIncome);

// Payouts only for admins
router.get('/pending-payouts', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getPendingPayouts);
router.get('/withdrawal-history', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getWithdrawalHistory);
router.post('/verify-earnings', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), verifyEarnings);
router.post('/process-payout', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), verifyEarnings);

// Earning Verification (Unified Auditing)
router.get('/success-balances', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getSuccessBalances);
router.get('/success-transactions/:userId', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getSuccessTransactions);

// Backward Compatibility for Delivery Auditing
router.get('/delivery-success-balances', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getSuccessBalances);
router.get('/agent-success-transactions/:agentId', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getSuccessTransactions);

// Automatic Payout Mode
router.get('/automatic-payout-status', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getAutomaticPayoutStatus);
router.post('/toggle-automatic-payout', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), toggleAutomaticPayout);

// Delivery Task History — global table for all completed tasks
router.get('/delivery-task-history', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager', 'logistics_manager'), getDeliveryTaskHistory);
router.get('/delivery-charge-ledger', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager', 'logistics_manager'), getDeliveryChargeLedger);
router.get('/delivery-charge-summary', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager', 'logistics_manager'), getDeliveryChargeSummary);
router.post('/logistics-invoices/:chargeId/settle', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), settleLogisticsCharge);

// Seller Sales History — for unified verification ledger
router.get('/seller-sales-history', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getSellerSalesHistory);

// Collect System Revenue from delivery tasks
router.post('/collect-system-revenue', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), collectSystemRevenue);

// Platform Wallet Details
router.get('/platform-wallet', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getPlatformWalletDetails);
router.post('/platform-wallet/withdraw', auth, checkRole('super_admin', 'superadmin'), withdrawPlatformFunds);

module.exports = router;
