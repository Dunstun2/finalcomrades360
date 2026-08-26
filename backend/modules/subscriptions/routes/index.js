const express = require('express');
const router = express.Router();
const { auth, adminOnly, optionalAuth } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validation');
const SubscriptionController = require('../controllers/subscription.controller');
const DeletionController = require('../controllers/deletionController');
const { 
  planSchema, 
  updatePlanSchema,
  subscribeSchema, 
  scheduleSchema, 
  updateAddressSchema,
  userPlanSchema,
  updateUserPlanSchema
} = require('../validators/subscription.validator');

// Benefit Packages Management (Admin)
router.get('/benefit-packages', auth, adminOnly, SubscriptionController.getBenefitPackages);
router.post('/benefit-packages', auth, adminOnly, SubscriptionController.createBenefitPackage);
router.put('/benefit-packages/:id', auth, adminOnly, SubscriptionController.updateBenefitPackage);
router.delete('/benefit-packages/:id', auth, adminOnly, DeletionController.deleteBenefitPackage);
router.get('/benefit-packages/:id/check-deletion', auth, adminOnly, DeletionController.checkPackageDeletion);

// Plan Management (Admin)
router.post('/plans', auth, adminOnly, validate(planSchema), SubscriptionController.createPlan);
router.put('/plans/:id', auth, adminOnly, validate(updatePlanSchema), SubscriptionController.updatePlan);
router.delete('/plans/:id', auth, adminOnly, DeletionController.deletePlan);
router.get('/plans/:id/check-deletion', auth, adminOnly, DeletionController.checkPlanDeletion);
router.get('/plans', optionalAuth, SubscriptionController.getPlans);

// User Subscription Lifecycles
router.post('/subscribe', optionalAuth, validate(subscribeSchema), SubscriptionController.subscribe);
router.post('/upgrade', auth, validate(subscribeSchema), SubscriptionController.upgrade);
router.post('/:id/cancel', auth, SubscriptionController.cancel);
router.get('/my', auth, SubscriptionController.getMySubscriptions);
router.get('/all', auth, adminOnly, SubscriptionController.getAllSubscriptions);

// Meal Schedule & Occurrences
router.post('/:id/schedule', auth, validate(scheduleSchema), SubscriptionController.saveMealSchedule);
router.get('/:id/schedule', auth, SubscriptionController.getMealSchedule);
router.get('/:id/occurrences', auth, (req, res, next) => {
  console.log('🔥 [Route] /subscriptions/:id/occurrences hit!', {
    subscriptionId: req.params.id,
    userId: req.user?.id,
    userRole: req.user?.role
  });
  next();
}, SubscriptionController.getMealOccurrences);
router.post('/occurrences/:occurrenceId/skip', auth, SubscriptionController.skipOccurrence);
router.put('/occurrences/:occurrenceId/address', auth, validate(updateAddressSchema), SubscriptionController.updateOccurrenceAddress);

// Guest Manage Routes (No auth — token-based, like order tracking links)
router.get('/guest/:token', SubscriptionController.getGuestSubscription);
router.post('/guest/:token/cancel', SubscriptionController.cancelGuest);
// Guest can also skip a meal occurrence using their token
router.post('/guest/:token/occurrences/:occurrenceId/skip', SubscriptionController.skipOccurrence);

// ==========================================
// CUSTOMER-FACING ENDPOINTS
// ==========================================

// Get available benefit packages for customers
router.get('/benefit-packages/available', SubscriptionController.getAvailablePackages);

// Create personal meal plan (customer can only select from existing packages)
router.post('/my/plans', auth, validate(userPlanSchema), SubscriptionController.createUserPlan);
router.put('/my/plans/:id', auth, validate(updateUserPlanSchema), SubscriptionController.updateUserPlan);

// Two-step subscription payment flow
router.post('/create-payment', auth, SubscriptionController.createSubscriptionPayment);
router.post('/confirm-payment/:id', auth, SubscriptionController.confirmSubscriptionPayment);

// View benefits for a specific subscription
router.get('/:id/benefits', auth, SubscriptionController.getSubscriptionBenefits);

// Get cashback summary for authenticated user
router.get('/my/cashback-summary', auth, SubscriptionController.getCashbackSummary);

module.exports = router;