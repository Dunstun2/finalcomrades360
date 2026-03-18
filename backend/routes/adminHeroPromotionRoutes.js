const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
    listHeroApplications,
    getHeroApplication,
    refundHeroPromotion,
    createHeroPromotion,
    editHeroPromotion,
    deleteHeroPromotion,
    markPaymentReceived,
    approveAndSchedule,
    updateStatus,
    updateHeroPromotionSettings
} = require('../controllers/adminHeroPromotionController');

const router = express.Router();

// Base is /api/admin/hero-promotions

// Applications List & Detail
router.get('/applications', listHeroApplications);
router.get('/applications/:id', getHeroApplication);

// Actions on applications
router.post('/applications/:id/refund', refundHeroPromotion);
router.post('/applications/:id/payment', markPaymentReceived);
router.post('/applications/:id/approve', approveAndSchedule);
router.patch('/applications/:id/status', updateStatus);

// Management (Direct CRUD)
router.post('/manage', createHeroPromotion);
router.patch('/manage/:id', editHeroPromotion);
router.delete('/manage/:id', deleteHeroPromotion);

// Global Settings
router.patch('/settings', updateHeroPromotionSettings);

module.exports = router;
