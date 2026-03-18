const express = require('express');
const router = express.Router();
const deliveryMessageController = require('../controllers/deliveryMessageController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/:orderId', deliveryMessageController.getOrderMessages);
router.post('/', deliveryMessageController.sendMessage);
router.patch('/:orderId/read', deliveryMessageController.markAsRead);

module.exports = router;
