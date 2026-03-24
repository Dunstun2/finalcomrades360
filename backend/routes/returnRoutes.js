const express = require('express');
const { auth, checkRole } = require('../middleware/auth');
const {
    requestReturn,
    listMyReturns,
    adminListReturns,
    adminApproveReturn,
    adminRejectReturn,
    assignReturnAgent,
    confirmReturnReceipt,
    processReturnRefund,
    completeReturn
} = require('../controllers/returnController');

const router = express.Router();

// Customer routes
router.post('/request', auth, requestReturn);
router.get('/my-returns', auth, listMyReturns);

// Admin/Seller routes
// The router.use middleware is removed as individual routes now have their own auth and checkRole
// router.use(auth, checkRole('admin', 'super_admin', 'superadmin')); // Original line

router.get('/admin/all', auth, checkRole(['admin', 'super_admin', 'superadmin']), adminListReturns); // Added auth and checkRole
router.post('/:returnId/approve', auth, checkRole(['admin', 'super_admin']), adminApproveReturn);
router.post('/:returnId/reject', auth, checkRole(['admin', 'super_admin']), adminRejectReturn);
router.post('/:returnId/assign-agent', auth, checkRole(['admin', 'super_admin']), assignReturnAgent);
router.post('/:returnId/confirm-receipt', auth, checkRole(['admin', 'super_admin']), confirmReturnReceipt);
router.post('/:returnId/refund', auth, checkRole(['admin', 'super_admin']), processReturnRefund);
router.post('/:returnId/complete', auth, checkRole(['admin', 'super_admin']), completeReturn);

module.exports = router;
