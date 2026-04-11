const express = require('express');
const { auth } = require('../middleware/auth');
const { 
  generateHandoverCode, 
  generateBulkHandoverCode,
  confirmHandoverCode, 
  confirmBulkHandoverCode,
  getHandoverStatus 
} = require('../controllers/handoverController');

const router = express.Router();

// All handover routes require authentication
router.use(auth);

// Giver generates a handover code
router.post('/generate', generateHandoverCode);
router.post('/bulk-generate', generateBulkHandoverCode);

// Receiver confirms a handover code
router.post('/confirm', confirmHandoverCode);
router.post('/bulk-confirm', confirmBulkHandoverCode);

// Get active pending code for a given order+type (for the UI to re-display)
router.get('/status/:orderId/:handoverType', getHandoverStatus);

module.exports = router;
