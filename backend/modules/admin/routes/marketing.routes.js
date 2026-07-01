const express = require('express');
const router = express.Router();
const { getPotentialRecipients, sendBulkThankYouMessages } = require('../controllers/marketingNotification.controller');
const { getSummary, getMarketersLeaderboard, getMarketerProfile } = require('../controllers/marketing.controller');
const { auth, adminOnly } = require('../../../middleware/auth');

/**
 * @route GET /api/admin/marketing/summary
 * @desc Get aggregated marketing KPIs
 */
router.get('/summary', auth, adminOnly, getSummary);

/**
 * @route GET /api/admin/marketing/marketers
 * @desc Get marketers leaderboard / list
 */
router.get('/marketers', auth, adminOnly, getMarketersLeaderboard);

/**
 * @route GET /api/admin/marketing/marketers/:id
 * @desc Get detailed profile for a single marketer
 */
router.get('/marketers/:id', auth, adminOnly, getMarketerProfile);

/**
 * @route GET /api/admin/marketing/potential-recipients
 * @desc Get customers who received deliveries today
 * @access Admin
 */
router.get('/potential-recipients', auth, adminOnly, getPotentialRecipients);

/**
 * @route POST /api/admin/marketing/send-bulk-thank-you
 * @desc Send bulk thank you messages to delivered customers
 * @access Admin
 */
router.post('/send-bulk-thank-you', auth, adminOnly, sendBulkThankYouMessages);

module.exports = router;
