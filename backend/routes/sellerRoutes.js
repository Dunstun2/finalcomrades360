const express = require('express');
const { auth, checkRole } = require('../middleware/auth');
const { getMyOrders, getMyProducts, getMyProductById, updateMyProduct, duplicateCheck, getMyKpis, getOverview } = require('../controllers/sellerController');
const { getSellerWallet } = require('../controllers/sellerWalletController');
const { uploadProductMedia } = require('../config/multer');
const { compressUploadedImages } = require('../utils/imageCompression');

const router = express.Router()

// Seller-only routes
router.get('/overview', auth, checkRole('seller', 'admin'), getOverview)
router.get('/products', auth, checkRole('seller', 'admin'), getMyProducts)
router.get('/products/duplicate-check', auth, checkRole('seller', 'admin'), duplicateCheck)
router.get('/products/:id', auth, checkRole('seller', 'admin'), getMyProductById)
router.patch('/products/:id', auth, checkRole('seller', 'admin'), uploadProductMedia.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'gallery', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), compressUploadedImages, updateMyProduct)
router.get('/orders', auth, checkRole('seller', 'admin'), getMyOrders)
// KPIs pre-aggregated
router.get('/kpis', auth, checkRole('seller', 'admin'), getMyKpis)

// Wallet
router.get('/wallet', auth, checkRole('seller', 'admin'), getSellerWallet)

module.exports = router;
