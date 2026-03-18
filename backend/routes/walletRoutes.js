const express = require('express');
const { auth } = require('../middleware/auth');
const { getWallet, creditWallet, withdraw, buyAirtime } = require('../controllers/walletController');
const router = express.Router();
router.get("/", auth, getWallet);
router.post("/credit", auth, creditWallet);
router.post("/withdraw", auth, withdraw);
router.post("/airtime", auth, buyAirtime);
module.exports = router;
