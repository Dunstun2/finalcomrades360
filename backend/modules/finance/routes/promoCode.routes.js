const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCode.controller');
const { authenticate, authorize, optionalAuth } = require('../../../middleware/auth');

// Public route to apply a promo code
router.post('/apply', optionalAuth, promoCodeController.applyPromoCode);
// Get auto apply promo code
router.get('/auto-apply', optionalAuth, promoCodeController.getAutoApplyPromo);

// Admin / Marketer routes for managing promo codes
router.get('/', authenticate, authorize('admin', 'superadmin', 'super_admin', 'marketer'), promoCodeController.getAllPromoCodes);
router.post('/', authenticate, authorize('admin', 'superadmin', 'super_admin', 'marketer'), promoCodeController.createPromoCode);
router.put('/:id', authenticate, authorize('admin', 'superadmin', 'super_admin', 'marketer'), promoCodeController.updatePromoCode);
router.delete('/:id', authenticate, authorize('admin', 'superadmin', 'super_admin', 'marketer'), promoCodeController.deletePromoCode);

module.exports = router;
