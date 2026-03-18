const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getSocialMediaAccounts,
  addSocialMediaAccount,
  updateSocialMediaAccount,
  deleteSocialMediaAccount,
  getSocialMediaAccountStats
} = require('../controllers/socialMediaAccountController');

// Social Media Account Routes
// All routes require authentication
router.get('/', auth, getSocialMediaAccounts);
router.post('/', auth, addSocialMediaAccount);
router.put('/:id', auth, updateSocialMediaAccount);
router.delete('/:id', auth, deleteSocialMediaAccount);
router.get('/:id/stats', auth, getSocialMediaAccountStats);

module.exports = router;