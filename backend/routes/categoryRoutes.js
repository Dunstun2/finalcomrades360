const express = require('express');
const { getCategories, getCategoriesWithProductCounts, getCategoryByIdWithProducts, getSubcategoryByIdWithProducts, getSubcategories } = require('../controllers/categoryController');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', getCategories);

// @route   GET /api/categories/with-counts
// @desc    Get all categories with real product counts from database
// @access  Public
router.get('/with-counts', getCategoriesWithProductCounts);

// @route   GET /api/categories/:id/products
// @desc    Get products for a specific category with pagination
// @access  Public
router.get('/:id/products', getCategoryByIdWithProducts);

// @route   GET /api/categories/:id/subcategories
// @desc    Get subcategories for a specific category
// @access  Public
router.get('/:id/subcategories', getSubcategories);

// @route   GET /api/subcategories/:id/products
// @desc    Get products for a specific subcategory with pagination
// @access  Public
router.get('/subcategories/:id/products', getSubcategoryByIdWithProducts);

module.exports = router;
