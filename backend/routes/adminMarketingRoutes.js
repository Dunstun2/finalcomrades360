const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const { getSummary, getMarketersLeaderboard, getMarketerProfile } = require('../controllers/adminMarketingController');

const router = express.Router();

// All routes require admin
router.use(auth, adminOnly);

// GET /api/admin/marketing/summary
router.get('/summary', getSummary);

// GET /api/admin/marketing/marketers
router.get('/marketers', getMarketersLeaderboard);

// GET /api/admin/marketing/marketers/:id
router.get('/marketers/:id', getMarketerProfile);

module.exports = router;
