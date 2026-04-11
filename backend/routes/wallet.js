const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { withdrawFunds } = require('../controllers/walletController');

router.post('/withdraw', authenticate, withdrawFunds);

module.exports = router;