const express = require('express');
const { auth, checkRole } = require('../middleware/auth');
const {
    getDeliveryConfig,
    updateDeliveryConfig,
    getSystemIncome,
    getPendingPayouts,
    processPayout,
    getAgentSuccessBalances,
    getAgentSuccessTransactions,
    getAutomaticPayoutStatus,
    toggleAutomaticPayout,
    getDeliveryTaskHistory,
    collectSystemRevenue,
    getDeliveryChargeLedger,
    getDeliveryChargeSummary
} = require('../controllers/financeController');

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
router.post('/process-payout', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), processPayout);

// Delivery Payout Auditing
router.get('/delivery-success-balances', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getAgentSuccessBalances);
router.get('/agent-success-transactions/:agentId', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getAgentSuccessTransactions);

// Automatic Payout Mode
router.get('/automatic-payout-status', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), getAutomaticPayoutStatus);
router.post('/toggle-automatic-payout', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), toggleAutomaticPayout);

// Delivery Task History — global table for all completed tasks
router.get('/delivery-task-history', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager', 'logistics_manager'), getDeliveryTaskHistory);
router.get('/delivery-charge-ledger', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager', 'logistics_manager'), getDeliveryChargeLedger);
router.get('/delivery-charge-summary', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager', 'logistics_manager'), getDeliveryChargeSummary);

// Collect System Revenue from delivery tasks
router.post('/collect-system-revenue', auth, checkRole('admin', 'superadmin', 'super_admin', 'finance_manager'), collectSystemRevenue);

module.exports = router;
