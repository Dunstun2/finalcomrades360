const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  generate2FASecret,
  verify2FASetup,
  disable2FA,
  verify2FAToken,
  generateNewRecoveryCodes
} = require('../controllers/twoFactorAuthController');

// Generate new 2FA secret and QR code
router.post('/setup', auth, generate2FASecret);

// Verify 2FA setup with token
router.post('/verify', auth, verify2FASetup);

// Disable 2FA
router.post('/disable', auth, disable2FA);

// Verify 2FA token (for login)
router.post('/verify-token', auth, verify2FAToken);

// Generate new recovery codes
router.post('/recovery-codes', auth, generateNewRecoveryCodes);

module.exports = router;
