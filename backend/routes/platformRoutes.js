const express = require('express');
const router = express.Router();
const { getConfig } = require('../controllers/PlatformConfigController');

// Public route to fetch platform config
router.get('/config/:key', getConfig);

module.exports = router;
