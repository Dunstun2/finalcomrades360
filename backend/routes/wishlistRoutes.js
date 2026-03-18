const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlistStatus
} = require('../controllers/wishlistController');

// All wishlist routes require authentication
router.use(authenticate);

// Add product to wishlist
router.post('/', addToWishlist);

// Get user's wishlist
router.get('/', getWishlist);

// Check if product is in wishlist
router.get('/check/:productId', checkWishlistStatus);

// Remove product from wishlist
router.delete('/:productId', removeFromWishlist);

module.exports = router;
