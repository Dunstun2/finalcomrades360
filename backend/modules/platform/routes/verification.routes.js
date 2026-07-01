const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification.controller');
const { auth: authenticateToken, checkRole } = require('../../../middleware/auth');
const adminVerificationController = require('../../admin/controllers/verification.controller');

// User routes
router.get('/status', authenticateToken, verificationController.getVerificationStatus);
router.post('/request-otp', authenticateToken, verificationController.requestPhoneVerificationOtp);
router.post('/verify-otp', authenticateToken, verificationController.verifyPhoneOtp);

// Guest routes (No Auth)
router.post('/request-guest-otp', verificationController.requestGuestPhoneOtp);
router.post('/verify-guest-otp', verificationController.verifyGuestPhoneOtp);
router.get('/check-phone', verificationController.checkPhoneStatus);

// Admin routes
router.get('/admin/pending', authenticateToken, checkRole(['admin', 'superadmin', 'super_admin']), adminVerificationController.getPendingVerifications);
router.post('/admin/review', authenticateToken, checkRole(['admin', 'superadmin', 'super_admin']), adminVerificationController.reviewVerification);
router.post('/admin/approve-id/:userId', authenticateToken, checkRole(['admin', 'superadmin', 'super_admin']), verificationController.approveNationalId);
router.post('/admin/reject-id/:userId', authenticateToken, checkRole(['admin', 'superadmin', 'super_admin']), verificationController.rejectNationalId);

module.exports = router;
