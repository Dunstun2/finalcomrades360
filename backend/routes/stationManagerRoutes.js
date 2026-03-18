const express = require('express');
const {
  getStationDashboard,
  markOrderReceivedAtWarehouse,
  markOrderReadyAtPickupStation
} = require('../controllers/stationManagerController');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth, checkRole(['station_manager', 'warehouse_manager', 'pickup_station_manager']));

router.get('/dashboard', getStationDashboard);
router.post('/orders/:orderId/warehouse-received', markOrderReceivedAtWarehouse);
router.post('/orders/:orderId/ready-for-pickup', markOrderReadyAtPickupStation);

module.exports = router;
