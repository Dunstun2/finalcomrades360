const express = require('express');
const { createProduct, getAllProducts, getProductById, getSuperAdminProducts, getRecentlyApprovedProducts, getPendingProducts, approveProduct, rejectProduct, updateProduct, checkDuplicate, deleteProduct, toggleVisibility, suspendProduct, requestProductDeletion, getDeletedProducts, restoreProduct, permanentlyDeleteProduct, migrateDeletedProduct, getHomepageProducts } = require('../controllers/productController');
const { auth, checkRole, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { uploadProductMedia } = require('../config/multer');
const { compressUploadedImages } = require('../utils/imageCompression');

// Define upload fields for products
const uploadFields = [
  { name: 'coverImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 },
  { name: 'video', maxCount: 1 }
];

const router = express.Router();

// @route   GET /api/products
// @desc    Get all approved products (public view)
// @access  Public
router.get('/', optionalAuth, getAllProducts);

// @route   GET /api/products/homepage-fast
// @desc    Fast homepage products with minimal data for quick loading
// @access  Public
router.get('/homepage-fast', optionalAuth, getHomepageProducts);

// @route   GET /api/products/admin/all
// @desc    Get all products for admin/super admin, including hidden and unapproved
// @access  Private (Super Admin, Admin)
router.get('/admin/all', auth, checkRole('super_admin', 'superadmin', 'admin'), getAllProducts);

// @route   GET /api/products/superadmin
// @desc    Get all approved products added by super admins
// @access  Public
router.get('/superadmin', getSuperAdminProducts);

// @route   GET /api/products/superadmin/recently-approved
// @desc    Get recently approved products added by super admins (last 30 days)
// @access  Public
router.get('/superadmin/recently-approved', (req, res) => {
  req.query.showRecentlyApproved = 'true';
  getSuperAdminProducts(req, res);
});

// @route   GET /api/products/recently-approved
// @desc    Get all recently approved products (last 30 days) with priority to super admin products
// @access  Public
router.get('/recently-approved', getRecentlyApprovedProducts);

// @route   GET /api/products/pending
// @desc    Get all pending products for admin approval
// @access  Private (Super Admin, Admin)
router.get('/pending', auth, checkRole('super_admin', 'superadmin', 'admin'), getPendingProducts);

// @route   GET /api/products/check-duplicate
// @desc    Check for duplicate products by seller
// @access  Private (Seller, Admin, Super Admin)
router.get('/check-duplicate', auth, checkDuplicate);

// @route   POST /api/products/request-deletion
// @desc    Request deletion of an approved product (requires admin approval)
// @access  Private (Product owner)
router.post('/request-deletion', auth, checkRole('seller'), requestProductDeletion);

// @route   GET /api/products/deleted
// @desc    Get deleted products in recycle bin
// @access  Private (Seller, Admin)
router.get('/deleted', auth, checkRole(['seller', 'admin', 'superadmin', 'super_admin']), getDeletedProducts);

// @route   POST /api/products/deleted/:id/restore
// @desc    Restore a product from recycle bin
// @access  Private (Product owner, Admin)
router.post('/deleted/:id/restore', auth, checkRole(['seller', 'admin', 'superadmin', 'super_admin']), restoreProduct);

// @route   DELETE /api/products/deleted/:id
// @desc    Permanently delete a product from recycle bin
// @access  Private (Product owner, Admin)
router.delete('/deleted/:id', auth, checkRole(['seller', 'admin', 'superadmin', 'super_admin']), permanentlyDeleteProduct);


// @route   PUT /api/products/:id/approve
// @desc    Approve a pending product
// @access  Private (Super Admin, Admin)
router.put('/:id/approve', auth, checkRole('super_admin', 'superadmin', 'admin'), approveProduct);

// @route   PUT /api/products/:id/reject
// @desc    Reject a pending product
// @access  Private (Super Admin, Admin)
router.put('/:id/reject', auth, checkRole('super_admin', 'superadmin', 'admin'), rejectProduct);

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Super Admin, Admin or Seller)
router.post('/', auth, checkRole(['super_admin', 'superadmin', 'admin', 'seller']), uploadProductMedia.fields(uploadFields), compressUploadedImages, createProduct);



// @route   PUT /api/products/:id/toggle-visibility
// @desc    Toggle product visibility (hide/unhide from homepage)
// @access  Private (Super Admin, Admin)
router.put('/:id/toggle-visibility', auth, checkRole('super_admin', 'superadmin', 'admin'), toggleVisibility);

// @route   PUT /api/products/:id/suspend
// @desc    Suspend a product with reason and duration
// @access  Private (Super Admin, Admin)
router.put('/:id/suspend', auth, checkRole('super_admin', 'superadmin', 'admin'), suspendProduct);

// @route   POST /api/products/migrate-deleted
// @desc    Migrate a permanently deleted product back to recycle bin (Admin only)
// @access  Private (Admin)
router.post('/migrate-deleted', auth, checkRole('super_admin', 'superadmin', 'admin'), migrateDeletedProduct);


// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', optionalAuth, getProductById);

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Product owner, Super Admin, or Admin)
router.put('/:id', auth, uploadProductMedia.fields(uploadFields), compressUploadedImages, updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete a product (only unapproved products by owner or admin)
// @access  Private (Product owner for unapproved products, or Super Admin/Admin)
router.delete('/:id', auth, deleteProduct);

module.exports = router;
