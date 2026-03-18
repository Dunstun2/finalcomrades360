const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

router.get('/resize', imageController.resizeImage);

module.exports = router;
