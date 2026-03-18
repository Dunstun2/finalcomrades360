const express = require('express');
const { requestPasswordReset, confirmPasswordReset } = require('../controllers/passwordResetController');

const router = express.Router()

router.post('/request', requestPasswordReset)
router.post('/confirm', confirmPasswordReset)

module.exports = router;
