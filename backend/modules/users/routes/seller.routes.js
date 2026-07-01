const express = require('express');
const { auth, checkRole, checkSellerProfile } = require('../../../middleware/auth');
const { getMyOrders, getMyProducts, getMyProductById, updateMyProduct, duplicateCheck, getMyKpis, getOverview, updateSellerSettings } = require('../controllers/seller.controller');
const { getSellerWallet } = require('../../finance/controllers/sellerWallet.controller');
const { withdraw } = require('../../finance/controllers/wallet.controller');
const { uploadProductMedia } = require('../../../config/multer');
const { compressUploadedImages } = require('../../../utils/imageCompression');

const router = express.Router()

// Seller-only routes - All require profile completeness
router.get('/overview', auth, checkRole('seller', 'admin'), checkSellerProfile, getOverview)
router.get('/products', auth, checkRole('seller', 'admin'), checkSellerProfile, getMyProducts)
router.patch('/settings', auth, checkRole('seller', 'admin', 'fastfood_vendor'), updateSellerSettings)
router.get('/products/duplicate-check', auth, checkRole('seller', 'admin'), checkSellerProfile, duplicateCheck)
router.get('/products/:id', auth, checkRole('seller', 'admin'), checkSellerProfile, getMyProductById)
router.patch('/products/:id', auth, checkRole('seller', 'admin'), checkSellerProfile, uploadProductMedia.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'gallery', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), compressUploadedImages, updateMyProduct)
router.get('/orders', auth, checkRole('seller', 'admin'), checkSellerProfile, getMyOrders)
// KPIs pre-aggregated
router.get('/kpis', auth, checkRole('seller', 'admin'), checkSellerProfile, getMyKpis)

// Wallet
router.get('/wallet', auth, checkRole('seller', 'admin'), checkSellerProfile, getSellerWallet)
router.post('/wallet/withdraw', auth, checkRole('seller', 'admin'), checkSellerProfile, withdraw)

module.exports = router;
