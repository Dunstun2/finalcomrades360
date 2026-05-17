const express = require('express');
const router = express.Router();
const stationManagerController = require('../controllers/stationManagerController');
const { authenticate } = require('../middleware/auth');

console.log('[stationManagerRoutes] Mounting routes...');

// Dashboard
router.get('/dashboard', authenticate, stationManagerController.getStationDashboard);

// Orders
router.post('/orders/:orderId/warehouse-received', authenticate, stationManagerController.markOrderReceivedAtWarehouse);
router.post('/orders/:orderId/ready-for-pickup', authenticate, stationManagerController.markOrderReadyAtPickupStation);

// Returns
router.post('/returns/:returnId/receive', authenticate, stationManagerController.markReturnReceivedAtStation);
router.post('/returns/:returnId/receive-warehouse', authenticate, stationManagerController.markReturnReceivedAtWarehouse);

// Wallet
router.get('/wallet', authenticate, stationManagerController.getStationWallet);
router.post('/wallet/withdraw', authenticate, stationManagerController.requestStationWithdrawal);

module.exports = router;