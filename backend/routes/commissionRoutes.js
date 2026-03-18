const express = require('express');
const { auth, adminOnly, requirePermission } = require('../middleware/auth');
const { getCommissionHistory, payCommission } = require('../controllers/commissionController');

const router = express.Router();

// Marketer: my commissions
router.get('/my', auth, getCommissionHistory);

// Finance: pay a commission
router.post('/:commissionId/pay', auth, requirePermission('finance.manage'), payCommission);

module.exports = router;
