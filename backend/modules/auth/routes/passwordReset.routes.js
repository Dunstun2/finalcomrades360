const express = require('express');
const { requestPasswordReset, confirmPasswordReset } = require('../controllers/passwordReset.controller');

const router = express.Router()

router.post('/request', requestPasswordReset)
router.post('/confirm', confirmPasswordReset)

module.exports = router;
