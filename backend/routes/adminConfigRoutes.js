const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../controllers/PlatformConfigController');
const { auth, adminOnly } = require('../middleware/auth');

// Public/Semi-protected: Get Config (Admins and potentially clients)
router.get('/:key', getConfig);

// Super Admin Only: Update Config
// Note: PlatformConfigController.updateConfig already has internal super-admin check
router.post('/:key', auth, updateConfig);

module.exports = router;
