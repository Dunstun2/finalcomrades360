const express = require('express');
const { trackReferralClick, trackProductView, trackShare, getSharingAnalytics, generateSharingContent } = require('../controllers/sharing.controller');
const { auth, marketerOnly } = require('../../../middleware/auth');

const router = express.Router();

router.post("/track-click", trackReferralClick);
router.post("/track-view", trackProductView);
router.post("/track-share", auth, marketerOnly, trackShare);
router.get("/analytics", auth, marketerOnly, getSharingAnalytics);
router.get("/content/:productId", auth, marketerOnly, generateSharingContent);

module.exports = router;
