const express = require('express');
const { me, applyRole, verifyRolePhone, adminApproveRole, listPendingRoles, updateProfile, updateAddress, requestAccountDeletion, requestEmailChange, confirmEmailChange, requestPhoneOtp, confirmPhoneOtp, changePassword, adminSetUserRole, getFullProfile, listUsersByRole, getUserById } = require("../controllers/userController");
const { getUserWallet } = require("../controllers/walletController");
const { auth, adminOnly } = require("../middleware/auth");
const { uploadProfileImages } = require("../config/multer");
const { compressUploadedImages } = require('../utils/imageCompression');

const router = express.Router();
router.get('/me', auth, me);
router.get('/me/full', auth, getFullProfile);
router.get('/profile', auth, me); // Alias for frontend
router.get('/:id', auth, getUserById); // Moved higher for better visibility
router.get('/:id/wallet', auth, getUserWallet);
router.patch('/me', auth, uploadProfileImages.single('profileImage'), compressUploadedImages, updateProfile);
// Support clients sending PUT for profile updates as an alias of PATCH
router.put('/me', auth, uploadProfileImages.single('profileImage'), compressUploadedImages, updateProfile);
router.put('/profile', auth, uploadProfileImages.single('profileImage'), compressUploadedImages, updateProfile); // Alias for frontend
router.post('/me/request-deletion', auth, requestAccountDeletion);
// Account security updates
router.post('/me/email-change/request', auth, requestEmailChange);
router.post('/me/email-change/confirm', auth, confirmEmailChange);
router.post('/me/phone-otp/request', auth, requestPhoneOtp);
router.post('/me/phone-otp/confirm', auth, confirmPhoneOtp);
router.post('/me/change-password', auth, changePassword);
router.post('/roles/apply', applyRole);
router.post('/roles/verify-phone', verifyRolePhone);
router.get('/roles/pending', auth, adminOnly, listPendingRoles);
router.post('/roles/approve', auth, adminOnly, adminApproveRole);
router.post('/roles/set', auth, adminOnly, adminSetUserRole);
router.get('/admin/users/roles/:role', auth, adminOnly, listUsersByRole);

// Address update for checkout
router.put('/address', auth, updateAddress);

module.exports = router;
