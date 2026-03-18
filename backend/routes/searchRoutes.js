const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/auth');

// @route   GET /api/search
// @desc    Search across products, services, and fast food
// @access  Public
router.get('/', optionalAuth, searchController.search);

module.exports = router;
