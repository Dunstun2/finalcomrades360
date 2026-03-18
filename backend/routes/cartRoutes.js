const express = require('express');
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  setFastFoodOrderBatch,
  clearCart,
  mergeCart,
  getCartCount
} = require('../controllers/cartController');
const { auth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// All cart routes require authentication
router.use(auth);

// Add item to cart
const addToCartSchema = {
  productId: require('joi').number().integer().positive().optional(),
  fastFoodId: require('joi').number().integer().positive().optional(),
  serviceId: require('joi').number().integer().positive().optional(),
  quantity: require('joi').number().integer().min(1).max(99).default(1),
  type: require('joi').string().valid('product', 'fastfood', 'service').default('product'),
  cartType: require('joi').string().valid('personal', 'marketing').default('personal')
};

router.post('/', validate(addToCartSchema), addToCart);

// Merge guest cart
router.post('/merge', mergeCart);

// Legacy route for backward compatibility
router.post('/add', validate(addToCartSchema), addToCart);

// Get user's cart
router.get('/', getCart);

// Get cart count (for navbar)
router.get('/count', getCartCount);

// Update cart item quantity
router.put('/update', validate({
  productId: require('joi').number().integer().positive().required(),
  quantity: require('joi').number().integer().min(0).max(99).required(),
  type: require('joi').string().valid('product', 'fastfood', 'service').default('product'),
  cartType: require('joi').string().valid('personal', 'marketing').default('personal')
}), updateCartItem);

// Apply one shared batch to all fastfood items in cart (order-level batch selection)
router.patch('/fastfood/batch', validate({
  batchId: require('joi').number().integer().positive().required(),
  cartType: require('joi').string().valid('personal', 'marketing').default('personal')
}), setFastFoodOrderBatch);

// Clear entire cart
router.delete('/', clearCart);

// Remove item from cart
router.delete('/:productId', removeFromCart);

module.exports = router;
