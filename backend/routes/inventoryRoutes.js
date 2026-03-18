const express = require('express');
const {
  reserveStock,
  releaseReservation,
  adjustStock,
  bulkStockImport,
  bulkStockExport,
  getStockAuditTrail
} = require('../controllers/inventoryController');
const { auth, adminOnly, adminOrSeller } = require('../middleware/auth');

const router = express.Router();

// Stock reservation (authenticated users)
router.post('/reserve', auth, reserveStock);
router.post('/release', auth, releaseReservation);

// Manual stock adjustment (admin or seller)
router.post('/adjust', auth, adminOrSeller, adjustStock);

// Bulk operations (admin only)
router.post('/bulk/import', auth, adminOnly, bulkStockImport);
router.get('/bulk/export', auth, adminOnly, bulkStockExport);

// Audit trail (admin only)
router.get('/audit', auth, adminOnly, getStockAuditTrail);

module.exports = router;
