const express = require('express');
const router = express.Router();
const pickupStationController = require('../controllers/pickupStationController');
const { authenticate, authorize } = require('../middleware/auth');

console.log('[pickupStationRoutes] Mounting routes...');
console.log('[pickupStationRoutes] Controller keys:', Object.keys(pickupStationController));

router.use((req, res, next) => {
    console.log(`[pickupStationRoutes] Incoming ${req.method} ${req.path}`);
    next();
});

// Public route to get active stations for checkout
router.get('/', pickupStationController.getAllPickupStations);
router.get('/:id', pickupStationController.getPickupStationById);

// Admin & Manager routes
router.post('/', authenticate, authorize(['admin', 'superadmin', 'super_admin', 'logistics_manager', 'pickup_station_manager']), pickupStationController.createPickupStation);
router.put('/:id', authenticate, authorize(['admin', 'superadmin', 'super_admin', 'logistics_manager', 'pickup_station_manager']), pickupStationController.updatePickupStation);
router.delete('/hard/:id', authenticate, authorize(['admin', 'superadmin', 'super_admin']), pickupStationController.hardDeletePickupStation);
router.delete('/:id', authenticate, authorize(['admin', 'superadmin', 'super_admin', 'logistics_manager', 'pickup_station_manager']), pickupStationController.deletePickupStation);
router.patch('/:id/activate', authenticate, authorize(['admin', 'superadmin', 'super_admin', 'logistics_manager', 'pickup_station_manager']), pickupStationController.activatePickupStation);

module.exports = router;
