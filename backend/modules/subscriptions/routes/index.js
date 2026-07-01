const express = require('express');
const router = express.Router();
const { auth, adminOnly, optionalAuth } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validation');
const SubscriptionController = require('../controllers/subscription.controller');
const { 
  planSchema, 
  updatePlanSchema,
  subscribeSchema, 
  scheduleSchema, 
  updateAddressSchema 
} = require('../validators/subscription.validator');

// Plan Management (Admin)
router.post('/plans', auth, adminOnly, validate(planSchema), SubscriptionController.createPlan);
router.put('/plans/:id', auth, adminOnly, validate(updatePlanSchema), SubscriptionController.updatePlan);
router.get('/plans', SubscriptionController.getPlans);

// User Subscription Lifecycles
router.post('/subscribe', optionalAuth, validate(subscribeSchema), SubscriptionController.subscribe);
router.post('/upgrade', auth, validate(subscribeSchema), SubscriptionController.upgrade);
router.post('/:id/cancel', auth, SubscriptionController.cancel);
router.get('/my', auth, SubscriptionController.getMySubscriptions);
router.get('/all', auth, adminOnly, SubscriptionController.getAllSubscriptions);

// Meal Schedule & Occurrences
router.post('/:id/schedule', auth, validate(scheduleSchema), SubscriptionController.saveMealSchedule);
router.get('/:id/schedule', auth, SubscriptionController.getMealSchedule);
router.get('/:id/occurrences', auth, SubscriptionController.getMealOccurrences);
router.post('/occurrences/:occurrenceId/skip', auth, SubscriptionController.skipOccurrence);
router.put('/occurrences/:occurrenceId/address', auth, validate(updateAddressSchema), SubscriptionController.updateOccurrenceAddress);

// Guest Manage Routes (No auth — token-based, like order tracking links)
router.get('/guest/:token', SubscriptionController.getGuestSubscription);
router.post('/guest/:token/cancel', SubscriptionController.cancelGuest);
// Guest can also skip a meal occurrence using their token
router.post('/guest/:token/occurrences/:occurrenceId/skip', SubscriptionController.skipOccurrence);

module.exports = router;
