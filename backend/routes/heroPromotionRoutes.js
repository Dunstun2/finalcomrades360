const express = require('express');
const { auth, checkRole } = require('../middleware/auth');
const { applyHeroPromotion, myHeroPromotions, listActiveHeroPromotions, submitPaymentProof, editMyHeroPromotion, deleteMyHeroPromotion, requestRefund, getHeroRates } = require('../controllers/heroPromotionController');

const router = express.Router()

// Public: currently active hero promotions
router.get('/active', listActiveHeroPromotions)

// Rates
router.get('/rates', auth, [checkRole('seller', 'admin')], getHeroRates)

// Seller: create application
router.post('/apply', auth, checkRole('seller', 'admin'), applyHeroPromotion)

// Seller: my applications
router.get('/mine', auth, checkRole('seller', 'admin'), myHeroPromotions)

// Seller: submit payment proof
router.post('/:id/payment-proof', auth, checkRole('seller', 'admin'), submitPaymentProof)

// Seller: edit application (before approval)
router.patch('/:id', auth, checkRole('seller', 'admin'), editMyHeroPromotion)

// Seller: delete application (or request refund if already paid)
router.delete('/:id', auth, checkRole('seller', 'admin'), deleteMyHeroPromotion)

// Seller: request refund explicitly
router.post('/:id/refund', auth, checkRole('seller', 'admin'), requestRefund)

// Public: currently active hero promotions
router.get('/active', listActiveHeroPromotions)

module.exports = router;
