const express = require('express');
const {
  createPayment,
  initiateMpesaPayment,
  createBankTransferPayment,
  createLipaMdogoMdogoPayment,
  initiateAirtelMoneyPayment,
  handleMpesaCallback,
  handleAirtelCallback,
  checkPaymentStatus,
  verifyPayment,
  verifyPaymentByOrder,
  getPaymentVerificationInfo,
  getUserPayments,
  processRefund,
  initiateWalletPayment,
  mpesaSimulate
} = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');
const { validatePaymentRequest } = require('../middleware/paymentSecurity');

const router = express.Router();

// Public routes (no auth required)
router.post("/mpesa/callback", handleMpesaCallback);
router.post("/airtel/callback", handleAirtelCallback);

// Protected routes (auth required)
router.use(auth);

// Payment management
router.post('/create', validatePaymentRequest, createPayment);
router.post('/mpesa/initiate', initiateMpesaPayment);
router.post('/airtel/initiate', initiateAirtelMoneyPayment);
router.post('/bank-transfer/create', validatePaymentRequest, createBankTransferPayment);
router.post('/lipa-mdogo-mdogo/create', validatePaymentRequest, createLipaMdogoMdogoPayment);
router.get('/status/:paymentId', checkPaymentStatus);
router.post('/verify', verifyPaymentByOrder);
router.post('/verify/:paymentId', verifyPayment);
router.get('/verification-info/:paymentId', getPaymentVerificationInfo);
router.get('/user', getUserPayments);
router.post('/refund/:paymentId', processRefund);
router.post('/wallet/pay', initiateWalletPayment);

// Legacy route for backward compatibility
router.post("/mpesa", mpesaSimulate);

module.exports = router;
