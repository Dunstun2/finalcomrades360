const express = require('express');
const { auth, checkRole } = require('../middleware/auth');
const {
  listMyAssignedOrders,
  updateMyOrderStatus,
  getMyProfile,
  upsertMyProfile,
  acceptDeliveryTask,
  rejectDeliveryTask,
  updateTaskStatus,
  getDeliveryTaskDetails,
  getAgentStats,
  listAvailableOrders,
  requestOrderAssignment,
  listPendingRequests,
  adminRejectRequest,
  confirmCollection,
  markArrivedAtPickup,
  updateMyCurrentLocation
} = require('../controllers/deliveryController');
const { getDeliveryWallet } = require('../controllers/deliveryWalletController');
const deliveryMessageRoutes = require('./deliveryMessageRoutes');

const router = express.Router();

// Mount messages sub-router
router.use('/messages', deliveryMessageRoutes);

// All routes here require authentication and delivery_agent or admin role
router.use(auth, checkRole('delivery_agent', 'admin', 'super_admin', 'superadmin'));

// Admin: Requests management
router.get('/requests', checkRole('admin', 'super_admin', 'superadmin'), listPendingRequests);
router.post('/requests/:taskId/reject', checkRole('admin', 'super_admin', 'superadmin'), adminRejectRequest);

// GET available orders (unassigned)
router.get('/available', listAvailableOrders);

// GET assigned orders (optionally filter by status, deliveryType)
router.get('/orders', listMyAssignedOrders);

// PATCH update status for an assigned order
router.patch('/orders/:orderId/status', updateMyOrderStatus);

// POST request assignment for an order
router.post('/orders/:orderId/request', requestOrderAssignment);

// Profile: availability and location
router.get('/profile', getMyProfile);
router.put('/profile', upsertMyProfile);
router.patch('/profile/location', updateMyCurrentLocation);

// Task management
router.post('/tasks/:taskId/accept', acceptDeliveryTask);
router.post('/tasks/:taskId/reject', rejectDeliveryTask);
router.post('/tasks/:taskId/mark-arrived', markArrivedAtPickup);
router.post('/tasks/:taskId/confirm-collection', confirmCollection);
router.patch('/tasks/:taskId/status', updateTaskStatus);
router.get('/tasks/:taskId', getDeliveryTaskDetails);

// Agent statistics
router.get('/stats', getAgentStats);

// Wallet
router.get('/wallet', getDeliveryWallet);

module.exports = router;
