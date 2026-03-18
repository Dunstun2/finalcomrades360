const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const warehouseController = require('../controllers/warehouseController');

console.log('[warehouseRoutes] Mounting routes...');

// Public routes/List
router.get('/', authenticate, warehouseController.listWarehouses);
router.get('/:id', authenticate, warehouseController.getWarehouse);

// Admin routes
router.post('/', authenticate, authorize(['admin', 'superadmin', 'super_admin']), warehouseController.createWarehouse);
router.put('/:id', authenticate, authorize(['admin', 'superadmin', 'super_admin']), warehouseController.updateWarehouse);
router.delete('/hard/:id', authenticate, authorize(['admin', 'superadmin', 'super_admin']), warehouseController.hardDeleteWarehouse);
router.delete('/:id', authenticate, authorize(['admin', 'superadmin', 'super_admin']), warehouseController.deleteWarehouse);
router.patch('/:id/activate', authenticate, authorize(['admin', 'superadmin', 'super_admin']), warehouseController.activateWarehouse);

module.exports = router;
