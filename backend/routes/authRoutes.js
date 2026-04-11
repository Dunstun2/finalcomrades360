const express = require('express');
const { register, login, stationLogin, me, verifyPassword, sendRegistrationOtp, googleAuth, forceChangePassword } = require('../controllers/authController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.post('/register', optionalAuth, validate(schemas.register), register);
router.post('/login', (req, res, next) => {
    console.log('[authRoutes] Hit /login route');
    next();
}, validate(schemas.login), login);
router.post('/station-login', stationLogin);
router.post('/force-change-password', auth, forceChangePassword);
router.get('/me', auth, me);
router.post('/verify-password', auth, verifyPassword);
router.post('/send-registration-otp', validate(schemas.sendOtp), sendRegistrationOtp);
router.post('/google', googleAuth);

module.exports = router;
