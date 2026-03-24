const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  changePassword,
  getSecurityData,
  getLoginHistory,
  getActiveSessions,
  terminateSession,
  updateTwoFactorAuth,
  updateSocialLogin
} = require('../controllers/profileController');
const { setDashboardPassword, verifyDashboardPassword } = require('../controllers/userController');

// All profile routes require authentication
router.use(authenticate);

// Profile management routes
router.get('/me', getProfile);
router.put('/me', updateProfile);

// Security-related routes
router.post('/change-password', changePassword);
router.get('/security', getSecurityData);
router.get('/login-history', getLoginHistory);
router.get('/active-sessions', getActiveSessions);
router.delete('/sessions/:sessionId', terminateSession);

// 2FA and social login routes
router.put('/2fa', updateTwoFactorAuth);
router.put('/social-login', updateSocialLogin);

// Dashboard security routes (mapped to /api/profile/...)
router.post('/dashboard-password', setDashboardPassword);
router.post('/dashboard-password/verify', verifyDashboardPassword);

module.exports = router;