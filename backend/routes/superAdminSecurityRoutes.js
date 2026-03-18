const express = require('express');
const { auth, superAdminOnly } = require('../middleware/auth');
const { initiateSecurityChange, finalizeSecurityChange } = require('../controllers/superAdminSecurityController');

const router = express.Router()

// Super admin only
router.use(auth, superAdminOnly)

// Step 1: Initiate (sends email token to new email and OTP to current phone)
router.post('/security/initiate', initiateSecurityChange)

// Step 2: Finalize (verify currentPassword + emailToken + phoneOtp and update)
router.post('/security/finalize', finalizeSecurityChange)

module.exports = router;
