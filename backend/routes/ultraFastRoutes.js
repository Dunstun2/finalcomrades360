const express = require('express');
const { getUltraFastHomepageProducts, getHomepageBatchData, invalidateHomepageCache } = require('../controllers/ultraFastController');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/ultra-fast/homepage
// @desc    Ultra-fast homepage products with Redis caching
// @access  Public
router.get('/homepage', getUltraFastHomepageProducts);

// @route   GET /api/ultra-fast/batch
// @desc    Get all homepage data in one optimized request
// @access  Public
router.get('/batch', getHomepageBatchData);

// @route   POST /api/ultra-fast/invalidate-cache
// @desc    Invalidate homepage cache (admin only)
// @access  Private (Super Admin, Admin)
router.post('/invalidate-cache', auth, checkRole('super_admin', 'superadmin', 'admin'), invalidateHomepageCache);

module.exports = router;