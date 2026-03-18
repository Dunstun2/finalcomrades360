const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { auth, adminOnly } = require('../middleware/auth');

// Publicly accessible list of active batches for customer-facing ordering flows.
router.get('/active', batchController.getActiveBatches);

// Admin only routes
router.use(auth);
router.use(adminOnly);

router.post('/', batchController.createBatch);
router.get('/', batchController.getAllBatches);
router.put('/:id', batchController.updateBatch);
router.patch('/:id/status', batchController.updateBatchStatus);
router.patch('/:id/toggle-automation', batchController.toggleAutomation);
router.delete('/:id', batchController.deleteBatch);

module.exports = router;
